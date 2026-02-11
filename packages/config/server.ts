import ip from 'ip';

const { env } = process;

function parseRedisUrl(redisUrl: string) {
    try {
        const url = new URL(redisUrl);
        const host = url.hostname;
        const port = url.port ? parseInt(url.port, 10) : 6379;
        const password = url.password ? decodeURIComponent(url.password) : undefined;

        // Railway / cloud providers often expose rediss:// for TLS
        const isTls = url.protocol === 'rediss:';
        const tls = isTls ? { servername: host } : undefined;

        return {
            host,
            port,
            password,
            tls,
        };
    } catch (e) {
        return null;
    }
}

const parsedRedisUrl =
    env.REDIS_URL || env.RedisUrl || env.REDIS_TLS_URL
        ? parseRedisUrl((env.REDIS_URL || env.RedisUrl || env.REDIS_TLS_URL) as string)
        : null;

export default {
    /** 服务端host, 默认为本机ip地址(可能会是局域网地址) */
    host: env.HOST || env.Host || ip.address(),

    // service port
    port: env.PORT ? parseInt(env.PORT, 10) : env.Port ? parseInt(env.Port, 10) : 9200,

    // mongodb address
    database:
        env.MONGODB_URI ||
        env.DATABASE_URL ||
        env.DATABASE ||
        env.Database ||
        'mongodb://localhost:27017/fiora',

    redis: {
        ...(parsedRedisUrl || {}),
        host:
            (parsedRedisUrl && parsedRedisUrl.host) ||
            env.REDIS_HOST ||
            env.RedisHost ||
            'localhost',
        port:
            (parsedRedisUrl && parsedRedisUrl.port) ||
            (env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : undefined) ||
            (env.RedisPort ? parseInt(env.RedisPort, 10) : undefined) ||
            6379,
        password:
            (parsedRedisUrl && parsedRedisUrl.password) ||
            env.REDIS_PASSWORD ||
            env.RedisPassword ||
            undefined,
    },

    // jwt encryption secret
    jwtSecret: env.JwtSecret || 'jwtSecret',

    // Maximize the number of groups
    maxGroupsCount: env.MaxGroupCount ? parseInt(env.MaxGroupCount, 10) : 3,

    allowOrigin: env.AllowOrigin ? env.AllowOrigin.split(',') : null,

    // token expires time
    tokenExpiresTime: env.TokenExpiresTime
        ? parseInt(env.TokenExpiresTime, 10)
        : 1000 * 60 * 60 * 24 * 30,

    // administrator user id
    administrator: env.Administrator ? env.Administrator.split(',') : [],

    /** 禁用注册功能 */
    disableRegister: env.DisableRegister
        ? env.DisableRegister === 'true'
        : false,

    /** disable user create new group */
    disableCreateGroup: env.DisableCreateGroup
        ? env.DisableCreateGroup === 'true'
        : false,

    /** 文件大小限制（字节） */
    maxFileSize: env.MaxFileSize
        ? parseInt(env.MaxFileSize, 10)
        : 20 * 1024 * 1024, // 20MB（原 10MB）

    /** Aliyun OSS */
    aliyunOSS: {
        enable: env.ALIYUN_OSS ? env.ALIYUN_OSS === 'true' : false,
        accessKeyId: env.ACCESS_KEY_ID || '',
        accessKeySecret: env.ACCESS_KEY_SECRET || '',
        roleArn: env.ROLE_ARN || '',
        region: env.REGION || '',
        bucket: env.BUCKET || '',
        endpoint: env.ENDPOINT || '',
    },

    /** 表情包 API 配置 (API盒子) */
    expressionApi: {
        /** API 接口地址 - 官方资源库版 */
        url: env.EXPRESSION_API_URL || 'https://cn.apihz.cn/api/img/apihzbqb.php',
        /** API 接口地址 - 搜狗版 */
        urlSogou: env.EXPRESSION_API_URL_SOGOU || 'https://cn.apihz.cn/api/img/apihzbqbsougou.php',
        /** API 接口地址 - 百度版 */
        urlBaidu: env.EXPRESSION_API_URL_BAIDU || 'https://cn.apihz.cn/api/img/apihzbqbbaidu.php',
        /** 开发者 ID (可在 .env 中配置 EXPRESSION_API_ID 覆盖) */
        id: env.EXPRESSION_API_ID || '10011686',
        /** 开发者 KEY (可在 .env 中配置 EXPRESSION_API_KEY 覆盖) */
        key: env.EXPRESSION_API_KEY || 'aeeb32f7f4f6c597f5366c5e94bde460',
        /** 是否启用聚合搜索（同时搜索官方资源库、搜狗版和百度版） */
        enableAggregate: env.EXPRESSION_API_AGGREGATE !== 'false', // 默认启用
    },

    /**
     * 自定义 Sticker（表情包）配置
     *
     * 说明：
     * - “文件本体”仍复用现有上传（/api/upload 或 OSS）
     * - 这里主要控制“表情包元数据”的落库接口限制（数量/大小/频率等）
     */
    stickers: {
        /** 单用户最多表情包数量（默认 200） */
        maxStickersPerUser: env.STICKER_MAX_COUNT
            ? parseInt(env.STICKER_MAX_COUNT, 10)
            : 200,
        /** 单用户表情包总容量上限（字节，默认 200MB；<=0 表示不限制） */
        maxTotalSizePerUser: env.STICKER_MAX_TOTAL_SIZE
            ? parseInt(env.STICKER_MAX_TOTAL_SIZE, 10)
            : 200 * 1024 * 1024,
        /** 单张静态图最大大小（字节，默认 18MB） */
        maxStaticSize: env.STICKER_MAX_STATIC_SIZE
            ? parseInt(env.STICKER_MAX_STATIC_SIZE, 10)
            : 18 * 1024 * 1024,
        /** 单张 GIF 最大大小（字节，默认 20MB） */
        maxGifSize: env.STICKER_MAX_GIF_SIZE
            ? parseInt(env.STICKER_MAX_GIF_SIZE, 10)
            : 20 * 1024 * 1024,
        /** 每分钟最多新增次数（默认 10；<=0 表示不限制） */
        maxUploadPerMinute: env.STICKER_MAX_UPLOAD_PER_MINUTE
            ? parseInt(env.STICKER_MAX_UPLOAD_PER_MINUTE, 10)
            : 10,
    },

    /** LDAP 认证配置 */
    ldap: {
        enable: env.LDAP_ENABLE ? env.LDAP_ENABLE === "true" : false,
        url: env.LDAP_URL || "",
        bindDN: env.LDAP_BIND_DN || "",
        bindCredentials: env.LDAP_BIND_CREDENTIALS || "",
        searchBase: env.LDAP_SEARCH_BASE || "",
        searchFilter: env.LDAP_SEARCH_FILTER || "(uid={{username}})",
        tlsOptions: env.LDAP_TLS_OPTIONS ? JSON.parse(env.LDAP_TLS_OPTIONS) : undefined,
    },
};
