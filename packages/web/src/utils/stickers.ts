/**
 * Web 端 Sticker（自定义表情包）本地兜底存储
 *
 * 设计目标：
 * - 在服务端尚未实现/不可用时，仍能使用本地表情包列表
 * - 服务端实现后，优先以服务端数据为准，本地仅做缓存与兜底
 *
 * 存储键：
 * - stickers:{userId}
 */

export interface StickerItem {
    /** 服务端生成的 id（本地兜底时可能为空） */
    _id?: string;
    /** 文件 URL（/Sticker/xxx 或 OSS URL） */
    url: string;
    /** MIME 类型 */
    mime: string;
    /** 图片宽度（可选） */
    width?: number;
    /** 图片高度（可选） */
    height?: number;
    /** 文件大小（字节，可选） */
    size?: number;
    /** 可选：用于去重 */
    sha256?: string;
    /** 创建时间（毫秒） */
    createTime?: number;
    /** 更新时间（毫秒） */
    updateTime?: number;
}

const AllowedMimes = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
]);

export function validateStickerMeta(sticker: StickerItem) {
    if (!sticker || typeof sticker !== 'object') {
        return false;
    }
    if (!sticker.url || typeof sticker.url !== 'string') {
        return false;
    }
    if (!sticker.mime || typeof sticker.mime !== 'string') {
        return false;
    }
    return AllowedMimes.has(sticker.mime.toLowerCase());
}

function storageKey(userId: string) {
    return `stickers:${userId}`;
}

export function loadLocalStickers(userId: string): StickerItem[] {
    try {
        const raw = window.localStorage.getItem(storageKey(userId));
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(validateStickerMeta);
    } catch (e) {
        return [];
    }
}

export function saveLocalStickers(userId: string, stickers: StickerItem[]) {
    try {
        const safe = (Array.isArray(stickers) ? stickers : [])
            .filter(validateStickerMeta)
            // 最多只保留 200 个，避免 localStorage 过大（服务端也默认 200）
            .slice(0, 200);
        window.localStorage.setItem(storageKey(userId), JSON.stringify(safe));
    } catch (e) {
        // localStorage 写入失败时忽略（例如隐私模式/空间不足）
    }
}


