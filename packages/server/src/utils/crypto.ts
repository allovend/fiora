import crypto from 'crypto';
import config from '@fiora/config/server';

function getKey() {
    // 使用 sha256 派生 32 字节 key
    return crypto.createHash('sha256').update(String(config.totpEncryptKey || '')).digest();
}

export function encryptText(plain: string) {
    const iv = crypto.randomBytes(12); // GCM 推荐 12 bytes
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // iv.tag.data(base64)
    return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptText(enc: string) {
    const [ivB64, tagB64, dataB64] = (enc || '').split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
        return '';
    }
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
}
