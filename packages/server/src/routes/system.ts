import fs from 'fs';
import path from 'path';
import axios from 'axios';
import assert, { AssertionError } from 'assert';
import { promisify } from 'util';
import RegexEscape from 'regex-escape';
import OSS, { STS } from 'ali-oss';

import config from '@fiora/config/server';
import logger from '@fiora/utils/logger';
import User from '@fiora/database/mongoose/models/user';
import Group from '@fiora/database/mongoose/models/group';

import Socket from '@fiora/database/mongoose/models/socket';
import {
    getAllSealIp,
    getAllSealUser,
    getSealIpKey,
    getSealUserKey,
    DisableSendMessageKey,
    DisableNewUserSendMessageKey,
    DisableRegisterKey,
    DisableCreateGroupKey,
    DisableDeleteMessageKey,
    getBannedUsernameKey,
    getAllBannedUsernames,
    Redis,
} from '@fiora/database/redis/initRedis';

/** 百度语言合成token */
let baiduToken = '';
/** 最后一次获取token的时间 */
let lastBaiduTokenTime = Date.now();

/**
 * 搜索用户和群组
 * @param ctx Context
 */
export async function search(ctx: Context<{ keywords: string }>) {
    const keywords = ctx.data.keywords?.trim() || '';
    if (keywords === '') {
        return {
            users: [],
            groups: [],
        };
    }

    const escapedKeywords = RegexEscape(keywords);
    const users = await User.find(
        { username: { $regex: escapedKeywords } },
        { avatar: 1, username: 1 },
    );
    const groups = await Group.find(
        { name: { $regex: escapedKeywords } },
        { avatar: 1, name: 1, members: 1 },
    );

    return {
        users,
        groups: groups.map((group) => ({
            _id: group._id,
            avatar: group.avatar,
            name: group.name,
            members: group.members.length,
        })),
    };
}

/**
 * 调用单个表情包 API
 * @param apiUrl API 地址
 * @param apiId 开发者 ID
 * @param apiKey 开发者 KEY
 * @param keywords 关键词
 * @param limit 返回数量限制
 * @param apiType API 类型：'official' | 'sogou' | 'baidu'
 * @returns 表情包结果数组
 */
async function callExpressionApi(
    apiUrl: string,
    apiId: string,
    apiKey: string,
    keywords: string,
    limit: number,
    apiType: 'official' | 'sogou' | 'baidu' = 'official',
): Promise<Array<{ image: string; width: number; height: number }>> {
    try {
        let params: URLSearchParams;
        
        if (apiType === 'sogou') {
            // 搜狗版 API: https://www.apihz.cn/api/apihzbqbsougou.html
            // 参数：id, key, words, page
            params = new URLSearchParams({
                id: apiId,
                key: apiKey,
                words: keywords,
                page: '1',
            });
        } else if (apiType === 'baidu') {
            // 百度版 API: https://www.apihz.cn/api/apihzbqbbaidu.html
            // 参数：id, key, words, page, limit
            params = new URLSearchParams({
                id: apiId,
                key: apiKey,
                words: keywords,
                page: '1',
                limit: limit.toString(),
            });
        } else {
            // 官方资源库版 API: https://www.apihz.cn/api/apihzbqb.html
            // 参数：id, key, type, words, page, limit
            params = new URLSearchParams({
                id: apiId,
                key: apiKey,
                type: '2', // 2=指定关键词搜索
                words: keywords,
                page: '1',
                limit: limit.toString(),
            });
        }

        const res = await axios({
            method: 'get',
            url: `${apiUrl}?${params.toString()}`,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000, // 10秒超时
            validateStatus: (status) => status < 500, // 允许 4xx 状态码
        });

        if (res.status !== 200) {
            const apiName = apiType === 'sogou' ? '搜狗版' : apiType === 'baidu' ? '百度版' : '官方版';
            logger.warn(`[searchExpression] ${apiName} HTTP status:`, res.status);
            return [];
        }

        const data = res.data;
        if (data.code !== 200) {
            const apiName = apiType === 'sogou' ? '搜狗版' : apiType === 'baidu' ? '百度版' : '官方版';
            logger.warn(`[searchExpression] ${apiName} API error:`, data.msg || '未知错误');
            return [];
        }

        // 返回格式转换：API盒子返回的是图片URL数组
        const images = (data.res || []).map((imageUrl: string) => ({
            image: imageUrl,
            width: 200, // 默认宽度，实际使用时浏览器会自动获取
            height: 200, // 默认高度，实际使用时浏览器会自动获取
        }));

        return images;
    } catch (err: any) {
        const apiName = apiType === 'sogou' ? '搜狗版' : apiType === 'baidu' ? '百度版' : '官方版';
        logger.error(`[searchExpression] ${apiName} axios error:`, err.message);
        return []; // 单个 API 失败不影响整体，返回空数组
    }
}

/**
 * 搜索表情包, 聚合搜索 API盒子官方资源库和搜狗版
 * 官方资源库 API文档: https://www.apihz.cn/api/apihzbqb.html
 * 搜狗版 API文档: https://www.apihz.cn/api/apihzbqbsougou.html
 * @param ctx Context
 */
export async function searchExpression(
    ctx: Context<{ keywords: string; limit?: number }>,
) {
    const { keywords, limit = 10 } = ctx.data;
    
    // 如果没有关键词，返回空数组
    if (!keywords || keywords.trim() === '') {
        return [];
    }

    // API盒子接口配置
    // 已配置默认的开发者 ID 和 KEY，如需修改可在 .env 文件中设置：
    // EXPRESSION_API_ID=你的开发者ID
    // EXPRESSION_API_KEY=你的开发者KEY
    // EXPRESSION_API_URL=https://cn.apihz.cn/api/img/apihzbqb.php (可选)
    // EXPRESSION_API_URL_SOGOU=https://cn.apihz.cn/api/img/apihzbqbsougou.php (可选)
    // EXPRESSION_API_URL_BAIDU=https://cn.apihz.cn/api/img/apihzbqbbaidu.php (可选)
    // EXPRESSION_API_AGGREGATE=false (可选，设置为 false 禁用聚合搜索，仅使用官方资源库)
    const apiId = config.expressionApi?.id || '10011686';
    const apiKey = config.expressionApi?.key || 'aeeb32f7f4f6c597f5366c5e94bde460';
    const apiUrl = config.expressionApi?.url || 'https://cn.apihz.cn/api/img/apihzbqb.php';
    const apiUrlSogou = config.expressionApi?.urlSogou || 'https://cn.apihz.cn/api/img/apihzbqbsougou.php';
    const apiUrlBaidu = config.expressionApi?.urlBaidu || 'https://cn.apihz.cn/api/img/apihzbqbbaidu.php';
    const enableAggregate = config.expressionApi?.enableAggregate !== false; // 默认启用聚合搜索
    
    // 限制关键词长度
    // 官方资源库版：不超过10个汉字
    // 搜狗版：不超过100个汉字
    // 百度版：不超过100个汉字
    const trimmedKeywords = keywords.trim();
    const officialKeywords = trimmedKeywords.substring(0, 10);
    const sogouKeywords = trimmedKeywords.substring(0, 100);
    const baiduKeywords = trimmedKeywords.substring(0, 100);
    
    // 限制返回数量
    // - 客户端默认请求 15 个（已增加）
    // - 每个 API 最多返回 requestLimit 个
    // - 聚合后去重，最终返回不超过 requestLimit 个
    // - 最大限制为 30 个（已增加，原来 20 个）
    // - 搜狗版和百度版没有 limit 参数或 limit 较大，返回数量由 API 决定
    const requestLimit = Math.min(limit || 15, 30);

    try {
        // 并行调用三个 API（如果启用聚合搜索）
        const promises: Promise<Array<{ image: string; width: number; height: number }>>[] = [
            callExpressionApi(apiUrl, apiId, apiKey, officialKeywords, requestLimit, 'official'),
        ];

        if (enableAggregate) {
            promises.push(
                callExpressionApi(apiUrlSogou, apiId, apiKey, sogouKeywords, requestLimit, 'sogou'),
                callExpressionApi(apiUrlBaidu, apiId, apiKey, baiduKeywords, requestLimit, 'baidu'),
            );
        }

        // 等待所有 API 调用完成
        const results = await Promise.all(promises);
        
        // 合并结果并去重（基于图片 URL）
        // 排序策略：官方资源库、搜狗版、百度版三个 API 均分显示，交替显示
        const imageUrlSet = new Set<string>();
        const mergedImages: Array<{ image: string; width: number; height: number; source?: string }> = [];
        
        const officialResults = results[0] || [];
        const sogouResults = enableAggregate && results[1] ? results[1] : [];
        const baiduResults = enableAggregate && results[2] ? results[2] : [];
        
        // 计算每个 API 应该返回的数量（三个 API 均分）
        const apiCount = enableAggregate ? 3 : 1;
        const perApiLimit = Math.ceil(requestLimit / apiCount);
        const officialLimit = Math.min(perApiLimit, officialResults.length);
        const sogouLimit = Math.min(perApiLimit, sogouResults.length);
        const baiduLimit = Math.min(perApiLimit, baiduResults.length);
        
        // 交替添加结果：官方 → 搜狗 → 百度 → 官方 → 搜狗 → 百度 ...
        let officialIndex = 0;
        let sogouIndex = 0;
        let baiduIndex = 0;
        let officialCount = 0;
        let sogouCount = 0;
        let baiduCount = 0;
        
        while (mergedImages.length < requestLimit) {
            let added = false;
            
            // 按顺序添加：官方 → 搜狗 → 百度
            if (officialCount < officialLimit && officialIndex < officialResults.length) {
                const item = officialResults[officialIndex];
                officialIndex++;
                if (!imageUrlSet.has(item.image)) {
                    imageUrlSet.add(item.image);
                    mergedImages.push({ ...item, source: 'official' });
                    officialCount++;
                    added = true;
                }
            }
            
            if (!added && enableAggregate && sogouCount < sogouLimit && sogouIndex < sogouResults.length) {
                const item = sogouResults[sogouIndex];
                sogouIndex++;
                if (!imageUrlSet.has(item.image)) {
                    imageUrlSet.add(item.image);
                    mergedImages.push({ ...item, source: 'sogou' });
                    sogouCount++;
                    added = true;
                }
            }
            
            if (!added && enableAggregate && baiduCount < baiduLimit && baiduIndex < baiduResults.length) {
                const item = baiduResults[baiduIndex];
                baiduIndex++;
                if (!imageUrlSet.has(item.image)) {
                    imageUrlSet.add(item.image);
                    mergedImages.push({ ...item, source: 'baidu' });
                    baiduCount++;
                    added = true;
                }
            }
            
            // 如果三个 API 都没有更多结果，跳出循环
            if (!added) {
                break;
            }
        }
        
        // 如果还有空间，继续填充剩余的结果（按优先级：官方 > 搜狗 > 百度）
        while (mergedImages.length < requestLimit && officialCount < officialLimit && officialIndex < officialResults.length) {
            const item = officialResults[officialIndex];
            officialIndex++;
            if (!imageUrlSet.has(item.image)) {
                imageUrlSet.add(item.image);
                mergedImages.push({ ...item, source: 'official' });
                officialCount++;
            }
        }
        
        if (enableAggregate) {
            while (mergedImages.length < requestLimit && sogouCount < sogouLimit && sogouIndex < sogouResults.length) {
                const item = sogouResults[sogouIndex];
                sogouIndex++;
                if (!imageUrlSet.has(item.image)) {
                    imageUrlSet.add(item.image);
                    mergedImages.push({ ...item, source: 'sogou' });
                    sogouCount++;
                }
            }
            
            while (mergedImages.length < requestLimit && baiduCount < baiduLimit && baiduIndex < baiduResults.length) {
                const item = baiduResults[baiduIndex];
                baiduIndex++;
                if (!imageUrlSet.has(item.image)) {
                    imageUrlSet.add(item.image);
                    mergedImages.push({ ...item, source: 'baidu' });
                    baiduCount++;
                }
            }
        }

        // 移除 source 字段（前端不需要）
        const finalImages = mergedImages.map(({ source, ...item }) => item);

        logger.info(`[searchExpression] 聚合搜索完成，关键词: "${keywords}", 官方版: ${officialResults.length}个(使用${officialCount}个), 搜狗版: ${sogouResults.length}个(使用${sogouCount}个), 百度版: ${baiduResults.length}个(使用${baiduCount}个), 合并去重后: ${finalImages.length}个, 限制: ${requestLimit}个`);
        
        return finalImages;
    } catch (err: any) {
        logger.error('[searchExpression] 聚合搜索失败:', err.message);
        throw new AssertionError({ message: `搜索表情包失败: ${err.message || '网络错误'}` });
    }
}

/**
 * 获取百度语言合成token
 */
export async function getBaiduToken() {
    if (baiduToken && Date.now() < lastBaiduTokenTime) {
        return { token: baiduToken };
    }

    const res = await axios.get(
        'https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=pw152BzvaSZVwrUf3Z2OHXM6&client_secret=fa273cc704b080e85ad61719abbf7794',
    );
    assert(res.status === 200, '请求百度token失败');

    baiduToken = res.data.access_token;
    lastBaiduTokenTime =
        Date.now() + (res.data.expires_in - 60 * 60 * 24) * 1000;
    return { token: baiduToken };
}

/**
 * 封禁用户, 需要管理员权限
 * @param ctx Context
 */
export async function sealUser(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'username不能为空');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: '用户不存在' });
    }

    const userId = user._id.toString();
    const isSealUser = await Redis.has(getSealUserKey(userId));
    assert(!isSealUser, '用户已在封禁名单');

    await Redis.set(getSealUserKey(userId), userId, Redis.Minute * 10);

    return {
        msg: 'ok',
    };
}

/**
 * 解禁用户, 需要管理员权限
 * @param ctx Context
 */
export async function cancelSealUser(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'username不能为空');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: '用户不存在' });
    }

    const userId = user._id.toString();
    const key = getSealUserKey(userId);
    const isSealUser = await Redis.has(key);
    assert(isSealUser, '用户不在封禁名单');

    // 删除Redis key来解禁
    await Redis.del(key);

    return {
        msg: 'ok',
    };
}

/**
 * 获取封禁列表, 包含用户封禁和ip封禁, 需要管理员权限
 * @param ctx Context
 */
export async function getSealList(ctx: Context<any>) {
    const sealUserList = await getAllSealUser();
    const sealIpList = await getAllSealIp();
    const users = await User.find({ _id: { $in: sealUserList } });

    const result = {
        users: users.map((user) => user.username),
        ips: sealIpList,
    };
    return result;
}

const CantSealLocalIp = '不能封禁内网ip';
const CantSealSelf = '闲的没事封自己干啥';
const IpInSealList = 'ip已在封禁名单';

/**
 * 封禁 ip 地址, 需要管理员权限
 */
export async function sealIp(ctx: Context<{ ip: string }>) {
    const { ip } = ctx.data;
    assert(ip !== '::1' && ip !== '127.0.0.1', CantSealLocalIp);
    assert(ip !== ctx.socket.ip, CantSealSelf);

    const isSealIp = await Redis.has(getSealIpKey(ip));
    assert(!isSealIp, IpInSealList);

    await Redis.set(getSealIpKey(ip), ip, Redis.Hour * 6);

    return {
        msg: 'ok',
    };
}

/**
 * 解禁 ip 地址, 需要管理员权限
 */
export async function cancelSealIp(ctx: Context<{ ip: string }>) {
    const { ip } = ctx.data;
    assert(ip !== '', 'ip不能为空');

    const key = getSealIpKey(ip);
    const isSealIp = await Redis.has(key);
    assert(isSealIp, 'ip不在封禁名单');

    // 删除Redis key来解禁
    await Redis.del(key);

    return {
        msg: 'ok',
    };
}

/**
 * 封禁指定用户的所有在线 ip 地址, 需要管理员权限
 */
export async function sealUserOnlineIp(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;

    const user = await User.findOne({ _id: userId });
    assert(user, '用户不存在');
    const sockets = await Socket.find({ user: userId });
    const ipList = [
        ...sockets.map((socket) => socket.ip),
        user.lastLoginIp,
    ].filter(
        (ip) =>
            ip !== '' &&
            ip !== '::1' &&
            ip !== '127.0.0.1' &&
            ip !== ctx.socket.ip,
    );

    // 如果全部 ip 都已经封禁过了, 则直接提示
    const isSealIpList = await Promise.all(
        ipList.map((ip) => Redis.has(getSealIpKey(ip))),
    );
    assert(!isSealIpList.every((isSealIp) => isSealIp), IpInSealList);

    await Promise.all(
        ipList.map(async (ip) => {
            await Redis.set(getSealIpKey(ip), ip, Redis.Hour * 6);
        }),
    );

    return {
        msg: 'ok',
    };
}

type STSResult = {
    enable: boolean;
    AccessKeyId: string;
    AccessKeySecret: string;
    bucket: string;
    region: string;
    SecurityToken: string;
    endpoint: string;
};

// eslint-disable-next-line consistent-return
export async function getSTS(): Promise<STSResult> {
    if (!config.aliyunOSS.enable) {
        // @ts-ignore
        return {
            enable: false,
        };
    }

    const sts = new STS({
        accessKeyId: config.aliyunOSS.accessKeyId,
        accessKeySecret: config.aliyunOSS.accessKeySecret,
    });
    try {
        const result = await sts.assumeRole(
            config.aliyunOSS.roleArn,
            undefined,
            undefined,
            'fiora-uploader',
        );
        // @ts-ignore
        return {
            enable: true,
            region: config.aliyunOSS.region,
            bucket: config.aliyunOSS.bucket,
            endpoint: config.aliyunOSS.endpoint,
            ...result.credentials,
        };
    } catch (err) {
        const typedErr = err as Error;
        assert.fail(`获取 STS 失败 - ${typedErr.message}`);
    }
}

export async function uploadFile(
    ctx: Context<{ fileName: string; file: any; isBase64?: boolean }>,
) {
    try {
        if (config.aliyunOSS.enable) {
            const sts = await getSTS();
            const client = new OSS({
                accessKeyId: sts.AccessKeyId,
                accessKeySecret: sts.AccessKeySecret,
                bucket: sts.bucket,
                region: sts.region,
                stsToken: sts.SecurityToken,
            });
            const result = await client.put(
                ctx.data.fileName,
                ctx.data.isBase64
                    ? Buffer.from(ctx.data.file, 'base64')
                    : ctx.data.file,
            );
            if (result.res.status === 200) {
                return {
                    url: `//${config.aliyunOSS.endpoint}/${result.name}`,
                };
            }
            throw Error('上传阿里云OSS失败');
        }

        const [directory, fileName] = ctx.data.fileName.split('/');
        // 修复：__dirname 是 routes 目录，需要回到 server 目录再进入 public
        // __dirname = packages/server/src/routes
        // 需要: packages/server/public
        const filePath = path.resolve(__dirname, '../../public', directory);
        const isExists = await promisify(fs.exists)(filePath);
        if (!isExists) {
            // 确保目录存在，使用 recursive 选项创建多级目录
            await promisify(fs.mkdir)(filePath, { recursive: true });
        }
        // 处理文件数据：如果是 base64 字符串则转换，如果是数组（Uint8Array 转换后的）则转换为 Buffer，否则直接使用
        let fileData: Buffer;
        if (ctx.data.isBase64) {
            // base64 字符串
            fileData = Buffer.from(ctx.data.file, 'base64');
        } else if (Array.isArray(ctx.data.file)) {
            // 从客户端发送的数组（Uint8Array 转换后的普通数组）
            fileData = Buffer.from(ctx.data.file);
        } else if (Buffer.isBuffer(ctx.data.file)) {
            // 已经是 Buffer
            fileData = ctx.data.file;
        } else {
            // 其他情况，尝试转换为 Buffer
            fileData = Buffer.from(ctx.data.file);
        }
        await promisify(fs.writeFile)(
            path.resolve(filePath, fileName),
            fileData as any,
        );
        return {
            url: `/${ctx.data.fileName}`,
        };
    } catch (err) {
        const typedErr = err as Error;
        logger.error('[uploadFile]', typedErr.message);
        return `上传文件失败:${typedErr.message}`;
    }
}

export async function toggleSendMessage(ctx: Context<{ enable: boolean }>) {
    const { enable } = ctx.data;
    await Redis.set(DisableSendMessageKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

export async function toggleNewUserSendMessage(
    ctx: Context<{ enable: boolean }>,
) {
    const { enable } = ctx.data;
    await Redis.set(DisableNewUserSendMessageKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

/**
 * 获取系统配置, 需要管理员权限
 */
export async function getSystemConfig() {
    // 从Redis读取配置，如果不存在则从config读取默认值
    const disableSendMessage = (await Redis.get(DisableSendMessageKey)) === 'true';
    const disableNewUserSendMessage = (await Redis.get(DisableNewUserSendMessageKey)) === 'true';
    const disableRegisterRedis = await Redis.get(DisableRegisterKey);
    const disableCreateGroupRedis = await Redis.get(DisableCreateGroupKey);
    const disableDeleteMessage = (await Redis.get(DisableDeleteMessageKey)) === 'true';
    
    return {
        disableSendMessage,
        disableNewUserSendMessage,
        disableRegister:
            disableRegisterRedis !== null
                ? disableRegisterRedis === 'true'
                : config.disableRegister,
        disableCreateGroup:
            disableCreateGroupRedis !== null
                ? disableCreateGroupRedis === 'true'
                : config.disableCreateGroup,
        disableDeleteMessage,
    };
}

/**
 * 更新系统配置, 需要管理员权限
 * @param ctx Context
 */
export async function updateSystemConfig(ctx: Context<{
    disableSendMessage?: boolean;
    disableNewUserSendMessage?: boolean;
    disableRegister?: boolean;
    disableCreateGroup?: boolean;
    disableDeleteMessage?: boolean;
}>) {
    const { disableSendMessage, disableNewUserSendMessage, disableRegister, disableCreateGroup, disableDeleteMessage } = ctx.data;
    
    // 更新配置到Redis（直接存储传入的值，不需要取反）
    if (typeof disableSendMessage === 'boolean') {
        await Redis.set(DisableSendMessageKey, disableSendMessage.toString());
    }
    if (typeof disableNewUserSendMessage === 'boolean') {
        await Redis.set(DisableNewUserSendMessageKey, disableNewUserSendMessage.toString());
    }
    if (typeof disableRegister === 'boolean') {
        await Redis.set(DisableRegisterKey, disableRegister.toString());
    }
    if (typeof disableCreateGroup === 'boolean') {
        await Redis.set(DisableCreateGroupKey, disableCreateGroup.toString());
    }
    if (typeof disableDeleteMessage === 'boolean') {
        await Redis.set(DisableDeleteMessageKey, disableDeleteMessage.toString());
    }
    
    return {
        msg: 'ok',
    };
}

/**
 * 切换注册功能开关，需要管理员权限
 */
export async function toggleRegister(ctx: Context<{ enable: boolean }>) {
    const { enable } = ctx.data;
    await Redis.set(DisableRegisterKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

/**
 * 封禁用户名（禁止使用该用户名注册）, 需要管理员权限
 * @param ctx Context
 */
export async function banUsername(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', '用户名不能为空');
    
    const isBanned = await Redis.has(getBannedUsernameKey(username));
    assert(!isBanned, '该用户名已在封禁名单');
    
    // 永久封禁，不设置过期时间
    await Redis.set(getBannedUsernameKey(username), username, Infinity);
    
    return {
        msg: 'ok',
    };
}

/**
 * 切换创建群组功能开关，需要管理员权限
 */
export async function toggleCreateGroup(ctx: Context<{ enable: boolean }>) {
    const { enable } = ctx.data;
    await Redis.set(DisableCreateGroupKey, (!enable).toString());
    return {
        msg: 'ok',
    };
}

/**
 * 解禁用户名, 需要管理员权限
 * @param ctx Context
 */
export async function unbanUsername(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', '用户名不能为空');
    
    const key = getBannedUsernameKey(username);
    const isBanned = await Redis.has(key);
    assert(isBanned, '该用户名不在封禁名单');
    
    // 删除Redis key来解禁
    await Redis.del(key);
    
    return {
        msg: 'ok',
    };
}

/**
 * 获取封禁用户名列表, 需要管理员权限
 * @param ctx Context
 */
export async function getBannedUsernameList(ctx: Context<any>) {
    try {
        logger.info('[getBannedUsernameList]', '函数被调用 - 时间戳:', Date.now());
        const bannedUsernames = await getAllBannedUsernames();
        logger.info('[getBannedUsernameList]', '封禁用户名数量:', bannedUsernames.length);
        return {
            usernames: bannedUsernames,
        };
    } catch (err) {
        logger.error('[getBannedUsernameList]', '错误:', err);
        throw err;
    }
}

/**
 * 获取所有在线用户列表，需要管理员权限
 */
export async function getAllOnlineUsers() {
    // 获取所有有用户的 socket 连接
    const sockets = await Socket.find(
        {
            user: { $exists: true, $ne: null },
        },
        {
            user: 1,
            ip: 1,
            os: 1,
            browser: 1,
        },
    ).populate('user', { username: 1, avatar: 1, _id: 1 });

    // 去重，每个用户只保留一个记录
    const userMap = new Map();
    sockets.forEach((socket) => {
        if (socket.user && typeof socket.user === 'object') {
            const userId = socket.user._id.toString();
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    userId,
                    username: socket.user.username,
                    avatar: socket.user.avatar,
                    ip: socket.ip,
                    os: socket.os || '未知',
                    browser: socket.browser || '未知',
                });
            }
        }
    });

    return Array.from(userMap.values());
}
