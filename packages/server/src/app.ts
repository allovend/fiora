import Koa from 'koa';
import koaSend from 'koa-send';
import koaStatic from 'koa-static';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

import logger from '@fiora/utils/logger';
import config from '@fiora/config/server';
import { getSocketIp } from '@fiora/utils/socket';
import SocketModel, {
    SocketDocument,
} from '@fiora/database/mongoose/models/socket';

import seal from './middlewares/seal';
import frequency from './middlewares/frequency';
import isLogin from './middlewares/isLogin';
import isAdmin from './middlewares/isAdmin';

import * as userRoutes from './routes/user';
import * as botRoutes from './routes/bot';
import * as groupRoutes from './routes/group';
import * as messageRoutes from './routes/message';
import * as systemRoutes from './routes/system';
import * as notificationRoutes from './routes/notification';
import * as historyRoutes from './routes/history';
import * as stickerRoutes from './routes/sticker';
import registerRoutes from './middlewares/registerRoutes';
import uploadRouter from './routes/upload';

const app = new Koa();
app.proxy = true;

const httpServer = http.createServer(app.callback());
const io = new Server(httpServer, {
    cors: {
        origin: config.allowOrigin || '*',
        credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
});

// HTTP 上传接口（支持进度）- 必须在返回 index.html 之前注册
app.use(uploadRouter.routes()).use(uploadRouter.allowedMethods());

// serve public static files - 必须在返回 HTML 之前，优先处理静态文件
app.use(
    koaStatic(path.join(__dirname, '../public'), {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        gzip: true,
        // 禁用缓存控制头，让浏览器可以正常刷新
        setHeaders: (res, path) => {
            /**
             * App 更新清单（manifest）
             * - latest.json 必须尽量避免缓存，否则客户端会拿到旧版本信息
             * - 这里按目录规则处理：/fiora-app/update/*.json
             */
            if (/\/fiora-app\/update\/.*\.json$/i.test(path)) {
                res.setHeader(
                    'Cache-Control',
                    'no-cache, no-store, must-revalidate',
                );
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return;
            }

            /**
             * APK 文件（推荐长缓存）
             * - 文件名带版本号时可以设置长缓存，降低带宽压力
             * - 同时开启断点续传（多数静态服务器默认支持 Range，这里显式声明更直观）
             */
            if (/\/fiora-app\/apk\//i.test(path)) {
                res.setHeader(
                    'Cache-Control',
                    'public, max-age=31536000, immutable',
                );
                res.setHeader('Accept-Ranges', 'bytes');
                return;
            }

            // 对于图片文件，设置较短的缓存时间，方便调试
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(path)) {
                res.setHeader('Cache-Control', 'public, max-age=3600');
            }
        },
    }),
);

// serve index.html - 作为 fallback，处理所有非静态文件和非 API 路由
app.use(async (ctx, next) => {
    // 排除 API 路由，避免返回 HTML
    // API 路由由上传路由处理，如果没有匹配则返回 404（不返回 HTML）
    if (ctx.request.url.startsWith('/api/')) {
        await next();
        return;
    }
    // 如果响应已经设置（静态文件已处理），直接返回
    if (ctx.response.status !== 404) {
        return;
    }
    // 非 API 路由，按原逻辑处理
    if (
        /\/invite\/group\/[\w\d]+/.test(ctx.request.url) ||
        !/(\.)|(\/invite\/group\/[\w\d]+)/.test(ctx.request.url)
    ) {
        await koaSend(ctx, 'index.html', {
            root: path.join(__dirname, '../public'),
            maxage: 1000 * 60 * 60 * 24 * 7,
            gzip: true,
        });
    } else {
        await next();
    }
});

const routes: Routes = {
    ...userRoutes,
    ...botRoutes,
    ...groupRoutes,
    ...messageRoutes,
    ...systemRoutes,
    ...notificationRoutes,
    ...historyRoutes,
    ...stickerRoutes,
};
Object.keys(routes).forEach((key) => {
    if (key.startsWith('_')) {
        routes[key] = null;
    }
});

// 调试：检查关键路由是否注册
if (process.env.NODE_ENV === 'development') {
    logger.info('[routes]', 'getBannedUsernameList exists:', typeof routes.getBannedUsernameList);
    logger.info('[routes]', 'banUsername exists:', typeof routes.banUsername);
    logger.info('[routes]', 'unbanUsername exists:', typeof routes.unbanUsername);
    logger.info('[routes]', 'toggleGroupMute exists:', typeof routes.toggleGroupMute);
}

io.on('connection', async (socket) => {
    const ip = getSocketIp(socket);
    logger.trace(`connection ${socket.id} ${ip}`);
    await SocketModel.create({
        id: socket.id,
        ip,
    } as SocketDocument);

    socket.on('disconnect', async () => {
        logger.trace(`disconnect ${socket.id}`);
        await SocketModel.deleteOne({
            id: socket.id,
        });
    });

    socket.use(seal(socket));
    socket.use(isLogin(socket));
    socket.use(isAdmin(socket));
    socket.use(frequency(socket));
    socket.use(registerRoutes(socket, routes));
});

// 导出io实例，供路由使用（例如删除用户时强制断开连接）
export { io };

export default httpServer;
