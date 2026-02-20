/**
 * Fiora 基础样式层 (Foundation Layer)
 * 
 * 这是"三层样式架构"的第一层：基础设施层
 * 只负责布局和逻辑，不管颜色和装饰
 * 
 * 原则：
 * - 只使用 data-fiora 属性选择器
 * - 只设置布局相关的 CSS（display, position, overflow 等）
 * - 不设置颜色、阴影、圆角等装饰性样式
 * - 确保程序不会因为用户 CSS 而崩溃
 */

export const baseStyles = `
/* ============================================
   Fiora 基础样式层 (Foundation Layer)
   只负责布局和逻辑，不管颜色和装饰
   ============================================ */

/* === 核心容器布局保护 === */
[data-fiora="app"] {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    display: block;
}

[data-fiora="main-container"] {
    display: flex;
    flex-direction: row;
    overflow: hidden;
    position: relative;
    /* 不设置尺寸，由主题层控制 */
}

/* === 侧边栏布局 === */
[data-fiora="sidebar"] {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
}

/* === 联系人区域布局 === */
[data-fiora="linkman-area"] {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
}

[data-fiora="linkman-list"] {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    position: relative;
}

[data-fiora="linkman-item"] {
    display: flex;
    flex-direction: row;
    align-items: center;
    position: relative;
    overflow: hidden;
    /* 不设置间距，由主题层控制 */
}

/* === 聊天区域布局 === */
[data-fiora="chat-area"] {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    position: relative;
    min-width: 0; /* 防止 flex 子元素溢出 */
}

[data-fiora="chat-header"] {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

[data-fiora="message-list"] {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    position: relative;
}

[data-fiora="message-item"] {
    display: flex;
    flex-direction: row;
    position: relative;
    overflow: hidden;
    /* 不设置对齐方式，由主题层根据 data-self 属性控制 */
}

[data-fiora="message-item"][data-self="true"] {
    flex-direction: row-reverse;
}

[data-fiora="message-avatar"] {
    flex-shrink: 0;
    position: relative;
    /* 不设置尺寸，由主题层控制 */
}

/* === 输入框区域布局 === */
[data-fiora="chat-input"] {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

[data-fiora="chat-input"] input,
[data-fiora="chat-input"] textarea {
    flex: 1;
    min-width: 0;
    resize: none;
    /* 不设置样式，由主题层控制 */
}

/* === 弹窗布局 === */
[data-fiora="dialog-mask"] {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
}

[data-fiora="dialog"] {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    /* 不设置尺寸、背景，由主题层控制 */
}

[data-fiora="dialog-header"] {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

[data-fiora="dialog-body"] {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    position: relative;
}

[data-fiora="dialog-footer"] {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
    position: relative;
}

/* === 防止用户 CSS 破坏布局的关键保护 === */
[data-fiora="main-container"] {
    /* 防止用户设置 display: none 导致应用消失 */
    display: flex !important;
}

[data-fiora="app"] {
    /* 防止用户设置 overflow: visible 导致滚动条问题 */
    overflow: hidden !important;
}

[data-fiora="message-list"],
[data-fiora="linkman-list"] {
    /* 确保列表容器可以滚动 */
    overflow-y: auto !important;
    overflow-x: hidden !important;
}

/* === 响应式保护 === */
@media (max-width: 768px) {
    [data-fiora="main-container"] {
        /* 移动端可能需要全屏 */
        width: 100% !important;
        height: 100% !important;
    }
}

/* === 样式保护罩：保护关键 UI 组件不被用户 CSS 破坏 === */
/* 这是 Fiora 的"最后底线"，防止用户写了自杀式 CSS 后无法恢复 */

/* 管理员入口保护 */
#admin-entry,
[data-fiora="admin-entry"] {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483647 !important; /* 浏览器支持的最大层级 */
}

#sidebar-root,
[data-fiora="sidebar"] {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

#sidebar-buttons {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

/* 设置弹窗保护（通过 data-fiora 属性识别） */
[data-fiora="dialog"][data-fiora~="setting-dialog"],
.rc-dialog[class*="setting"] {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483647 !important;
}

/* 设置弹窗遮罩保护 */
[data-fiora="dialog-mask"][data-fiora~="setting-dialog-mask"],
.rc-dialog-wrap[class*="setting"] {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483646 !important;
}

/* 登录/注册弹窗保护（防止用户 CSS 导致无法登录）
 * 关键点：只对"打开态"生效（由 LoginAndRegister.tsx 注入 class：login-dialog-visible）
 * - 这样既能防止用户 CSS 隐藏弹窗，又不会阻止正常关闭
 */
.login-dialog-wrap-visible[data-fiora="dialog-mask"] {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483647 !important;
}
.login-dialog-wrap-visible[data-fiora="dialog-mask"] .rc-dialog.login-dialog-visible {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483647 !important;
}

/* 错误提示保护（防止用户 CSS 隐藏错误信息） */
[data-fiora="error-message"],
.message-error,
.ant-message {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    z-index: 2147483647 !important;
}
`;

