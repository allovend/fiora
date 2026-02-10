/**
 * Set Administrator
 * 设置用户为管理员
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import User from '@fiora/database/mongoose/models/user';
import initMongoDB from '@fiora/database/mongoose/initMongoDB';

/**
 * 设置用户为管理员
 * @param username 用户名或用户 ID
 */
export async function setAdmin(usernameOrId: string) {
    if (!usernameOrId) {
        console.log(chalk.red('错误：缺少参数 [username 或 userId]'));
        return;
    }

    await initMongoDB();

    // 尝试通过用户名查找
    let user = await User.findOne({ username: usernameOrId });
    
    // 如果通过用户名找不到，尝试通过 ID 查找
    if (!user) {
        try {
            user = await User.findById(usernameOrId);
        } catch (err) {
            // ID 格式错误，忽略
        }
    }

    if (!user) {
        console.log(chalk.red(`用户 [${usernameOrId}] 不存在`));
        return;
    }

    const userId = user._id.toString();
    console.log(chalk.blue(`找到用户: ${user.username} (ID: ${userId})`));

    // 查找 .env 或 .env2 文件
    // 从当前工作目录向上查找项目根目录（包含 package.json 的目录）
    let projectRoot = process.cwd();
    let foundPackageJson = false;
    
    // 向上查找包含 package.json 的目录
    for (let i = 0; i < 10; i++) {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            foundPackageJson = true;
            break;
        }
        const parent = path.dirname(projectRoot);
        if (parent === projectRoot) {
            break; // 已到达根目录
        }
        projectRoot = parent;
    }

    if (!foundPackageJson) {
        // 如果找不到，使用脚本所在目录向上查找
        projectRoot = path.resolve(__dirname, '../../../..');
    }

    const envFiles = ['.env', '.env2'];
    let envFile: string | null = null;

    for (const file of envFiles) {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
            envFile = filePath;
            break;
        }
    }

    if (!envFile) {
        // 如果不存在，创建 .env2 文件
        envFile = path.join(projectRoot, '.env2');
        console.log(chalk.yellow(`未找到环境配置文件，将创建 ${envFile}`));
    }

    // 读取现有配置
    let envContent = '';
    if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, 'utf-8');
    }

    // 解析现有的 Administrator 配置
    const lines = envContent.split('\n');
    let administratorLineIndex = -1;
    let existingAdmins: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Administrator=')) {
            administratorLineIndex = i;
            const value = line.substring('Administrator='.length).trim();
            if (value) {
                // 只保留有效的 MongoDB ObjectId（24 位十六进制字符串）
                existingAdmins = value.split(',')
                    .map(id => id.trim())
                    .filter(id => id && /^[0-9a-fA-F]{24}$/.test(id));
            }
            break;
        }
    }

    // 检查用户是否已经是管理员
    if (existingAdmins.includes(userId)) {
        console.log(chalk.green(`用户 [${user.username}] 已经是管理员`));
        return;
    }

    // 添加新的管理员
    existingAdmins.push(userId);
    const newAdministratorValue = existingAdmins.join(',');

    // 更新或添加 Administrator 行
    if (administratorLineIndex >= 0) {
        lines[administratorLineIndex] = `Administrator=${newAdministratorValue}`;
    } else {
        // 如果文件不为空且最后一行没有换行，添加换行
        if (envContent && !envContent.endsWith('\n')) {
            lines.push('');
        }
        lines.push(`Administrator=${newAdministratorValue}`);
    }

    // 写入文件
    fs.writeFileSync(envFile, lines.join('\n'), 'utf-8');

    console.log(chalk.green(`✓ 成功将用户 [${user.username}] 设置为管理员`));
    console.log(chalk.yellow(`  配置文件: ${envFile}`));
    console.log(chalk.yellow(`  当前管理员 ID: ${newAdministratorValue}`));
    console.log(chalk.blue('\n⚠️  请重启服务端以使配置生效！'));
}

async function run() {
    const usernameOrId = process.argv[3];
    await setAdmin(usernameOrId);
    process.exit(0);
}

export default run;

