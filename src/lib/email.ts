import nodemailer from "nodemailer";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration missing in .env file.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: {
  to: string;
  name: string;
  verificationUrl: string;
}) {
  await sendEmail({
    to,
    subject: "Verify your MARKET account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="margin-bottom: 12px;">Verify your email</h2>

        <p>Hi ${name},</p>

        <p>
          Thank you for creating your MARKET account. Please verify your email
          address by clicking the button below.
        </p>

        <p style="margin: 28px 0;">
          <a href="${verificationUrl}" style="background:#101828;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:600;">
            Verify Email
          </a>
        </p>

        <p>
          If the button does not work, copy and paste this link in your browser:
        </p>

        <p style="word-break: break-all; color:#475467;">
          ${verificationUrl}
        </p>

        <p style="margin-top: 28px; color:#667085; font-size: 13px;">
          This verification link will expire in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendAdminLoginOtpEmail({
  to,
  name,
  otp,
  expiresInMinutes,
}: {
  to: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  await sendEmail({
    to,
    subject: "Your OREYA admin login verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="margin-bottom: 12px;">Admin login verification</h2>

        <p>Hi ${safeName},</p>

        <p>
          Use the verification code below to complete your OREYA administrator login.
        </p>

        <div style="margin: 28px 0; padding: 18px 20px; background: #f3f4f6; border-radius: 10px; text-align: center;">
          <div style="font-size: 30px; font-weight: 700; letter-spacing: 8px; color: #111827;">
            ${safeOtp}
          </div>
        </div>

        <p style="color: #475467;">
          This code will expire in ${expiresInMinutes} minutes and can be used only for this administrator login attempt.
        </p>

        <p style="margin-top: 28px; color:#667085; font-size: 13px;">
          If you did not attempt to sign in to the OREYA administrator area, you can ignore this email.
        </p>
      </div>
    `,
  });
}