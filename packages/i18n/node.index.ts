import osLocale from 'os-locale';

import * as zhCN from './zh-CN';
import * as enUS from './en-US';

const languages = {
    'zh-CN': zhCN,
    'en-US': enUS,
};

// 获取系统 locale 并规范化
function getNormalizedLocale(): 'zh-CN' | 'en-US' {
    const rawLocale = osLocale.sync() || 'en-US';
    // 将各种中文 locale 格式统一为 zh-CN
    if (rawLocale.toLowerCase().startsWith('zh')) {
        return 'zh-CN';
    }
    // 默认返回 en-US
    return 'en-US';
}

const locale = getNormalizedLocale();

export default function i18n(key: keyof typeof enUS | keyof typeof zhCN) {
    // @ts-ignore
    return languages[locale]?.[key] || enUS[key] || key;
}
