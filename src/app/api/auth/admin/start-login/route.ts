import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  ADMIN_LOGIN_CHALLENGE_TTL_SECONDS,
  ADMIN_LOGIN_OTP_TTL_SECONDS,
  ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS,
  generateAdminLoginOtp,
  getAdminLoginOtpExpiresAt,
  hashAdminLoginOtp,
  maskEmail,
} from "@/lib/admin-login-otp";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { sendAdminLoginOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const login = String(body.email || body.username || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!login || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username/email and password are required.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username/email or password.",
        },
        { status: 401 }
      );
    }

    const isBcryptPassword =
      user.password.startsWith("$2a$") || user.password.startsWith("$2b$");

    let isPasswordValid = false;

    if (isBcryptPassword) {
      isPasswordValid = await verifyPassword(password, user.password);
    } else {
      isPasswordValid = password === user.password;

      if (isPasswordValid) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            password: await hashPassword(password),
          },
        });
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username/email or password.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "This login page is restricted to administrator accounts.",
        },
        { status: 403 }
      );
    }

    const now = new Date();

    await prisma.adminLoginOtp.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lte: now,
            },
          },
          {
            createdAt: {
              lte: new Date(
                now.getTime() - ADMIN_LOGIN_CHALLENGE_TTL_SECONDS * 1000
              ),
            },
          },
        ],
      },
    });

    const challengeId = randomUUID();
    const otp = generateAdminLoginOtp();
    const expiresAt = getAdminLoginOtpExpiresAt(now);
    const codeHash = hashAdminLoginOtp(challengeId, otp);

    await prisma.$transaction([
      prisma.adminLoginOtp.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.adminLoginOtp.create({
        data: {
          id: challengeId,
          userId: user.id,
          codeHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
        },
      }),
    ]);

    try {
      await sendAdminLoginOtpEmail({
        to: user.email,
        name: user.name,
        otp,
        expiresInMinutes: ADMIN_LOGIN_OTP_TTL_SECONDS / 60,
      });
    } catch (error) {
      await prisma.adminLoginOtp.deleteMany({
        where: {
          id: challengeId,
        },
      });

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "A verification code has been sent to your registered email.",
      challengeId,
      maskedEmail: maskEmail(user.email),
      expiresInSeconds: ADMIN_LOGIN_OTP_TTL_SECONDS,
      resendCooldownSeconds: ADMIN_LOGIN_OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("ADMIN_LOGIN_START_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send the administrator verification code. Please try again.",
      },
      { status: 500 }
    );
  }
}