import { NextResponse } from "next/server";
import {
  ADMIN_LOGIN_OTP_LENGTH,
  ADMIN_LOGIN_OTP_MAX_ATTEMPTS,
  isAdminLoginChallengeExpired,
  verifyAdminLoginOtpHash,
} from "@/lib/admin-login-otp";
import { createAuthToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeId = String(body.challengeId || "").trim();
    const otp = String(body.otp || "").trim();

    if (!challengeId || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification code is required.",
        },
        { status: 400 }
      );
    }

    const otpPattern = new RegExp(`^\\d{${ADMIN_LOGIN_OTP_LENGTH}}$`);

    if (!otpPattern.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message: `Enter the ${ADMIN_LOGIN_OTP_LENGTH}-digit verification code.`,
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

    if (challenge.attempts >= ADMIN_LOGIN_OTP_MAX_ATTEMPTS) {
      await prisma.adminLoginOtp.deleteMany({
        where: {
          id: challenge.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Too many incorrect attempts. Please sign in again.",
        },
        { status: 429 }
      );
    }

    const isOtpValid = verifyAdminLoginOtpHash({
      challengeId: challenge.id,
      otp,
      storedHash: challenge.codeHash,
    });

    if (!isOtpValid) {
      const nextAttemptCount = challenge.attempts + 1;

      if (nextAttemptCount >= ADMIN_LOGIN_OTP_MAX_ATTEMPTS) {
        await prisma.adminLoginOtp.deleteMany({
          where: {
            id: challenge.id,
          },
        });

        return NextResponse.json(
          {
            success: false,
            message: "Too many incorrect attempts. Please sign in again.",
          },
          { status: 429 }
        );
      }

      const updateResult = await prisma.adminLoginOtp.updateMany({
        where: {
          id: challenge.id,
          attempts: challenge.attempts,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Your verification session has expired. Please sign in again.",
          },
          { status: 401 }
        );
      }

      const attemptsRemaining =
        ADMIN_LOGIN_OTP_MAX_ATTEMPTS - nextAttemptCount;

      return NextResponse.json(
        {
          success: false,
          message: `Incorrect verification code. ${attemptsRemaining} attempt${
            attemptsRemaining === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 401 }
      );
    }

    const consumeResult = await prisma.adminLoginOtp.deleteMany({
      where: {
        id: challenge.id,
        codeHash: challenge.codeHash,
        attempts: challenge.attempts,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (consumeResult.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "This verification code has already been used or expired.",
        },
        { status: 401 }
      );
    }

    const token = await createAuthToken({
      id: challenge.user.id,
      name: challenge.user.name,
      email: challenge.user.email,
      role: challenge.user.role,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "Administrator login successful.",
      user: {
        id: challenge.user.id,
        name: challenge.user.name,
        email: challenge.user.email,
        role: challenge.user.role,
      },
      redirectTo: "/admin/dashboard",
    });
  } catch (error) {
    console.error("ADMIN_LOGIN_VERIFY_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify the administrator login code. Please try again.",
      },
      { status: 500 }
    );
  }
}