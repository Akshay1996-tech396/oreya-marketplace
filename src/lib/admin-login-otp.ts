import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const ADMIN_LOGIN_OTP_LENGTH = 6;
export const ADMIN_LOGIN_OTP_TTL_SECONDS = 5 * 60;
export const ADMIN_LOGIN_OTP_MAX_ATTEMPTS = 5;
export const ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const ADMIN_LOGIN_CHALLENGE_TTL_SECONDS = 15 * 60;

function getAdminLoginOtpSecret() {
  return (
    process.env.AUTH_SECRET ||
    "marketplace_local_auth_secret_change_later"
  );
}

export function generateAdminLoginOtp() {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(ADMIN_LOGIN_OTP_LENGTH, "0");
}

export function hashAdminLoginOtp(challengeId: string, otp: string) {
  return createHmac("sha256", getAdminLoginOtpSecret())
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

export function verifyAdminLoginOtpHash({
  challengeId,
  otp,
  storedHash,
}: {
  challengeId: string;
  otp: string;
  storedHash: string;
}) {
  const candidateHash = hashAdminLoginOtp(challengeId, otp);
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, storedBuffer);
}

export function getAdminLoginOtpExpiresAt(now = new Date()) {
  return new Date(now.getTime() + ADMIN_LOGIN_OTP_TTL_SECONDS * 1000);
}

export function getAdminLoginChallengeExpiresAt(createdAt: Date) {
  return new Date(
    createdAt.getTime() + ADMIN_LOGIN_CHALLENGE_TTL_SECONDS * 1000
  );
}

export function isAdminLoginChallengeExpired(
  createdAt: Date,
  now = new Date()
) {
  return getAdminLoginChallengeExpiresAt(createdAt).getTime() <= now.getTime();
}

export function getAdminLoginResendWaitSeconds(
  lastSentAt: Date,
  now = new Date()
) {
  const elapsedSeconds = Math.floor(
    (now.getTime() - lastSentAt.getTime()) / 1000
  );

  return Math.max(
    0,
    ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
  );
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length === 1) {
    return `*@${domain}`;
  }

  if (localPart.length === 2) {
    return `${localPart[0]}*@${domain}`;
  }

  return `${localPart[0]}${"*".repeat(
    Math.min(localPart.length - 2, 6)
  )}${localPart[localPart.length - 1]}@${domain}`;
}