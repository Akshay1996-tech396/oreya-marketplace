import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  createAuthToken,
  hashPassword,
  setAuthCookie,
  verifyPassword,
} from "../../../../lib/auth";

type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

const validRoles: UserRole[] = ["CUSTOMER", "VENDOR", "ADMIN"];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

function getRedirectPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function getRoleLabel(role: UserRole) {
  if (role === "ADMIN") {
    return "admin";
  }

  if (role === "VENDOR") {
    return "vendor";
  }

  return "customer";
}

function getCorrectLoginPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/login";
  }

  if (role === "VENDOR") {
    return "/vendor/login";
  }

  return "/login";
}

function getWrongLoginPageMessage(expectedRole: UserRole, actualRole: string) {
  const expectedLabel = getRoleLabel(expectedRole);
  const correctLoginPath = getCorrectLoginPath(actualRole);

  if (actualRole === "ADMIN") {
    return `This account belongs to an administrator. Please use the admin login page: ${correctLoginPath}`;
  }

  if (actualRole === "VENDOR") {
    return `This account belongs to a vendor. Please use the vendor login page: ${correctLoginPath}`;
  }

  return `This account belongs to a customer. Please use the ${expectedLabel} login page only for ${expectedLabel} accounts.`;
}

function getVendorStatusMessage(status: string) {
  if (status === "PENDING") {
    return "Your vendor account is pending admin approval.";
  }

  if (status === "REJECTED") {
    return "Your vendor account has been rejected.";
  }

  if (status === "SUSPENDED") {
    return "Your vendor account has been suspended.";
  }

  return "Your vendor account is not approved.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const login = String(body.email || body.username || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");
    const expectedRole = isValidRole(body.expectedRole)
      ? body.expectedRole
      : null;

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

    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json(
        {
          success: false,
          message: getWrongLoginPageMessage(expectedRole, user.role),
          correctLoginPath: getCorrectLoginPath(user.role),
        },
        { status: 403 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator accounts require email verification during sign in. Please use the admin login page.",
          code: "ADMIN_OTP_REQUIRED",
          correctLoginPath: "/admin/login",
        },
        { status: 403 }
      );
    }

    if (user.role === "CUSTOMER" && !user.emailVerifiedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email before signing in.",
        },
        { status: 403 }
      );
    }

    if (user.role === "VENDOR") {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: user.id,
        },
      });

      if (!vendorProfile) {
        return NextResponse.json(
          {
            success: false,
            message: "Vendor profile not found.",
          },
          { status: 403 }
        );
      }

      if (vendorProfile.status !== "APPROVED") {
        return NextResponse.json(
          {
            success: false,
            message: getVendorStatusMessage(vendorProfile.status),
          },
          { status: 403 }
        );
      }
    }

    const token = await createAuthToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirectTo: getRedirectPath(user.role),
    });
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}