import assert, { AssertionError } from 'assert';
import { Types } from '@fiora/database/mongoose';
import stringHash from 'string-hash';

import config from '@fiora/config/server';
import getRandomAvatar from '@fiora/utils/getRandomAvatar';
import Group, { GroupDocument } from '@fiora/database/mongoose/models/group';
import Socket from '@fiora/database/mongoose/models/socket';
import Message from '@fiora/database/mongoose/models/message';
import {
    DisableCreateGroupKey,
    Redis,
} from '@fiora/database/redis/initRedis';

const { isValid } = Types.ObjectId;

/**
 * 获取指定群组的在线用户辅助方法
 * @param group 群组
 */
async function getGroupOnlineMembersHelper(group: GroupDocument) {
    const sockets = await Socket.find(
        {
            user: {
                $in: group.members.map((member) => member.toString()),
            },
        },
        {
            os: 1,
            browser: 1,
            environment: 1,
            user: 1,
        },
    ).populate('user', { username: 1, avatar: 1 });
    const filterSockets = sockets.reduce((result, socket) => {
        result.set(socket.user._id.toString(), socket);
        return result;
    }, new Map());
    return Array.from(filterSockets.values());
}

/**
 * 创建群组
 * @param ctx Context
 */
export async function createGroup(ctx: Context<{ name: string }>) {
    // 从 Redis 读取配置，如果不存在则从环境变量读取
    const disableCreateGroupRedis = await Redis.get(DisableCreateGroupKey);
    const disableCreateGroup =
        disableCreateGroupRedis !== null
            ? disableCreateGroupRedis === 'true'
            : config.disableCreateGroup;
    
    assert(!disableCreateGroup, '管理员已关闭创建群组功能');

    const ownGroupCount = await Group.count({ creator: ctx.socket.user });
    assert(
        ctx.socket.isAdmin || ownGroupCount < config.maxGroupsCount,
        `创建群组失败, 你已经创建了${config.maxGroupsCount}个群组`,
    );

    const { name } = ctx.data;
    assert(name, '群组名不能为空');

    const group = await Group.findOne({ name });
    assert(!group, '该群组已存在');

    let newGroup = null;
    try {
        newGroup = await Group.create({
            name,
            avatar: getRandomAvatar(),
            creator: ctx.socket.user,
            members: [ctx.socket.user],
        } as GroupDocument);
    } catch (err: any) {
        if (err && err.name === 'ValidationError') {
            return '群组名包含不支持的字符或者长度超过限制';
        }
        throw err;
    }

    ctx.socket.join(newGroup._id.toString());
    return {
        _id: newGroup._id,
        name: newGroup.name,
        avatar: newGroup.avatar,
        createTime: newGroup.createTime,
        creator: newGroup.creator,
        disableMute: newGroup.disableMute || false,
    };
}

/**
 * 加入群组
 * @param ctx Context
 */
export async function joinGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '加入群组失败, 群组不存在' });
    }
    assert(group.members.indexOf(ctx.socket.user) === -1, '你已经在群组中');

    group.members.push(ctx.socket.user);
    await group.save();

    const messages = await Message.find(
        { toGroup: groupId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: 3 },
    ).populate('from', { username: 1, avatar: 1 });
    messages.reverse();

    ctx.socket.join(group._id.toString());

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        createTime: group.createTime,
        creator: group.creator,
        disableMute: group.disableMute || false,
        messages,
    };
}

/**
 * 退出群组
 * @param ctx Context
 */
export async function leaveGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }

    // 默认群组没有creator
    if (group.creator) {
        assert(
            group.creator.toString() !== ctx.socket.user.toString(),
            '群主不可以退出自己创建的群',
        );
    }

    const index = group.members.indexOf(ctx.socket.user);
    assert(index !== -1, '你不在群组中');

    group.members.splice(index, 1);
    await group.save();

    ctx.socket.leave(group._id.toString());

    return {};
}

const GroupOnlineMembersCacheExpireTime = 1000 * 60;

/**
 * 获取群组在线成员
 */
function getGroupOnlineMembersWrapperV2() {
    const cache: Record<
        string,
        {
            key?: string;
            value: any;
            expireTime: number;
        }
    > = {};
    return async function getGroupOnlineMembersV2(
        ctx: Context<{ groupId: string; cache?: string }>,
    ) {
        const { groupId, cache: cacheKey } = ctx.data;
        assert(isValid(groupId), '无效的群组ID');

        if (
            cache[groupId] &&
            cache[groupId].key === cacheKey &&
            cache[groupId].expireTime > Date.now()
        ) {
            return { cache: cacheKey };
        }

        const group = await Group.findOne({ _id: groupId });
        if (!group) {
            throw new AssertionError({ message: '群组不存在' });
        }
        const result = await getGroupOnlineMembersHelper(group);
        const resultCacheKey = stringHash(
            result.map((item) => item.user._id).join(','),
        ).toString(36);
        if (cache[groupId] && cache[groupId].key === resultCacheKey) {
            cache[groupId].expireTime =
                Date.now() + GroupOnlineMembersCacheExpireTime;
            if (resultCacheKey === cacheKey) {
                return { cache: cacheKey };
            }
        }

        cache[groupId] = {
            key: resultCacheKey,
            value: result,
            expireTime: Date.now() + GroupOnlineMembersCacheExpireTime,
        };
        return {
            cache: resultCacheKey,
            members: result,
        };
    };
}
export const getGroupOnlineMembersV2 = getGroupOnlineMembersWrapperV2();

export async function getGroupOnlineMembers(
    ctx: Context<{ groupId: string; cache?: string }>,
) {
    const result = await getGroupOnlineMembersV2(ctx);
    return result.members;
}

/**
 * 获取默认群组的在线成员
 * 无需登录态
 */
function getDefaultGroupOnlineMembersWrapper() {
    let cache: any = null;
    let expireTime = 0;
    return async function getDefaultGroupOnlineMembers() {
        if (cache && expireTime > Date.now()) {
            return cache;
        }

        const group = await Group.findOne({ isDefault: true });
        if (!group) {
            throw new AssertionError({ message: '群组不存在' });
        }
        cache = await getGroupOnlineMembersHelper(group);
        expireTime = Date.now() + GroupOnlineMembersCacheExpireTime;
        return cache;
    };
}
export const getDefaultGroupOnlineMembers = getDefaultGroupOnlineMembersWrapper();

/**
 * 修改群头像, 只有群创建者有权限
 * @param ctx Context
 */
export async function changeGroupAvatar(
    ctx: Context<{ groupId: string; avatar: string }>,
) {
    const { groupId, avatar } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');
    assert(avatar, '头像地址不能为空');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        '只有群主才能修改头像',
    );

    await Group.updateOne({ _id: groupId }, { avatar });
    
    // 通知群组所有成员头像已更新
    ctx.socket.emit(groupId, 'changeGroupAvatar', { groupId, avatar });
    
    return {};
}

/**
 * 修改群组头像, 只有群创建者有权限
 * @param ctx Context
 */
export async function changeGroupName(
    ctx: Context<{ groupId: string; name: string }>,
) {
    const { groupId, name } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');
    assert(name, '群组名称不能为空');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }
    assert(group.name !== name, '新群组名不能和之前一致');
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        '只有群主才能修改头像',
    );

    const targetGroup = await Group.findOne({ name });
    assert(!targetGroup, '该群组名已存在');

    await Group.updateOne({ _id: groupId }, { name });

    ctx.socket.emit(groupId, 'changeGroupName', { groupId, name });

    return {};
}

/**
 * 删除群组, 只有群创建者有权限
 * @param ctx Context
 */
export async function deleteGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        '只有群主才能解散群组',
    );
    assert(group.isDefault !== true, '默认群组不允许解散');

    await Group.deleteOne({ _id: group });

    ctx.socket.emit(groupId, 'deleteGroup', { groupId });

    return {};
}

export async function getGroupBasicInfo(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        members: group.members.length,
        disableMute: group.disableMute || false,
    };
}

/**
 * 切换群组禁言状态，只有群主或管理员有权限
 * @param ctx Context
 */
export async function toggleGroupMute(
    ctx: Context<{ groupId: string; disableMute: boolean }>,
) {
    const { groupId, disableMute } = ctx.data;
    assert(isValid(groupId), '无效的群组ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }

    // 只有群主或管理员可以切换禁言状态
    const isCreator = group.creator && group.creator.toString() === ctx.socket.user.toString();
    assert(
        ctx.socket.isAdmin || isCreator,
        '只有群主或管理员可以设置群组禁言',
    );

    await Group.updateOne({ _id: groupId }, { disableMute });

    // 通知群组所有成员
    ctx.socket.emit(groupId, 'changeGroupMute', { groupId, disableMute });

    return {
        msg: 'ok',
    };
}



/**
 * 管理员：获取群组全部成员（直接从数据库读取）
 * - 只允许全局管理员调用
 * - 返回成员列表，并标记是否封禁（封禁信息存 Redis，因此这里会额外查询 Redis）
 */
export async function adminGetGroupUsers(ctx: Context<{ groupId: string }>) {
    assert(ctx.socket.isAdmin, '你不是管理员');
    const { groupId } = ctx.data;
    assert(groupId, 'groupId不能为空');

    const group = await Group.findOne({ _id: groupId })
        .populate('members', 'username avatar createTime')
        .populate('creator', 'username avatar createTime');
    if (!group) {
        throw new AssertionError({ message: '群组不存在' });
    }

    // members 可能不包含 creator，这里合并并去重
    const usersMap = new Map<string, any>();
    const members = (group.members as any[]) || [];
    members.forEach((u) => {
        if (u && u._id) usersMap.set(String(u._id), u);
    });
    const creator = group.creator as any;
    if (creator && creator._id) {
        usersMap.set(String(creator._id), creator);
    }

    const users = Array.from(usersMap.values());

    // 补充封禁状态（Redis key: SealUser-<userId>）
    const { Redis, getSealUserKey } = await import('@fiora/database/redis/initRedis');
    const sealedIds = new Set<string>();
    await Promise.all(
        users.map(async (u) => {
            try {
                const isSealed = await Redis.has(getSealUserKey(String(u._id)));
                if (isSealed) sealedIds.add(String(u._id));
            } catch (e) {
                // ignore redis errors for listing
            }
        }),
    );

    return {
        groupId,
        users: users.map((u) => ({
            _id: u._id,
            username: u.username,
            avatar: u.avatar,
            createTime: u.createTime,
            isSealed: sealedIds.has(String(u._id)),
            isCreator: creator && String(u._id) === String(creator._id),
        })),
    };
}
