import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResetAdminPasswordBody = {
  secret?: string;
  emailOrUsername?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          message: "This reset route is disabled in production.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ResetAdminPasswordBody;

    const secret = body.secret?.trim();
    const emailOrUsername = body.emailOrUsername?.trim();
    const newPassword = body.newPassword?.trim();

    if (!process.env.ADMIN_RESET_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "ADMIN_RESET_SECRET env variable missing hai.",
        },
        { status: 500 }
      );
    }

    if (secret !== process.env.ADMIN_RESET_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reset secret.",
        },
        { status: 401 }
      );
    }

    if (!emailOrUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "emailOrUsername required hai.",
        },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "New password minimum 6 characters ka hona chahiye.",
        },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        OR: [
          {
            email: emailOrUsername,
          },
          {
            username: emailOrUsername,
          },
        ],
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin user nahi mila. Email ya username check karo.",
        },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: {
        id: adminUser.id,
      },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin password reset successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("RESET_ADMIN_PASSWORD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Admin password reset failed.",
      },
      { status: 500 }
    );
  }
}