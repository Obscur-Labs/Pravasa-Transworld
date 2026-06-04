import nodemailer from 'nodemailer';

const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const MAIL_FROM = process.env.EMAIL_FROM || `Pravasa Transworld <${process.env.SMTP_USER}>`;

export async function verifyMailConnection(): Promise<void> {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  console.log('[EMAIL] Verifying SMTP connection...');
  console.log(`[EMAIL] Host: ${host} | Port: ${port} | Secure: ${secure}`);
  console.log(`[EMAIL] User: ${process.env.SMTP_USER || '(not set)'}`);
  try {
    await transporter.verify();
    console.log('[EMAIL] SMTP connection verified successfully.');
  } catch (err: any) {
    console.error('[EMAIL] SMTP verification FAILED:', err?.message ?? err);
    console.error('[EMAIL] Code:', err?.code, '| Response:', err?.response ?? 'none');
    console.error('[EMAIL] Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your env.');
  }
}
