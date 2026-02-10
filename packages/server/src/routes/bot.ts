import assert, { AssertionError } from 'assert';
import { Types } from '@fiora/database/mongoose';
import Bot, { BotDocument } from '@fiora/database/mongoose/models/bot';
import Conversation from '@fiora/database/mongoose/models/conversation';
import Message from '@fiora/database/mongoose/models/message';
import Group from '@fiora/database/mongoose/models/group';
import User from '@fiora/database/mongoose/models/user';
import llmService, { LLMMessage } from '../services/llm';
import logger from '@fiora/utils/logger';
import getRandomAvatar from '@fiora/utils/getRandomAvatar';

const { isValid } = Types.ObjectId;

/**
 * 创建或更新AI机器人配置（仅管理员）
 * @param ctx Context
 */
export async function configureBot(ctx: Context<{
    name: string;
    avatar?: string;
    config: {
        llmUrl: string;
        apiKey: string;
        model: string;
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
        maxHistory?: number;
    };
}>) {
    assert(ctx.socket.isAdmin, '只有管理员可以配置AI机器人');

    const { name, avatar, config } = ctx.data;

    assert(name, '机器人名称不能为空');
    assert(config.llmUrl, 'LLM URL不能为空');
    assert(config.apiKey, 'API Key不能为空');
    assert(config.model, '模型名称不能为空');

    let bot = await Bot.findOne({ type: 'ai' });

    if (bot) {
        // 更新现有配置
        bot.name = name;
        if (avatar) bot.avatar = avatar;
        bot.config = {
            ...bot.config,
            ...config,
        };
        bot.creator = ctx.socket.user;
        await bot.save();
    } else {
        // 创建新机器人
        bot = await Bot.create({
            name,
            avatar: avatar || getRandomAvatar(),
            type: 'ai',
            enabled: false,
            config: {
                llmUrl: config.llmUrl,
                apiKey: config.apiKey,
                model: config.model,
                systemPrompt: config.systemPrompt || '你是一个友好的AI助手，请用简洁、准确的语言回答用户的问题。',
                temperature: config.temperature || 0.7,
                maxTokens: config.maxTokens || 2000,
                maxHistory: config.maxHistory || 10,
            },
            creator: ctx.socket.user,
        } as BotDocument);
    }

    logger.info('[configureBot]', ctx.socket.user, bot._id);

    return {
        _id: bot._id,
        name: bot.name,
        avatar: bot.avatar,
        enabled: bot.enabled,
        config: {
            ...bot.config,
            apiKey: '***', // 隐藏API Key
        },
    };
}

/**
 * 获取AI机器人配置
 * @param ctx Context
 */
export async function getBotConfig(ctx: Context<{}>) {
    const bot = await Bot.findOne({ type: 'ai' });

    if (!bot) {
        return null;
    }

    return {
        _id: bot._id,
        name: bot.name,
        avatar: bot.avatar,
        enabled: bot.enabled,
        config: {
            ...bot.config,
            apiKey: ctx.socket.isAdmin ? bot.config.apiKey : '***', // 非管理员隐藏API Key
        },
    };
}

/**
 * 启用/禁用AI机器人（仅管理员）
 * @param ctx Context
 */
export async function toggleBot(ctx: Context<{ enabled: boolean }>) {
    assert(ctx.socket.isAdmin, '只有管理员可以启用/禁用AI机器人');

    const { enabled } = ctx.data;
    const bot = await Bot.findOne({ type: 'ai' });

    assert(bot, 'AI机器人未配置');

    bot.enabled = enabled;
    await bot.save();

    logger.info('[toggleBot]', ctx.socket.user, enabled);

    return { enabled: bot.enabled };
}

/**
 * 测试LLM连接
 * @param ctx Context
 */
export async function testLLMConnection(ctx: Context<{
    llmUrl: string;
    apiKey: string;
    model: string;
}>) {
    assert(ctx.socket.isAdmin, '只有管理员可以测试LLM连接');

    const { llmUrl, apiKey, model } = ctx.data;

    try {
        const success = await llmService.testConnection({
            llmUrl,
            apiKey,
            model,
        });

        return { success, message: success ? '连接成功' : '连接失败' };
    } catch (error) {
        logger.error('[testLLMConnection]', error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * 发送消息给AI机器人（私聊）
 * @param ctx Context
 */
export async function sendMessageToBot(ctx: Context<{
    content: string;
}>) {
    const { content } = ctx.data;
    const userId = ctx.socket.user;

    assert(content, '消息内容不能为空');

    // 获取AI机器人
    const bot = await Bot.findOne({ type: 'ai', enabled: true });
    assert(bot, 'AI机器人未启用');

    // 获取或创建对话上下文
    let conversation = await Conversation.findOne({
        user: userId,
        bot: bot._id,
        group: undefined, // 私聊
    });

    if (!conversation) {
        conversation = await Conversation.create({
            user: userId,
            bot: bot._id,
            messages: [],
        });
    }

    // 添加用户消息到上下文
    conversation.messages.push({
        role: 'user',
        content,
        createTime: new Date(),
    });

    // 构建对话上下文
    const context = llmService.buildContext(
        bot.config.systemPrompt,
        conversation.messages.map(m => ({ role: m.role, content: m.content })),
        content,
        bot.config.maxHistory,
    );

    // 创建一个临时消息ID用于流式更新
    const tempMessageId = new Types.ObjectId().toString();
    let fullResponse = '';

    try {
        // 调用LLM（流式）
        fullResponse = await llmService.chat(
            context,
            {
                llmUrl: bot.config.llmUrl,
                apiKey: bot.config.apiKey,
                model: bot.config.model,
                temperature: bot.config.temperature,
                maxTokens: bot.config.maxTokens,
                stream: true,
            },
            (chunk: string) => {
                // 发送流式响应块
                ctx.socket.emit(userId, 'botMessageStream', {
                    tempMessageId,
                    chunk,
                    botId: bot._id,
                });
            },
        );

        // 添加助手回复到上下文
        conversation.messages.push({
            role: 'assistant',
            content: fullResponse,
            createTime: new Date(),
        });

        // 只保留最近的N轮对话
        const maxMessages = bot.config.maxHistory * 2; // user + assistant 成对
        if (conversation.messages.length > maxMessages) {
            conversation.messages = conversation.messages.slice(-maxMessages);
        }

        conversation.lastActiveTime = new Date();
        await conversation.save();

        // 保存消息到数据库
        const message = await Message.create({
            from: bot._id,
            to: userId,
            type: 'text',
            content: fullResponse,
        });

        // 发送完成事件
        ctx.socket.emit(userId, 'botMessageComplete', {
            tempMessageId,
            message: {
                _id: message._id,
                from: {
                    _id: bot._id,
                    username: bot.name,
                    avatar: bot.avatar,
                    tag: 'bot',
                },
                to: userId,
                type: 'text',
                content: fullResponse,
                createTime: message.createTime,
            },
        });

        logger.info('[sendMessageToBot]', userId, bot._id, content.substring(0, 50));

        return { messageId: message._id };
    } catch (error) {
        logger.error('[sendMessageToBot]', error);
        
        // 发送错误事件
        ctx.socket.emit(userId, 'botMessageError', {
            tempMessageId,
            error: (error as Error).message,
        });

        throw new AssertionError({ message: `AI回复失败: ${(error as Error).message}` });
    }
}

/**
 * 群聊@AI机器人
 * @param ctx Context
 */
export async function mentionBotInGroup(ctx: Context<{
    groupId: string;
    content: string;
}>) {
    const { groupId, content } = ctx.data;
    const userId = ctx.socket.user;

    assert(isValid(groupId), '无效的群组ID');
    assert(content, '消息内容不能为空');

    // 验证群组和成员
    const group = await Group.findOne({ _id: groupId });
    assert(group, '群组不存在');

    const isMember = group.members.some(m => m.toString() === userId.toString());
    assert(isMember, '你不是该群组成员');

    // 获取AI机器人
    const bot = await Bot.findOne({ type: 'ai', enabled: true });
    assert(bot, 'AI机器人未启用');

    // 解析@机器人的消息内容
    const mentionRegex = new RegExp(`@${bot.name}\\s+(.+)`, 's');
    const match = content.match(mentionRegex);
    
    if (!match) {
        throw new AssertionError({ message: '消息格式错误，请使用 @机器人名 消息内容' });
    }

    const userMessage = match[1].trim();

    // 获取或创建群聊对话上下文
    let conversation = await Conversation.findOne({
        user: userId,
        bot: bot._id,
        group: groupId,
    });

    if (!conversation) {
        conversation = await Conversation.create({
            user: userId,
            bot: bot._id,
            group: groupId,
            messages: [],
        });
    }

    // 添加用户消息
    conversation.messages.push({
        role: 'user',
        content: userMessage,
        createTime: new Date(),
    });

    // 构建对话上下文
    const context = llmService.buildContext(
        bot.config.systemPrompt,
        conversation.messages.map(m => ({ role: m.role, content: m.content })),
        userMessage,
        bot.config.maxHistory,
    );

    const tempMessageId = new Types.ObjectId().toString();
    let fullResponse = '';

    try {
        // 调用LLM
        fullResponse = await llmService.chat(
            context,
            {
                llmUrl: bot.config.llmUrl,
                apiKey: bot.config.apiKey,
                model: bot.config.model,
                temperature: bot.config.temperature,
                maxTokens: bot.config.maxTokens,
                stream: true,
            },
            (chunk: string) => {
                // 向群组所有成员发送流式响应
                ctx.socket.emit(groupId, 'botMessageStream', {
                    tempMessageId,
                    chunk,
                    botId: bot._id,
                    groupId,
                });
            },
        );

        // 添加助手回复
        conversation.messages.push({
            role: 'assistant',
            content: fullResponse,
            createTime: new Date(),
        });

        // 限制历史长度
        const maxMessages = bot.config.maxHistory * 2;
        if (conversation.messages.length > maxMessages) {
            conversation.messages = conversation.messages.slice(-maxMessages);
        }

        conversation.lastActiveTime = new Date();
        await conversation.save();

        // 获取用户信息
        const user = await User.findById(userId);

        // 保存群消息
        const message = await Message.create({
            from: bot._id,
            to: groupId,
            type: 'text',
            content: `@${user?.username || 'user'} ${fullResponse}`,
        });

        // 发送完成事件
        ctx.socket.emit(groupId, 'botMessageComplete', {
            tempMessageId,
            message: {
                _id: message._id,
                from: {
                    _id: bot._id,
                    username: bot.name,
                    avatar: bot.avatar,
                    tag: 'bot',
                },
                to: groupId,
                type: 'text',
                content: message.content,
                createTime: message.createTime,
            },
        });

        logger.info('[mentionBotInGroup]', userId, groupId, bot._id);

        return { messageId: message._id };
    } catch (error) {
        logger.error('[mentionBotInGroup]', error);

        ctx.socket.emit(groupId, 'botMessageError', {
            tempMessageId,
            error: (error as Error).message,
        });

        throw new AssertionError({ message: `AI回复失败: ${(error as Error).message}` });
    }
}

/**
 * 清除对话上下文
 * @param ctx Context
 */
export async function clearConversation(ctx: Context<{
    groupId?: string;
}>) {
    const { groupId } = ctx.data;
    const userId = ctx.socket.user;

    const bot = await Bot.findOne({ type: 'ai' });
    assert(bot, 'AI机器人不存在');

    const conversation = await Conversation.findOne({
        user: userId,
        bot: bot._id,
        group: groupId || undefined,
    });

    if (conversation) {
        conversation.messages = [];
        conversation.lastActiveTime = new Date();
        await conversation.save();
    }

    logger.info('[clearConversation]', userId, groupId);

    return { success: true };
}