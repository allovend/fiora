/**
 * Fiora 默认主题（第三层：艺术品表现层）
 * 
 * 这是"三层样式架构"的第三层：通过调用第二层的变量，编写出的"默认主题"
 * 
 * 原则：
 * - 只给变量赋值
 * - 提供有层次感的默认样式（阴影、圆角、边框、间距等）
 * - 不使用 !important（确保自定义CSS可以轻松覆盖）
 * - 使用过渡效果提升交互体验（可被自定义CSS覆盖）
 * - 全面为自定义CSS让路
 */

import { ThemeVariables } from './theme-variables';

/**
 * 默认主题 CSS
 * 有层次感的设计，提供阴影、圆角、边框等视觉元素，确保自定义CSS可以轻松覆盖
 */
export const defaultTheme = `
/* ============================================
   Fiora 默认主题 (Default Theme)
   有层次感的设计 - 提供视觉层次，全面为自定义CSS让路
   ============================================ */

:root {
    /* ===== 全局原始值 (Global Primitives) ===== */
    --fiora-blue-500: #007bff;
    --fiora-blue-600: #0056b3;
    --fiora-purple-500: #7c3aed;
    --fiora-purple-600: #6d28d9;
    --fiora-green-500: #23a55a;
    --fiora-green-600: #1f9250;
    --fiora-gray-50: #f8f9fa;
    --fiora-gray-100: #e9ecef;
    --fiora-gray-200: #dee2e6;
    --fiora-gray-300: #ced4da;
    --fiora-gray-400: #adb5bd;
    --fiora-gray-500: #6c757d;
    --fiora-gray-600: #495057;
    --fiora-gray-700: #343a40;
    --fiora-gray-800: #212529;
    --fiora-gray-900: #0a0a0a;
    
    /* ===== 语义别名 (Semantic Tokens) ===== */
    
    /* 主色调 */
    ${ThemeVariables.colorPrimary}: var(--fiora-purple-500);
    ${ThemeVariables.colorPrimaryHover}: var(--fiora-purple-600);
    ${ThemeVariables.colorPrimaryActive}: var(--fiora-purple-600);
    ${ThemeVariables.colorSecondary}: var(--fiora-blue-500);
    ${ThemeVariables.colorAccent}: var(--fiora-green-500);
    
    /* 背景色 */
    ${ThemeVariables.bgApp}: var(--fiora-gray-50);
    ${ThemeVariables.bgContainer}: #ffffff;
    ${ThemeVariables.bgSidebar}: #ffffff;
    ${ThemeVariables.bgLinkmanList}: #ffffff;
    ${ThemeVariables.bgChat}: var(--fiora-gray-50);
    ${ThemeVariables.bgChatInput}: #ffffff;
    ${ThemeVariables.bgDialog}: #ffffff;
    ${ThemeVariables.bgDialogMask}: rgba(0, 0, 0, 0.5);
    
    /* 文字颜色 */
    ${ThemeVariables.textPrimary}: var(--fiora-gray-900);
    ${ThemeVariables.textSecondary}: var(--fiora-gray-600);
    ${ThemeVariables.textTertiary}: var(--fiora-gray-400);
    ${ThemeVariables.textInverse}: #ffffff;
    
    /* 边框颜色 */
    ${ThemeVariables.borderColor}: var(--fiora-gray-200);
    ${ThemeVariables.borderColorLight}: var(--fiora-gray-100);
    ${ThemeVariables.borderColorDark}: var(--fiora-gray-300);
    
    /* ===== 组件特定变量 (Component Tokens) ===== */
    
    /* 消息气泡 */
    ${ThemeVariables.msgBubbleSelfBg}: var(${ThemeVariables.colorPrimary});
    ${ThemeVariables.msgBubbleSelfColor}: var(${ThemeVariables.textInverse});
    ${ThemeVariables.msgBubbleOtherBg}: #ffffff;
    ${ThemeVariables.msgBubbleOtherColor}: var(${ThemeVariables.textPrimary});
    ${ThemeVariables.msgBubbleRadius}: 12px;
    ${ThemeVariables.msgBubbleShadow}: 0 2px 4px rgba(0, 0, 0, 0.1);
    
    /* 联系人列表 */
    ${ThemeVariables.linkmanItemBg}: transparent;
    ${ThemeVariables.linkmanItemBgHover}: var(--fiora-gray-100);
    ${ThemeVariables.linkmanItemBgActive}: var(--fiora-purple-100, #ede9fe);
    ${ThemeVariables.linkmanNameColor}: var(${ThemeVariables.textPrimary});
    ${ThemeVariables.linkmanPreviewColor}: var(${ThemeVariables.textSecondary});
    ${ThemeVariables.linkmanTimeColor}: var(${ThemeVariables.textTertiary});
    
    /* 侧边栏 */
    ${ThemeVariables.sidebarIconColor}: var(--fiora-gray-500);
    ${ThemeVariables.sidebarIconColorHover}: var(${ThemeVariables.colorPrimary});
    ${ThemeVariables.sidebarIconColorActive}: var(${ThemeVariables.colorPrimary});
    
    /* 输入框 */
    ${ThemeVariables.inputBg}: #ffffff;
    ${ThemeVariables.inputColor}: var(${ThemeVariables.textPrimary});
    ${ThemeVariables.inputBorderColor}: var(${ThemeVariables.borderColor});
    ${ThemeVariables.inputBorderRadius}: 8px;
    
    /* 尺寸 */
    ${ThemeVariables.containerWidth}: 95%;
    ${ThemeVariables.containerMaxWidth}: 1200px;
    ${ThemeVariables.containerHeight}: 85vh;
    ${ThemeVariables.sidebarWidth}: 70px;
    ${ThemeVariables.linkmanListWidth}: 280px;
    ${ThemeVariables.avatarSize}: 40px;
    
    /* 圆角 */
    ${ThemeVariables.borderRadiusSm}: 4px;
    ${ThemeVariables.borderRadiusMd}: 8px;
    ${ThemeVariables.borderRadiusLg}: 12px;
    ${ThemeVariables.borderRadiusXl}: 16px;
    
    /* 间距 */
    ${ThemeVariables.spacingXs}: 4px;
    ${ThemeVariables.spacingSm}: 8px;
    ${ThemeVariables.spacingMd}: 16px;
    ${ThemeVariables.spacingLg}: 24px;
    ${ThemeVariables.spacingXl}: 32px;
    
    /* 动画（提供变量，但不强制使用） */
    ${ThemeVariables.transitionFast}: 0.15s;
    ${ThemeVariables.transitionBase}: 0.3s;
    ${ThemeVariables.transitionSlow}: 0.5s;
    ${ThemeVariables.easeInOut}: cubic-bezier(0.4, 0, 0.2, 1);
    ${ThemeVariables.easeOut}: cubic-bezier(0, 0, 0.2, 1);
    ${ThemeVariables.easeIn}: cubic-bezier(0.4, 0, 1, 1);
    ${ThemeVariables.easeBounce}: cubic-bezier(0.34, 1.56, 0.64, 1);
    
    /* 阴影（提供变量，但不强制使用） */
    ${ThemeVariables.shadowSm}: 0 1px 2px rgba(0, 0, 0, 0.05);
    ${ThemeVariables.shadowMd}: 0 4px 6px rgba(0, 0, 0, 0.1);
    ${ThemeVariables.shadowLg}: 0 10px 15px rgba(0, 0, 0, 0.1);
    ${ThemeVariables.shadowXl}: 0 20px 25px rgba(0, 0, 0, 0.15);
}

/* === 应用配色和层次感样式（不使用!important，可被自定义CSS覆盖） === */

/* 主容器 - 设置尺寸、背景、圆角和阴影 */
[data-fiora="main-container"] {
    width: var(${ThemeVariables.containerWidth});
    max-width: var(${ThemeVariables.containerMaxWidth});
    height: var(${ThemeVariables.containerHeight});
    background: var(${ThemeVariables.bgContainer});
    margin: auto;
    border-radius: var(${ThemeVariables.borderRadiusLg});
    box-shadow: var(${ThemeVariables.shadowLg});
}

/* 侧边栏 - 设置尺寸、背景和边框 */
[data-fiora="sidebar"] {
    width: var(${ThemeVariables.sidebarWidth});
    background: var(${ThemeVariables.bgSidebar});
    border-right: 1px solid var(${ThemeVariables.borderColor});
}

/* 侧边栏图标 - 只设置颜色 */
[data-fiora="sidebar"] .iconfont {
    color: var(${ThemeVariables.sidebarIconColor});
}

/* 联系人区域 - 设置尺寸、背景和边框 */
[data-fiora="linkman-area"] {
    width: var(${ThemeVariables.linkmanListWidth});
    background: var(${ThemeVariables.bgLinkmanList});
    border-right: 1px solid var(${ThemeVariables.borderColor});
}

/* 联系人项 - 设置背景、文字颜色、内边距和过渡效果 */
[data-fiora="linkman-item"] {
    background: var(${ThemeVariables.linkmanItemBg});
    padding: var(${ThemeVariables.spacingSm}) var(${ThemeVariables.spacingMd});
    margin: 2px var(${ThemeVariables.spacingXs});
    border-radius: var(${ThemeVariables.borderRadiusMd});
    transition: background-color var(${ThemeVariables.transitionFast}) var(${ThemeVariables.easeInOut});
    cursor: pointer;
}

[data-fiora="linkman-item"]:hover {
    background: var(${ThemeVariables.linkmanItemBgHover});
}

[data-fiora="linkman-item"][data-focus="true"] {
    background: var(${ThemeVariables.linkmanItemBgActive});
}

[data-fiora="linkman-name"] {
    color: var(${ThemeVariables.linkmanNameColor});
}

[data-fiora="linkman-preview"] {
    color: var(${ThemeVariables.linkmanPreviewColor});
}

[data-fiora="linkman-time"] {
    color: var(${ThemeVariables.linkmanTimeColor});
}

/* 聊天区域 - 只设置背景 */
[data-fiora="chat-area"] {
    background: var(${ThemeVariables.bgChat});
}

/* 消息内容 - 设置背景、文字颜色、圆角和阴影 */
[data-fiora="message-item"][data-self="true"] [data-fiora="message-content"] {
    background: var(${ThemeVariables.msgBubbleSelfBg});
    color: var(${ThemeVariables.msgBubbleSelfColor});
    border-radius: var(${ThemeVariables.msgBubbleRadius});
    box-shadow: var(${ThemeVariables.msgBubbleShadow});
    padding: var(${ThemeVariables.spacingSm}) var(${ThemeVariables.spacingMd});
}

[data-fiora="message-item"]:not([data-self="true"]) [data-fiora="message-content"] {
    background: var(${ThemeVariables.msgBubbleOtherBg});
    color: var(${ThemeVariables.msgBubbleOtherColor});
    border-radius: var(${ThemeVariables.msgBubbleRadius});
    box-shadow: var(${ThemeVariables.msgBubbleShadow});
    padding: var(${ThemeVariables.spacingSm}) var(${ThemeVariables.spacingMd});
    border: 1px solid var(${ThemeVariables.borderColorLight});
}

/* 输入框区域 - 设置背景和边框 */
[data-fiora="chat-input"] {
    background: var(${ThemeVariables.bgChatInput});
    border-top: 1px solid var(${ThemeVariables.borderColor});
    padding: var(${ThemeVariables.spacingMd});
}

/* 输入框 - 设置背景、文字颜色、边框和圆角 */
[data-fiora="chat-input-field"] {
    background: var(${ThemeVariables.inputBg});
    color: var(${ThemeVariables.inputColor});
    border: 1px solid var(${ThemeVariables.inputBorderColor});
    border-radius: var(${ThemeVariables.inputBorderRadius});
    padding: var(${ThemeVariables.spacingSm}) var(${ThemeVariables.spacingMd});
    transition: border-color var(${ThemeVariables.transitionFast}) var(${ThemeVariables.easeInOut});
}

[data-fiora="chat-input-field"]:focus {
    outline: none;
    border-color: var(${ThemeVariables.colorPrimary});
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
}

/* 弹窗 - 设置背景和确保居中 */
[data-fiora="dialog-mask"] {
    background: var(${ThemeVariables.bgDialogMask});
    /* 确保遮罩层居中布局 */
    display: flex;
    align-items: center;
    justify-content: center;
}

[data-fiora="dialog"] {
    background: var(${ThemeVariables.bgDialog});
    /* 确保弹窗居中显示，移除可能干扰居中的定位 */
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    transform: none;
    margin: 0;
    border-radius: var(${ThemeVariables.borderRadiusLg});
    box-shadow: var(${ThemeVariables.shadowXl});
    overflow: hidden;
}

[data-fiora="dialog-header"] {
    color: var(${ThemeVariables.textPrimary});
    padding: var(${ThemeVariables.spacingMd}) var(${ThemeVariables.spacingLg});
    border-bottom: 1px solid var(${ThemeVariables.borderColor});
    background: var(${ThemeVariables.bgDialog});
}

[data-fiora="dialog-body"] {
    color: var(${ThemeVariables.textPrimary});
    padding: var(${ThemeVariables.spacingLg});
}

[data-fiora="dialog-footer"] {
    padding: var(${ThemeVariables.spacingMd}) var(${ThemeVariables.spacingLg});
    border-top: 1px solid var(${ThemeVariables.borderColor});
    background: var(${ThemeVariables.bgDialog});
}
`;
