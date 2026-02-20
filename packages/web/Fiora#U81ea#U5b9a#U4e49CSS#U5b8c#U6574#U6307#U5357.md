# Fiora 自定义 CSS 完整指南

---

## 📋 目录

- [快速开始](#快速开始)
- [三层样式架构与优先级](#三层样式架构与优先级)
- [DOM 层级结构](#dom-层级结构)
- [核心变量表](#核心变量表)
- [稳定选择器速查](#稳定选择器速查)
- [示例](#示例)
- [安全限制](#安全限制)
- [高级技巧](#高级技巧)
- [常见问题](#常见问题)

---

## 🚀 快速开始

Fiora 采用**三层样式架构**：

1. **基础层** - 布局和逻辑
2. **变量层** - 50+ 个 CSS 变量（主要使用）
3. **表现层** - 默认主题样式（可覆盖）

### 创建主题

修改 CSS 变量即可：

```css
:root {
    --fiora-color-primary: #ff6b6b;
    --fiora-bg-app: #1a1a1a;
}
```

### 实时预览

在设置面板的 CSS 输入框中输入代码，立即看到效果。如果 CSS 导致页面异常，访问 `?safeMode=true` 进入安全模式。

---

## 🏗️ 三层样式架构与优先级

### 架构说明

- **第一层：基础设施层** - 布局和逻辑，使用 `data-fiora` 属性选择器
- **第二层：抽象语义变量层** - 定义 50+ 个 CSS 变量
- **第三层：艺术品表现层** - 通过变量赋值定义默认主题，可被用户 CSS 覆盖

### CSS 加载顺序

1. **基础样式层**（`base-styles.ts`）- 布局保护，使用 `!important`，通过 `injectBaseStyles()` 注入
2. **默认主题层**（`default-theme.ts`）- 变量定义和默认样式，不使用 `!important`，通过 `injectDefaultTheme()` 注入
3. **用户自定义CSS** - 可覆盖默认主题，通过 `injectCustomCss()` 注入到 `#user-custom-css` 样式标签
4. **保护UI样式**（`injectCustomCss.ts` 中的 `ensureProtectedUiCss()`）- 最后加载，使用 `!important`，确保关键UI不被用户CSS隐藏

**注意**：保护UI样式在每次 `injectCustomCss()` 调用后都会执行 `ensureProtectedUiCss()`，确保始终在用户CSS之后加载。

### CSS 优先级规则

1. `!important` 声明（最高）
2. 内联样式
3. ID选择器
4. 类选择器、属性选择器、伪类选择器
5. 元素选择器、伪元素选择器

### 无法覆盖的保护规则

**保护层级说明**：
- **基础样式层**（`base-styles.ts`）：在基础样式层中定义，使用 `!important`，最早加载
- **保护UI样式层**（`ensureProtectedUiCss()`）：在用户CSS之后注入，使用 `!important`，最后加载
- **双重保护**：同时在两个层级都有保护规则，确保最高优先级

| 选择器 | 受保护属性 | z-index | 保护层级 | 说明 |
|--------|-----------|---------|---------|------|
| `[data-fiora="main-container"]` | `display` | - | 基础样式层 | 防止应用消失（响应式保护：移动端强制全屏） |
| `[data-fiora="app"]` | `overflow` | - | 基础样式层 | 防止滚动条问题 |
| `[data-fiora="message-list"]`, `[data-fiora="linkman-list"]` | `overflow-y`, `overflow-x` | - | 基础样式层 | 确保可滚动 |
| `#admin-entry`, `[data-fiora="admin-entry"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | 双重保护 | 管理员入口保护 |
| `#sidebar-root`, `[data-fiora="sidebar"]` | `display`, `visibility`, `opacity`, `pointer-events` | - | 双重保护 | 侧边栏保护 |
| `#sidebar-buttons` | `display`, `visibility`, `opacity`, `pointer-events` | - | 保护UI样式层 | 侧边栏按钮保护 |
| `.admin-console-wrap.admin-console-visible` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | 保护UI样式层 | 管理员控制台保护（仅在可见时生效） |
| `[data-fiora="dialog"][data-fiora~="setting-dialog"]`, `.rc-dialog[class*="setting"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | 基础样式层 | 设置弹窗保护（通过类名识别） |
| `[data-fiora="dialog-mask"][data-fiora~="setting-dialog-mask"]`, `.rc-dialog-wrap[class*="setting"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483646` | 基础样式层 | 设置弹窗遮罩保护 |
| `.login-dialog-wrap-visible[data-fiora="dialog-mask"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | 双重保护 | 登录弹窗保护（仅在可见时生效，通过 `.login-dialog-wrap-visible` 类名识别） |
| `[data-fiora="error-message"]`, `.message-error`, `.ant-message` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | 基础样式层 | 错误提示保护 |
| `[data-fiora="dialog-mask"]` | - | `1050` | 基础样式层 | 对话框遮罩层级（可覆盖，但基础样式层设置了默认值） |

**注意：** 预设模板使用大量 `!important`，只能通过修改CSS变量覆盖。登录弹窗保护使用类名 `.login-dialog-wrap-visible` 作为条件，只在窗口可见时生效。设置弹窗保护通过 `.rc-dialog[class*="setting"]` 类名选择器实现，而非 `data-fiora` 属性。

---

## 🌳 DOM 层级结构

Fiora 使用 `data-fiora` 属性标识关键元素，这些属性**永远不会改变**。

### 完整层级结构

```
[data-fiora="app"]
├── .blur
└── [data-fiora="main-container"]
    ├── [data-fiora="sidebar"]
    │   ├── [data-fiora="sidebar-avatar"]
    │   └── .iconfont
    ├── [data-fiora="linkman-area"]
    │   └── .container
    │       ├── .functionBar
    │       └── [data-fiora="linkman-list"]
    │           └── [data-fiora="linkman-item"]
    │           ├── [data-fiora="linkman-avatar"]
    │           └── [data-fiora="linkman-info"]
    │               ├── [data-fiora="linkman-name-time"]
    │               │   ├── [data-fiora="linkman-name"]
    │               │   └── [data-fiora="linkman-time"]
    │               └── [data-fiora="linkman-preview-unread"]
    │                   ├── [data-fiora="linkman-preview"]
    │                   └── [data-fiora="linkman-unread"]
    └── [data-fiora="chat-area"]
        ├── [data-fiora="chat-header"]
        │   ├── .buttonContainer (移动端，包含侧边栏和联系人列表按钮)
        │   ├── [data-fiora="chat-header-name"]
        │   │   ├── [data-fiora="chat-header-online-count"]
        │   │   ├── [data-fiora="chat-header-status"]
        │   │   └── [data-fiora="chat-header-mobile-status"] (移动端状态显示)
        │   └── [data-fiora="chat-header-buttons"]
        ├── [data-fiora="message-list"]
        │   └── [data-fiora="message-item"]
        │       ├── [data-fiora="message-avatar"]
        │       └── .right
        │           ├── [data-fiora="message-name-time"]
        │           │   ├── [data-fiora="message-tag"]
        │           │   ├── [data-fiora="message-username"]
        │           │   └── [data-fiora="message-time"]
        │           ├── [data-fiora="message-content-wrapper"]
        │           │   ├── [data-fiora="message-content"]
        │           │   │   ├── [data-fiora="message-text"]
        │           │   │   ├── [data-fiora="message-image"]
        │           │   │   ├── [data-fiora="message-code"]
        │           │   │   ├── [data-fiora="message-file"]
        │           │   │   ├── [data-fiora="message-url"]
        │           │   │   ├── [data-fiora="message-invite"]
        │           │   │   └── [data-fiora="message-system"]
        │           │   └── [data-fiora="message-button-list"]
        │           └── [data-fiora="message-arrow"]
        └── [data-fiora="chat-input"]
            ├── .iconButton (表情按钮、功能按钮等，无 data-fiora)
            ├── [data-fiora="chat-input-form"]
            │   ├── [data-fiora="chat-input-field"]
            │   └── [data-fiora="chat-input-hint"] (提示图标，仅在非移动端且未聚焦时显示)
            └── .iconButton (发送按钮等，无 data-fiora)
```

### 弹窗结构

```
[data-fiora="dialog-mask"]     /* 弹窗遮罩层（半透明背景） */
└── [data-fiora="dialog"]      /* 弹窗容器 */
    ├── [data-fiora="dialog-header"]   /* 弹窗头部（标题栏） */
    ├── [data-fiora="dialog-body"]     /* 弹窗主体（内容区域，可滚动） */
    └── [data-fiora="dialog-footer"]   /* 弹窗底部（操作按钮区域） */
```

### 特殊说明

- **功能栏** `.functionBar` 没有 `data-fiora` 属性，需使用类名选择器（功能栏是搜索栏，位于联系人列表上方，用于搜索用户和群组）
- **选中联系人**：`[data-fiora~="linkman-focus"]`（推荐，实际代码使用此方式）。当联系人被选中时，`linkman-item` 的 `data-fiora` 属性会包含 `linkman-focus` token，可用于高亮显示当前选中的联系人
- **自己消息**：`[data-fiora="message-item"][data-self="true"]` 或 `[data-fiora~="message-self"]`。自己发送的消息会显示在右侧，使用 `row-reverse` 布局
- **他人消息**：`[data-fiora="message-item"]:not([data-self="true"])` 或 `[data-fiora~="message-other"]`。他人发送的消息会显示在左侧，使用正常的 `row` 布局
- **对话框属性**：仅在 `visible={true}` 时存在。弹窗只有在显示时才会被注入 `data-fiora` 属性，关闭后属性会被移除
- **消息按钮列表**：`[data-fiora="message-button-list"]` 仅在鼠标悬停时显示（包含撤回等操作按钮）。当鼠标悬停在消息上时，会显示操作按钮列表
- **消息结构**：`message-item` 包含 `message-avatar` 和一个 `.right` 容器，`.right` 容器内包含 `message-name-time`、`message-content-wrapper` 和 `message-arrow`。`.right` 是消息右侧内容的包装器，没有 `data-fiora` 属性，需使用类名选择器
- **消息内容类型**：所有消息类型都有对应的 `data-fiora` 属性：
  - `message-text` - 文本消息（纯文本内容，支持表情和链接）
  - `message-image` - 图片消息（包含图片容器和图片元素，点击可查看大图）
  - `message-code` - 代码消息（点击可查看完整代码，支持语法高亮）
  - `message-file` - 文件消息（点击可下载文件，显示文件名和大小）
  - `message-url` - URL消息（链接消息，点击可打开链接）
  - `message-invite` - 邀请消息（群组邀请，包含邀请信息和加入按钮）
  - `message-system` - 系统消息（系统通知，如加入群组、撤回消息等）
- **全局类名**：`.app`, `.sidebar`, `.message`, `.self`, `.content`, `.functionBar`, `.right`, `.nicknameTimeBlock`, `.contentButtonBlock`, `.buttonList`, `.arrow` 等可安全使用（详见下方全局类名清单）。这些类名不会随 CSS Modules 哈希变化，可以稳定使用
- **毛玻璃效果**：支持 `[data-aero="true"]` 的组件：`sidebar`（侧边栏）, `linkman-area`（联系人区域）, `chat-area`（聊天区域）, `chat-header`（聊天头部）, `chat-input`（输入框）, `linkman-item`（联系人项）。当启用毛玻璃效果时，这些组件会添加 `data-aero="true"` 属性，可以配合 `backdrop-filter: blur()` 使用

---

## 🎨 核心变量表

### 主色调

```css
--fiora-color-primary: #7c3aed;
--fiora-color-primary-hover: #6d28d9;
--fiora-color-primary-active: #5b21b6;
--fiora-color-secondary: #007bff;
--fiora-color-accent: #7c3aed;
```

### 背景色

```css
--fiora-bg-app: #ffffff;
--fiora-bg-container: #ffffff;
--fiora-bg-sidebar: #f8f9fa;
--fiora-bg-linkman-list: #ffffff;
--fiora-bg-chat: #f8fafc;
--fiora-bg-chat-input: #ffffff;
--fiora-bg-dialog: #ffffff;
--fiora-bg-dialog-mask: rgba(0,0,0,0.3);
```

### 文字颜色

```css
--fiora-text-primary: #1e293b;
--fiora-text-secondary: #64748b;
--fiora-text-tertiary: #94a3b8;
--fiora-text-inverse: #ffffff;
```

### 消息气泡

```css
--fiora-msg-bubble-self-bg: #7c3aed;
--fiora-msg-bubble-self-color: #ffffff;
--fiora-msg-bubble-other-bg: #f1f5f9;
--fiora-msg-bubble-other-color: #1e293b;
--fiora-msg-bubble-radius: 12px;
--fiora-msg-bubble-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```

### 联系人列表

```css
--fiora-linkman-item-bg: transparent;
--fiora-linkman-item-bg-hover: #f5f3ff;
--fiora-linkman-item-bg-active: #ede9fe;
--fiora-linkman-name-color: #1e293b;
--fiora-linkman-preview-color: #64748b;
--fiora-linkman-time-color: #94a3b8;
```

### 侧边栏

```css
--fiora-sidebar-icon-color: #6c757d;
--fiora-sidebar-icon-color-hover: #7c3aed;
--fiora-sidebar-icon-color-active: #7c3aed;
```

### 输入框

```css
--fiora-input-bg: #ffffff;
--fiora-input-color: #1e293b;
--fiora-input-border-color: rgba(0,0,0,0.1);
--fiora-input-border-radius: 8px;
```

### 边框颜色

```css
--fiora-border-color: #dee2e6;
--fiora-border-color-light: #e9ecef;
--fiora-border-color-dark: #ced4da;
```

### 尺寸

```css
--fiora-container-width: 95%;
--fiora-container-max-width: 1200px;
--fiora-container-height: 85vh;
--fiora-sidebar-width: 70px;
--fiora-linkman-list-width: 280px;
--fiora-avatar-size: 40px;
```

### 圆角

```css
--fiora-border-radius-sm: 4px;
--fiora-border-radius-md: 8px;
--fiora-border-radius-lg: 12px;
--fiora-border-radius-xl: 16px;
```

### 间距

```css
--fiora-spacing-xs: 4px;
--fiora-spacing-sm: 8px;
--fiora-spacing-md: 16px;
--fiora-spacing-lg: 24px;
--fiora-spacing-xl: 32px;
```

### 动画

```css
--fiora-transition-fast: 0.15s;
--fiora-transition-base: 0.3s;
--fiora-transition-slow: 0.5s;
--fiora-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--fiora-ease-out: cubic-bezier(0, 0, 0.2, 1);
--fiora-ease-in: cubic-bezier(0.4, 0, 1, 1);
--fiora-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 阴影

```css
--fiora-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--fiora-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--fiora-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--fiora-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

### 全局原始值（颜色）

```css
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
```

---

## 🎯 稳定选择器速查

### 主要容器

```css
/* 应用根容器 - 整个应用的根元素 */
[data-fiora="app"]

/* 主容器 - 包含侧边栏、联系人列表和聊天区域的容器 */
[data-fiora="main-container"]

/* 侧边栏 - 左侧边栏，包含头像、在线状态和功能按钮 */
[data-fiora="sidebar"]

/* 联系人区域 - 包含功能栏和联系人列表的区域 */
[data-fiora="linkman-area"]

/* 聊天区域 - 包含聊天头部、消息列表和输入框的区域 */
[data-fiora="chat-area"]
```

### 联系人列表

```css
/* 联系人列表容器 - 所有联系人项的滚动容器 */
[data-fiora="linkman-list"]

/* 联系人项 - 单个联系人条目 */
[data-fiora="linkman-item"]

/* 联系人头像 - 联系人的头像图片 */
[data-fiora="linkman-avatar"]

/* 联系人信息区域 - 包含名称、时间、预览和未读数的容器 */
[data-fiora="linkman-info"]

/* 联系人名称和时间块 - 包含名称和时间的容器 */
[data-fiora="linkman-name-time"]

/* 联系人名称 - 联系人的显示名称 */
[data-fiora="linkman-name"]

/* 联系人时间 - 最后一条消息的时间 */
[data-fiora="linkman-time"]

/* 联系人预览和未读数块 - 包含消息预览和未读数的容器 */
[data-fiora="linkman-preview-unread"]

/* 联系人预览 - 最后一条消息的预览文本 */
[data-fiora="linkman-preview"]

/* 联系人未读数 - 未读消息数量徽章 */
[data-fiora="linkman-unread"]
```

### 聊天区域

```css
/* ===== 聊天头部 ===== */
/* 聊天头部栏 - 显示聊天对象信息和操作按钮的头部栏 */
[data-fiora="chat-header"]

/* 聊天对象名称 - 显示当前聊天对象的名称 */
[data-fiora="chat-header-name"]

/* 在线人数 - 群组中显示在线成员数量（如：群组(5)） */
[data-fiora="chat-header-online-count"]

/* 在线状态 - 显示在线/离线状态（如：在线/离线） */
[data-fiora="chat-header-status"]

/* 聊天头部按钮容器 - 包含分享、功能等操作按钮 */
[data-fiora="chat-header-buttons"]

/* ===== 消息列表 ===== */
/* 消息列表容器 - 所有消息的滚动容器 */
[data-fiora="message-list"]

/* 消息项 - 单条消息的容器 */
[data-fiora="message-item"]

/* 自己发送的消息 - 使用 data-self="true" 标识 */
[data-fiora="message-item"][data-self="true"]

/* 他人发送的消息 - 使用 data-self="false" 标识 */
[data-fiora="message-item"][data-self="false"]

/* 消息头像 - 发送者的头像图片 */
[data-fiora="message-avatar"]

/* 消息名称和时间块 - 包含用户标签、用户名和时间的容器 */
[data-fiora="message-name-time"]

/* 用户标签 - 显示在用户名前的标签（如：管理员、VIP等） */
[data-fiora="message-tag"]

/* 消息用户名 - 发送者的显示名称 */
[data-fiora="message-username"]

/* 消息时间 - 消息的发送时间 */
[data-fiora="message-time"]

/* 消息内容包装器 - 包含消息内容和操作按钮的容器（悬停时显示按钮） */
[data-fiora="message-content-wrapper"]

/* 消息内容 - 消息的实际内容容器（文本、图片、代码等） */
[data-fiora="message-content"]

/* 消息按钮列表 - 悬停时显示的按钮列表（如：撤回按钮）
 * 默认仅在鼠标悬停在消息上时显示，可以通过CSS自定义显示方式
 * 示例：始终显示或使用其他触发方式
 */
[data-fiora="message-button-list"]

/* 消息箭头 - 消息气泡的指向箭头 */
[data-fiora="message-arrow"]

/* ===== 消息内容类型 ===== */
/* 文本消息 - 纯文本消息内容 */
[data-fiora="message-text"]

/* 图片消息容器 - 图片消息的容器 */
[data-fiora="message-image"]

/* 图片消息内容 - 图片消息中的实际图片元素 */
[data-fiora="message-image-content"]

/* 代码消息 - 代码消息的容器（点击可查看完整代码） */
[data-fiora="message-code"]

/* 文件消息 - 文件消息的容器（点击可下载文件） */
[data-fiora="message-file"]

/* URL消息 - 链接消息的容器 */
[data-fiora="message-url"]

/* 邀请消息容器 - 群组邀请消息的容器 */
[data-fiora="message-invite"]

/* 邀请消息信息 - 邀请消息中的邀请信息文本 */
[data-fiora="message-invite-info"]

/* 邀请消息按钮 - 邀请消息中的"加入"按钮 */
[data-fiora="message-invite-button"]

/* 系统消息容器 - 系统消息的容器（如：xxx 加入了群组） */
[data-fiora="message-system"]

/* 系统消息用户名 - 系统消息中涉及的用户名 */
[data-fiora="message-system-username"]

/* 系统消息内容 - 系统消息的实际内容 */
[data-fiora="message-system-content"]

/* ===== 输入框 ===== */
/* 输入框容器 - 聊天输入框的外层容器 */
[data-fiora="chat-input"]

/* 输入表单 - 输入框的表单容器 */
[data-fiora="chat-input-form"]

/* 输入框字段 - 实际的输入框元素（input/textarea） */
[data-fiora="chat-input-field"]

/* 输入框提示 - 输入框的提示图标（i图标，显示粘贴图片等提示） */
[data-fiora="chat-input-hint"]
```

### 弹窗

```css
/* 弹窗遮罩 - 弹窗的背景遮罩层（半透明背景） */
[data-fiora="dialog-mask"]

/* 弹窗容器 - 弹窗的主体容器 */
[data-fiora="dialog"]

/* 弹窗头部 - 弹窗的标题栏区域 */
[data-fiora="dialog-header"]

/* 弹窗主体 - 弹窗的主要内容区域（可滚动） */
[data-fiora="dialog-body"]

/* 弹窗底部 - 弹窗的底部操作区域（按钮等） */
[data-fiora="dialog-footer"]
```

### 文字颜色选择器

| 组件 | 文字元素 | 选择器 | 变量 |
|------|---------|--------|------|
| 侧边栏 | 图标 | `[data-fiora="sidebar"] .iconfont` | `--fiora-sidebar-icon-color` |
| 联系人 | 名称 | `[data-fiora="linkman-name"]` | `--fiora-linkman-name-color` |
| 联系人 | 预览 | `[data-fiora="linkman-preview"]` | `--fiora-linkman-preview-color` |
| 联系人 | 时间 | `[data-fiora="linkman-time"]` | `--fiora-linkman-time-color` |
| 聊天头部 | 名称 | `[data-fiora="chat-header"] .name` | `--fiora-text-primary` |
| 消息 | 用户名 | `[data-fiora="message-username"]` | `--fiora-text-primary` |
| 消息 | 时间 | `[data-fiora="message-time"]` | `--fiora-text-secondary` |
| 消息 | 自己内容 | `[data-self="true"] [data-fiora="message-content"]` | `--fiora-msg-bubble-self-color` |
| 消息 | 他人内容 | `:not([data-self="true"]) [data-fiora="message-content"]` | `--fiora-msg-bubble-other-color` |
| 输入框 | 输入文字 | `[data-fiora="chat-input-field"]` | `--fiora-input-color` |
| 输入框 | 占位符 | `[data-fiora="chat-input-field"]::placeholder` | `--fiora-text-tertiary` |

**对比度要求：** 普通文字至少 4.5:1，大号文字至少 3:1（WCAG 2.1标准）

---

## 👋 示例

### 示例 1：极简红色主题

```css
:root {
    --fiora-color-primary: #ff6b6b;
    --fiora-bg-app: #fff5f5;
    --fiora-bg-container: #ffffff;
    --fiora-msg-bubble-self-bg: #ff6b6b;
}
```

### 示例 2：深色主题

```css
:root {
    --fiora-bg-app: #0a0a0a;
    --fiora-bg-container: #1a1a1a;
    --fiora-bg-sidebar: #1e1e1e;
    --fiora-bg-linkman-list: #2a2a2a;
    --fiora-bg-chat: #1e1e1e;
    --fiora-text-primary: #ffffff;
    --fiora-text-secondary: #b0b0b0;
    --fiora-sidebar-icon-color: #ffffff;
    --fiora-linkman-name-color: #ffffff;
    --fiora-linkman-preview-color: #b0b0b0;
    --fiora-msg-bubble-self-bg: #007bff;
    --fiora-msg-bubble-self-color: #ffffff;
    --fiora-msg-bubble-other-bg: #2a2a2a;
    --fiora-msg-bubble-other-color: #ffffff;
}
```

**注意：** 修改背景色时必须同时修改文字颜色，确保对比度 ≥ 4.5:1。

### 示例 3：渐变主题

```css
:root {
    --fiora-bg-app: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --fiora-bg-container: rgba(255, 255, 255, 0.95);
    --fiora-color-primary: #667eea;
    --fiora-msg-bubble-self-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --fiora-msg-bubble-self-color: #ffffff;
}

[data-fiora="main-container"] {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}
```

---

## 🛡️ 安全限制

Fiora 实施十层安全过滤机制：

| 层级 | 防护内容 |
|-----|---------|
| 1️⃣ | 长度限制（最大500KB） |
| 2️⃣ | HTML标签过滤 |
| 3️⃣ | 危险协议阻断 |
| 4️⃣ | 表达式过滤 |
| 5️⃣ | 外部脚本阻止 |
| 6️⃣ | DOM操作过滤 |
| 7️⃣ | 外部@import阻止 |
| 8️⃣ | 外部资源阻止（隐私保护） |
| 9️⃣ | Unicode欺骗防护 |
| 🔟 | 注释长度限制 |

### ❌ 被阻止的内容

```css
background: url(javascript:alert('xss'));
background: url(vbscript:msgbox("xss"));
-moz-binding: url(xss.xml);
behavior: url(xss.htc);
expression(alert('xss'));
@import url("https://example.com/style.css");
background: url("https://tracker.com/track.gif");
```

### ✅ 允许的内容

```css
/* Data URI */
background: url("data:image/png;base64,iVBORw0KGgoAAAANS...");

/* 同源资源 */
background: url("/images/bg.png");
background: url("./images/bg.png");

/* 标准CSS功能 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
backdrop-filter: blur(20px);
animation: slideIn 0.3s ease-out;
```

---

## 🎯 高级技巧

### 1. 使用 `data-fiora` 属性选择器

```css
/* ✅ 推荐 */
[data-fiora="linkman-item"]:hover {
    background: var(--fiora-linkman-item-bg-hover);
}

/* ❌ 不推荐 */
.linkman--3t0ta:hover {
    background: red;
}
```

### 2. 区分自己的消息和他人的消息

```css
[data-fiora="message-item"][data-self="true"] [data-fiora="message-content"] {
    background: var(--fiora-msg-bubble-self-bg);
    color: var(--fiora-msg-bubble-self-color);
}

[data-fiora="message-item"][data-self="false"] [data-fiora="message-content"] {
    background: var(--fiora-msg-bubble-other-bg);
    color: var(--fiora-msg-bubble-other-color);
}
```

### 3. 添加动画效果

```css
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

[data-fiora="message-item"][data-self="false"] {
    animation: slideIn 0.3s ease-out;
}
```

### 4. 自定义弹窗样式

```css
[data-fiora="dialog-mask"] {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

[data-fiora="dialog"] {
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

### 5. 自定义消息类型样式

```css
/* 图片消息 */
[data-fiora="message-image"] {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-fiora="message-image-content"] {
    max-width: 100%;
    cursor: pointer;
    transition: transform 0.2s;
}

[data-fiora="message-image-content"]:hover {
    transform: scale(1.02);
}

/* 代码消息 */
[data-fiora="message-code"] {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

[data-fiora="message-code"]:hover {
    background: #e8e8e8;
}

/* 文件消息 */
[data-fiora="message-file"] {
    background: #f0f0f0;
    border-radius: 8px;
    padding: 12px;
    text-decoration: none;
    display: inline-block;
}

/* 系统消息 */
[data-fiora="message-system"] {
    text-align: center;
    color: var(--fiora-text-secondary);
    font-style: italic;
    padding: 8px 0;
}

/* 邀请消息 */
[data-fiora="message-invite"] {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: transform 0.2s;
}

[data-fiora="message-invite"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
```

### 6. 自定义消息标签和按钮

```css
/* 消息标签（用户标签） */
[data-fiora="message-tag"] {
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    margin-right: 4px;
    font-weight: 500;
}

/* 消息按钮列表（悬停时显示） */
[data-fiora="message-button-list"] {
    opacity: 0;
    transition: opacity 0.2s;
    margin-left: 8px;
}

[data-fiora="message-content-wrapper"]:hover [data-fiora="message-button-list"] {
    opacity: 1;
}

/* 消息按钮列表中的按钮（如撤回按钮）
 * 注意：按钮本身没有 data-fiora 属性，需要使用类名选择器
 */
[data-fiora="message-button-list"] .button {
    background: var(--fiora-color-primary);
    color: var(--fiora-text-inverse);
    border-radius: var(--fiora-border-radius-sm);
    transition: all var(--fiora-transition-fast);
}

[data-fiora="message-button-list"] .button:hover {
    background: var(--fiora-color-primary-hover);
    transform: scale(1.1);
}
```

### 6.1 自定义输入框按钮

```css
/* 输入框中的按钮（表情、功能、发送按钮）
 * 注意：这些按钮没有 data-fiora 属性，需要使用类名选择器
 */
[data-fiora="chat-input"] .iconButton {
    color: var(--fiora-sidebar-icon-color);
    transition: color var(--fiora-transition-fast);
}

[data-fiora="chat-input"] .iconButton:hover {
    color: var(--fiora-sidebar-icon-color-hover);
    transform: scale(1.1);
}
```

### 6.2 自定义聊天头部按钮

```css
/* 聊天头部按钮容器中的按钮（分享、功能按钮）
 * 注意：按钮本身没有 data-fiora 属性，需要使用类名选择器
 */
[data-fiora="chat-header-buttons"] .iconButton {
    color: var(--fiora-sidebar-icon-color);
    transition: color var(--fiora-transition-fast);
}

[data-fiora="chat-header-buttons"] .iconButton:hover {
    color: var(--fiora-sidebar-icon-color-hover);
}
```

### 6.3 自定义功能栏搜索输入框

```css
/* 功能栏中的搜索输入框
 * 注意：搜索输入框没有 data-fiora 属性，需要使用类名选择器
 */
.functionBar input {
    background: var(--fiora-input-bg);
    color: var(--fiora-input-color);
    border: 1px solid var(--fiora-input-border-color);
    border-radius: var(--fiora-input-border-radius);
    padding: var(--fiora-spacing-sm);
    transition: all var(--fiora-transition-fast);
}

.functionBar input:focus {
    outline: none;
    border-color: var(--fiora-color-primary);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}
```

### 7. 自定义滚动条样式

```css
/* 消息列表滚动条
 * 注意：Fiora 使用 .show-scrollbar 类来控制滚动条的显示
 */
[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar-track {
    background: var(--fiora-bg-container);
    border-radius: 3px;
}

[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar-thumb {
    background: var(--fiora-border-color);
    border-radius: 3px;
    transition: background var(--fiora-transition-fast);
}

[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--fiora-border-color-dark);
}

/* 联系人列表滚动条 */
[data-fiora="linkman-list"].show-scrollbar::-webkit-scrollbar {
    width: 6px;
}

[data-fiora="linkman-list"].show-scrollbar::-webkit-scrollbar-thumb {
    background: var(--fiora-border-color);
    border-radius: 3px;
}
```

### 8. 自定义在线状态指示器

```css
/* 在线状态指示器
 * 注意：使用全局类名 .online 和 .offline
 */
.online {
    background-color: var(--fiora-green-500) !important;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

.offline {
    background-color: var(--fiora-gray-500) !important;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
```

### 9. 响应式设计

```css
@media only screen and (max-width: 500px) {
    :root {
        --fiora-container-width: 100%;
        --fiora-container-height: 100vh;
    }
    
    [data-fiora="main-container"] {
        border-radius: 0;
    }
    
    [data-fiora="sidebar"] {
        width: 60px;
    }
    
    /* 移动端消息样式调整 */
    [data-fiora="message-content"] {
        max-width: 85%;
    }
}
```

---

## ❓ 常见问题

### Q: 为什么我的CSS没有生效？

**A:** 可能的原因：
1. 选择器优先级不够，尝试添加 `!important`（但注意某些保护规则无法覆盖）
2. 使用了不稳定的CSS Modules类名，请改用 `data-fiora` 属性或CSS变量
3. 浏览器缓存，请 Ctrl+F5 强制刷新
4. Service Worker 缓存，请清除 Service Worker 缓存

### Q: 如何调试我的自定义CSS？

**A:** 
1. 按 F12 打开浏览器开发者工具
2. 在 Elements 标签中查看元素的 `data-fiora` 属性
3. 在 Console 中运行：
   ```javascript
   document.querySelectorAll('[data-fiora]')
   getComputedStyle(document.documentElement).getPropertyValue('--fiora-color-primary')
   ```

### Q: 如何确保文字可读性？

**A:** 修改背景色时必须同时修改文字颜色：
```css
:root {
    --fiora-bg-sidebar: #1e1e1e;
    --fiora-sidebar-icon-color: #ffffff;
    --fiora-linkman-name-color: #ffffff;
    --fiora-linkman-preview-color: #b0b0b0;
}
```

**对比度要求：** 普通文字至少 4.5:1，大号文字至少 3:1

### Q: 如果我的CSS导致页面无法使用怎么办？

**A:** 使用安全模式：
1. 在 URL 后添加 `?safeMode=true`
2. 安全模式会禁用所有用户自定义 CSS
3. 进入设置面板，清除或修复你的 CSS
4. 移除 URL 中的 `?safeMode=true` 恢复正常模式

### Q: 我能修改布局吗？

**A:** 可以，但以下属性**无法修改**（使用`!important`保护）：
- `[data-fiora="main-container"]` 的 `display`
- `[data-fiora="app"]` 的 `overflow`
- `[data-fiora="message-list"]` 和 `[data-fiora="linkman-list"]` 的滚动属性
- 关键UI组件的可见性和交互性

推荐修改：宽度、高度、内外边距、字体、颜色、动画效果、背景、边框、阴影

---

## 📚 最佳实践

1. **优先使用 CSS 变量**：通过修改变量改变样式，而非直接覆盖规则
2. **使用 `!important` 时要谨慎**：仅在必要时使用
3. **保持响应式**：使用 `@media only screen and (max-width: 500px)` 适配移动端
4. **测试你的主题**：测试浅色和深色背景、不同屏幕尺寸、文字对比度
5. **组织你的自定义 CSS**：按变量定义、全局样式、布局、组件样式、动画、媒体查询的顺序组织

---

## 📝 全局类名完整清单

以下全局类名是稳定的，可以安全使用（不会随 CSS Modules 哈希变化）：

### 主要容器
- `.app` - 应用根容器
- `.sidebar` - 侧边栏
- `.blur` - 背景模糊层
- `.child` - 主容器

### 联系人区域
- `.functionBar` - 功能栏（搜索栏）
- `.functionBarAndLinkmanList` - 联系人区域容器
- `.container` - 通用容器

### 消息相关
- `.message` - 消息容器
- `.self` - 自己发送的消息（配合 `.message.self` 使用）
- `.right` - 消息右侧内容区域
- `.nicknameTimeBlock` - 用户名和时间块
- `.contentButtonBlock` - 内容和按钮块
- `.content` - 消息内容
- `.buttonList` - 消息按钮列表
- `.arrow` - 消息箭头
- `.tag` - 用户标签
- `.nickname` - 用户名
- `.time` - 时间
- `.avatar` - 头像

### 聊天头部
- `.headerBar` - 聊天头部栏
- `.name` - 聊天对象名称
- `.buttonContainer` - 按钮容器
- `.status` - 状态显示

### 输入框
- `.chat-input` - 输入框容器
- `.chat-input-form` - 输入表单

### 其他
- `.system` - 系统消息
- `.online` - 在线状态
- `.offline` - 离线状态

**注意：** 优先使用 `data-fiora` 属性选择器，全局类名仅作为补充。如果某个元素有 `data-fiora` 属性，应优先使用该属性而非类名。

---

**提示：**
- 开始时建议先修改CSS变量，熟悉后再使用高级选择器
- 修改背景色时务必同时修改文字颜色，确保可读性
- 使用`data-fiora`属性选择器比类名选择器更稳定
- 所有消息类型都有对应的 `data-fiora` 属性，可以直接选择
