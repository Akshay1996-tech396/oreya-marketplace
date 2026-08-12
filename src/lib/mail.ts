import nodemailer from "nodemailer";

type VendorCredentialsEmailData = {
  to: string;
  name: string;
  businessName: string;
  username: string;
  password: string;
};

function isMailConfigured() {
  const smtpHost = process.env.SMTP_HOST || "";
  const smtpPort = process.env.SMTP_PORT || "";
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpFrom = process.env.SMTP_FROM || "";

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    return false;
  }

  if (
    smtpUser.includes("your-email") ||
    smtpPass.includes("your-gmail-app-password") ||
    smtpFrom.includes("your-email")
  ) {
    return false;
  }

  return true;
}

function logVendorCredentials(data: VendorCredentialsEmailData) {
  console.log("========================================");
  console.log("SMTP is not configured or email failed.");
  console.log("Vendor credentials:");
  console.log("Email:", data.to);
  console.log("Name:", data.name);
  console.log("Business:", data.businessName);
  console.log("Username:", data.username);
  console.log("Password:", data.password);
  console.log("========================================");
}

export async function sendVendorCredentialsEmail(
  data: VendorCredentialsEmailData
) {
  if (!isMailConfigured()) {
    logVendorCredentials(data);

    return {
      sent: false,
      reason: "SMTP is not configured.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: data.to,
      subject: "Your OREYA Vendor Login Details",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome to OREYA Marketplace</h2>

          <p>Hello ${data.name},</p>

          <p>Your vendor registration request for <strong>${data.businessName}</strong> has been received.</p>

          <p>You can login using the details below:</p>

          <div style="background:#f5f5f5; padding:16px; border-radius:10px;">
            <p><strong>Username:</strong> ${data.username}</p>
            <p><strong>Password:</strong> ${data.password}</p>
          </div>

          <p>Please login and change your password after your first login.</p>

          <p>Thank you,<br/>OREYA Marketplace Team</p>
        </div>
      `,
    });

    return {
      sent: true,
    };
  } catch (error) {
    console.error("EMAIL_SEND_ERROR", error);
    logVendorCredentials(data);

    return {
      sent: false,
      reason: "Email sending failed.",
    };
  }
}