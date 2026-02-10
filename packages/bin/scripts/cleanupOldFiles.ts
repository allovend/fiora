import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import initMongoDB from '@fiora/database/mongoose/initMongoDB';
import Message from '@fiora/database/mongoose/models/message';
import config from '@fiora/config/server';
import logger from '@fiora/utils/logger';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

/**
 * 清理旧文件脚本
 * 删除超过指定天数且消息已不存在的文件
 * 
 * 使用方法：
 * npx ts-node packages/bin/scripts/cleanupOldFiles.ts [days]
 * 
 * 参数：
 * - days: 文件保留天数，默认 30 天
 */
async function cleanupOldFiles(days = 30) {
    // 如果启用了 OSS，不需要清理本地文件
    if (config.aliyunOSS.enable) {
        logger.info('[cleanupOldFiles] OSS enabled, skipping local file cleanup');
        return;
    }

    await initMongoDB();

    const publicDir = path.resolve(__dirname, '../../../server/public');
    const imageDir = path.join(publicDir, 'ImageMessage');
    const fileDir = path.join(publicDir, 'FileMessage');

    const now = Date.now();
    const expireTime = days * 24 * 60 * 60 * 1000; // 转换为毫秒

    let deletedCount = 0;
    let totalSize = 0;

    /**
     * 清理指定目录中的旧文件
     */
    async function cleanDirectory(dirPath: string, messageType: 'image' | 'file') {
        if (!fs.existsSync(dirPath)) {
            logger.info(`[cleanupOldFiles] Directory not exists: ${dirPath}`);
            return;
        }

        const files = await readdir(dirPath);
        logger.info(`[cleanupOldFiles] Found ${files.length} files in ${dirPath}`);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                const stats = await stat(filePath);
                const fileAge = now - stats.mtimeMs;

                // 检查文件是否过期
                if (fileAge > expireTime) {
                    // 检查消息是否还存在
                    const fileName = `${messageType === 'image' ? 'ImageMessage' : 'FileMessage'}/${file}`;
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
                        deletedCount++;
                        totalSize += stats.size;
                        logger.info(`[cleanupOldFiles] Deleted: ${filePath} (${(stats.size / 1024).toFixed(2)}KB)`);
                    } else {
                        logger.debug(`[cleanupOldFiles] Message exists, keeping: ${filePath}`);
                    }
                }
            } catch (err) {
                logger.error(`[cleanupOldFiles] Error processing ${filePath}:`, (err as Error).message);
            }
        }
    }

    logger.info(`[cleanupOldFiles] Starting cleanup, files older than ${days} days will be checked`);

    await cleanDirectory(imageDir, 'image');
    await cleanDirectory(fileDir, 'file');

    logger.info(
        `[cleanupOldFiles] Cleanup completed. Deleted ${deletedCount} files, freed ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
    );
}

// 从命令行参数获取天数
const days = process.argv[2] ? parseInt(process.argv[2], 10) : 30;

// 导出函数供 bin/index.ts 调用
export default async function run() {
    const days = process.argv[3] ? parseInt(process.argv[3], 10) : 30;
    await cleanupOldFiles(days);
}

