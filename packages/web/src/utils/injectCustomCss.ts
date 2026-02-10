import { baseStyles } from './base-styles';
import { defaultTheme } from './default-theme';

/**
 * 注入基础样式层（第一层：基础设施层）
 * 只负责布局和逻辑，不管颜色和装饰
 */
export function injectBaseStyles(): void {
    const existed = document.getElementById('fiora-base-styles') as HTMLStyleElement | null;
    if (existed) {
        return; // 已存在，无需重复注入
    }
    
    const style = document.createElement('style');
    style.id = 'fiora-base-styles';
    style.textContent = baseStyles;
    // 基础样式应该最早注入，放在 head 最前面
    document.head.insertBefore(style, document.head.firstChild);
}

/**
 * 注入默认主题（第二层：抽象语义变量层 + 第三层：艺术品表现层）
 * 定义变量并应用默认主题样式
 */
export function injectDefaultTheme(): void {
    const existed = document.getElementById('fiora-default-theme') as HTMLStyleElement | null;
    if (existed) {
        return; // 已存在，无需重复注入
    }
    
    const style = document.createElement('style');
    style.id = 'fiora-default-theme';
    style.textContent = defaultTheme;
    // 默认主题应该在基础样式之后，但在用户自定义 CSS 之前
    const baseStylesEl = document.getElementById('fiora-base-styles');
    if (baseStylesEl && baseStylesEl.nextSibling) {
        document.head.insertBefore(style, baseStylesEl.nextSibling);
    } else {
        document.head.appendChild(style);
    }
}

/**
 * 清除所有用户自定义 CSS
 */
export function clearCustomCss(): void {
    // 移除所有可能的自定义样式标签（防止有多个）
    const oldStyles = document.querySelectorAll('style[id="user-custom-css"]');
    oldStyles.forEach((style) => {
        style.remove();
    });
    
    // 也尝试通过其他方式查找（防止ID不一致的情况）
    const allStyles = document.querySelectorAll('style');
    allStyles.forEach((style) => {
        // 如果样式内容包含用户自定义的标识，也移除（可选，更安全）
        // 这里只移除明确标记的样式标签
    });
}

/**
 * 注入用户自定义 CSS
 * @param cssText CSS 代码文本
 * @param enableHotUpdate 是否启用热更新（实时预览），默认 false
 * 
 * 热更新说明：
 * - 当 enableHotUpdate 为 true 时，每次调用都会更新样式标签内容，实现实时预览
 * - 当 enableHotUpdate 为 false 时，会先清除旧样式再注入新样式（默认行为）
 */
export function injectCustomCss(cssText: string, enableHotUpdate: boolean = false) {
    if (enableHotUpdate) {
        // 热更新模式：直接更新现有样式标签内容
        let style = document.getElementById('user-custom-css') as HTMLStyleElement | null;
        if (!style) {
            // 如果不存在，创建新的样式标签
            style = document.createElement('style');
            style.id = 'user-custom-css';
            document.head.appendChild(style);
        }
        
        // 更新样式内容
        if (!cssText || !cssText.trim()) {
            style.textContent = '';
        } else {
            const sanitizedCss = sanitizeCss(cssText);
            style.textContent = sanitizedCss;
        }
        
        // 确保保护样式在最后
        ensureProtectedUiCss();
    } else {
        // 默认模式：先清除所有之前的自定义 CSS
        clearCustomCss();

        // 如果 CSS 代码为空，直接返回（已清除，无需注入）
        if (!cssText || !cssText.trim()) {
            ensureProtectedUiCss();
            return;
        }

        // 安全过滤：移除危险的 CSS 代码
        const sanitizedCss = sanitizeCss(cssText);

        // 创建新的样式标签
        const style = document.createElement('style');
        style.id = 'user-custom-css';
        style.textContent = sanitizedCss;
        document.head.appendChild(style);

        // 自定义 CSS 注入完成后，确保"受保护 UI"样式在其之后（优先级更高）
        ensureProtectedUiCss();
    }
}

/**
 * 过滤危险的 CSS 代码
 *
 * 安全策略（多层防护，确保用户安全）：
 * - ✅ 允许：绝大多数标准 CSS、CSS 变量、动画、媒体查询
 * - ✅ 允许：`data:` 与"相对路径/同源路径"的资源引用
 * - ❌ 禁止：所有可能执行代码的特性（javascript:、vbscript:、expression()等）
 * - ❌ 禁止：外部资源加载（隐私保护）
 * - ❌ 禁止：HTML标签注入（防止XSS）
 * - ❌ 禁止：超长内容（防止DOS攻击）
 *
 * 安全等级：高（多层过滤 + 白名单机制）
 * @param cssText 原始 CSS 代码
 * @returns 过滤后的 CSS 代码
 */
function sanitizeCss(cssText: string): string {
    // 第一层：长度限制（防止DOS攻击）
    const MAX_CSS_LENGTH = 500000; // 500KB
    if (cssText.length > MAX_CSS_LENGTH) {
        console.warn(`[CSS安全] CSS长度超限: ${cssText.length} > ${MAX_CSS_LENGTH}`);
        return `/* CSS内容过长，已被阻止（最大${MAX_CSS_LENGTH}字符） */`;
    }

    let sanitized = cssText;

    // 第二层：移除HTML标签（防止注入<script>、<iframe>等）
    sanitized = sanitized.replace(/<[^>]*>/g, '/* blocked HTML tag */');

    // 第三层：移除危险协议
    // javascript: (最常见的XSS向量)
    sanitized = sanitized.replace(/javascript\s*:/gi, '/* blocked javascript */');
    // vbscript: (老旧但仍需防范)
    sanitized = sanitized.replace(/vbscript\s*:/gi, '/* blocked vbscript */');
    // data:text/html (可能包含可执行脚本)
    sanitized = sanitized.replace(/data\s*:\s*text\s*\/\s*html/gi, '/* blocked data:text/html */');
    
    // 第四层：移除危险的CSS表达式
    // expression() (IE特有，已废弃但仍需防范)
    sanitized = sanitized.replace(/expression\s*\(/gi, '/* blocked expression */');
    // eval() 尝试
    sanitized = sanitized.replace(/\beval\s*\(/gi, '/* blocked eval */');
    
    // 第五层：移除可以加载外部脚本的CSS属性
    // -moz-binding (Firefox旧版，可加载XBL)
    sanitized = sanitized.replace(/-moz-binding\s*:/gi, '/* blocked -moz-binding */');
    // behavior (IE特有，可加载HTC)
    sanitized = sanitized.replace(/behavior\s*:/gi, '/* blocked behavior */');
    
    // 第六层：过滤document/window/location等DOM操作尝试
    // 虽然CSS本身不能执行JS，但防止某些浏览器bug
    sanitized = sanitized.replace(/document\s*\./gi, '/* blocked document */');
    sanitized = sanitized.replace(/window\s*\./gi, '/* blocked window */');
    sanitized = sanitized.replace(/location\s*\./gi, '/* blocked location */');
    sanitized = sanitized.replace(/alert\s*\(/gi, '/* blocked alert */');
    sanitized = sanitized.replace(/confirm\s*\(/gi, '/* blocked confirm */');
    sanitized = sanitized.replace(/prompt\s*\(/gi, '/* blocked prompt */');

    // 第七层：阻止外部 @import（隐私保护 + 供应链安全）
    /**
     * 只允许：
     * - 相对路径：./style.css、../style.css
     * - 绝对路径：/style.css
     * - Data URI：data:text/css;base64,...
     * 
     * 阻止：
     * - 外部HTTP(S)：https://evil.com/style.css
     * - 协议相对：//evil.com/style.css
     */
    sanitized = sanitized.replace(
        /@import\s+(?:url\s*\(\s*)?(?:['"])?([^'")\s]+)(?:['"])?\s*\)?\s*;/gi,
        (full, rawUrl: string) => {
            const u = String(rawUrl || '').trim().toLowerCase();
            // 白名单机制：只允许明确安全的路径
            const isSafe =
                u.startsWith('/') ||
                u.startsWith('./') ||
                u.startsWith('../') ||
                u.startsWith('data:text/css');
            
            if (!isSafe) {
                console.warn(`[CSS安全] 阻止外部@import: ${rawUrl}`);
                return '/* blocked @import: external resource */';
            }
            return full;
        },
    );

    // 第八层：阻止 url() 中的外部资源（隐私保护）
    /**
     * URL资源加载限制：
     * ✅ 允许：data URI（完全内联，无网络请求）
     * ✅ 允许：相对路径（同源资源）
     * ✅ 允许：绝对路径（同源资源）
     * ❌ 禁止：HTTP(S)外部资源（隐私泄露风险）
     * ❌ 禁止：协议相对URL（//xxx）
     * 
     * 示例：
     * - background: url(data:image/png;base64,...)  ✅ 允许
     * - background: url(/images/bg.png)             ✅ 允许
     * - background: url(https://evil.com/track.gif) ❌ 禁止（隐私泄露）
     */
    sanitized = sanitized.replace(
        /url\s*\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
        (full, _quote: string, rawUrl: string) => {
            const u = String(rawUrl || '').trim().toLowerCase();
            
            // 白名单检查
            const isSafe =
                u.startsWith('data:') ||  // Data URI
                u.startsWith('/') ||      // 绝对路径（同源）
                u.startsWith('./') ||     // 相对路径
                u.startsWith('../');      // 相对路径（父级）

            // 黑名单检查：协议相对URL和外部HTTP(S)
            const isExternal =
                u.startsWith('//') ||
                u.startsWith('http://') ||
                u.startsWith('https://');

            if (isExternal || !isSafe) {
                console.warn(`[CSS安全] 阻止外部资源: ${rawUrl}`);
                return 'url(/* blocked: external resource */)';
            }
            return full;
        },
    );

    // 第九层：移除潜在的Unicode欺骗（零宽字符、同形异义字符等）
    // 防止通过特殊Unicode字符绕过过滤
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, ''); // 零宽字符
    
    // 第十层：移除注释中可能的恶意内容（虽然注释不会执行，但防止信息泄露）
    // 保留合法的CSS注释，但移除可能包含敏感信息的超长注释
    sanitized = sanitized.replace(/\/\*[\s\S]{5000,}?\*\//g, '/* 注释过长已移除 */');

    return sanitized;
}

/**
 * 从 localStorage 加载自定义 CSS
 * 
 * 加载顺序（严格按照三层架构）：
 * 1. 基础样式层（Foundation Layer）- 布局和逻辑
 * 2. 默认主题层（Default Theme）- 通过预设模板或默认变量
 * 3. 用户自定义 CSS（User Custom CSS）- 最后加载，可以覆盖所有变量
 */
export function loadCustomCss(): void {
    // 第一步：注入基础样式层（第一层）
    injectBaseStyles();
    
    // 第二步：注入默认主题（第二层 + 第三层）
    injectDefaultTheme();
    
    // 第三步：加载用户自定义 CSS（最后加载以覆盖默认主题）
    const customCss = window.localStorage.getItem('customCss') || '';
    if (customCss) {
        injectCustomCss(customCss);
    } else {
        // 即便没有自定义 CSS，也要确保保护样式存在（避免被其它样式/扩展影响）
        ensureProtectedUiCss();
    }
}

/**
 * 注入“受保护 UI”样式（必须在用户自定义 CSS 之后）
 *
 * 目标：
 * - 不允许用户通过“自定义 CSS 功能”隐藏管理员入口/管理员控制台（避免把自己锁死）
 * - 用户仍然可以对这些区域做配色/字体等美化，但无法通过 display/visibility/opacity/pointer-events 让它消失
 *
 * 原理：
 * - 我们把保护样式放在 <head> 最后
 * - 并且对关键属性使用 !important
 * - 由于注入顺序固定（用户 CSS 永远先于保护 CSS），用户无法通过该功能覆盖这些保护规则
 */
function ensureProtectedUiCss() {
    const css = `
/* ===== Fiora Protected UI CSS (auto-generated) ===== */
/* 管理员入口（侧边栏按钮）保护 */
#sidebar-root {
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
#admin-entry {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
#admin-entry .iconfont {
  display: inline-block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* 管理员控制台（rc-dialog）保护
 * 关键点：只对"打开态"生效（由 Admin.tsx 注入 class：admin-console-visible）
 * - 不能依赖 aria-hidden（在部分场景下可能为空，见用户反馈）
 * - 这样既能防止用户 CSS 隐藏弹窗，又不会阻止正常关闭
 * - 使用 flex 布局确保居中显示
 */
.admin-console-wrap.admin-console-visible {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}
.admin-console-wrap.admin-console-visible .rc-dialog.admin-console-dialog.admin-console-visible {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  position: relative !important;
  top: auto !important;
  transform: none !important;
  margin: 0 !important;
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
`;

    const existed = document.getElementById('protected-ui-css') as HTMLStyleElement | null;
    if (existed) {
        // 更新内容，并确保它在 <head> 最后（保证覆盖顺序）
        existed.textContent = css;
        existed.remove();
        document.head.appendChild(existed);
        return;
    }
    const style = document.createElement('style');
    style.id = 'protected-ui-css';
    style.textContent = css;
    document.head.appendChild(style);
}

