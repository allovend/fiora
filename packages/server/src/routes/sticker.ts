import assert, { AssertionError } from 'assert';

import config from '@fiora/config/server';
import { Types } from '@fiora/database/mongoose';
import Sticker, { StickerDocument } from '@fiora/database/mongoose/models/sticker';
import logger from '@fiora/utils/logger';
import { Redis } from '@fiora/database/redis/initRedis';

const { isValid } = Types.ObjectId;

/**
 * StickerItem：对外返回的表情包结构（客户端渲染用）
 * 注意：这里不强依赖任何前端实现，保证字段稳定即可
 */
export interface StickerItem {
    _id: string;
    url: string;
    mime: string;
    width: number;
    height: number;
    size: number;
    sha256?: string;
    createTime: number;
    updateTime: number;
}

/**
 * 允许的 MIME 列表
 * - 静态图：png/jpg/jpeg/webp
 * - 动图：gif
 */
const AllowedMimes = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg', // 兼容：部分客户端可能会传 image/jpg
    'image/webp',
    'image/gif',
]);

/**
 * 简单的 URL 安全校验：
 * - 允许：/xxx（本地静态资源）、http(s)://xxx、//xxx（协议相对）
 * - 拒绝：javascript: 等危险 scheme
 *
 * 说明：
 * - 文件本体上传已经由 /api/upload 处理，此处只落库元数据
 * - 更严格的“magic header 检测”需要服务端直接拿到文件字节，当前接口为元数据落库，先做基础防护
 */
function assertSafeUrl(url: string) {
    assert(url && typeof url === 'string', 'url不能为空');
    assert(url.length <= 2048, 'url过长');

    const lower = url.toLowerCase().trim();
    assert(
        lower.startsWith('/') ||
            lower.startsWith('http://') ||
            lower.startsWith('https://') ||
            lower.startsWith('//'),
        'url格式不合法',
    );
    assert(!lower.startsWith('javascript:'), 'url不安全');
}

/**
 * 上传频率限制（按用户）
 * 默认：每分钟最多 10 次 addUserSticker
 */
async function assertUploadRateLimit(userId: string) {
    const maxPerMinute =
        config.stickers?.maxUploadPerMinute ??
        (process.env.STICKER_MAX_UPLOAD_PER_MINUTE
            ? parseInt(process.env.STICKER_MAX_UPLOAD_PER_MINUTE, 10)
            : 10);

    // 0 或负数表示不限制（便于调试/自建环境）
    if (maxPerMinute <= 0) {
        return;
    }

    // 使用“分钟桶”key：stickers:upload:{userId}:{YYYYMMDDHHmm}
    const now = new Date();
    const bucket =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
    const key = `stickers:upload:${userId}:${bucket}`;

    const current = await Redis.incr(key);
    // 只在第一次设置过期，避免每次重置 TTL
    if (current === 1) {
        await Redis.expire(key, 60);
    }
    assert(current <= maxPerMinute, '上传太频繁，请稍后再试');
}

/**
 * 读取用户表情包列表
 * socket event: getUserStickers
 */
export async function getUserStickers(ctx: Context<{}>) {
    const userId = ctx.socket.user;
    assert(userId, '请登录后再试');

    const limit =
        config.stickers?.maxStickersPerUser ??
        (process.env.STICKER_MAX_COUNT
            ? parseInt(process.env.STICKER_MAX_COUNT, 10)
            : 200);

    const stickers = await Sticker.find(
        { userId, isDeleted: false },
        {
            url: 1,
            mime: 1,
            width: 1,
            height: 1,
            size: 1,
            sha256: 1,
            createTime: 1,
            updateTime: 1,
        },
        { sort: { createTime: -1 }, limit },
    );

    return {
        stickers: stickers.map((s) => ({
            _id: s._id.toString(),
            url: s.url,
            mime: s.mime,
            width: s.width || 0,
            height: s.height || 0,
            size: s.size || 0,
            sha256: s.sha256 || '',
            createTime: s.createTime ? s.createTime.getTime() : Date.now(),
            updateTime: s.updateTime ? s.updateTime.getTime() : Date.now(),
        })),
    };
}

/**
 * 新增用户表情包（元数据落库）
 * socket event: addUserSticker
 */
export async function addUserSticker(
    ctx: Context<{
        url: string;
        mime: string;
        width?: number;
        height?: number;
        size?: number;
        sha256?: string;
    }>,
) {
    const userId = ctx.socket.user;
    assert(userId, '请登录后再试');

    const { url, mime } = ctx.data;
    const width = Number(ctx.data.width || 0);
    const height = Number(ctx.data.height || 0);
    const size = Number(ctx.data.size || 0);
    const sha256 = (ctx.data.sha256 || '').trim();

    assertSafeUrl(url);
    assert(mime && typeof mime === 'string', 'mime不能为空');
    assert(AllowedMimes.has(mime.toLowerCase()), '不支持的文件类型');

    // 基础尺寸校验（非强制）
    if (width || height) {
        assert(width >= 0 && width <= 4096, 'width不合法');
        assert(height >= 0 && height <= 4096, 'height不合法');
    }

    // 基础大小校验（建议客户端传；不传则只做数量限制）
    if (size) {
        assert(size > 0, 'size不合法');
        const maxStatic =
            config.stickers?.maxStaticSize ??
            (process.env.STICKER_MAX_STATIC_SIZE
                ? parseInt(process.env.STICKER_MAX_STATIC_SIZE, 10)
                : 2 * 1024 * 1024);
        const maxGif =
            config.stickers?.maxGifSize ??
            (process.env.STICKER_MAX_GIF_SIZE
                ? parseInt(process.env.STICKER_MAX_GIF_SIZE, 10)
                : 5 * 1024 * 1024);
        const maxSize = mime === 'image/gif' ? maxGif : maxStatic;
        assert(size <= maxSize, '文件过大');
    }

    await assertUploadRateLimit(userId);

    // 配额：单用户最大数量
    const maxCount =
        config.stickers?.maxStickersPerUser ??
        (process.env.STICKER_MAX_COUNT
            ? parseInt(process.env.STICKER_MAX_COUNT, 10)
            : 200);
    const count = await Sticker.count({ userId, isDeleted: false });
    assert(count < maxCount, `表情包数量已达上限（${maxCount}）`);

    // 配额：单用户总容量（可选，需要 size）
    const maxTotalSize =
        config.stickers?.maxTotalSizePerUser ??
        (process.env.STICKER_MAX_TOTAL_SIZE
            ? parseInt(process.env.STICKER_MAX_TOTAL_SIZE, 10)
            : 200 * 1024 * 1024);
    if (size && maxTotalSize > 0) {
        const agg = await Sticker.aggregate([
            { $match: { userId: new Types.ObjectId(userId), isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$size' } } },
        ]);
        const total = agg?.[0]?.total || 0;
        assert(total + size <= maxTotalSize, '表情包总容量已达上限');
    }

    // 去重策略（轻量版）：
    // - 优先按 sha256（如果客户端提供）
    // - 否则按 url（同一个 url 重复添加时直接返回已有记录）
    let existed: StickerDocument | null = null;
    if (sha256) {
        existed = await Sticker.findOne({
            userId,
            sha256,
            isDeleted: false,
        });
    }
    if (!existed) {
        existed = await Sticker.findOne({ userId, url, isDeleted: false });
    }
    if (existed) {
        return {
            sticker: {
                _id: existed._id.toString(),
                url: existed.url,
                mime: existed.mime,
                width: existed.width || 0,
                height: existed.height || 0,
                size: existed.size || 0,
                sha256: existed.sha256 || '',
                createTime: existed.createTime
                    ? existed.createTime.getTime()
                    : Date.now(),
                updateTime: existed.updateTime
                    ? existed.updateTime.getTime()
                    : Date.now(),
            },
        };
    }

    const now = new Date();
    const created = await Sticker.create({
        userId,
        url,
        mime: mime.toLowerCase(),
        width,
        height,
        size,
        sha256,
        isDeleted: false,
        createTime: now,
        updateTime: now,
    } as unknown as StickerDocument);

    logger.info(
        '[addUserSticker]',
        userId,
        created._id.toString(),
        created.mime,
        created.size,
    );

    return {
        sticker: {
            _id: created._id.toString(),
            url: created.url,
            mime: created.mime,
            width: created.width || 0,
            height: created.height || 0,
            size: created.size || 0,
            sha256: created.sha256 || '',
            createTime: created.createTime ? created.createTime.getTime() : Date.now(),
            updateTime: created.updateTime ? created.updateTime.getTime() : Date.now(),
        },
    };
}

/**
 * 删除用户表情包（软删除）
 * socket event: deleteUserSticker
 */
export async function deleteUserSticker(ctx: Context<{ stickerId: string }>) {
    const userId = ctx.socket.user;
    assert(userId, '请登录后再试');

    const { stickerId } = ctx.data;
    assert(isValid(stickerId), '无效的表情包ID');

    const sticker = await Sticker.findOne({ _id: stickerId, userId });
    if (!sticker || sticker.isDeleted) {
        throw new AssertionError({ message: '表情包不存在' });
    }

    sticker.isDeleted = true;
    sticker.updateTime = new Date();
    await sticker.save();

    logger.info('[deleteUserSticker]', userId, stickerId);

    return { success: true };
}


