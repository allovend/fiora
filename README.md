# [Fiora](https://fiora.suisuijiang.com/) &middot; [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/yinxin630/fiora/blob/master/LICENSE) [![author](https://img.shields.io/badge/author-%E7%A2%8E%E7%A2%8E%E9%85%B1-blue.svg)](http://suisuijiang.com) [![Node.js Version](https://img.shields.io/badge/node.js-14.16.0-blue.svg)](http://nodejs.org/download) [![Test Status](https://github.com/yinxin630/fiora/workflows/Unit%20Test/badge.svg)](https://github.com/yinxin630/fiora/actions?query=workflow%3A%22Unit+Test%22) [![Typescript Status](https://github.com/yinxin630/fiora/workflows/Typescript%20Type%20Check/badge.svg)](https://github.com/yinxin630/fiora/actions?query=workflow%3A%22Typescript+Type+Check%22)


Fiora is an interesting open source chat application. It is developed based on [node.js](https://nodejs.org/), [react](https://reactjs.org/) and [socket.io](https://socket.io/) technologies

- **Richness:** Fiora contains backend and frontend
- **Cross Platform:** Fiora is developed with node.js. Supports Windows / Linux / macOS systems
- **Open Source:** Fiora follows the MIT open source license

Online Example: [https://fiora.suisuijiang.com/](https://fiora.suisuijiang.com/)   
Documentation: [https://yinxin630.github.io/fiora/](https://yinxin630.github.io/fiora/)

**Other Client**   
Vscode Extension: [https://github.com/moonrailgun/fiora-for-vscode](https://github.com/moonrailgun/fiora-for-vscode)   

If you are seek for other open-source IM Application which like discord or slack, maybe try out `Tailchat`: https://tailchat.msgbyte.com/ 

## Features

1. Register an account and log in, it can save your data for a long time
2. Join an existing group or create your own group to communicate with everyone
3. Chat privately with anyone and add them as friends
4. Multiple message types, including text / emoticons / pictures / codes / files / commands, you can also search for emoticons
5. Push notification when you receive a new message, you can customize the notification ringtone, and it can also read the message out
6. Choose the theme you like, and you can set it as any wallpaper and theme color you like
7. Set up an administrator to manage users

## Screenshot

<img src="https://github.com/yinxin630/fiora/raw/master/packages/docs/static/img/screenshots/screenshot-pc.png" alt="PC" style="max-width:800px" />
<img src="https://github.com/yinxin630/fiora/raw/master/packages/docs/static/img/screenshots/screenshot-phone.png" alt="Phone" height="667" style="max-height:667px" />
<img src="https://github.com/yinxin630/fiora/raw/master/packages/docs/static/img/screenshots/screenshot-app.png" alt="App" height="896" style="max-height:896px" />

## Install / 安装

Fiora provides two ways to install

Fiora 提供两种安装方式：

- [Install by source code](https://yinxin630.github.io/fiora/docs/install#how-to-run) / [源码安装](https://yinxin630.github.io/fiora/docs/install#how-to-run)
- [Install by docker](https://yinxin630.github.io/fiora/docs/install#running-on-the-docker) / [Docker 安装](https://yinxin630.github.io/fiora/docs/install#running-on-the-docker)

### Quick Start / 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/yinxin630/fiora.git
cd fiora

# 2. 安装依赖
npm install

# 3. 配置环境变量（创建 .env 文件）
cp .env.example .env
# 编辑 .env 文件，配置 MongoDB、Redis 等

# 4. 启动开发环境
npm run dev:server  # 启动服务端（端口 9200）
npm run dev:web     # 启动 Web 前端（端口 8080）

# 5. 构建生产版本
npm run build:web   # 构建 Web 前端
npm start           # 启动生产环境服务端
```

### Prerequisites / 前置要求

- **Node.js**: >= 14.16.0
- **MongoDB**: >= 4.0
- **Redis**: >= 5.0
- **npm** 或 **yarn**

## Development Guide / 开发指南

### Project Structure / 项目结构

Fiora 采用 monorepo 架构，使用 Lerna 管理多个包：

```
fiora/
├── packages/
│   ├── web/              # Web 前端（React + TypeScript）
│   ├── server/           # 服务端（Koa.js + Socket.IO）
│   ├── database/         # 数据库模型和初始化（Mongoose）
│   ├── config/           # 配置文件（服务端和客户端）
│   ├── utils/            # 工具函数
│   ├── bin/              # 命令行工具和脚本
│   ├── i18n/             # 国际化资源
│   └── docs/             # 文档网站
├── .env                  # 环境变量配置文件
├── package.json          # 根 package.json
└── lerna.json            # Lerna 配置
```

### Technology Stack / 技术栈

**后端 (Backend)**
- **Koa.js**: Web 框架
- **Socket.IO**: 实时通信
- **Mongoose**: MongoDB ODM
- **Redis**: 缓存和配置存储
- **TypeScript**: 类型安全

**前端 (Frontend)**
- **React**: UI 框架
- **Redux**: 状态管理
- **TypeScript**: 类型安全
- **Webpack**: 构建工具
- **Less**: CSS 预处理器

### Key Directories / 关键目录说明

#### 服务端 (`packages/server/src/`)

- `main.ts` - 服务端入口文件，初始化数据库和启动服务器
- `app.ts` - Koa 应用配置，中间件和路由注册
- `routes/` - API 路由处理
  - `user.ts` - 用户相关接口（注册、登录、用户信息等）
  - `message.ts` - 消息相关接口（发送、删除、撤回等）
  - `group.ts` - 群组相关接口（创建、加入、退出等）
  - `upload.ts` - 文件上传接口（支持 multipart 和 base64）
  - `system.ts` - 系统接口（搜索、表情包等）
- `middlewares/` - Koa 中间件
- `types/` - TypeScript 类型定义

#### Web 前端 (`packages/web/src/`)

- `main.tsx` - 前端入口文件
- `App.tsx` - 主应用组件
- `modules/` - 功能模块
  - `Chat/` - 聊天界面
  - `Sidebar/` - 侧边栏（用户信息、设置、下载等）
  - `LoginAndRegister/` - 登录注册
- `components/` - 通用组件
- `state/` - Redux 状态管理
- `service.ts` - API 服务封装
- `socket.ts` - Socket.IO 客户端连接

#### 数据库 (`packages/database/mongoose/models/`)

- `user.ts` - 用户模型
- `message.ts` - 消息模型
- `group.ts` - 群组模型
- `friend.ts` - 好友关系模型
- `history.ts` - 历史记录模型
- `socket.ts` - Socket 连接模型
- `notification.ts` - 通知模型

### API Documentation / API 文档

#### Socket.IO 事件

所有实时通信通过 Socket.IO 进行，主要事件包括：

**客户端发送 (Client → Server)**

- `register` - 注册新用户
  ```typescript
  socket.emit('register', {
    username: string,
    password: string,
    os: string,
    browser: string,
    environment: string
  })
  ```

- `login` - 账密登录
  ```typescript
  socket.emit('login', {
    username: string,
    password: string,
    os: string,
    browser: string,
    environment: string
  })
  ```

- `loginByToken` - Token 登录
  ```typescript
  socket.emit('loginByToken', {
    token: string,
    os: string,
    browser: string,
    environment: string
  })
  ```

- `sendMessage` - 发送消息
  ```typescript
  socket.emit('sendMessage', {
    to: string,           // 接收者 ID（用户或群组）
    type: string,         // 消息类型：'text' | 'image' | 'file' | 'code' | 'invite'
    content: string,      // 消息内容
    width?: number,       // 图片宽度（图片消息）
    height?: number,      // 图片高度（图片消息）
    fileSize?: number,    // 文件大小（文件消息）
    fileName?: string     // 文件名（文件消息）
  })
  ```

- `deleteMessage` - 删除消息
  ```typescript
  socket.emit('deleteMessage', {
    messageId: string
  })
  ```

- `changeAvatar` - 修改头像
  ```typescript
  socket.emit('changeAvatar', {
    avatar: string  // 头像 URL，空字符串表示重置为随机默认头像
  })
  ```

**服务端推送 (Server → Client)**

- `message` - 收到新消息
  ```typescript
  socket.on('message', (message: MessageDocument) => {
    // 处理新消息
  })
  ```

- `deleteMessage` - 消息被删除
  ```typescript
  socket.on('deleteMessage', ({ messageId: string }) => {
    // 处理消息删除
  })
  ```

#### HTTP API

**文件上传**

- `POST /api/upload` - 上传文件
  - Content-Type: `multipart/form-data` 或 `application/x-www-form-urlencoded`
  - Headers: `x-auth-token: <token>` (从 Socket.IO 获取)
  - Body:
    - `file`: 文件（multipart）或 base64 字符串（移动端）
    - `fileName`: 文件名（如 `ImageMessage/xxx.jpg`）
    - `isBase64`: `'true'` 或 `'false'`（移动端传 `'true'`）
  - Response:
    ```json
    {
      "url": "/ImageMessage/xxx.jpg"
    }
    ```
    或
    ```json
    {
      "error": "错误信息"
    }
    ```

### Database Schema / 数据库结构

#### User (用户)

```typescript
{
  _id: ObjectId,
  username: string,           // 用户名（唯一）
  password: string,           // 加密后的密码
  avatar: string,            // 头像 URL
  tag: string,               // 用户标签
  groups: ObjectId[],        // 所属群组 ID 列表
  friends: ObjectId[],       // 好友 ID 列表
  createTime: Date,          // 创建时间
  lastLoginTime: Date,       // 最后登录时间
  lastLoginIp: string        // 最后登录 IP
}
```

#### Message (消息)

```typescript
{
  _id: ObjectId,
  to: ObjectId,              // 接收者 ID（用户或群组）
  from: ObjectId,            // 发送者 ID
  type: string,             // 消息类型：'text' | 'image' | 'file' | 'code' | 'invite'
  content: string,          // 消息内容
  width?: number,           // 图片宽度
  height?: number,          // 图片高度
  fileSize?: number,        // 文件大小
  fileName?: string,        // 文件名
  createTime: Date,         // 创建时间
  deleted: boolean          // 是否已删除（软删除）
}
```

#### Group (群组)

```typescript
{
  _id: ObjectId,
  name: string,             // 群组名称
  avatar: string,          // 群组头像
  creator: ObjectId,       // 创建者 ID
  members: ObjectId[],     // 成员 ID 列表
  isDefault: boolean,      // 是否为默认群组
  createTime: Date        // 创建时间
}
```

### Common Development Tasks / 常见开发任务

#### 1. 添加新的消息类型

1. 在 `packages/database/mongoose/models/message.ts` 中扩展消息类型
2. 在 `packages/server/src/routes/message.ts` 的 `sendMessage` 函数中添加处理逻辑
3. 在 `packages/web/src/modules/Chat/Message/` 中添加对应的消息显示组件
4. 在 `packages/web/src/modules/Chat/ChatInput.tsx` 中添加发送逻辑

#### 2. 添加新的 API 接口

1. 在 `packages/server/src/routes/` 中创建或修改路由文件
2. 在 `packages/server/src/app.ts` 中注册路由
3. 在 `packages/web/src/service.ts` 中添加客户端调用方法
4. 在对应的组件中使用新的 API

#### 3. 修改文件上传限制

1. 修改 `packages/config/client.ts` 中的客户端限制（`maxImageSize`、`maxFileSize` 等）
2. 修改 `packages/config/server.ts` 中的服务端限制（`maxFileSize`）
3. 修改 `.env` 文件中的环境变量（可选）
4. 重新构建 Web 前端：`npm run build:web`

#### 4. 添加定时任务

1. 在 `packages/bin/scripts/` 中创建脚本文件
2. 使用 `cron` 或系统定时任务调用脚本
3. 示例：`packages/bin/scripts/cleanupOldMessages.ts`（清理旧消息）

#### 5. 自定义主题

1. 修改 `packages/web/src/styles/variable.less` 中的 CSS 变量
2. 或在 `packages/web/src/themes.ts` 中添加新主题
3. 在用户设置中允许切换主题

### Debugging / 调试

#### 服务端调试

```bash
# 启动开发模式（自动重启）
npm run dev:server

# 查看日志
# 日志输出到控制台，使用 log4js 进行日志管理
```

#### Web 前端调试

```bash
# 启动开发模式（热重载）
npm run dev:web

# 访问 http://localhost:8080
# 使用浏览器开发者工具进行调试
```

#### 数据库调试

```bash
# 连接 MongoDB
mongo mongodb://localhost:27017/fiora

# 查看用户
db.users.find().pretty()

# 查看消息
db.messages.find().sort({ createTime: -1 }).limit(10).pretty()

# 查看群组
db.groups.find().pretty()
```

### Testing / 测试

```bash
# 运行所有测试
npm test

# 运行 TypeScript 类型检查
npm run ts-check

# 运行 ESLint 代码检查
npm run lint
```

### Build & Deploy / 构建和部署

#### 构建 Web 前端

```bash
npm run build:web
# 构建产物在 packages/server/public/ 目录
```

#### 生产环境部署

1. 确保 MongoDB 和 Redis 服务正在运行
2. 配置 `.env` 文件
3. 构建 Web 前端：`npm run build:web`
4. 启动服务端：`npm start`
5. 使用 PM2 或 systemd 管理进程（推荐）

#### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "fiora" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs fiora

# 重启应用
pm2 restart fiora
```

## Configuration / 配置说明

Fiora supports configuration through environment variables. Create a `.env` file in the project root directory to configure the following options:

Fiora 支持通过环境变量进行配置。在项目根目录创建 `.env` 文件来配置以下选项：

### Server Configuration / 服务端配置

- `Host` - 服务端主机地址（默认：本机 IP 地址）
- `Port` - 服务端端口（默认：9200）
- `Database` - MongoDB 连接字符串（默认：mongodb://localhost:27017/fiora）
- `RedisHost` - Redis 主机地址（默认：localhost）
- `RedisPort` - Redis 端口（默认：6379）
- `JwtSecret` - JWT 加密密钥（默认：jwtSecret）
- `MaxGroupCount` - 每个用户最大群组数量（默认：3）
- `AllowOrigin` - 允许的 CORS 源（逗号分隔）
- `TokenExpiresTime` - Token 过期时间（毫秒，默认：30 天）
- `Administrator` - 管理员用户 ID（逗号分隔）
- `DisableRegister` - 禁用用户注册（默认：false）
- `DisableCreateGroup` - 禁用用户创建群组（默认：false）
- `MaxFileSize` - 最大文件上传大小（字节，默认：20MB）

### Client Configuration / 客户端配置

- `Server` - 客户端连接的服务端 URL
- `MaxImageSize` - 最大图片上传大小（字节，默认：10MB）
- `MaxBackgroundImageSize` - 最大背景图片大小（字节，默认：10MB）
- `MaxAvatarSize` - 最大头像大小（字节，默认：3MB）
- `MaxFileSize` - 最大文件上传大小（字节，默认：20MB）
- `DefaultTheme` - 默认主题（默认：cool）
- `Sound` - 默认通知音效（默认：default）
- `TagColorMode` - 标签颜色模式（默认：fixedColor）
- `FrontendMonitorAppId` - 前端监控应用 ID
- `DisableDeleteMessage` - 禁用用户删除消息（默认：false）
- `AndroidDownloadUrl` - Android APK 下载链接（用于二维码，建议设置为公网域名以确保手机扫码后可以正常下载）

### Example `.env` file / 示例 `.env` 文件

```bash
# Server Configuration / 服务端配置
Port=9200
Database=mongodb://localhost:27017/fiora
JwtSecret=your-secret-key
Administrator=your-user-id

# Client Configuration / 客户端配置
MaxImageSize=10485760
MaxFileSize=20971520
AndroidDownloadUrl=https://your-domain.com/fiora.apk
```

## Change Log

You can find the Fiora changelog [on the website](https://yinxin630.github.io/fiora/docs/changelog)

## Contribution

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. Please make sure to update tests as appropriate

1. Fork it (<https://github.com/yinxin630/fiora/fork>)
2. Create your feature branch (`git checkout -b some-feature`)
3. Commit your changes (`git commit -am 'Add some some features'`)
4. Push to the branch (`git push origin some-feature`)
5. Create a new Pull Request

## License

Fiora is [MIT licensed](./LICENSE)
