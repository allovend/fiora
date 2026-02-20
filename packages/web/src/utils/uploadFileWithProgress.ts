import config from '@fiora/config/client';

/**
 * 使用 HTTP 上传文件，支持进度回调
 * @param blob 文件 Blob 数据
 * @param fileName 文件名
 * @param onProgress 进度回调函数 (progress: number) => void
 * @returns Promise<string> 返回文件 URL
 */
export default async function uploadFileWithProgress(
    blob: Blob,
    fileName: string,
    onProgress?: (progress: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('fileName', fileName);
        formData.append('isBase64', 'false');

        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        // 监听完成
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.url);
                    }
                } catch (err) {
                    reject(new Error('解析响应失败'));
                }
            } else {
                reject(new Error(`上传失败: ${xhr.statusText}`));
            }
        });

        // 监听错误
        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });

        // 监听取消
        xhr.addEventListener('abort', () => {
            reject(new Error('上传已取消'));
        });

        // 获取服务器地址
        let serverUrl = config.server.replace(/\/$/, '');
        // 处理相对路径和协议相对路径
        if (serverUrl.startsWith('//')) {
            serverUrl = `${window.location.protocol}${serverUrl}`;
        } else if (serverUrl.startsWith('/')) {
            serverUrl = `${window.location.origin}${serverUrl}`;
        }
        const uploadUrl = `${serverUrl}/api/upload`;

        // 发送请求
        xhr.open('POST', uploadUrl);
        // 添加必要的请求头（如果需要认证，可以从 localStorage 获取 token）
        const token = window.localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('x-auth-token', token);
        }
        xhr.send(formData);
    });
}

/**
 * 使用 HTTP 上传 base64 文件（移动端），支持进度回调
 * @param base64Data base64 编码的字符串
 * @param fileName 文件名
 * @param onProgress 进度回调函数 (progress: number) => void
 * @returns Promise<string> 返回文件 URL
 */
export async function uploadBase64FileWithProgress(
    base64Data: string,
    fileName: string,
    onProgress?: (progress: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', base64Data);
        formData.append('fileName', fileName);
        formData.append('isBase64', 'true');

        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        // 监听完成
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.url);
                    }
                } catch (err) {
                    reject(new Error('解析响应失败'));
                }
            } else {
                reject(new Error(`上传失败: ${xhr.statusText}`));
            }
        });

        // 监听错误
        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });

        // 监听取消
        xhr.addEventListener('abort', () => {
            reject(new Error('上传已取消'));
        });

        // 获取服务器地址
        let serverUrl = config.server.replace(/\/$/, '');
        // 处理相对路径和协议相对路径
        if (serverUrl.startsWith('//')) {
            serverUrl = `${window.location.protocol}${serverUrl}`;
        } else if (serverUrl.startsWith('/')) {
            serverUrl = `${window.location.origin}${serverUrl}`;
        }
        const uploadUrl = `${serverUrl}/api/upload`;

        // 发送请求
        xhr.open('POST', uploadUrl);
        // 添加必要的请求头（如果需要认证，可以从 localStorage 获取 token）
        const token = window.localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('x-auth-token', token);
        }
        xhr.send(formData);
    });
}

