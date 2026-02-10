import { Schema, model, Document } from 'mongoose';

const ConversationMessageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    createTime: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const ConversationSchema = new Schema({
    createTime: { type: Date, default: Date.now, index: true },
    lastActiveTime: { type: Date, default: Date.now, index: true },
    
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    bot: {
        type: Schema.Types.ObjectId,
        ref: 'Bot',
        required: true,
        index: true,
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        index: true,
    },
    messages: {
        type: [ConversationMessageSchema],
        default: [],
    },
});

// 复合索引：用户+机器人+群组的唯一会话
ConversationSchema.index({ user: 1, bot: 1, group: 1 }, { unique: true });

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createTime: Date;
}

export interface ConversationDocument extends Document {
    /** 创建时间 */
    createTime: Date;
    /** 最后活跃时间 */
    lastActiveTime: Date;
    /** 用户ID */
    user: string;
    /** 机器人ID */
    bot: string;
    /** 群组ID（可选，私聊时为空） */
    group?: string;
    /** 对话消息历史 */
    messages: ConversationMessage[];
}

/**
 * Conversation Model
 * AI对话上下文
 */
const Conversation = model<ConversationDocument>('Conversation', ConversationSchema);

export default Conversation;