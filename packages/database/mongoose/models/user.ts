import { Schema, model, Document } from 'mongoose';
import { NAME_REGEXP } from '@fiora/utils/const';

const UserSchema = new Schema({
    createTime: { type: Date, default: Date.now },
    lastLoginTime: { type: Date, default: Date.now },

    username: {
        type: String,
        trim: true,
        unique: true,
        match: NAME_REGEXP,
        index: true,
    },

    /** 邮箱（可用于登录/验证码登录）。历史账号可能为空 */
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
        index: true,
        default: '',
    },
    salt: String,
    password: String,
    avatar: String,
    tag: {
        type: String,
        default: '',
        trim: true,
        match: NAME_REGEXP,
    },
    expressions: [
        {
            type: String,
        },
    ],
    lastLoginIp: String,
    authProvider: {
        type: String,
        default: 'local',
        immutable: true,
    },

    /** 2FA (TOTP) */
    totpEnabled: { type: Boolean, default: false },
    // 已启用密钥（加密存储）
    totpSecretEnc: { type: String, default: '', select: false },
    // 临时密钥（用于设置流程；加密存储）
    totpTempSecretEnc: { type: String, default: '', select: false },

});

export interface UserDocument extends Document {
    /** 用户名 */
    username: string;
    /** 邮箱 */
    email: string;
    /** 密码加密盐 */
    salt: string;
    /** 加密的密码 */
    password: string;
    /** 头像 */
    avatar: string;
    /** 用户标签 */
    tag: string;
    /** 表情收藏 */
    expressions: string[];
    /** 创建时间 */
    createTime: Date;
    /** 最后登录时间 */
    lastLoginTime: Date;
    /** 最后登录IP */
    lastLoginIp: string;
    /** 账号来源(local/ldap) */
    authProvider: string;

    /** 2FA */
    totpEnabled: boolean;
    totpSecretEnc: string;
    totpTempSecretEnc: string;
}

/**
 * User Model
 * 用户信息
 */
const User = model<UserDocument>('User', UserSchema);

export default User;
