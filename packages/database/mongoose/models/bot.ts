import { Schema, model, Document } from 'mongoose';

const BotSchema = new Schema({
    createTime: { type: Date, default: Date.now },
    
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    avatar: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        enum: ['ai'],
        default: 'ai',
    },
    enabled: {
        type: Boolean,
        default: false,
    },
    config: {
        llmUrl: {
            type: String,
            default: '',
        },
        apiKey: {
            type: String,
            default: '',
        },
        model: {
            type: String,
            default: 'gpt-3.5-turbo',
        },
        systemPrompt: {
            type: String,
            default: '你是一个友好的AI助手，请用简洁、准确的语言回答用户的问题。',
        },
        temperature: {
            type: Number,
            default: 0.7,
            min: 0,
            max: 2,
        },
        maxTokens: {
            type: Number,
            default: 2000,
        },
        maxHistory: {
            type: Number,
            default: 10, // 保留最近10轮对话
        },
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});

export interface BotDocument extends Document {
    /** 创建时间 */
    createTime: Date;
    /** 机器人名称 */
    name: string;
    /** 机器人头像 */
    avatar: string;
    /** 机器人类型 */
    type: 'ai';
    /** 是否启用 */
    enabled: boolean;
    /** LLM配置 */
    config: {
        llmUrl: string;
        apiKey: string;
        model: string;
        systemPrompt: string;
        temperature: number;
        maxTokens: number;
        maxHistory: number;
    };
    /** 创建者 */
    creator: string;
}

/**
 * Bot Model
 * AI机器人
 */
const Bot = model<BotDocument>('Bot', BotSchema);

export default Bot;