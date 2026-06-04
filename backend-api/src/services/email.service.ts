import { transporter, MAIL_FROM } from '../config/email';

const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const header = (title: string) => `
  <div style="background: #1d4ed8; padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Pravasa Transworld</h1>
    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">${title}</p>
  </div>
`;

const footer = () => `
  <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} Pravasa Transworld. All rights reserved.<br/>
      This is an automated message, please do not reply.
    </p>
  </div>
`;

async function sendMail(to: string, subject: string, html: string, label: string): Promise<void> {
  console.log(`[EMAIL:${label}] Preparing to send → ${to} | Subject: "${subject}"`);
  try {
    const info = await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
    console.log(`[EMAIL:${label}] Sent successfully → messageId: ${info.messageId} | accepted: [${info.accepted}] | rejected: [${info.rejected}]`);
    if (info.rejected?.length) {
      console.warn(`[EMAIL:${label}] Address rejected by server: ${info.rejected.join(', ')}`);
    }
  } catch (err: any) {
    console.error(`[EMAIL:${label}] FAILED for ${to}`);
    console.error(`[EMAIL:${label}] Error code: ${err?.code} | Response: ${err?.response}`);
    console.error(`[EMAIL:${label}] Full error:`, err?.message ?? err);
    throw err;
  }
}

export async function sendOTPEmail(email: string, name: string, otp: string): Promise<void> {
  console.log(`[OTP] Generating OTP email for ${email} (name: ${name})`);
  await sendMail(
    email,
    'Your Pravasa Transworld Login OTP',
    `
      <div style="${baseStyle}">
        ${header('Secure Login')}
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Hi ${name},</p>
          <p style="color: #475569; font-size: 15px; margin: 0 0 32px;">
            Use the OTP below to log into your Pravasa Transworld account. It expires in 10 minutes.
          </p>
          <div style="background: #eff6ff; border: 2px dashed #1d4ed8; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 32px;">
            <p style="color: #1d4ed8; font-size: 42px; font-weight: 800; letter-spacing: 12px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">
            If you didn't request this OTP, please ignore this email.
          </p>
        </div>
        ${footer()}
      </div>
    `,
    'OTP'
  );
}

export async function sendDocumentStatusEmail(
  email: string,
  name: string,
  status: 'approved' | 'rejected',
  reason?: string,
  referenceId?: string
): Promise<void> {
  const isApproved = status === 'approved';
  console.log(`[DOC_STATUS] Sending document ${status} email → ${email} | ref: ${referenceId}`);
  await sendMail(
    email,
    isApproved ? 'Documents Approved - Proceed to Payment' : 'Document Revision Required',
    `
      <div style="${baseStyle}">
        ${header(isApproved ? 'Documents Approved' : 'Document Revision Required')}
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Hi ${name},</p>
          ${isApproved ? `
            <p style="color: #475569; font-size: 15px; margin: 0 0 16px;">
              Great news! Your documents for application <strong>${referenceId}</strong> have been approved.
            </p>
            <p style="color: #475569; font-size: 15px; margin: 0 0 32px;">
              Please log in to complete your payment and continue the visa processing.
            </p>
            <a href="${frontendUrl}/applications" style="display: inline-block; background: #1d4ed8; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Make Payment
            </a>
          ` : `
            <p style="color: #475569; font-size: 15px; margin: 0 0 16px;">
              Some documents for application <strong>${referenceId}</strong> need to be re-uploaded.
            </p>
            ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 0 0 24px;">
              <p style="color: #dc2626; font-size: 14px; margin: 0;"><strong>Reason:</strong> ${reason}</p>
            </div>` : ''}
            <a href="${frontendUrl}/applications" style="display: inline-block; background: #1d4ed8; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Re-upload Documents
            </a>
          `}
        </div>
        ${footer()}
      </div>
    `,
    'DOC_STATUS'
  );
}

export async function sendStatusUpdateEmail(
  email: string,
  name: string,
  statusLabel: string,
  referenceId: string
): Promise<void> {
  console.log(`[APP_STATUS] Sending status update "${statusLabel}" → ${email} | ref: ${referenceId}`);
  await sendMail(
    email,
    `Application Update: ${statusLabel}`,
    `
      <div style="${baseStyle}">
        ${header('Application Status Update')}
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Hi ${name},</p>
          <p style="color: #475569; font-size: 15px; margin: 0 0 16px;">
            Your visa application <strong>${referenceId}</strong> status has been updated.
          </p>
          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 0 0 32px; text-align: center;">
            <p style="color: #1d4ed8; font-size: 18px; font-weight: 700; margin: 0;">${statusLabel}</p>
          </div>
          <a href="${frontendUrl}/applications" style="display: inline-block; background: #1d4ed8; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Application
          </a>
        </div>
        ${footer()}
      </div>
    `,
    'APP_STATUS'
  );
}

export async function sendVisaDeliveredEmail(
  email: string,
  name: string,
  referenceId: string,
  downloadUrl: string
): Promise<void> {
  console.log(`[VISA_DELIVERED] Sending visa ready email → ${email} | ref: ${referenceId}`);
  await sendMail(
    email,
    'Your Visa is Ready for Download!',
    `
      <div style="${baseStyle}">
        ${header('Visa Delivered')}
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; margin: 0 0 16px;">Hi ${name},</p>
          <p style="color: #475569; font-size: 15px; margin: 0 0 16px;">
            Congratulations! Your visa for application <strong>${referenceId}</strong> is ready.
          </p>
          <p style="color: #475569; font-size: 15px; margin: 0 0 32px;">
            You can download your visa directly from your dashboard or using the button below.
          </p>
          <a href="${downloadUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Download Visa
          </a>
        </div>
        ${footer()}
      </div>
    `,
    'VISA_DELIVERED'
  );
}
