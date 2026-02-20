import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import initMongoDB from '@fiora/database/mongoose/initMongoDB';
import Message from '@fiora/database/mongoose/models/message';
import History from '@fiora/database/mongoose/models/history';
import config from '@fiora/config/server';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

/**
 * 清理旧消息和文件脚本
 * - 文字消息保留 3 个月（90 天）
 * - 图片和文件消息保留 7 天，并删除对应的文件
 * 
 * 使用方法：
 * npm run script cleanupOldMessages
 */
async function cleanupOldMessages() {
    await initMongoDB();

    const now = Date.now();
    // 文字消息保留 90 天（3 个月）
    const textMessageExpireTime = 90 * 24 * 60 * 60 * 1000;
    // 图片和文件消息保留 7 天
    const fileMessageExpireTime = 7 * 24 * 60 * 60 * 1000;

    const expireDate = new Date(now - textMessageExpireTime);
    const fileExpireDate = new Date(now - fileMessageExpireTime);

    console.log(chalk.blue('[cleanupOldMessages] Starting cleanup...'));
    console.log(chalk.blue(`[cleanupOldMessages] Text messages older than ${expireDate.toISOString()} will be deleted`));
    console.log(chalk.blue(`[cleanupOldMessages] File messages older than ${fileExpireDate.toISOString()} will be deleted`));

    // 1. 删除超过 7 天的图片和文件消息，并删除对应的文件
    const fileMessages = await Message.find({
        type: { $in: ['image', 'file'] },
        createTime: { $lt: fileExpireDate },
    });

    console.log(chalk.yellow(`[cleanupOldMessages] Found ${fileMessages.length} file messages to delete`));

    let deletedFilesCount = 0;
    let deletedFilesSize = 0;

    for (const message of fileMessages) {
        try {
            // 删除关联的文件（如果使用本地存储）
            if (!config.aliyunOSS.enable && (message.type === 'image' || message.type === 'file')) {
                let filePath: string | null = null;

                if (message.type === 'image') {
                    // 图片消息格式：/ImageMessage/userId_timestamp?width=xxx&height=xxx
                    const urlMatch = message.content.match(/^(\/[^?]+)/);
                    if (urlMatch) {
                        filePath = urlMatch[1];
                    }
                } else if (message.type === 'file') {
                    // 文件消息格式：JSON.stringify({ fileUrl, filename, size, ext })
                    try {
                        const fileData = JSON.parse(message.content);
                        if (fileData.fileUrl && fileData.fileUrl.startsWith('/')) {
                            filePath = fileData.fileUrl.split('?')[0]; // 去除查询参数
                        }
                    } catch (e) {
                        // JSON 解析失败，忽略
                    }
                }

                // 删除本地文件
                if (filePath) {
                    const fullPath = path.resolve(__dirname, '../../../server/public', filePath.startsWith('/') ? filePath.substring(1) : filePath);
                    try {
                        const stats = await stat(fullPath);
                        await unlink(fullPath);
                        deletedFilesCount++;
                        deletedFilesSize += stats.size;
                        console.log(chalk.green(`[cleanupOldMessages] Deleted file: ${fullPath} (${(stats.size / 1024).toFixed(2)}KB)`));
                    } catch (err) {
                        // 文件不存在或删除失败，记录日志但不影响消息删除
                        console.log(chalk.yellow(`[cleanupOldMessages] Failed to delete file: ${fullPath}`, (err as Error).message));
                    }
                }
            }

            // 删除消息关联的历史记录
            await History.deleteMany({ message: message._id });
        } catch (err) {
            console.error(chalk.red(`[cleanupOldMessages] Error processing message ${message._id}:`, (err as Error).message));
        }
    }

    // 删除超过 7 天的图片和文件消息
    const fileDeleteResult = await Message.deleteMany({
        type: { $in: ['image', 'file'] },
        createTime: { $lt: fileExpireDate },
    });
    console.log(chalk.green(`[cleanupOldMessages] Deleted ${fileDeleteResult.deletedCount} file messages`));

    // 2. 删除超过 3 个月的文字消息
    const textDeleteResult = await Message.deleteMany({
        type: 'text',
        createTime: { $lt: expireDate },
    });
    console.log(chalk.green(`[cleanupOldMessages] Deleted ${textDeleteResult.deletedCount} text messages`));

    // 3. 清理孤立文件（文件存在但消息已不存在）
    if (!config.aliyunOSS.enable) {
        const publicDir = path.resolve(__dirname, '../../../server/public');
        const imageDir = path.join(publicDir, 'ImageMessage');
        const fileDir = path.join(publicDir, 'FileMessage');

        async function cleanOrphanFiles(dirPath: string, messageType: 'image' | 'file') {
            if (!fs.existsSync(dirPath)) {
                return;
            }

            const files = await readdir(dirPath);
            console.log(chalk.blue(`[cleanupOldMessages] Checking ${files.length} files in ${dirPath} for orphan files`));

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                try {
                    const stats = await stat(filePath);
                    const fileName = `${messageType === 'image' ? 'ImageMessage' : 'FileMessage'}/${file}`;

                    // 检查消息是否还存在
                    const messageExists = await Message.findOne({
                        type: messageType,
                        $or: [
                            { content: { $regex: fileName } },
                            { content: { $regex: file } },
                        ],
                    });

                    // 如果消息不存在，删除文件
                    if (!messageExists) {
                        await unlink(filePath);
                        deletedFilesCount++;
                        deletedFilesSize += stats.size;
                        console.log(chalk.green(`[cleanupOldMessages] Deleted orphan file: ${filePath} (${(stats.size / 1024).toFixed(2)}KB)`));
                    }
                } catch (err) {
                    console.error(chalk.red(`[cleanupOldMessages] Error processing file ${filePath}:`, (err as Error).message));
                }
            }
        }

        await cleanOrphanFiles(imageDir, 'image');
        await cleanOrphanFiles(fileDir, 'file');
    }

    console.log(
        chalk.green(
            `[cleanupOldMessages] Cleanup completed. ` +
            `Deleted ${fileDeleteResult.deletedCount} file messages, ` +
            `${textDeleteResult.deletedCount} text messages, ` +
            `${deletedFilesCount} files, ` +
            `freed ${(deletedFilesSize / 1024 / 1024).toFixed(2)}MB`,
        ),
    );
}

// 导出函数供 bin/index.ts 调用
export default async function run() {
    try {
        await cleanupOldMessages();
        process.exit(0);
    } catch (err) {
        console.error(chalk.red('[cleanupOldMessages] Script failed:'), err);
        process.exit(1);
    }
}

