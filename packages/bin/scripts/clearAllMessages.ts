import path from 'path';
import fs from 'fs';
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
 * 清理所有聊天记录和文件（非交互式）
 * 使用方法：
 * npx ts-node packages/bin/index.ts clearAllMessages
 */
async function clearAllMessages() {
    console.log(chalk.red('⚠️  警告：即将删除所有聊天记录和文件！'));
    console.log(chalk.yellow('开始清理...\n'));

    await initMongoDB();

    // 1. 删除所有消息
    console.log(chalk.blue('[clearAllMessages] 正在删除所有消息...'));
    const messageCount = await Message.countDocuments({});
    const deleteResult = await Message.deleteMany({});
    console.log(chalk.green(`[clearAllMessages] 已删除 ${deleteResult.deletedCount} 条消息（共 ${messageCount} 条）`));

    // 2. 删除所有历史记录
    console.log(chalk.blue('[clearAllMessages] 正在删除所有历史记录...'));
    const historyCount = await History.countDocuments({});
    const deleteHistoryResult = await History.deleteMany({});
    console.log(chalk.green(`[clearAllMessages] 已删除 ${deleteHistoryResult.deletedCount} 条历史记录（共 ${historyCount} 条）`));

    // 3. 删除所有本地文件（如果未启用 OSS）
    if (!config.aliyunOSS.enable) {
        console.log(chalk.blue('[clearAllMessages] 正在删除本地文件...'));
        // 从 packages/bin/scripts 到 packages/server/public
        const publicDir = path.resolve(__dirname, '../../server/public');
        const imageDir = path.join(publicDir, 'ImageMessage');
        const fileDir = path.join(publicDir, 'FileMessage');
        
        console.log(chalk.blue(`[clearAllMessages] 检查目录: ${publicDir}`));
        console.log(chalk.blue(`[clearAllMessages] ImageMessage: ${imageDir}`));
        console.log(chalk.blue(`[clearAllMessages] FileMessage: ${fileDir}`));

        let deletedFilesCount = 0;
        let deletedFilesSize = 0;

        async function deleteDirectoryFiles(dirPath: string, dirName: string) {
            if (!fs.existsSync(dirPath)) {
                console.log(chalk.yellow(`[clearAllMessages] 目录不存在: ${dirPath}`));
                return;
            }

            const files = await readdir(dirPath);
            console.log(chalk.blue(`[clearAllMessages] 在 ${dirName} 目录中找到 ${files.length} 个文件`));

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                try {
                    const stats = await stat(filePath);
                    await unlink(filePath);
                    deletedFilesCount++;
                    deletedFilesSize += stats.size;
                } catch (err) {
                    console.error(chalk.red(`[clearAllMessages] 删除文件失败: ${filePath}`, (err as Error).message));
                }
            }
        }

        await deleteDirectoryFiles(imageDir, 'ImageMessage');
        await deleteDirectoryFiles(fileDir, 'FileMessage');

        console.log(
            chalk.green(
                `[clearAllMessages] 已删除 ${deletedFilesCount} 个文件，释放空间 ${(deletedFilesSize / 1024 / 1024).toFixed(2)}MB`,
            ),
        );
    } else {
        console.log(chalk.blue('[clearAllMessages] OSS 已启用，跳过本地文件删除'));
    }

    console.log(chalk.green('\n✅ 所有聊天记录和文件已清理完成！'));
}

async function run() {
    try {
        await clearAllMessages();
        process.exit(0);
    } catch (err) {
        console.error(chalk.red('[clearAllMessages] 清理失败:'), err);
        process.exit(1);
    }
}

export default run;

