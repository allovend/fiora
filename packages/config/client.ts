import { MB } from '../utils/const';

export default {
    server:
        process.env.Server ||
        (process.env.NODE_ENV === 'development' ? '//localhost:9200' : '/'),

    maxImageSize: process.env.MaxImageSize
        ? parseInt(process.env.MaxImageSize, 10)
        : MB * 10, // 10MB（原 5MB）
    maxBackgroundImageSize: process.env.MaxBackgroundImageSize
        ? parseInt(process.env.MaxBackgroundImageSize, 10)
        : MB * 10, // 10MB（原 5MB）
    maxAvatarSize: process.env.MaxAvatarSize
        ? parseInt(process.env.MaxAvatarSize, 10)
        : MB * 3, // 3MB（原 1.5MB）
    maxFileSize: process.env.MaxFileSize
        ? parseInt(process.env.MaxFileSize, 10)
        : MB * 20, // 20MB（原 10MB）

    // client default system setting
    defaultTheme: process.env.DefaultTheme || 'cool',
    sound: process.env.Sound || 'default',
    tagColorMode: process.env.TagColorMode || 'fixedColor',

    /**
     * 前端监控: https://yueying.effirst.com/index
     * 值为监控应用id, 为空则不启用监控
     */
    frontendMonitorAppId: process.env.FrontendMonitorAppId || '',

    // 禁止用户撤回消息, 不包括管理员, 管理员始终能撤回任何消息
    // 默认是禁止的
    disableDeleteMessage: process.env.DisableDeleteMessage
        ? process.env.DisableDeleteMessage === 'true'
        : false,

    /**
     * APK 下载链接
     * 如果设置了此值，将使用此链接作为 Android APK 下载地址
     * 如果不设置，将使用 window.location.origin + '/fiora.apk'
     * 建议设置为公网域名，确保手机扫码后可以正常下载
     * 例如: 'https://fiora.nasforjonas.xyz/fiora.apk'
     */
    androidDownloadUrl: process.env.AndroidDownloadUrl || '',
};
