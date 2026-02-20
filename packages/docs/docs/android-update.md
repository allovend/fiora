# Android 端“检查更新 / 下载 APK / 安装”实现说明

本文档用于指导 **Android 客户端**对接服务端的更新协议，实现“检查更新 → 提示用户 → 下载/安装”的完整链路。

> 约定：服务端已提供 `latest.json` 更新清单，并通过 HTTPS 域名对外可访问。

---

## 1. 固定入口（必须）

- **更新清单（manifest）URL（固定）**：`https://fiora.nasforjonas.xyz/fiora-app/update/latest.json`
- **APK 直链 URL（由 manifest 下发）**：`manifest.android.apkUrl`
  - 推荐同域名：`https://fiora.nasforjonas.xyz/fiora-app/apk/fiora-<version>.apk`

---

## 2. Manifest JSON 协议（服务端返回）

服务端返回示例：

```json
{
  "version": "1.2.3",
  "build": 12,
  "title": "v1.2.3 更新",
  "notes": "1. 修复若干问题\n2. 优化性能",
  "force": false,
  "minSupportedVersion": "1.1.0",
  "android": {
    "apkUrl": "https://fiora.nasforjonas.xyz/fiora-app/apk/fiora-1.2.3.apk",
    "sha256": "可选：APK文件的sha256",
    "size": 12345678
  }
}
```

字段说明（Android 端重点）：
- **version（必须）**：语义化版本（x.y.z），用于判断是否需要更新
- **title / notes（可选）**：用于弹窗展示
- **force（可选）**：强制更新开关
  - `true`：不允许“稍后”，只允许更新/退出
- **minSupportedVersion（可选）**：最低可用版本（强更策略）
- **android.apkUrl（必须）**：APK 下载直链（HTTPS）
- **android.sha256 / android.size（可选）**：用于下载完整性校验、显示下载大小

---

## 3. 客户端流程（推荐实现）

### 3.1 点击“检查更新”

1) GET 拉取 manifest（建议加 `Cache-Control: no-cache`，避免缓存干扰）
2) 校验 JSON 必要字段
3) 对比版本（语义化版本比较）
4) 根据结果弹窗

### 3.2 版本比较规则（语义化 x.y.z）

- 将 `version` 按 `.` 分割成 `[major, minor, patch]`，缺省补 0
- 从 major → minor → patch 逐位比较

判定：
- 若 `manifest.version` > `currentVersion`：有更新
- 否则：无更新

### 3.3 强更策略

建议两层规则，任意命中都视为强制更新：
- `manifest.force === true`
- 若存在 `minSupportedVersion` 且 `currentVersion < minSupportedVersion`

强更交互建议：
- 仅提供“立即更新”
- 可选提供“退出应用”

---

## 4. 下载与安装策略（两种方案）

### 4.1 最小可用方案（推荐先上线）：打开浏览器下载

优点：无需额外原生改造，成本最低。  
缺点：需要跳转浏览器 → 用户手动安装。

流程：
1) 弹窗点击“立即更新”
2) `Intent.ACTION_VIEW` 打开 `android.apkUrl`
3) 用户在浏览器下载并安装

注意：
- `apkUrl` 必须是 **手机可直接下载**的 HTTPS 直链（不要需要登录、不要复杂跳转）

### 4.2 进阶方案（可选）：应用内下载 + 唤起安装（体验更好）

要点：
- 下载到应用私有目录（cache/downloads）
-（可选）下载完成后校验 `sha256`
- 通过 `FileProvider` 生成 `content://` URI 唤起安装
- 处理 Android 8+ “允许安装未知应用”权限引导

断点续传（推荐）：
- 服务端支持 `Accept-Ranges: bytes`（静态服务器一般支持）
- 客户端使用可断点续传的下载库

---

## 5. APK 存放与 URL 规范（强烈建议）

### 5.1 服务器存放路径（服务端机器）

建议将 APK 放到：
- **服务器目录**：`/opt/fiora/packages/server/public/fiora-app/apk/`

文件命名建议：
- `fiora-<version>.apk`（带版本号，便于 CDN/长缓存与回滚）
  - 示例：`fiora-1.2.3.apk`

### 5.2 对外直链（Android 端使用）

- `https://fiora.nasforjonas.xyz/fiora-app/apk/fiora-1.2.3.apk`

> 前置条件：反代/网关需要把 `/fiora-app/` 路径转发到后端服务（9200）。

---

## 6. 上线前自检清单（非常重要）

### 6.1 Manifest 自检
- `curl -I https://fiora.nasforjonas.xyz/fiora-app/update/latest.json`
  - 期望：`200`
  - 期望 Header：`Cache-Control: no-cache, no-store, must-revalidate`

### 6.2 APK 直链自检
- `curl -I https://fiora.nasforjonas.xyz/fiora-app/apk/fiora-1.2.3.apk`
  - 期望：`200`（或支持 Range 时 `206`）
  - 文件大小与 `manifest.android.size` 一致（若填写）

### 6.3 客户端自检（建议日志）
- 打印最终使用的 manifestUrl（避免占位域名导致 404）
- 打印 manifest.version / currentVersion / hasUpdate
- 有更新时：打印 android.apkUrl（确保为 HTTPS 且可访问）

---

## 7. 常见问题排查

### 7.1 “检查更新失败 404”
优先检查：
- 客户端是否仍在请求占位地址（例如 `your-domain.com`）
- 反代规则是否包含 `/fiora-app/` 前缀转发
- manifest 文件是否部署到服务端并可被外网访问

### 7.2 “发现新版本，但点击更新没反应”
优先检查：
- `android.apkUrl` 是否为空
- `apkUrl` 是否是 HTTPS 直链
- Android 系统是否拦截了未知来源安装（进阶方案需要处理权限）


