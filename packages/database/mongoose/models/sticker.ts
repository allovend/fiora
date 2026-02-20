import { Schema, model, Document } from 'mongoose';

/**
 * Sticker（表情包）模型
 *
 * 说明：
 * - 该模型只保存“元数据”（url/mime/尺寸/大小等）
 * - 文件本体仍复用现有上传能力（/api/upload 或 OSS）
 * - isDeleted 采用软删除，便于未来做“延迟清理/回收站”策略
 */

const StickerSchema = new Schema(
    {
        /** 创建时间 */
        createTime: { type: Date, default: Date.now, index: true },
        /** 更新时间 */
        updateTime: { type: Date, default: Date.now },

        /** 归属用户 */
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
            required: true,
        },

        /** 文件 URL（本地：/Sticker/xxx 或 OSS：//endpoint/bucketKey） */
        url: { type: String, required: true, trim: true, index: true },

        /** MIME 类型：image/png,image/jpeg,image/webp,image/gif */
        mime: { type: String, required: true, trim: true },

        /** 宽/高（可选，客户端可传；若不传也不影响发送） */
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },

        /** 文件大小（字节，可选，但建议客户端传，便于配额限制） */
        size: { type: Number, default: 0 },

        /** 预留：用于去重（可选；如果客户端/服务端未来计算 sha256 可填） */
        sha256: { type: String, default: '', trim: true, index: true },

        /** 软删除标记 */
        isDeleted: { type: Boolean, default: false, index: true },
    },
    {
        // 关闭 mongoose 自动 timestamps，避免字段名与项目既有字段不一致
        timestamps: false,
    },
);

/**
 * 复合索引（非唯一）
 * - getUserStickers 常用查询条件：userId + isDeleted + createTime
 */
StickerSchema.index({ userId: 1, isDeleted: 1, createTime: -1 });

export interface StickerDocument extends Document {
    userId: string;
    url: string;
    mime: string;
    width: number;
    height: number;
    size: number;
    sha256: string;
    isDeleted: boolean;
    createTime: Date;
    updateTime: Date;
}

/**
 * Sticker Model
 * 表情包元数据
 */
const Sticker = model<StickerDocument>('Sticker', StickerSchema);

export default Sticker;


