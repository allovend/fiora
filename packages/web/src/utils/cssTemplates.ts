/**
 * CSS 预设模板
 * 用户可以在设置中选择这些模板，快速应用预设样式
 * 
 * 架构原则：
 * 1. 优先使用CSS变量（ThemeVariables），而非直接覆盖样式
 * 2. 只在装饰性样式（动画、阴影等）使用!important
 * 3. 确保不阻碍自定义CSS（布局和配色可通过变量覆盖）
 * 4. 正确处理登录窗口（排除登录窗口的装饰性样式）
 */

import { ThemeVariables } from './theme-variables';

export interface CssTemplate {
    id: string;
    name: string;
    description: string;
    css: string;
}

export const cssTemplates: CssTemplate[] = [
    // 预设模板已清空，可以在这里添加新模板
];

/**
 * 根据 ID 获取模板
 */
export function getCssTemplateById(id: string): CssTemplate | undefined {
    return cssTemplates.find((template) => template.id === id);
}

/**
 * 获取所有模板
 */
export function getAllCssTemplates(): CssTemplate[] {
    return cssTemplates;
}
