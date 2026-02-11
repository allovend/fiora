
import assert from 'assert';
import logger from '@fiora/utils/logger';
import { getSocketIp } from '@fiora/utils/socket';
import { Socket } from 'socket.io';

// Sanitize route data to prevent injection attacks
function sanitizeData(data: any): any {
    if (typeof data === 'string') {
        return data.replace(/[^a-zA-Z0-9_-]/g, '');  // Sanitize strings
    }
    // For other data types, implement additional sanitization as needed
    return data;
}

function defaultCallback() {
    logger.error('Server Error: emit event with callback');
}

export default function registerRoutes(socket: Socket, routes: Routes) {
    return async ([event, data, cb = defaultCallback]: MiddlewareArgs) => {
        const sanitizedData = sanitizeData(data);  // Sanitize data before passing it to the route

        const route = routes[event];
        if (route) {
            try {
                const ctx: Context<any> = {
                    data: sanitizedData,
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
                    },
                };
                await route(ctx);
            } catch (err) {
                logger.error('Error in route handler: ', err);
            }
        }
    };
}
