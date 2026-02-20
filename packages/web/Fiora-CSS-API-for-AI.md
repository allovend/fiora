# Fiora CSS Customization API for AI

## Task
Generate CSS code for Fiora chat application customization. Use the provided selectors, variables, and structure to create complete CSS that customizes all elements and layouts.

## System Architecture

Fiora uses a three-layer CSS architecture:

1. **Foundation Layer** (`base-styles.ts`): Layout and logic, uses `!important`, injected first via `injectBaseStyles()`
2. **Semantic Variable Layer** (`default-theme.ts`): 50+ CSS variables, no `!important`, injected second via `injectDefaultTheme()`
3. **Presentation Layer**: Default theme styles, can be overridden by user CSS

### CSS Loading Order

1. Foundation styles (`base-styles.ts`) - `!important` protection
2. Default theme (`default-theme.ts`) - variable definitions
3. User custom CSS - injected via `injectCustomCss()` to `#user-custom-css`
4. Protected UI styles (`ensureProtectedUiCss()`) - `!important`, injected last

### CSS Priority Rules

1. `!important` declarations (highest)
2. Inline styles
3. ID selectors
4. Class selectors, attribute selectors, pseudo-class selectors
5. Element selectors, pseudo-element selectors

### !important Usage Guidelines

**CRITICAL**: Foundation layer uses `!important` for protected properties. To override Foundation layer styles, User CSS **MUST** also use `!important` for the same properties. However, **DO NOT** use `!important` unnecessarily - only when overriding Foundation layer protected properties or when absolutely necessary for specificity conflicts.

**Examples**:
- ✅ Override Foundation: `[data-fiora="main-container"] { width: 90% !important; }` (if Foundation sets width with !important)
- ✅ Override protected scroll: `[data-fiora="message-list"] { overflow-y: scroll !important; }` (Foundation protects overflow-y)
- ❌ Unnecessary: `[data-fiora="linkman-name"] { color: red !important; }` (no Foundation protection, regular specificity works)

### Protected Rules (Cannot Override)

| Selector | Protected Properties | z-index | Layer | Notes |
|----------|---------------------|---------|-------|-------|
| `[data-fiora="main-container"]` | `display` | - | Foundation | Prevents app disappearance (responsive: mobile fullscreen) |
| `[data-fiora="app"]` | `overflow` | - | Foundation | Prevents scrollbar issues |
| `[data-fiora="message-list"]`, `[data-fiora="linkman-list"]` | `overflow-y`, `overflow-x` | - | Foundation | Ensures scrollability |
| `#admin-entry`, `[data-fiora="admin-entry"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | Dual | Admin entry protection |
| `#sidebar-root`, `[data-fiora="sidebar"]` | `display`, `visibility`, `opacity`, `pointer-events` | - | Dual | Sidebar protection |
| `#sidebar-buttons` | `display`, `visibility`, `opacity`, `pointer-events` | - | Protected UI | Sidebar buttons protection |
| `.admin-console-wrap.admin-console-visible` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | Protected UI | Admin console (visible only) |
| `[data-fiora="dialog"][data-fiora~="setting-dialog"]`, `.rc-dialog[class*="setting"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | Foundation | Settings dialog (class-based) |
| `[data-fiora="dialog-mask"][data-fiora~="setting-dialog-mask"]`, `.rc-dialog-wrap[class*="setting"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483646` | Foundation | Settings dialog mask |
| `.login-dialog-wrap-visible[data-fiora="dialog-mask"]` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | Dual | Login dialog (visible only, class-based) |
| `[data-fiora="error-message"]`, `.message-error`, `.ant-message` | `display`, `visibility`, `opacity`, `pointer-events`, `z-index` | `2147483647` | Foundation | Error message protection |
| `[data-fiora="dialog-mask"]` | - | `1050` | Foundation | Dialog mask z-index (overridable default) |

### Z-Index Hierarchy

Follow this stacking order to prevent element occlusion:

| Layer | z-index Range | Elements | Notes |
|-------|--------------|----------|-------|
| Root Background | -1 | Background layers | Behind all content |
| Main Layout | 1-10 | Containers, sidebars, lists | Base layout elements |
| Overlays | 20-50 | Message buttons, tooltips | Floating action elements |
| Sticky Headers | 100 | Chat header, fixed toolbars | Sticky navigation |
| Dialog Masks | 1050 | Dialog backgrounds | Foundation default |
| Dialog Windows | 1060 | Dialog content | Above masks |
| Protected Admin | 2147483647 | Admin console, critical UI | Maximum browser z-index |

**Rule**: When setting custom z-index, ensure it doesn't conflict with protected elements. Use values within the appropriate range for your element type.

---

## DOM Structure

### Complete Hierarchy

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
    │               ├── [data-fiora="linkman-avatar"]
    │               └── [data-fiora="linkman-info"]
    │                   ├── [data-fiora="linkman-name-time"]
    │                   │   ├── [data-fiora="linkman-name"]
    │                   │   └── [data-fiora="linkman-time"]
    │                   └── [data-fiora="linkman-preview-unread"]
    │                       ├── [data-fiora="linkman-preview"]
    │                       └── [data-fiora="linkman-unread"]
    └── [data-fiora="chat-area"]
        ├── [data-fiora="chat-header"]
        │   ├── .buttonContainer (mobile only)
        │   ├── [data-fiora="chat-header-name"]
        │   │   ├── [data-fiora="chat-header-online-count"]
        │   │   ├── [data-fiora="chat-header-status"]
        │   │   └── [data-fiora="chat-header-mobile-status"] (mobile only)
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
            ├── .iconButton (no data-fiora)
            ├── [data-fiora="chat-input-form"]
            │   ├── [data-fiora="chat-input-field"]
            │   └── [data-fiora="chat-input-hint"] (desktop only, when not focused)
            └── .iconButton (no data-fiora)
```

### Dialog Structure

```
[data-fiora="dialog-mask"]
└── [data-fiora="dialog"]
    ├── [data-fiora="dialog-header"]
    ├── [data-fiora="dialog-body"]
    └── [data-fiora="dialog-footer"]
```

### Critical Selector Rules

- `.functionBar`: No `data-fiora`, MUST use class selector
- Selected contact: `[data-fiora~="linkman-focus"]` (token-based selector)
- Own messages: `[data-fiora="message-item"][data-self="true"]` or `[data-fiora~="message-self"]` (right side, `row-reverse`)
- Others' messages: `[data-fiora="message-item"]:not([data-self="true"])` or `[data-fiora~="message-other"]` (left side, `row`)
- Chat type: Group chats show `[data-fiora="chat-header-online-count"]` (online members count), private chats do not. Use this to distinguish: `[data-fiora="chat-header"]:has([data-fiora="chat-header-online-count"])` for groups
- Dialog attributes: Only exist when `visible={true}` (dynamic)
- Message button list: `[data-fiora="message-button-list"]` (hidden by default, shows on hover)
- Message structure: `message-item` → `message-avatar` + `.right` (`.right` has no `data-fiora`, use class selector)
- Message types: All have `data-fiora`: `message-text`, `message-image`, `message-code`, `message-file`, `message-url`, `message-invite`, `message-system`
- Global class names: Stable, no CSS Modules hash: `.app`, `.sidebar`, `.message`, `.self`, `.content`, `.functionBar`, `.right`, `.nicknameTimeBlock`, `.contentButtonBlock`, `.buttonList`, `.arrow`
- Glass effect: Use `[data-aero="true"]` selector for: `sidebar`, `linkman-area`, `chat-area`, `chat-header`, `chat-input`, `linkman-item`

---

## CSS Variables

### Primary Colors
```css
--fiora-color-primary: #7c3aed;
--fiora-color-primary-hover: #6d28d9;
--fiora-color-primary-active: #5b21b6;
--fiora-color-secondary: #007bff;
--fiora-color-accent: #7c3aed;
```

### Background Colors
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

### Text Colors
```css
--fiora-text-primary: #1e293b;
--fiora-text-secondary: #64748b;
--fiora-text-tertiary: #94a3b8;
--fiora-text-inverse: #ffffff;
```

### Border Colors
```css
--fiora-border-color: #dee2e6;
--fiora-border-color-light: #e9ecef;
--fiora-border-color-dark: #ced4da;
```

### Message Bubbles
```css
--fiora-msg-bubble-self-bg: #7c3aed;
--fiora-msg-bubble-self-color: #ffffff;
--fiora-msg-bubble-other-bg: #f1f5f9;
--fiora-msg-bubble-other-color: #1e293b;
--fiora-msg-bubble-radius: 12px;
--fiora-msg-bubble-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
```

### Contact List
```css
--fiora-linkman-item-bg: transparent;
--fiora-linkman-item-bg-hover: #f5f3ff;
--fiora-linkman-item-bg-active: #ede9fe;
--fiora-linkman-name-color: #1e293b;
--fiora-linkman-preview-color: #64748b;
--fiora-linkman-time-color: #94a3b8;
```

### Sidebar
```css
--fiora-sidebar-icon-color: #6c757d;
--fiora-sidebar-icon-color-hover: #7c3aed;
--fiora-sidebar-icon-color-active: #7c3aed;
```

### Input
```css
--fiora-input-bg: #ffffff;
--fiora-input-color: #1e293b;
--fiora-input-border-color: rgba(0,0,0,0.1);
--fiora-input-border-radius: 8px;
```

### Dimensions
```css
--fiora-container-width: 95%;
--fiora-container-max-width: 1200px;
--fiora-container-height: 85vh;
--fiora-sidebar-width: 70px;
--fiora-linkman-list-width: 280px;
--fiora-avatar-size: 40px;
```

### Border Radius
```css
--fiora-border-radius-sm: 4px;
--fiora-border-radius-md: 8px;
--fiora-border-radius-lg: 12px;
--fiora-border-radius-xl: 16px;
```

### Spacing
```css
--fiora-spacing-xs: 4px;
--fiora-spacing-sm: 8px;
--fiora-spacing-md: 16px;
--fiora-spacing-lg: 24px;
--fiora-spacing-xl: 32px;
```

### Transitions
```css
--fiora-transition-fast: 0.15s;
--fiora-transition-base: 0.3s;
--fiora-transition-slow: 0.5s;
--fiora-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--fiora-ease-out: cubic-bezier(0, 0, 0.2, 1);
--fiora-ease-in: cubic-bezier(0.4, 0, 1, 1);
--fiora-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Shadows
```css
--fiora-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--fiora-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--fiora-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--fiora-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

### Global Primitives (Colors)
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

## Stable Selectors Reference

### Main Containers
- `[data-fiora="app"]` - Root container
- `[data-fiora="main-container"]` - Main container (sidebar + contacts + chat)
- `[data-fiora="sidebar"]` - Sidebar
- `[data-fiora="linkman-area"]` - Contact area
- `[data-fiora="chat-area"]` - Chat area

### Contact List
- `[data-fiora="linkman-list"]` - Contact list container
- `[data-fiora="linkman-item"]` - Contact item
- `[data-fiora="linkman-avatar"]` - Contact avatar
- `[data-fiora="linkman-info"]` - Contact info container
- `[data-fiora="linkman-name-time"]` - Name and time block
- `[data-fiora="linkman-name"]` - Contact name
- `[data-fiora="linkman-time"]` - Last message time
- `[data-fiora="linkman-preview-unread"]` - Preview and unread block
- `[data-fiora="linkman-preview"]` - Message preview
- `[data-fiora="linkman-unread"]` - Unread count badge

### Chat Area
- `[data-fiora="chat-header"]` - Chat header
- `[data-fiora="chat-header-name"]` - Chat object name
- `[data-fiora="chat-header-online-count"]` - Online members count
- `[data-fiora="chat-header-status"]` - Online/offline status
- `[data-fiora="chat-header-mobile-status"]` - Mobile status (mobile only)
- `[data-fiora="chat-header-buttons"]` - Header buttons container

### Message List
- `[data-fiora="message-list"]` - Message list container
- `[data-fiora="message-item"]` - Message item
- `[data-fiora="message-item"][data-self="true"]` - Own message
- `[data-fiora="message-item"][data-self="false"]` - Others' message
- `[data-fiora="message-avatar"]` - Message avatar
- `[data-fiora="message-name-time"]` - Name and time block
- `[data-fiora="message-tag"]` - User tag
- `[data-fiora="message-username"]` - Username
- `[data-fiora="message-time"]` - Message time
- `[data-fiora="message-content-wrapper"]` - Content and button wrapper
- `[data-fiora="message-content"]` - Message content
- `[data-fiora="message-button-list"]` - Button list (hover only)
- `[data-fiora="message-arrow"]` - Message arrow

### Message Types
- `[data-fiora="message-text"]` - Text message
- `[data-fiora="message-image"]` - Image message container
- `[data-fiora="message-image-content"]` - Image element
- `[data-fiora="message-code"]` - Code message
- `[data-fiora="message-file"]` - File message
- `[data-fiora="message-url"]` - URL message
- `[data-fiora="message-invite"]` - Invite message container
- `[data-fiora="message-invite-info"]` - Invite info
- `[data-fiora="message-invite-button"]` - Join button
- `[data-fiora="message-system"]` - System message container
- `[data-fiora="message-system-username"]` - System message username
- `[data-fiora="message-system-content"]` - System message content

### Input
- `[data-fiora="chat-input"]` - Input container
- `[data-fiora="chat-input-form"]` - Input form
- `[data-fiora="chat-input-field"]` - Input field
- `[data-fiora="chat-input-hint"]` - Hint icon (desktop only, when not focused)

### Dialogs
- `[data-fiora="dialog-mask"]` - Dialog mask
- `[data-fiora="dialog"]` - Dialog container
- `[data-fiora="dialog-header"]` - Dialog header
- `[data-fiora="dialog-body"]` - Dialog body
- `[data-fiora="dialog-footer"]` - Dialog footer

### Elements Without data-fiora (Use Class Selectors)
- `.functionBar` - Search bar
- `.functionBar input` - Search input field
- `.container` - Generic container (inside linkman-area)
- `.right` - Message right content area
- `.iconButton` - Icon buttons (in chat-input, chat-header-buttons)
- `.button` - Buttons (in message-button-list)
- `.buttonContainer` - Button container (mobile header)
- `.show-scrollbar` - Scrollbar visibility class
- `.online` - Online status indicator
- `.offline` - Offline status indicator

---

## Text Color Selectors

| Component | Text Element | Selector | Variable |
|-----------|-------------|----------|----------|
| Sidebar | Icon | `[data-fiora="sidebar"] .iconfont` | `--fiora-sidebar-icon-color` |
| Contact | Name | `[data-fiora="linkman-name"]` | `--fiora-linkman-name-color` |
| Contact | Preview | `[data-fiora="linkman-preview"]` | `--fiora-linkman-preview-color` |
| Contact | Time | `[data-fiora="linkman-time"]` | `--fiora-linkman-time-color` |
| Chat Header | Name | `[data-fiora="chat-header"] .name` | `--fiora-text-primary` |
| Message | Username | `[data-fiora="message-username"]` | `--fiora-text-primary` |
| Message | Time | `[data-fiora="message-time"]` | `--fiora-text-secondary` |
| Message | Own content | `[data-self="true"] [data-fiora="message-content"]` | `--fiora-msg-bubble-self-color` |
| Message | Others' content | `:not([data-self="true"]) [data-fiora="message-content"]` | `--fiora-msg-bubble-other-color` |
| Input | Text | `[data-fiora="chat-input-field"]` | `--fiora-input-color` |
| Input | Placeholder | `[data-fiora="chat-input-field"]::placeholder` | `--fiora-text-tertiary` |

**Contrast Requirements**: Normal text ≥ 4.5:1, large text ≥ 3:1 (WCAG 2.1)

---

## Security Restrictions

Ten-layer security filtering:
1. Length limit (max 500KB)
2. HTML tag filtering
3. Dangerous protocol blocking
4. Expression filtering
5. External script blocking
6. DOM manipulation filtering
7. External @import blocking
8. External resource blocking (privacy protection)
9. Unicode spoofing protection
10. Comment length limit

### Blocked
```css
background: url(javascript:alert('xss'));
background: url(vbscript:msgbox("xss"));
-moz-binding: url(xss.xml);
behavior: url(xss.htc);
expression(alert('xss'));
@import url("https://example.com/style.css");
background: url("https://tracker.com/track.gif");
```

### Allowed
```css
/* Data URI */
background: url("data:image/png;base64,iVBORw0KGgoAAAANS...");

/* Same-origin resources */
background: url("/images/bg.png");
background: url("./images/bg.png");

/* Standard CSS features */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
backdrop-filter: blur(20px);
animation: slideIn 0.3s ease-out;
```

---

## Implementation Rules

### Rule 1: data-fiora Attribute Selectors
MUST use `[data-fiora="..."]` for all elements with this attribute. DO NOT use CSS Modules class names (they have hashes).

### Rule 2: Own vs Others' Messages
MUST distinguish using `[data-self="true"]` or `[data-fiora~="message-self"]` for own messages, `:not([data-self="true"])` or `[data-fiora~="message-other"]` for others.
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

### Rule 3: Selected Contact
MUST use `[data-fiora~="linkman-focus"]` to style selected contact (token-based selector).
```css
[data-fiora~="linkman-focus"] {
    background: var(--fiora-linkman-item-bg-active);
}
```

### Rule 4: Message Button List
Default: hidden, shows on hover via `[data-fiora="message-content-wrapper"]:hover [data-fiora="message-button-list"]`. CAN be customized to always show or use different trigger.
```css
[data-fiora="message-button-list"] {
    display: none;
}

[data-fiora="message-content-wrapper"]:hover [data-fiora="message-button-list"] {
    display: flex;
}
```

### Rule 5: Buttons Without data-fiora
MUST use class selectors for buttons without `data-fiora`: `.button` (in message-button-list), `.iconButton` (in chat-input, chat-header-buttons), `.functionBar input` (search input).
```css
/* Message buttons */
[data-fiora="message-button-list"] .button {
    /* styles */
}

/* Input buttons */
[data-fiora="chat-input"] .iconButton {
    /* styles */
}

/* Header buttons */
[data-fiora="chat-header-buttons"] .iconButton {
    /* styles */
}

/* Search input */
.functionBar input {
    /* styles */
}
```

### Rule 6: Glass Effect
MUST use `[data-aero="true"]` selector for glass effect. Supported components: `sidebar`, `linkman-area`, `chat-area`, `chat-header`, `chat-input`, `linkman-item`.
```css
[data-fiora="sidebar"][data-aero="true"] {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.8);
}
```

### Rule 7: Scrollbar Customization
MUST use `.show-scrollbar` class selector for scrollbar styling. Apply to `[data-fiora="message-list"]` and `[data-fiora="linkman-list"]`.

**Important**: To prevent layout shift when scrollbar appears, use `scrollbar-gutter: stable;` on scroll containers.

```css
[data-fiora="message-list"] {
    scrollbar-gutter: stable; /* Prevents layout shift */
}

[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar {
    width: 6px;
}

[data-fiora="message-list"].show-scrollbar::-webkit-scrollbar-thumb {
    background: var(--fiora-border-color);
    border-radius: 3px;
}
```

### Rule 8: Online Status Indicators
MUST use `.online` and `.offline` global class names for status indicators.
```css
.online {
    background-color: var(--fiora-green-500) !important;
}

.offline {
    background-color: var(--fiora-gray-500) !important;
}
```

### Rule 9: Responsive Design
MUST include `@media (max-width: 768px)` for mobile device customization.

**iOS Safe Area**: For devices with notches (iPhone X+), use `env(safe-area-inset-*)` to handle safe areas.

```css
@media (max-width: 768px) {
    [data-fiora="main-container"] {
        width: 100%;
        height: 100%;
        border-radius: 0;
    }
    
    [data-fiora="message-item"] .right {
        max-width: 85%;
    }
    
    /* iOS safe area support */
    [data-fiora="chat-input"] {
        padding-bottom: env(safe-area-inset-bottom);
    }
    
    [data-fiora="main-container"] {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
    }
}
```

### Rule 10: Message Type Customization
MUST customize all message types using their `data-fiora` attributes: `message-text`, `message-image`, `message-code`, `message-file`, `message-url`, `message-invite`, `message-system`.
```css
/* Image messages */
[data-fiora="message-image"] {
    border-radius: var(--fiora-border-radius-md);
    overflow: hidden;
    box-shadow: var(--fiora-shadow-md);
}

/* Code messages */
[data-fiora="message-code"] {
    background: #f5f5f5;
    border: 1px solid var(--fiora-border-color);
    border-radius: var(--fiora-border-radius-md);
    padding: var(--fiora-spacing-sm);
    font-family: 'Courier New', monospace;
}

/* File messages */
[data-fiora="message-file"] {
    background: var(--fiora-bg-container);
    border: 1px solid var(--fiora-border-color);
    border-radius: var(--fiora-border-radius-md);
    padding: var(--fiora-spacing-sm);
}

/* System messages */
[data-fiora="message-system"] {
    text-align: center;
    color: var(--fiora-text-secondary);
    font-size: 12px;
}
```

### Rule 11: Animation and Transitions
MUST include smooth animations for better UX. Use CSS variables for transition timing.

**Required animations**:
- Message items: Entry animation (fade-in + slide-up)
- Contact items: Hover transition
- Buttons: Hover/active state transitions
- Dialogs: Open/close animations

```css
/* Message entry animation */
@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

[data-fiora="message-item"] {
    animation: messageSlideIn var(--fiora-transition-base) var(--fiora-ease-out);
}

/* Contact hover transition */
[data-fiora="linkman-item"] {
    transition: background var(--fiora-transition-fast) var(--fiora-ease-in-out);
}

/* Dialog open animation */
@keyframes dialogFadeIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

[data-fiora="dialog"] {
    animation: dialogFadeIn var(--fiora-transition-base) var(--fiora-ease-out);
}
```

### Rule 12: Z-Index Management
MUST respect z-index hierarchy to prevent element occlusion. Use values within appropriate ranges.

**Z-index ranges**:
- Background layers: -1 to 0
- Main layout: 1-10
- Overlays (message buttons, tooltips): 20-50
- Sticky headers: 100
- Dialog masks: 1050 (Foundation default, can override)
- Dialog windows: 1060
- Protected admin: 2147483647 (DO NOT override)

```css
/* Example: Message button overlay */
[data-fiora="message-button-list"] {
    z-index: 20;
}

/* Example: Custom tooltip */
.custom-tooltip {
    z-index: 30;
}

/* Example: Sticky header */
[data-fiora="chat-header"] {
    z-index: 100;
}
```

### Rule 13: Ant Design Component Overrides
Fiora integrates Ant Design. When styling notifications or tooltips, use these selectors:

**Ant Design components**:
- `.ant-message-notice`: Global feedback messages (rendered in portal)
- `.ant-message`: Message container
- `.ant-tooltip`: Hover tooltips
- `.ant-popover`: Pop-up cards
- `.ant-modal`: Modal dialogs (if used)

**Note**: These elements are often rendered outside `[data-fiora="app"]` in a portal. Use `body > .ant-component` selectors if needed.

```css
/* Ant Design message notifications */
.ant-message {
    z-index: 2147483647; /* Protected, but can style colors */
}

.ant-message-notice-content {
    background: var(--fiora-bg-dialog);
    color: var(--fiora-text-primary);
    border-radius: var(--fiora-border-radius-md);
}

/* Ant Design tooltips */
.ant-tooltip-inner {
    background: var(--fiora-bg-dialog);
    color: var(--fiora-text-primary);
    border-radius: var(--fiora-border-radius-sm);
}
```

### Rule 14: Negative Constraints (DO NOT)
MUST NOT generate CSS that:

1. **Security violations**:
   - ❌ `content: url("javascript:...")` - No script injection
   - ❌ `behavior: url(...)` - No external behaviors
   - ❌ `expression(...)` - No CSS expressions
   - ❌ `@import url("http://...")` - No external imports

2. **Layout breaking**:
   - ❌ Override protected properties without `!important` (will be ignored)
   - ❌ Set `display: none` on protected elements (will be overridden)
   - ❌ Use z-index > 2147483647 (browser maximum)

3. **Performance issues**:
   - ❌ Excessive `filter` or `backdrop-filter` on many elements (causes lag)
   - ❌ Complex animations on scroll (causes jank)
   - ❌ Large base64 images in CSS (increases file size)

4. **Accessibility violations**:
   - ❌ Text contrast < 4.5:1 for normal text
   - ❌ Text contrast < 3:1 for large text
   - ❌ Remove focus indicators completely

---

## Output Requirements

Generate complete CSS that customizes ALL elements and layouts. Follow these rules:

1. **MUST use CSS variables** for colors, spacing, and design tokens
2. **MUST use `[data-fiora="..."]` selectors** for all elements with this attribute
3. **MUST use class selectors** only when `data-fiora` is unavailable (`.functionBar`, `.right`, `.iconButton`, `.button`, etc.)
4. **MUST NOT override protected properties** - see Protected Rules table
5. **MUST ensure text contrast** - ≥ 4.5:1 for normal text, ≥ 3:1 for large text
6. **MUST handle responsive design** - use `@media (max-width: 768px)` for mobile
7. **MUST NOT use blocked features** - see Security Restrictions
8. **MUST use semantic variable names** - use `--fiora-color-primary`, not hardcoded colors
9. **MUST maintain consistency** - use same variables for similar elements
10. **MUST include hover states** - provide hover styles for all interactive elements
11. **MUST cover all elements** - customize every element mentioned in DOM Structure
12. **MUST use exact selectors** - match selector format exactly as provided
13. **MUST customize all message types** - text, image, code, file, url, invite, system
14. **MUST customize all containers** - app, main-container, sidebar, linkman-area, chat-area
15. **MUST customize all interactive elements** - buttons, inputs, links, avatars
16. **MUST include animations** - entry animations for messages, transitions for interactions
17. **MUST respect z-index hierarchy** - use appropriate z-index ranges
18. **MUST handle Ant Design components** - style `.ant-message`, `.ant-tooltip` if needed
19. **MUST use !important correctly** - only when overriding Foundation layer protected properties
20. **MUST follow negative constraints** - see Rule 14
21. **MUST optimize code size** - merge similar selectors, use CSS shorthand properties (e.g., `margin` instead of `margin-top` + `margin-left`) to reduce file size
22. **MUST prevent layout shift** - use `scrollbar-gutter: stable;` on scroll containers
23. **MUST support iOS safe areas** - use `env(safe-area-inset-*)` for devices with notches

### Example Output Structure

```css
:root {
    /* Override CSS variables */
    --fiora-color-primary: #your-color;
    --fiora-bg-app: #your-bg;
    /* ... all relevant variables ... */
}

/* Animations */
@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Main containers */
[data-fiora="app"] {
    /* styles */
}

/* Specific elements */
[data-fiora="message-item"][data-self="true"] {
    animation: messageSlideIn var(--fiora-transition-base) var(--fiora-ease-out);
    /* styles */
}

/* Elements without data-fiora */
.functionBar input {
    /* styles */
}

/* Ant Design components */
.ant-message-notice-content {
    /* styles */
}

/* Responsive */
@media (max-width: 768px) {
    /* mobile styles */
}
```

### Complete Example: Cyberpunk Glass Theme

```css
:root {
    /* Color palette */
    --fiora-color-primary: #00ff88;
    --fiora-color-primary-hover: #00cc6a;
    --fiora-bg-app: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
    --fiora-bg-container: rgba(26, 26, 46, 0.8);
    --fiora-bg-sidebar: rgba(0, 255, 136, 0.1);
    --fiora-bg-linkman-list: rgba(26, 26, 46, 0.6);
    --fiora-bg-chat: rgba(10, 10, 10, 0.4);
    --fiora-text-primary: #00ff88;
    --fiora-text-secondary: #88ffaa;
    --fiora-text-tertiary: #44aa66;
    --fiora-msg-bubble-self-bg: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
    --fiora-msg-bubble-self-color: #000000;
    --fiora-msg-bubble-other-bg: rgba(0, 255, 136, 0.15);
    --fiora-msg-bubble-other-color: #00ff88;
    --fiora-border-color: rgba(0, 255, 136, 0.3);
    --fiora-shadow-lg: 0 0 20px rgba(0, 255, 136, 0.3);
}

/* Animations */
@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes glow {
    0%, 100% {
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    }
    50% {
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.8);
    }
}

/* Main container with glass effect */
[data-fiora="main-container"] {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--fiora-border-color);
    box-shadow: var(--fiora-shadow-lg);
}

/* Sidebar with neon glow */
[data-fiora="sidebar"] {
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-right: 2px solid var(--fiora-border-color);
}

[data-fiora="sidebar"] .iconfont:hover {
    animation: glow 2s ease-in-out infinite;
}

/* Scroll containers - prevent layout shift */
[data-fiora="message-list"],
[data-fiora="linkman-list"] {
    scrollbar-gutter: stable;
}

/* Messages with entry animation */
[data-fiora="message-item"] {
    animation: messageSlideIn var(--fiora-transition-base) var(--fiora-ease-out);
}

[data-fiora="message-content"] {
    border: 1px solid var(--fiora-border-color);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
}

/* Contact list hover effect */
[data-fiora="linkman-item"] {
    transition: all var(--fiora-transition-fast) var(--fiora-ease-in-out);
    border-left: 3px solid transparent;
}

[data-fiora="linkman-item"]:hover {
    border-left-color: var(--fiora-color-primary);
    background: rgba(0, 255, 136, 0.1);
}

/* Ant Design components */
.ant-message-notice-content {
    background: var(--fiora-bg-container);
    border: 1px solid var(--fiora-border-color);
    color: var(--fiora-text-primary);
    box-shadow: var(--fiora-shadow-lg);
}

/* Responsive */
@media (max-width: 768px) {
    [data-fiora="main-container"] {
        border: none;
    }
}
```

---

## Global Class Names (Stable)

- `.app` - Root container
- `.sidebar` - Sidebar
- `.blur` - Blur background layer
- `.child` - Main container
- `.functionBar` - Search bar
- `.functionBarAndLinkmanList` - Contact area container
- `.container` - Generic container
- `.message` - Message container
- `.self` - Own message (use with `.message.self`)
- `.right` - Message right content area
- `.nicknameTimeBlock` - Username and time block
- `.contentButtonBlock` - Content and button block
- `.content` - Message content
- `.buttonList` - Message button list
- `.arrow` - Message arrow
- `.tag` - User tag
- `.nickname` - Username
- `.time` - Time
- `.avatar` - Avatar
- `.headerBar` - Chat header bar
- `.name` - Chat object name
- `.buttonContainer` - Button container
- `.status` - Status display
- `.chat-input` - Input container
- `.chat-input-form` - Input form
- `.system` - System message
- `.online` - Online status
- `.offline` - Offline status

**Rule**: Prefer `data-fiora` attribute selectors over class names. Use class names only when `data-fiora` is not available.

