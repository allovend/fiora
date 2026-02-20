/* eslint-disable camelcase */
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDom from 'react-dom';
import { Provider } from 'react-redux';

import config from '@fiora/config/client';
import setCssVariable from './utils/setCssVariable';
import { loadCustomCss } from './utils/injectCustomCss';
import App from './App';
import store from './state/store';
import getData from './localStorage';

// 引入CSS变量体系（为用户自定义CSS提供基础）
import './styles/cssVariables.css';

// 注册 Service Worker
if (window.location.protocol === 'https:' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`/service-worker.js`).catch((err) => {
            // 静默处理 Service Worker 注册错误（可能是浏览器扩展冲突）
            console.warn('[Service Worker] 注册失败:', err);
        });
    });
}

// 捕获并忽略浏览器扩展引起的消息通道错误
// 这个错误通常由 Chrome 扩展引起，不影响应用功能
window.addEventListener('error', (event) => {
    if (
        event.error &&
        event.error.message &&
        event.error.message.includes('message channel closed before a response was received')
    ) {
        // 静默忽略这个错误（由浏览器扩展引起）
        event.preventDefault();
        return false;
    }
}, true);

// 捕获未处理的 Promise 拒绝（包括消息通道错误）
window.addEventListener('unhandledrejection', (event) => {
    if (
        event.reason &&
        event.reason.message &&
        event.reason.message.includes('message channel closed before a response was received')
    ) {
        // 静默忽略这个错误（由浏览器扩展引起）
        event.preventDefault();
        return false;
    }
});

// 如果配置了前端监控, 动态加载并启动监控
if (config.frontendMonitorAppId) {
    // @ts-ignore
    import(/* webpackChunkName: "frontend-monitor" */ 'wpk-reporter').then(
        (module) => {
            const WpkReporter = module.default;

            const __wpk = new WpkReporter({
                bid: config.frontendMonitorAppId,
                spa: true,
                rel: config.frontendMonitorAppId,
                uid: () => localStorage.getItem('username') || '',
                plugins: [],
            });

            __wpk.installAll();
        },
    );
}

// 更新 css variable
const { primaryColor, primaryTextColor } = getData();
setCssVariable(primaryColor, primaryTextColor);

// 检查安全模式：如果 URL 带有 ?safeMode=true，则不加载用户自定义 CSS
// 这是最后的容错保障，当用户写错 CSS 导致页面无法使用时，可以通过这个参数恢复
const urlParams = new URLSearchParams(window.location.search);
const isSafeMode = urlParams.get('safeMode') === 'true';

if (!isSafeMode) {
    // 正常模式：加载用户自定义 CSS
    loadCustomCss();
} else {
    // 安全模式：只加载基础样式和默认主题，不加载用户自定义 CSS
    // 这样可以确保用户能够访问设置面板来修复 CSS
    import('./utils/injectCustomCss').then((module) => {
        module.injectBaseStyles();
        module.injectDefaultTheme();
    });
    console.warn('[Fiora] 安全模式已启用：用户自定义 CSS 已被禁用。移除 URL 中的 ?safeMode=true 可恢复正常模式。');
}

// 修复 aria-hidden 无障碍性问题
// 延迟加载以确保在 React 渲染完成后执行
setTimeout(() => {
    import('./utils/fixAriaHidden').then(({ observeAriaHidden }) => {
        observeAriaHidden();
    }).catch((err) => {
        console.warn('[fixAriaHidden] 加载失败:', err);
    });
}, 100);

// 请求 Notification 授权
if (
    window.Notification &&
    (window.Notification.permission === 'default' ||
        window.Notification.permission === 'denied')
) {
    window.Notification.requestPermission();
}

if (window.location.pathname !== '/') {
    const { pathname } = window.location;
    window.history.pushState({}, 'fiora', '/');
    if (pathname.startsWith('/invite/group/')) {
        const groupId = pathname.replace(`/invite/group/`, '');
        window.sessionStorage.setItem('inviteGroupId', groupId);
    }
}

ReactDom.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('app'),
);
