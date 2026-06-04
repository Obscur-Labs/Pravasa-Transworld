import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} = process.env;

const port = parseInt(SMTP_PORT || '587', 10);
const secure = SMTP_SECURE === 'true' || port === 465;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port,
  secure,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const MAIL_FROM = EMAIL_FROM || `Pravasa Transworld <${SMTP_USER}>`;

export async function verifyMailConnection(): Promise<void> {
  console.log('[EMAIL] Verifying SMTP connection...');
  console.log(`[EMAIL] Host: ${SMTP_HOST || 'smtp.gmail.com'} | Port: ${port} | Secure: ${secure}`);
  console.log(`[EMAIL] User: ${SMTP_USER || '(not set)'}`);
  try {
    await transporter.verify();
    console.log('[EMAIL] SMTP connection verified successfully.');
  } catch (err: any) {
    console.error('[EMAIL] SMTP verification FAILED:', err?.message ?? err);
    console.error('[EMAIL] Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your env.');
  }
}
