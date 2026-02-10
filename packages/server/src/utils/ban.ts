import config from '@fiora/config/server';
import { Redis } from '@fiora/database/redis/initRedis';
import {
    getLoginFailKey,
    getLoginBanKey,
    getLoginBanStageKey,
    getGroupJoinFailKey,
    getGroupJoinBanKey,
    getGroupJoinBanStageKey,
} from '@fiora/database/redis/initRedis';

/**
 * 封禁策略：
 * - 每次错误：failCount++
 * - 达到 errorCount：
 *   - stage=0 -> 封禁 firstBanHours 小时，stage=1
 *   - stage=1 -> 封禁 secondBanDays 天，stage=2
 * - errorCount/first/second 任意为 0 则对应能力禁用
 */
function getPolicy(type: 'login' | 'group') {
    const policyCfg = type === 'login' ? config.security.login : config.security.group;
    const { errorCount, firstBanHours, secondBanDays } = policyCfg;
    return {
        errorCount: Math.max(0, errorCount || 0),
        firstBanSeconds: Math.max(0, (firstBanHours || 0) * 60 * 60),
        secondBanSeconds: Math.max(0, (secondBanDays || 0) * 24 * 60 * 60),
    };
}

async function getStage(stageKey: string) {
    const v = await Redis.get(stageKey);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
}

async function setStage(stageKey: string, stage: number, expireSeconds: number) {
    if (expireSeconds > 0) {
        await Redis.set(stageKey, String(stage), expireSeconds);
    } else {
        await Redis.set(stageKey, String(stage));
    }
}

export async function checkBannedOrThrow(banKey: string, message: string) {
    const banned = await Redis.get(banKey);
    if (banned !== null) {
        throw new Error(message);
    }
}

export async function recordFailureAndMaybeBan(params: {
    failKey: string;
    banKey: string;
    stageKey: string;
    type: 'login' | 'group';
}) {
    const policy = getPolicy(params.type);
    if (policy.errorCount <= 0) {
        return;
    }

    const count = await Redis.incr(params.failKey);
    // 默认给 failKey 一个 24h 的 TTL，避免无限增长
    await Redis.expire(params.failKey, 24 * 60 * 60);

    if (count < policy.errorCount) {
        return;
    }

    // 达到阈值：清空计数并进入封禁
    await Redis.del(params.failKey);

    const stage = await getStage(params.stageKey);
    if (stage <= 0 && policy.firstBanSeconds > 0) {
        await Redis.set(params.banKey, '1', policy.firstBanSeconds);
        await setStage(params.stageKey, 1, Math.max(policy.secondBanSeconds, policy.firstBanSeconds));
        return;
    }

    if (stage >= 1 && policy.secondBanSeconds > 0) {
        await Redis.set(params.banKey, '1', policy.secondBanSeconds);
        await setStage(params.stageKey, 2, policy.secondBanSeconds);
    }
}

export async function clearBan(params: { banKey: string; failKey: string; stageKey: string }) {
    await Redis.del(params.banKey);
    await Redis.del(params.failKey);
    await Redis.del(params.stageKey);
}

// ---- 便捷封装 ----
export function loginKeys(username: string) {
    return {
        failKey: getLoginFailKey(username),
        banKey: getLoginBanKey(username),
        stageKey: getLoginBanStageKey(username),
    };
}

export function groupJoinKeys(userId: string, groupId: string) {
    return {
        failKey: getGroupJoinFailKey(userId, groupId),
        banKey: getGroupJoinBanKey(userId, groupId),
        stageKey: getGroupJoinBanStageKey(userId, groupId),
    };
}
