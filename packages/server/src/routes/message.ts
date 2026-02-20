/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import assert, { AssertionError } from 'assert';
import { Types } from '@fiora/database/mongoose';
import { Expo, ExpoPushErrorTicket } from 'expo-server-sdk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import xss from '@fiora/utils/xss';
import logger from '@fiora/utils/logger';
import config from '@fiora/config/server';
import User, { UserDocument } from '@fiora/database/mongoose/models/user';
import Group, { GroupDocument } from '@fiora/database/mongoose/models/group';
import Message, {
    handleInviteV2Message,
    handleInviteV2Messages,
    MessageDocument,
} from '@fiora/database/mongoose/models/message';
import Notification from '@fiora/database/mongoose/models/notification';
import History, {
    createOrUpdateHistory,
} from '@fiora/database/mongoose/models/history';
import Socket from '@fiora/database/mongoose/models/socket';

import {
    DisableSendMessageKey,
    DisableNewUserSendMessageKey,
    DisableDeleteMessageKey,
    Redis,
} from '@fiora/database/redis/initRedis';
import client from '../../../config/client';

const { isValid } = Types.ObjectId;

/** 初次获取历史消息数 */
const FirstTimeMessagesCount = 15;
/** 每次调用接口获取的历史消息数 */
const EachFetchMessagesCount = 30;

const OneYear = 365 * 24 * 3600 * 1000;

/** 石头剪刀布, 用于随机生成结果 */
const RPS = ['石头', '剪刀', '布'];

async function pushNotification(
    notificationTokens: string[],
    message: MessageDocument,
    groupName?: string,
) {
    const expo = new Expo({});

    const content =
        message.type === 'text' ? message.content : `[${message.type}]`;
    const pushMessages = notificationTokens.map((notificationToken) => ({
        to: notificationToken,
        sound: 'default',
        title: groupName || (message.from as any).username,
        body: groupName
            ? `${(message.from as any).username}: ${content}`
            : content,
        data: { focus: message.to },
    }));

    const chunks = expo.chunkPushNotifications(pushMessages as any);
    for (const chunk of chunks) {
        try {
            const results = await expo.sendPushNotificationsAsync(chunk);
            results.forEach((result) => {
                const { status, message: errMessage } =
                    result as ExpoPushErrorTicket;
                if (status === 'error') {
                    logger.warn('[Notification]', errMessage);
                }
            });
        } catch (error) {
            logger.error('[Notification]', (error as Error).message);
        }
    }
}

/**
 * 发送消息
 * 如果是发送给群组, to是群组id
 * 如果是发送给个人, to是俩人id按大小序拼接后的值
 * @param ctx Context
 */
export async function sendMessage(ctx: Context<SendMessageData>) {
    const disableSendMessage = await Redis.get(DisableSendMessageKey);
    assert(disableSendMessage !== 'true' || ctx.socket.isAdmin, '全员禁言中');

    const disableNewUserSendMessage = await Redis.get(
        DisableNewUserSendMessageKey,
    );
    if (disableNewUserSendMessage === 'true') {
        const user = await User.findById(ctx.socket.user);
        const isNewUser =
            user && user.createTime.getTime() > Date.now() - OneYear;
        assert(
            ctx.socket.isAdmin || !isNewUser,
            '新用户禁言中! 主群禁止闲聊, 多交流fiora和开发技术, 自发维护交流环境',
        );
    }

    const { to, content } = ctx.data;
    let { type } = ctx.data;
    assert(to, 'to不能为空');

    let toGroup: GroupDocument | null = null;
    let toUser: UserDocument | null = null;
    if (isValid(to)) {
        toGroup = await Group.findOne({ _id: to });
        assert(toGroup, '群组不存在');
        
        // 检查群组禁言状态，管理员不受限制
        if (toGroup.disableMute && !ctx.socket.isAdmin) {
            assert(false, '该群组已开启禁言，只有管理员可以发言');
        }
    } else {
        const userId = to.replace(ctx.socket.user.toString(), '');
        assert(isValid(userId), '无效的用户ID');
        toUser = await User.findOne({ _id: userId });
        assert(toUser, '用户不存在');
    }

    let messageContent = content;
    if (type === 'text') {
        assert(messageContent.length <= 2048, '消息长度过长');

        const rollRegex = /^-roll( ([0-9]*))?$/;
        if (rollRegex.test(messageContent)) {
            const regexResult = rollRegex.exec(messageContent);
            if (regexResult) {
                let numberStr = regexResult[1] || '100';
                if (numberStr.length > 5) {
                    numberStr = '99999';
                }
                const number = parseInt(numberStr, 10);
                type = 'system';
                messageContent = JSON.stringify({
                    command: 'roll',
                    value: Math.floor(Math.random() * (number + 1)),
                    top: number,
                });
            }
        } else if (/^-rps$/.test(messageContent)) {
            type = 'system';
            messageContent = JSON.stringify({
                command: 'rps',
                value: RPS[Math.floor(Math.random() * RPS.length)],
            });
        }
        messageContent = xss(messageContent);
    } else if (type === 'file') {
        const file: { size: number } = JSON.parse(content);
        assert(file.size < client.maxFileSize, '要发送的文件过大');
        messageContent = content;
    } else if (type === 'inviteV2') {
        const shareTargetGroup = await Group.findOne({ _id: content });
        if (!shareTargetGroup) {
            throw new AssertionError({ message: '目标群组不存在' });
        }
        const user = await User.findOne({ _id: ctx.socket.user });
        if (!user) {
            throw new AssertionError({ message: '用户不存在' });
        }
        messageContent = JSON.stringify({
            inviter: user._id,
            group: shareTargetGroup._id,
        });
    }

    const user = await User.findOne(
        { _id: ctx.socket.user },
        { username: 1, avatar: 1, tag: 1 },
    );
    if (!user) {
        throw new AssertionError({ message: '用户不存在' });
    }

    const message = await Message.create({
        from: ctx.socket.user,
        to,
        type,
        content: messageContent,
    } as MessageDocument);

    const messageData = {
        _id: message._id,
        createTime: message.createTime,
        from: user.toObject(),
        to,
        type,
        content: message.content,
    };
    if (type === 'inviteV2') {
        await handleInviteV2Message(messageData);
    }

    if (toGroup) {
        ctx.socket.emit(toGroup._id.toString(), 'message', messageData);

        const notifications = await Notification.find({
            user: {
                $in: toGroup.members,
            },
        });
        const notificationTokens: string[] = [];
        notifications.forEach((notification) => {
            // Messages sent by yourself don’t push notification to yourself
            if (
                notification.user._id.toString() === ctx.socket.user.toString()
            ) {
                return;
            }
            notificationTokens.push(notification.token);
        });
        if (notificationTokens.length) {
            pushNotification(
                notificationTokens,
                messageData as unknown as MessageDocument,
                toGroup.name,
            );
        }
    } else {
        const targetSockets = await Socket.find({ user: toUser?._id });
        const targetSocketIdList =
            targetSockets?.map((socket) => socket.id) || [];
        if (targetSocketIdList.length) {
            ctx.socket.emit(targetSocketIdList, 'message', messageData);
        }

        const selfSockets = await Socket.find({ user: ctx.socket.user });
        const selfSocketIdList = selfSockets?.map((socket) => socket.id) || [];
        if (selfSocketIdList.length) {
            ctx.socket.emit(selfSocketIdList, 'message', messageData);
        }

        const notificationTokens = await Notification.find({ user: toUser });
        if (notificationTokens.length) {
            pushNotification(
                notificationTokens.map(({ token }) => token),
                messageData as unknown as MessageDocument,
            );
        }
    }

    createOrUpdateHistory(ctx.socket.user.toString(), to, message._id);

    return messageData;
}

/**
 * 获取一组联系人的最后历史消息
 * @param ctx Context
 */
export async function getLinkmansLastMessages(
    ctx: Context<{ linkmans: string[] }>,
) {
    const { linkmans } = ctx.data;
    assert(Array.isArray(linkmans), '参数linkmans应该是Array');

    const promises = linkmans.map(async (linkmanId) => {
        const messages = await Message.find(
            { to: linkmanId },
            {
                type: 1,
                content: 1,
                from: 1,
                createTime: 1,
                deleted: 1,
            },
            { sort: { createTime: -1 }, limit: FirstTimeMessagesCount },
        ).populate('from', { username: 1, avatar: 1, tag: 1 });
        await handleInviteV2Messages(messages);
        return messages;
    });
    const results = await Promise.all(promises);
    type Messages = {
        [linkmanId: string]: MessageDocument[];
    };
    const messages = linkmans.reduce((result: Messages, linkmanId, index) => {
        result[linkmanId] = (results[index] || []).reverse();
        return result;
    }, {});

    return messages;
}

export async function getLinkmansLastMessagesV2(
    ctx: Context<{ linkmans: string[] }>,
) {
    const { linkmans } = ctx.data;

    const histories = await History.find({
        user: ctx.socket.user.toString(),
        linkman: {
            $in: linkmans,
        },
    });
    const historyMap = histories
        .filter(Boolean)
        .reduce((result: { [linkman: string]: string }, history) => {
            result[history.linkman] = history.message;
            return result;
        }, {});

    const linkmansMessages = await Promise.all(
        linkmans.map(async (linkmanId) => {
            const messages = await Message.find(
                { to: linkmanId },
                {
                    type: 1,
                    content: 1,
                    from: 1,
                    createTime: 1,
                    deleted: 1,
                },
                {
                    sort: { createTime: -1 },
                    limit: historyMap[linkmanId] ? 100 : FirstTimeMessagesCount,
                },
            ).populate('from', { username: 1, avatar: 1, tag: 1 });
            await handleInviteV2Messages(messages);
            return messages;
        }),
    );

    type ResponseData = {
        [linkmanId: string]: {
            messages: MessageDocument[];
            unread: number;
        };
    };
    const responseData = linkmans.reduce(
        (result: ResponseData, linkmanId, index) => {
            const messages = linkmansMessages[index];
            if (historyMap[linkmanId]) {
                const messageIndex = messages.findIndex(
                    ({ _id }) => _id.toString() === historyMap[linkmanId],
                );
                result[linkmanId] = {
                    messages: messages.slice(0, 15).reverse(),
                    unread: messageIndex === -1 ? 100 : messageIndex,
                };
            } else {
                result[linkmanId] = {
                    messages: messages.reverse(),
                    unread: 0,
                };
            }
            return result;
        },
        {},
    );

    return responseData;
}

/**
 * 获取联系人的历史消息
 * @param ctx Context
 */
export async function getLinkmanHistoryMessages(
    ctx: Context<{ linkmanId: string; existCount: number }>,
) {
    const { linkmanId, existCount } = ctx.data;

    const messages = await Message.find(
        { to: linkmanId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        {
            sort: { createTime: -1 },
            limit: EachFetchMessagesCount + existCount,
        },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}

/**
 * 获取默认群组的历史消息
 * @param ctx Context
 */
export async function getDefaultGroupHistoryMessages(
    ctx: Context<{ existCount: number }>,
) {
    const { existCount } = ctx.data;

    const group = await Group.findOne({ isDefault: true });
    if (!group) {
        throw new AssertionError({ message: '默认群组不存在' });
    }
    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        {
            sort: { createTime: -1 },
            limit: EachFetchMessagesCount + existCount,
        },
    ).populate('from', { username: 1, avatar: 1, tag: 1 });
    await handleInviteV2Messages(messages);
    const result = messages.slice(existCount).reverse();
    return result;
}

/**
 * 删除消息, 需要管理员权限
 */
export async function deleteMessage(ctx: Context<{ messageId: string }>) {
    // 检查Redis中的配置，如果Redis中没有则使用client配置中的默认值
    const redisDisableDeleteMessage = (await Redis.get(DisableDeleteMessageKey)) === 'true';
    const isDeleteMessageDisabled = redisDisableDeleteMessage || client.disableDeleteMessage;
    assert(
        !isDeleteMessageDisabled || ctx.socket.isAdmin,
        '已禁止撤回消息',
    );

    const { messageId } = ctx.data;
    assert(messageId, 'messageId不能为空');

    const message = await Message.findOne({ _id: messageId });
    if (!message) {
        throw new AssertionError({ message: '消息不存在' });
    }
    assert(
        ctx.socket.isAdmin ||
            message.from.toString() === ctx.socket.user.toString(),
        '只能撤回本人的消息',
    );

    // 删除消息前，先删除关联的文件（如果是图片或文件消息）
    if ((message.type === 'image' || message.type === 'file') && !config.aliyunOSS.enable) {
        try {
            // 从消息内容中提取文件路径
            let filePath: string | null = null;
            if (message.type === 'image') {
                // 图片消息格式：/ImageMessage/userId_timestamp?width=xxx&height=xxx
                const urlMatch = message.content.match(/^(\/[^?]+)/);
                if (urlMatch) {
                    filePath = urlMatch[1];
                }
            } else if (message.type === 'file') {
                // 文件消息格式：JSON.stringify({ fileUrl, filename, size, ext })
                try {
                    const fileData = JSON.parse(message.content);
                    if (fileData.fileUrl && fileData.fileUrl.startsWith('/')) {
                        filePath = fileData.fileUrl.split('?')[0]; // 去除查询参数
                    }
                } catch (e) {
                    // JSON 解析失败，忽略
                }
            }

            // 删除本地文件
            if (filePath) {
                const fullPath = path.resolve(__dirname, '../../public', filePath.substring(1)); // 去除开头的 /
                try {
                    await promisify(fs.unlink)(fullPath);
                    logger.info('[deleteMessage] deleted file:', fullPath);
                } catch (err) {
                    // 文件不存在或删除失败，记录日志但不影响消息删除
                    logger.warn('[deleteMessage] failed to delete file:', fullPath, (err as Error).message);
                }
            }
        } catch (err) {
            // 文件删除失败不影响消息删除流程
            logger.warn('[deleteMessage] error deleting file:', (err as Error).message);
        }
    }

    if (ctx.socket.isAdmin) {
        await Message.deleteOne({ _id: messageId });
    } else {
        message.deleted = true;
        await message.save();
    }

    /**
     * 广播删除消息通知, 区分群消息和私聊消息
     */
    const messageName = 'deleteMessage';
    const messageData = {
        linkmanId: message.to.toString(),
        messageId,
        isAdmin: ctx.socket.isAdmin,
    };
    if (isValid(message.to)) {
        // 群消息
        ctx.socket.emit(message.to.toString(), messageName, messageData);
    } else {
        // 私聊消息
        const targetUserId = message.to.replace(ctx.socket.user.toString(), '');
        const targetSockets = await Socket.find({ user: targetUserId });
        const targetSocketIdList =
            targetSockets?.map((socket) => socket.id) || [];
        if (targetSocketIdList) {
            ctx.socket.emit(targetSocketIdList, messageName, messageData);
        }

        const selfSockets = await Socket.find({ user: ctx.socket.user });
        const selfSocketIdList = selfSockets?.map((socket) => socket.id) || [];
        if (selfSocketIdList) {
            ctx.socket.emit(
                selfSocketIdList.filter(
                    (socketId) => socketId !== ctx.socket.id,
                ),
                messageName,
                messageData,
            );
        }
    }

    return {
        msg: 'ok',
    };
}


/**
 * 管理员：获取群组全部消息（包含已撤回 deleted=true 的消息）
 * 直接从数据库读取，只允许全局管理员调用
 */
export async function adminGetGroupMessages(
    ctx: Context<{ groupId: string; page?: number; pageSize?: number }>,
) {
    assert(ctx.socket.isAdmin, '你不是管理员');
    const { groupId } = ctx.data;
    assert(groupId, 'groupId不能为空');

    const page = Math.max(Number(ctx.data.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(ctx.data.pageSize || 100), 1), 200);

    const [messages, total] = await Promise.all([
        Message.find({ to: groupId })
            .sort({ createTime: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('from', 'username avatar'),
        Message.countDocuments({ to: groupId }),
    ]);

    return {
        page,
        pageSize,
        total,
        messages: messages.map((m) => ({
            _id: m._id,
            from: m.from,
            to: m.to,
            type: m.type,
            content: m.content,
            deleted: m.deleted,
            createTime: m.createTime,
        })),
    };
}

/**
 * 管理员：硬删除消息（物理删除 Message 文档）
 * - 不受“禁止撤回”开关影响
 * - 会广播 deleteMessage 事件让前端移除
 */
export async function hardDeleteMessage(ctx: Context<{ messageId: string }>) {
    assert(ctx.socket.isAdmin, '你不是管理员');
    const { messageId } = ctx.data;
    assert(messageId, 'messageId不能为空');

    const message = await Message.findOne({ _id: messageId });
    if (!message) {
        throw new AssertionError({ message: '消息不存在' });
    }

    // 尽力删除本地文件（仅本地存储）
    if ((message.type === 'image' || message.type === 'file') && !config.aliyunOSS.enable) {
        try {
            let filePath: string | null = null;
            if (message.type === 'image') {
                const urlMatch = message.content.match(/^(\/[^?]+)/);
                if (urlMatch) {
                    filePath = urlMatch[1];
                }
            } else if (message.type === 'file') {
                try {
                    const fileData = JSON.parse(message.content);
                    if (fileData.fileUrl && fileData.fileUrl.startsWith('/')) {
                        filePath = fileData.fileUrl.split('?')[0];
                    }
                } catch (e) {
                    // ignore
                }
            }
            if (filePath) {
                const fullPath = path.resolve(__dirname, '../../public', filePath.substring(1));
                try {
                    await promisify(fs.unlink)(fullPath);
                    logger.info('[hardDeleteMessage] deleted file:', fullPath);
                } catch (err) {
                    logger.warn(
                        '[hardDeleteMessage] failed to delete file:',
                        fullPath,
                        (err as Error).message,
                    );
                }
            }
        } catch (err) {
            logger.warn('[hardDeleteMessage] error deleting file:', (err as Error).message);
        }
    }

    // 先删除关联 History，再删除 Message
    await History.deleteMany({ message: message._id });
    await Message.deleteOne({ _id: messageId });

    // 广播给前端：沿用 deleteMessage 事件名，确保 UI 统一处理
    const messageName = 'deleteMessage';
    const messageData = {
        linkmanId: message.to.toString(),
        messageId,
        isAdmin: true,
    };
    if (isValid(message.to)) {
        ctx.socket.emit(message.to.toString(), messageName, messageData);
    } else {
        const targetUserId = message.to.replace(ctx.socket.user.toString(), '');
        const targetSockets = await Socket.find({ user: targetUserId });
        const targetSocketIdList = targetSockets?.map((s) => s.id) || [];
        if (targetSocketIdList.length > 0) {
            ctx.socket.emit(targetSocketIdList, messageName, messageData);
        }

        const selfSockets = await Socket.find({ user: ctx.socket.user });
        const selfSocketIdList = selfSockets?.map((s) => s.id) || [];
        if (selfSocketIdList.length > 0) {
            ctx.socket.emit(
                selfSocketIdList.filter((socketId) => socketId !== ctx.socket.id),
                messageName,
                messageData,
            );
        }
    }

    return { msg: 'ok' };
}
