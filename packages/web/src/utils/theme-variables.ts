/**
 * Fiora 主题变量定义
 * 
 * 这是"三层样式架构"的第二层：抽象语义变量层
 * 定义了完整的 CSS 变量体系，供主题和用户自定义使用
 * 
 * 变量命名规范：
 * - 全局原始值：--fiora-{color}-{shade} (如 --fiora-blue-500)
 * - 语义别名：--fiora-{semantic-name} (如 --fiora-color-primary)
 * - 组件变量：--fiora-{component}-{property} (如 --fiora-msg-bubble-self-bg)
 */

/**
 * 主题变量键名映射
 * 用于主题导出/导入和可视化编辑器
 */
export const ThemeVariables = {
    // ===== 全局原始值 (Global Primitives) =====
    
    // 颜色原始值
    blue500: '--fiora-blue-500',
    blue600: '--fiora-blue-600',
    purple500: '--fiora-purple-500',
    purple600: '--fiora-purple-600',
    green500: '--fiora-green-500',
    green600: '--fiora-green-600',
    gray50: '--fiora-gray-50',
    gray100: '--fiora-gray-100',
    gray200: '--fiora-gray-200',
    gray300: '--fiora-gray-300',
    gray400: '--fiora-gray-400',
    gray500: '--fiora-gray-500',
    gray600: '--fiora-gray-600',
    gray700: '--fiora-gray-700',
    gray800: '--fiora-gray-800',
    gray900: '--fiora-gray-900',
    
    // ===== 语义别名 (Semantic Tokens) =====
    
    // 主色调
    colorPrimary: '--fiora-color-primary',
    colorPrimaryHover: '--fiora-color-primary-hover',
    colorPrimaryActive: '--fiora-color-primary-active',
    colorSecondary: '--fiora-color-secondary',
    colorAccent: '--fiora-color-accent',
    
    // 背景色
    bgApp: '--fiora-bg-app',
    bgContainer: '--fiora-bg-container',
    bgSidebar: '--fiora-bg-sidebar',
    bgLinkmanList: '--fiora-bg-linkman-list',
    bgChat: '--fiora-bg-chat',
    bgChatInput: '--fiora-bg-chat-input',
    bgDialog: '--fiora-bg-dialog',
    bgDialogMask: '--fiora-bg-dialog-mask',
    
    // 文字颜色
    textPrimary: '--fiora-text-primary',
    textSecondary: '--fiora-text-secondary',
    textTertiary: '--fiora-text-tertiary',
    textInverse: '--fiora-text-inverse',
    
    // 边框颜色
    borderColor: '--fiora-border-color',
    borderColorLight: '--fiora-border-color-light',
    borderColorDark: '--fiora-border-color-dark',
    
    // ===== 组件特定变量 (Component Tokens) =====
    
    // 消息气泡
    msgBubbleSelfBg: '--fiora-msg-bubble-self-bg',
    msgBubbleSelfColor: '--fiora-msg-bubble-self-color',
    msgBubbleOtherBg: '--fiora-msg-bubble-other-bg',
    msgBubbleOtherColor: '--fiora-msg-bubble-other-color',
    msgBubbleRadius: '--fiora-msg-bubble-radius',
    msgBubbleShadow: '--fiora-msg-bubble-shadow',
    
    // 联系人列表
    linkmanItemBg: '--fiora-linkman-item-bg',
    linkmanItemBgHover: '--fiora-linkman-item-bg-hover',
    linkmanItemBgActive: '--fiora-linkman-item-bg-active',
    linkmanNameColor: '--fiora-linkman-name-color',
    linkmanPreviewColor: '--fiora-linkman-preview-color',
    linkmanTimeColor: '--fiora-linkman-time-color',
    
    // 侧边栏
    sidebarIconColor: '--fiora-sidebar-icon-color',
    sidebarIconColorHover: '--fiora-sidebar-icon-color-hover',
    sidebarIconColorActive: '--fiora-sidebar-icon-color-active',
    
    // 输入框
    inputBg: '--fiora-input-bg',
    inputColor: '--fiora-input-color',
    inputBorderColor: '--fiora-input-border-color',
    inputBorderRadius: '--fiora-input-border-radius',
    
    // 尺寸
    containerWidth: '--fiora-container-width',
    containerMaxWidth: '--fiora-container-max-width',
    containerHeight: '--fiora-container-height',
    sidebarWidth: '--fiora-sidebar-width',
    linkmanListWidth: '--fiora-linkman-list-width',
    avatarSize: '--fiora-avatar-size',
    
    // 圆角
    borderRadiusSm: '--fiora-border-radius-sm',
    borderRadiusMd: '--fiora-border-radius-md',
    borderRadiusLg: '--fiora-border-radius-lg',
    borderRadiusXl: '--fiora-border-radius-xl',
    
    // 间距
    spacingXs: '--fiora-spacing-xs',
    spacingSm: '--fiora-spacing-sm',
    spacingMd: '--fiora-spacing-md',
    spacingLg: '--fiora-spacing-lg',
    spacingXl: '--fiora-spacing-xl',
    
    // 动画
    transitionFast: '--fiora-transition-fast',
    transitionBase: '--fiora-transition-base',
    transitionSlow: '--fiora-transition-slow',
    easeInOut: '--fiora-ease-in-out',
    easeOut: '--fiora-ease-out',
    easeIn: '--fiora-ease-in',
    easeBounce: '--fiora-ease-bounce',
    
    // 阴影
    shadowSm: '--fiora-shadow-sm',
    shadowMd: '--fiora-shadow-md',
    shadowLg: '--fiora-shadow-lg',
    shadowXl: '--fiora-shadow-xl',
} as const;

/**
 * 获取所有变量名数组
 */
export function getAllThemeVariableNames(): string[] {
    return Object.values(ThemeVariables);
}

/**
 * 获取变量值（从 CSS 中读取）
 */
export function getThemeVariableValue(variableName: string): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(variableName).trim() || null;
}

/**
 * 设置变量值
 */
export function setThemeVariableValue(variableName: string, value: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    const root = document.documentElement;
    root.style.setProperty(variableName, value);
}

/**
 * 导出当前主题变量值
 */
export function exportThemeVariables(): Record<string, string> {
    const theme: Record<string, string> = {};
    getAllThemeVariableNames().forEach((varName) => {
        const value = getThemeVariableValue(varName);
        if (value) {
            theme[varName] = value;
        }
    });
    return theme;
}

/**
 * 导入主题变量值
 */
export function importThemeVariables(theme: Record<string, string>): void {
    Object.entries(theme).forEach(([varName, value]) => {
        setThemeVariableValue(varName, value);
    });
}

