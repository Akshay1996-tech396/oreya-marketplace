import { randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hashPassword } from "../../../../lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type VendorUserForRegister = {
  id: string;
  name: string;
  email: string;
  role: "VENDOR";
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateLockedPassword() {
  return `LOCKED-${randomBytes(32).toString("hex")}`;
}

async function getUniqueVendorSlug(businessName: string) {
  const baseSlug = slugify(businessName) || "vendor";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.vendorProfile.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

function getRedirectPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/login";
  return "/login";
}

function getStringValue(body: Record<string, unknown>, key: string) {
  const value = body[key];

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function createVerificationToken() {
  return randomBytes(32).toString("hex");
}

function createTokenExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return expiresAt;
}

function isAllowedRole(role: string) {
  return role === "CUSTOMER" || role === "VENDOR";
}

function getVendorBusinessName(body: Record<string, unknown>, name: string) {
  return (
    getStringValue(body, "businessName") ||
    getStringValue(body, "companyName") ||
    getStringValue(body, "brandName") ||
    name ||
    "Vendor"
  );
}

export async function POST(request: Request) {
  let createdVendorUserId = "";

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const role = getStringValue(body, "role").toUpperCase() || "CUSTOMER";
    const name = getStringValue(body, "name");
    const email = getStringValue(body, "email").toLowerCase();
    const phone = getStringValue(body, "phone");
    const password = getStringValue(body, "password");

    const firstName = getStringValue(body, "firstName");
    const lastName = getStringValue(body, "lastName");

    const mobileCountryCode =
      getStringValue(body, "mobileCountryCode") || "+971";

    const brandName = getStringValue(body, "brandName");
    const companyName = getStringValue(body, "companyName");
    const branchName = getStringValue(body, "branchName");
    const website = getStringValue(body, "website");
    const residentialPhone = getStringValue(body, "residentialPhone");
    const residentialCountryCode = getStringValue(
      body,
      "residentialCountryCode"
    );
    const country = getStringValue(body, "country");
    const state = getStringValue(body, "state");
    const city = getStringValue(body, "city");
    const addressLine1 = getStringValue(body, "addressLine1");
    const addressLine2 = getStringValue(body, "addressLine2");
    const zipCode = getStringValue(body, "zipCode");

    const licenseFile = getStringValue(body, "licenseFile");
    const licenseExpiry = getStringValue(body, "licenseExpiry");
    const termsAccepted = Boolean(body.termsAccepted);

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Name and email are required.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only customer and vendor accounts can be created.",
        },
        { status: 400 }
      );
    }

    if (role === "CUSTOMER" && password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    if (role === "VENDOR") {
      if (!firstName && !name) {
        return NextResponse.json(
          {
            success: false,
            message: "First name is required.",
          },
          { status: 400 }
        );
      }

      if (!lastName && !name) {
        return NextResponse.json(
          {
            success: false,
            message: "Last name is required.",
          },
          { status: 400 }
        );
      }

      if (!phone) {
        return NextResponse.json(
          {
            success: false,
            message: "Mobile number is required.",
          },
          { status: 400 }
        );
      }

      if (!licenseFile) {
        return NextResponse.json(
          {
            success: false,
            message: "Business license PDF is required.",
          },
          { status: 400 }
        );
      }

      if (!licenseFile.toLowerCase().includes(".pdf")) {
        return NextResponse.json(
          {
            success: false,
            message: "Business license document must be a PDF file.",
          },
          { status: 400 }
        );
      }

      if (!parseDateValue(licenseExpiry)) {
        return NextResponse.json(
          {
            success: false,
            message: "A valid license expiry date is required.",
          },
          { status: 400 }
        );
      }

      if (!termsAccepted) {
        return NextResponse.json(
          {
            success: false,
            message: "Please accept the terms and conditions.",
          },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "This email address already exists.",
        },
        { status: 409 }
      );
    }

    if (role === "VENDOR") {
      const lockedPassword = generateLockedPassword();
      const hashedLockedPassword = await hashPassword(lockedPassword);
      const userId = randomUUID();

      const vendorBusinessName = getVendorBusinessName(body, name);
      const vendorSlug = await getUniqueVendorSlug(vendorBusinessName);
      const parsedLicenseExpiry = parseDateValue(licenseExpiry);

      const user = (
        await prisma.$queryRawUnsafe<VendorUserForRegister[]>(
          `
            INSERT INTO users (
              id,
              name,
              email,
              username,
              password,
              phone,
              role,
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1,
              $2,
              $3,
              NULL,
              $4,
              $5,
              'VENDOR',
              NOW(),
              NOW()
            )
            RETURNING id, name, email, role
          `,
          userId,
          name,
          email,
          hashedLockedPassword,
          phone || null
        )
      )[0];

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: "Unable to create vendor user account.",
          },
          { status: 500 }
        );
      }

      createdVendorUserId = user.id;

      try {
        await prisma.vendorProfile.create({
          data: {
            userId: user.id,

            businessName: vendorBusinessName,
            slug: vendorSlug,
            phone,

            /*
             * The vendor registration form now collects only basic approval
             * details. The remaining business details will be completed later
             * from /vendor/profile.
             */
            brandName,
            companyName,
            branchName,
            website,
            mobileCountryCode,
            residentialPhone,
            residentialCountryCode,
            country,
            state,
            city,
            address: addressLine1,
            addressLine1,
            addressLine2,
            zipCode,

            licenseFile,
            licenseExpiry: parsedLicenseExpiry,
            termsAccepted,
            status: "PENDING",
          },
        });
      } catch (profileError) {
        console.error("VENDOR_PROFILE_CREATE_ERROR", profileError);

        await prisma.user
          .delete({
            where: {
              id: user.id,
            },
          })
          .catch(() => null);

        createdVendorUserId = "";

        return NextResponse.json(
          {
            success: false,
            message: "Unable to create vendor profile. Please try again.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message:
            "Vendor registration submitted successfully. Login details will be shared by email after admin approval.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: "VENDOR",
          },
          redirectTo: getRedirectPath("VENDOR"),
        },
        { status: 201 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = createVerificationToken();
    const expiresAt = createTokenExpiryDate();
    const customerUserId = randomUUID();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    const user = await prisma.user.create({
      data: {
        id: customerUserId,
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: "CUSTOMER",
      },
    });

    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt,
        },
      });
    } catch (tokenError) {
      console.error("CUSTOMER_VERIFICATION_TOKEN_ERROR", tokenError);

      await prisma.user
        .delete({
          where: {
            id: user.id,
          },
        })
        .catch(() => null);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create verification token. Please try again.",
        },
        { status: 500 }
      );
    }

    try {
      await sendVerificationEmail({
        to: email,
        name,
        verificationUrl,
      });
    } catch (emailError) {
      console.error("CUSTOMER_VERIFICATION_EMAIL_ERROR", emailError);

      await prisma.user
        .delete({
          where: {
            id: user.id,
          },
        })
        .catch(() => null);

      return NextResponse.json(
        {
          success: false,
          message:
            "Account was not created because the verification email could not be sent. Please check your SMTP settings.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully. Please check your email and verify your account.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectTo: "/login",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    if (createdVendorUserId) {
      await prisma.user
        .delete({
          where: {
            id: createdVendorUserId,
          },
        })
        .catch(() => null);
    }

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