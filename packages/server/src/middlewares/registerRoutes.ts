import assert from 'assert';
import logger from '@fiora/utils/logger';
import { getSocketIp } from '@fiora/utils/socket';
import { Socket } from 'socket.io';


function sanitizeString(input: string) {
    // 去除零宽字符、控制字符，避免隐藏注入（性能友好）
    return (input || '')
        .replace(/[\u200B-\u200F\uFEFF\u2060\u180E]/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim();
}

function sanitizeObject<T>(data: T): T {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') return sanitizeString(data) as any;
    if (Array.isArray(data)) return data.map((v) => sanitizeObject(v)) as any;
    if (typeof data === 'object') {
        const obj: any = data;
        const out: any = {};
        Object.keys(obj).forEach((k) => {
            out[k] = sanitizeObject(obj[k]);
        });
        return out;
    }
    return data;
}

function defaultCallback() {
    logger.error('Server Error: emit event with callback');
}

export default function registerRoutes(socket: Socket, routes: Routes) {
    return async ([event, data, cb = defaultCallback]: MiddlewareArgs) => {
        const route = routes[event];
        if (route) {
            try {
                const ctx: Context<any> = {
                    data: sanitizeObject(data),
                    socket: {
                        id: socket.id,
                        ip: getSocketIp(socket),
                        get user() {
                            return socket.data.user;
                        },
                        set user(newUserId: string) {
                            socket.data.user = newUserId;
                        },
                        get isAdmin() {
                            return socket.data.isAdmin;
                        },
                        join: socket.join.bind(socket),
                        leave: socket.leave.bind(socket),
                        emit: (target, _event, _data) => {
                            socket.to(target).emit(_event, _data);
                        },
                    },
                };
                const before = Date.now();
                const res = await route(ctx);
                const after = Date.now();
                logger.info(
                    `[${event}]`,
                    after - before,
                    ctx.socket.id,
                    ctx.socket.user || 'null',
                    typeof res === 'string' ? res : 'null',
                );
                cb(res);
            } catch (err: any) {
                if (err instanceof assert.AssertionError) {
                    cb(err.message);
                } else {
                    const errorMessage = err?.message || String(err);
                    logger.error(`[${event}]`, errorMessage);
                    cb(`Server Error: ${errorMessage}`);
                }
            }
        } else {
            cb(`Server Error: event [${event}] not exists`);
        }
    };
}
