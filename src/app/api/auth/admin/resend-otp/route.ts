import { NextResponse } from "next/server";
import {
  ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS,
  ADMIN_LOGIN_OTP_TTL_SECONDS,
  generateAdminLoginOtp,
  getAdminLoginOtpExpiresAt,
  getAdminLoginResendWaitSeconds,
  hashAdminLoginOtp,
  isAdminLoginChallengeExpired,
  maskEmail,
} from "@/lib/admin-login-otp";
import { sendAdminLoginOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeId = String(body.challengeId || "").trim();

    if (!challengeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification session is required.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const challenge = await prisma.adminLoginOtp.findUnique({
      where: {
        id: challengeId,
      },
      include: {
        user: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        {
          success: false,
          message: "Your verification session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (
      challenge.user.role !== "ADMIN" ||
      challenge.expiresAt.getTime() <= now.getTime() ||
      isAdminLoginChallengeExpired(challenge.createdAt, now)
    ) {
      await prisma.adminLoginOtp.deleteMany({
        where: {
          id: challenge.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Your verification session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const waitSeconds = getAdminLoginResendWaitSeconds(
      challenge.lastSentAt,
      now
    );

    if (waitSeconds > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting another code.`,
          retryAfterSeconds: waitSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(waitSeconds),
          },
        }
      );
    }

    const otp = generateAdminLoginOtp();
    const codeHash = hashAdminLoginOtp(challenge.id, otp);
    const expiresAt = getAdminLoginOtpExpiresAt(now);

    await prisma.adminLoginOtp.update({
      where: {
        id: challenge.id,
      },
      data: {
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
      },
    });

    try {
      await sendAdminLoginOtpEmail({
        to: challenge.user.email,
        name: challenge.user.name,
        otp,
        expiresInMinutes: ADMIN_LOGIN_OTP_TTL_SECONDS / 60,
      });
    } catch (error) {
      await prisma.adminLoginOtp.deleteMany({
        where: {
          id: challenge.id,
        },
      });

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent to your registered email.",
      challengeId: challenge.id,
      maskedEmail: maskEmail(challenge.user.email),
      expiresInSeconds: ADMIN_LOGIN_OTP_TTL_SECONDS,
      resendCooldownSeconds: ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("ADMIN_LOGIN_RESEND_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to resend the administrator verification code. Please try again.",
      },
      { status: 500 }
    );
  }
}