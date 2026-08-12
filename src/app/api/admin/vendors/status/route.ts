import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "../../../../../lib/auth";
import { sendVendorCredentialsEmail } from "../../../../../lib/mail";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

type VendorStatusInput = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

type UsernameRow = {
  id: string;
};

type ExistingUsernameRow = {
  username: string | null;
};

function slugifyUsername(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "") || "vendor"
  );
}

function generatePassword() {
  return `Oreya@${randomBytes(4).toString("hex").toUpperCase()}`;
}

function isValidVendorStatus(status: string): status is VendorStatusInput {
  return (
    status === "PENDING" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "SUSPENDED"
  );
}

function getReadableStatus(status: VendorStatusInput) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

async function getUniqueUsername(businessName: string) {
  const baseUsername = slugifyUsername(businessName);

  let username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

  let existingUser = await prisma
    .$queryRawUnsafe<UsernameRow[]>(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      username
    )
    .then((rows) => (rows.length > 0 ? rows[0] : null));

  while (existingUser) {
    username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

    existingUser = await prisma
      .$queryRawUnsafe<UsernameRow[]>(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`,
        username
      )
      .then((rows) => (rows.length > 0 ? rows[0] : null));
  }

  return username;
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentUser();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in before continuing.",
        },
        { status: 401 }
      );
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Only an administrator can update vendor status.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const vendorId = String(body.vendorId || "").trim();
    const status = String(body.status || "").toUpperCase();

    if (!vendorId || !isValidVendorStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid vendor ID and status are required.",
        },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        user: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor not found.",
        },
        { status: 404 }
      );
    }

    if (status === "APPROVED") {
      const existingUsernameRows = await prisma.$queryRawUnsafe<
        ExistingUsernameRow[]
      >(`SELECT username FROM users WHERE id = $1 LIMIT 1`, vendor.userId);

      const existingUsername = existingUsernameRows[0]?.username || null;
      const username =
        existingUsername || (await getUniqueUsername(vendor.businessName));

      const generatedPassword = generatePassword();
      const hashedPassword = await hashPassword(generatedPassword);

      await prisma.$executeRawUnsafe(
        `
        UPDATE users
        SET username = $1,
            password = $2,
            "updatedAt" = NOW()
        WHERE id = $3
        `,
        username,
        hashedPassword,
        vendor.userId
      );

      await prisma.vendorProfile.update({
        where: {
          id: vendor.id,
        },
        data: {
          status: "APPROVED",
        },
      });

      const mailResult = await sendVendorCredentialsEmail({
        to: vendor.user.email,
        name: vendor.user.name,
        businessName: vendor.businessName,
        username,
        password: generatedPassword,
      });

      return NextResponse.json({
        success: true,
        message: mailResult.sent
          ? "Vendor approved successfully. Login credentials have been sent to the vendor email address."
          : "Vendor approved successfully. SMTP is not configured, so the generated login credentials have been logged in the terminal.",
        username,
      });
    }

    await prisma.vendorProfile.update({
      where: {
        id: vendor.id,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vendor status updated to ${getReadableStatus(status)}.`,
    });
  } catch (error) {
    console.error("ADMIN_VENDOR_STATUS_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}