import nodemailer from 'nodemailer';
import config from '@fiora/config/server';

export async function sendMail(options: { to: string; subject: string; text: string; html?: string }) {
    if (!config.smtp?.enable) {
        // SMTP 未启用：静默跳过（也可改为抛错）
        return;
    }
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user
            ? {
                  user: config.smtp.user,
                  pass: config.smtp.pass,
              }
            : undefined,
    });

    await transporter.sendMail({
        from: config.smtp.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    });
}
