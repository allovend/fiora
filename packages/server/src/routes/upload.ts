import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Router from 'koa-router';
import koaBody from 'koa-body';
import OSS, { STS } from 'ali-oss';

import config from '@fiora/config/server';
import logger from '@fiora/utils/logger';
import { getSTS } from './system';

const router = new Router();

// 配置 koa-body 中间件，支持文件上传
const uploadMiddleware = koaBody({
    multipart: true,
    formidable: {
        maxFileSize: config.maxFileSize || 20 * 1024 * 1024, // 20MB（原 10MB）
        keepExtensions: true,
        // 确保文件被保存到临时目录
        uploadDir: undefined, // 使用系统默认临时目录
    },
    // 确保解析文件
    parsedMethods: ['POST', 'PUT', 'PATCH'],
});

/**
 * HTTP 文件上传接口
 * POST /api/upload
 * 支持进度显示
 * 注意：需要通过 Socket.IO 获取 token 进行认证
 */
// 处理 CORS 预检请求
router.options('/api/upload', async (ctx) => {
    ctx.set('Access-Control-Allow-Origin', ctx.headers.origin || '*');
    ctx.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    /**
     * CORS 预检放行必要请求头
     *
     * 关键点：
     * - Web 端上传会带上 `x-auth-token`（见 web/src/utils/uploadFileWithProgress.ts）
     * - 浏览器会在跨域时先发 OPTIONS 预检，若服务端未在 Access-Control-Allow-Headers 中声明该 header
     *   则预检失败，表现为“上传一直无法完成/直接报 CORS”
     *
     * 安全性：
     * - 仅放行上传所需的 header，不开放任意 header
     */
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
    ctx.status = 204;
});

router.post('/api/upload', uploadMiddleware, async (ctx) => {
    // 设置 CORS 头
    ctx.set('Access-Control-Allow-Origin', ctx.headers.origin || '*');
    ctx.set('Access-Control-Allow-Credentials', 'true');
    try {
        // 从请求头获取 token（客户端需要从 socket 获取）
        const token = ctx.request.headers['x-auth-token'] as string;
        // koa-body 会将文件放在 ctx.request.files 中，字段名是 FormData 中的字段名
        // 如果 FormData 中使用 'file' 作为字段名，则文件在 ctx.request.files.file
        const file = ctx.request.files?.file;
        const fileName = ctx.request.body?.fileName as string;
        const isBase64 = ctx.request.body?.isBase64 === 'true';
        
        // 调试：检查所有可能的文件位置
        logger.info('[upload] files structure:', {
            filesKeys: ctx.request.files ? Object.keys(ctx.request.files) : [],
            fileType: file ? typeof file : 'null',
            fileIsArray: Array.isArray(file),
            filePath: file ? ((file as any)?.filepath || (file as any)?.path) : 'null',
        });
        
        // 调试日志：记录请求数据结构
        logger.info('[upload] request data:', {
            hasFiles: !!ctx.request.files,
            filesKeys: ctx.request.files ? Object.keys(ctx.request.files) : [],
            bodyKeys: ctx.request.body ? Object.keys(ctx.request.body) : [],
            fileName,
            isBase64,
            fileType: file ? typeof file : 'null',
            filePath: file ? (file as any)?.filepath : 'null',
        });

        if (!file && !isBase64) {
            logger.error('[upload] missing file and isBase64 is false');
            ctx.status = 400;
            ctx.body = { error: '缺少文件' };
            return;
        }

        if (!fileName) {
            ctx.status = 400;
            ctx.body = { error: '缺少文件名' };
            return;
        }

        // TODO: 验证 token（可以通过 socket.io 验证）
        // 目前先允许上传，后续可以添加认证

        // 处理 base64 格式（移动端）- 通过 FormData 的 text 字段传递
        if (isBase64) {
            // 注意：当使用 multipart/form-data 时，文本字段在 body 中，文件字段在 files 中
            // 但 koa-body 可能将 file 字段解析到 files 中，需要检查两个位置
            let base64Data = (ctx.request.body?.file as string) || 
                            (ctx.request.files?.file && typeof ctx.request.files.file === 'string' 
                                ? ctx.request.files.file as string 
                                : null);
            
            // 如果 file 在 files 中且是对象，可能是被误解析为文件了
            if (!base64Data && ctx.request.files?.file) {
                const fileObj = ctx.request.files.file as any;
                // 如果是文件对象，尝试读取内容（这种情况不应该发生，但为了兼容性）
                if (fileObj.filepath) {
                    logger.warn('[upload] file field was parsed as file object, reading content');
                    base64Data = await promisify(fs.readFile)(fileObj.filepath, 'utf-8');
                }
            }
            
            // 调试日志：记录接收到的数据信息
            logger.info('[upload] base64 request:', {
                hasFile: !!base64Data,
                fileType: typeof base64Data,
                fileLength: base64Data ? base64Data.length : 0,
                fileName,
                firstChars: base64Data ? base64Data.substring(0, 50) : 'null',
            });
            
            if (!base64Data) {
                logger.error('[upload] missing base64 data');
                ctx.status = 400;
                ctx.body = { error: '缺少文件数据' };
                return;
            }

            // 处理 data URI 格式：去除 "data:image/xxx;base64," 前缀
            // React Native 的 ImagePicker 可能返回纯 base64，也可能返回 data URI 格式
            const originalLength = base64Data.length;
            if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
                logger.info('[upload] removed data URI prefix, length:', originalLength, '->', base64Data.length);
            }
            // 去除可能的换行符和空格
            const beforeClean = base64Data.length;
            base64Data = base64Data.replace(/\s/g, '');
            if (beforeClean !== base64Data.length) {
                logger.info('[upload] removed whitespace, length:', beforeClean, '->', base64Data.length);
            }

            // 验证 base64 格式
            if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
                logger.error('[upload] invalid base64 format, first 100 chars:', base64Data.substring(0, 100));
                ctx.status = 400;
                ctx.body = { error: '无效的 base64 数据格式' };
                return;
            }
            
            logger.info('[upload] base64 validated, length:', base64Data.length);

            try {
                // 尝试解码 base64 验证数据有效性
                const buffer = Buffer.from(base64Data, 'base64');
                logger.info('[upload] base64 decoded, buffer length:', buffer.length);
                
                if (buffer.length === 0) {
                    logger.error('[upload] decoded buffer is empty');
                    ctx.status = 400;
                    ctx.body = { error: 'base64 数据解码后为空' };
                    return;
                }

                if (config.aliyunOSS.enable) {
                    const sts = await getSTS();
                    const client = new OSS({
                        accessKeyId: sts.AccessKeyId,
                        accessKeySecret: sts.AccessKeySecret,
                        bucket: sts.bucket,
                        region: sts.region,
                        stsToken: sts.SecurityToken,
                    });
                    const result = await client.put(
                        fileName,
                        buffer as any,
                    );
                    if (result.res.status === 200) {
                        ctx.body = {
                            url: `//${config.aliyunOSS.endpoint}/${result.name}`,
                        };
                        return;
                    }
                    throw Error('上传阿里云OSS失败');
                }

                // 保存到本地
                const lastSlashIndex = fileName.lastIndexOf('/');
                const directory = lastSlashIndex > 0 ? fileName.substring(0, lastSlashIndex) : '';
                const fileBaseName = lastSlashIndex > 0 ? fileName.substring(lastSlashIndex + 1) : fileName;
                // 修复路径：__dirname 是 routes 目录，需要回到 server 目录再进入 public
                const targetDir = path.resolve(__dirname, '../../public', directory);
                const isExists = await promisify(fs.exists)(targetDir);
                if (!isExists) {
                    await promisify(fs.mkdir)(targetDir, { recursive: true });
                }
                const finalPath = path.resolve(targetDir, fileBaseName);
                await promisify(fs.writeFile)(finalPath, buffer as any);
                logger.info('[upload] file saved:', finalPath, 'size:', buffer.length);
                ctx.body = { url: `/${fileName}` };
                return;
            } catch (err) {
                const typedErr = err as Error;
                logger.error('[upload] base64 decode error:', typedErr.message);
                ctx.status = 400;
                ctx.body = { error: `base64 数据解码失败: ${typedErr.message}` };
                return;
            }
        }

        // 处理文件上传（Web端）
        // koa-body 使用 formidable，文件对象结构：
        // - 单个文件：{ filepath: string, originalFilename: string, mimetype: string, size: number }
        // - 多个文件：数组形式
        let filePath: string | undefined;
        let fileSize: number | undefined;
        
        if (Array.isArray(file)) {
            // 如果是数组，取第一个文件
            const firstFile = file[0] as any;
            filePath = firstFile?.filepath || firstFile?.path;
            fileSize = firstFile?.size;
        } else if (file) {
            // 单个文件对象
            const fileObj = file as any;
            filePath = fileObj?.filepath || fileObj?.path;
            fileSize = fileObj?.size;
        }
        
        if (!filePath) {
            logger.error('[upload] file path is undefined');
            logger.error('[upload] file object keys:', file ? Object.keys(file as any) : 'null');
            logger.error('[upload] file object:', file);
            logger.error('[upload] files object keys:', ctx.request.files ? Object.keys(ctx.request.files) : 'null');
            logger.error('[upload] files object:', ctx.request.files);
            ctx.status = 400;
            ctx.body = { error: '文件对象无效，无法获取文件路径。请检查文件是否已正确上传。' };
            return;
        }
        
        logger.info('[upload] file path:', filePath, 'size:', fileSize);
        
        // 验证文件路径是否存在
        const fileExists = await promisify(fs.exists)(filePath);
        if (!fileExists) {
            logger.error('[upload] file does not exist at path:', filePath);
            ctx.status = 400;
            ctx.body = { error: '临时文件不存在' };
            return;
        }
        if (config.aliyunOSS.enable) {
            const sts = await getSTS();
            const client = new OSS({
                accessKeyId: sts.AccessKeyId,
                accessKeySecret: sts.AccessKeySecret,
                bucket: sts.bucket,
                region: sts.region,
                stsToken: sts.SecurityToken,
            });
            const fileStream = fs.createReadStream(filePath);
            const result = await client.putStream(fileName, fileStream);
            if (result.res.status === 200) {
                // 删除临时文件
                try {
                    await promisify(fs.unlink)(filePath);
                } catch (e) {
                    // 忽略删除失败
                }
                ctx.body = {
                    url: `//${config.aliyunOSS.endpoint}/${result.name}`,
                };
                return;
            }
            throw Error('上传阿里云OSS失败');
        }

        // 保存到本地
        const lastSlashIndex = fileName.lastIndexOf('/');
        const directory = lastSlashIndex > 0 ? fileName.substring(0, lastSlashIndex) : '';
        const fileBaseName = lastSlashIndex > 0 ? fileName.substring(lastSlashIndex + 1) : fileName;
        // 修复路径：__dirname 是 routes 目录，需要回到 server 目录再进入 public
        const targetDir = path.resolve(__dirname, '../../public', directory);
        const isExists = await promisify(fs.exists)(targetDir);
        if (!isExists) {
            await promisify(fs.mkdir)(targetDir, { recursive: true });
        }
        const targetPath = path.resolve(targetDir, fileBaseName);
        await promisify(fs.copyFile)(filePath, targetPath);
        // 删除临时文件
        try {
            await promisify(fs.unlink)(filePath);
        } catch (e) {
            // 忽略删除失败
        }
        ctx.body = { url: `/${fileName}` };
    } catch (err) {
        const typedErr = err as Error;
        logger.error('[upload]', typedErr.message);
        ctx.status = 500;
        ctx.body = { error: `上传文件失败:${typedErr.message}` };
    }
});

export default router;

