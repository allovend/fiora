import React, { useEffect, useMemo, useRef } from 'react';
import Dialog from 'rc-dialog';
import 'rc-dialog/assets/index.css';

import './Dialog.less';

/**
 * Dialog 包装器：修复 rc-dialog 在某些浏览器/版本下的 aria-hidden 焦点警告
 *
 * 现象（用户控制台可见）：
 * - “Blocked aria-hidden on an element because its descendant retained focus...”
 *
 * 根因（高概率）：
 * - rc-dialog 的“焦点哨兵”元素（通常是 `div[tabindex="0"]`）有时带 `aria-hidden="true"`
 * - 该元素被 focus 后，浏览器会警告“焦点元素不应被 aria-hidden”
 *
 * 解决策略（尽量小改动）：
 * - 监听 focusin：如果焦点落在 `aria-hidden="true"` 的元素上，则将其改为 `aria-hidden="false"`
 * - 对自定义 CSS/主题无影响，只消除警告并避免潜在的可访问性问题
 */
function fixAriaHiddenFocusTarget(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    if (el.getAttribute('aria-hidden') === 'true') {
        el.setAttribute('aria-hidden', 'false');
    }
}

let dialogSeq = 0;

export default function DialogWrapper(props: any) {
    // 为每个 Dialog 实例生成一个稳定但不冲突的“实例 id”
    const instanceIdRef = useRef<string>('');
    if (!instanceIdRef.current) {
        dialogSeq += 1;
        instanceIdRef.current = `fiora-${Date.now()}-${dialogSeq}`;
    }

    // rc-dialog 通过 Portal 渲染到 body 下，无法直接在 JSX 上挂 data-* 到 wrap / dialog
    // 做法：给 wrapClassName / className 注入一个“唯一类名”，再用 DOM 查询给对应节点补 data-fiora
    const wrapClassName = useMemo(() => {
        const base = String(props.wrapClassName || '').trim();
        const unique = `fiora-dialog-wrap fiora-dialog-wrap-${instanceIdRef.current}`;
        return base ? `${base} ${unique}` : unique;
    }, [props.wrapClassName]);

    const className = useMemo(() => {
        const base = String(props.className || '').trim();
        const unique = `fiora-dialog fiora-dialog-${instanceIdRef.current}`;
        return base ? `${base} ${unique}` : unique;
    }, [props.className]);

    useEffect(() => {
        const handler = (e: FocusEvent) => fixAriaHiddenFocusTarget(e.target);
        document.addEventListener('focusin', handler, true);

        // 初始也做一次清理：把 rc-dialog 注入的 aria-hidden 哨兵修正掉
        // （避免第一次打开弹窗就报 warning）
        const timer = window.setTimeout(() => {
            const bad = document.querySelectorAll('div[tabindex="0"][aria-hidden="true"]');
            bad.forEach((node) => {
                (node as HTMLElement).setAttribute('aria-hidden', 'false');
            });
        }, 0);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('focusin', handler, true);
        };
    }, []);

    useEffect(() => {
        // 仅在可见时写入属性（避免误伤其它弹窗）
        if (!props.visible) {
            return;
        }

        const wrap = document.querySelector(
            `.fiora-dialog-wrap-${instanceIdRef.current}`,
        ) as HTMLElement | null;
        if (!wrap) {
            return;
        }
        // 遮罩层（wrap）
        wrap.setAttribute('data-fiora', 'dialog-mask');

        // 弹窗主体（rc-dialog）
        const dialog = wrap.querySelector('.rc-dialog') as HTMLElement | null;
        if (dialog) {
            dialog.setAttribute('data-fiora', 'dialog');
            const header = dialog.querySelector('.rc-dialog-header') as HTMLElement | null;
            if (header) {
                header.setAttribute('data-fiora', 'dialog-header');
            }
            const body = dialog.querySelector('.rc-dialog-body') as HTMLElement | null;
            if (body) {
                body.setAttribute('data-fiora', 'dialog-body');
            }
            const footer = dialog.querySelector('.rc-dialog-footer') as HTMLElement | null;
            if (footer) {
                footer.setAttribute('data-fiora', 'dialog-footer');
            }
        }
    }, [props.visible]);

    return <Dialog {...props} wrapClassName={wrapClassName} className={className} />;
}