import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function getStringValue(body: Record<string, unknown>, key: string) {
  const value = body[key];

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function createVerificationToken() {
  return randomBytes(32).toString("hex");
}

function createTokenExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return expiresAt;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = getStringValue(body, "email").toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email address is required.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No account was found with this email address.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Verification email can only be resent for customer accounts.",
        },
        { status: 400 }
      );
    }

    const verificationToken = createVerificationToken();
    const expiresAt = createTokenExpiryDate();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email has been sent successfully.",
    });
  } catch (error) {
    console.error("RESEND_VERIFICATION_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to resend verification email.",
      },
      { status: 500 }
    );
  }
}