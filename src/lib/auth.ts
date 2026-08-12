import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getVendorProfileCompletion } from "./vendor-profile-completion";

export type UserRole = "ADMIN" | "VENDOR" | "CUSTOMER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  vendorProfileComplete: boolean;
  vendorProfileCompletionPercentage: number;
  vendorProfileMissingFields: string[];
};

export type AuthTokenUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  vendorProfileComplete?: boolean;
};

const AUTH_COOKIE_NAME = "marketplace_auth_token";

function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    "marketplace_local_auth_secret_change_later";

  return new TextEncoder().encode(secret);
}

function isValidRole(role: unknown): role is UserRole {
  return (
    role === "ADMIN" ||
    role === "VENDOR" ||
    role === "CUSTOMER"
  );
}

async function getVendorProfileCompletionStatus(
  userId: string,
  ownerName: string
) {
  const vendorProfile =
    await prisma.vendorProfile.findUnique({
      where: {
        userId,
      },
      select: {
        businessName: true,
        phone: true,
        residentialPhone: true,
        brandName: true,
        companyName: true,
        branchName: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        addressLine1: true,
        address: true,
        description: true,
        licenseFile: true,
        licenseExpiry: true,
      },
    });

  if (!vendorProfile) {
    return getVendorProfileCompletion(null);
  }

  return getVendorProfileCompletion({
    businessName: vendorProfile.businessName,
    ownerName,

    businessPhone:
      vendorProfile.phone ||
      vendorProfile.residentialPhone,

    brandName: vendorProfile.brandName,
    companyName: vendorProfile.companyName,
    branchName: vendorProfile.branchName,

    city: vendorProfile.city,
    state: vendorProfile.state,
    country: vendorProfile.country,
    zipCode: vendorProfile.zipCode,

    addressLine1: vendorProfile.addressLine1,
    address: vendorProfile.address,

    description: vendorProfile.description,

    businessLicense: vendorProfile.licenseFile,
    licenseExpiryDate: vendorProfile.licenseExpiry,
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
) {
  return bcrypt.compare(password, hashedPassword);
}

export async function createAuthToken(
  user: AuthTokenUser
) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    vendorProfileComplete:
      user.vendorProfileComplete,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(
      AUTH_COOKIE_NAME
    )?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      getAuthSecret()
    );

    if (
      typeof payload.id !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !isValidRole(payload.role)
    ) {
      return null;
    }

    /*
     * Vendor profile completion does not apply to
     * administrators or customers.
     */
    if (payload.role !== "VENDOR") {
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        vendorProfileComplete: true,
        vendorProfileCompletionPercentage: 100,
        vendorProfileMissingFields: [],
      };
    }

    /*
     * Read the latest vendor profile data from the database.
     * This prevents profile-completion information from
     * becoming outdated inside the authentication token.
     */
    const profileCompletion =
      await getVendorProfileCompletionStatus(
        payload.id,
        payload.name
      );

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,

      vendorProfileComplete:
        profileCompletion.isComplete,

      vendorProfileCompletionPercentage:
        profileCompletion.completionPercentage,

      vendorProfileMissingFields:
        profileCompletion.missingFields,
    };
  } catch (error) {
    console.error(
      "GET_CURRENT_USER_ERROR",
      error
    );

    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return user;
}

export async function requireCompletedVendorProfile() {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "VENDOR" ||
    !user.vendorProfileComplete
  ) {
    return null;
  }

  return user;
}