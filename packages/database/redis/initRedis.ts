import redis from 'redis';
import { promisify } from 'util';
import config from '@fiora/config/server';
import logger from '@fiora/utils/logger';

export default function initRedis() {
    const client = redis.createClient({
        ...config.redis,
    });

    client.on('error', (err) => {
        logger.error('[redis]', err.message);
        process.exit(0);
    });

    return client;
}

const client = initRedis();

export const get = promisify(client.get).bind(client);

export const expire = promisify(client.expire).bind(client);

export const del = promisify(client.del.bind(client)) as (key: string) => Promise<number>;

/**
 * 自增计数
 *
 * 说明：
 * - 一些业务（例如 Sticker 上传频率限制）需要原子自增
 * - 之前 Redis 封装未暴露 incr，导致运行时报错：`Redis.incr is not a function`
 */
export const incr = promisify(client.incr).bind(client) as (key: string) => Promise<number>;

export async function set(key: string, value: string, expireTime = Infinity) {
    await promisify(client.set).bind(client)(key, value);
    if (expireTime !== Infinity) {
        await expire(key, expireTime);
    }
}

export const keys = promisify(client.keys).bind(client);

export async function has(key: string) {
    const v = await get(key);
    return v !== null;
}

export function getNewUserKey(userId: string) {
    return `NewUser-${userId}`;
}

export function getNewRegisteredUserIpKey(ip: string) {
    // The value of v1 is ip
    // The value of v2 is count number
    return `NewRegisteredUserIpV2-${ip}`;
}

export function getSealIpKey(ip: string) {
    return `SealIp-${ip}`;
}

export async function getAllSealIp() {
    const allSealIpKeys = await keys('SealIp-*');
    return allSealIpKeys.map((key) => key.replace('SealIp-', ''));
}

export function getSealUserKey(user: string) {
    return `SealUser-${user}`;
}

export async function getAllSealUser() {
    const allSealUserKeys = await keys('SealUser-*');
    return allSealUserKeys.map((key) => key.split('-')[1]);
}

const Minute = 60;
const Hour = Minute * 60;
const Day = Hour * 24;

export const Redis = {
    get,
    set,
    has,
    expire,
    incr,
    keys,
    del,
    Minute,
    Hour,
    Day,
};

export const DisableSendMessageKey = 'DisableSendMessage';
export const DisableNewUserSendMessageKey = 'DisableNewUserSendMessageKey';
export const DisableRegisterKey = 'DisableRegister';
export const DisableCreateGroupKey = 'DisableCreateGroup';
export const DisableDeleteMessageKey = 'DisableDeleteMessage';

// 封禁用户名列表的Redis key前缀
export function getBannedUsernameKey(username: string) {
    return `BannedUsername-${username}`;
}

// 获取所有封禁的用户名
export async function getAllBannedUsernames() {
    const allBannedUsernameKeys = await keys('BannedUsername-*');
    return allBannedUsernameKeys.map((key) => key.replace('BannedUsername-', ''));
}
