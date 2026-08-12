import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createAuthToken, hashPassword, setAuthCookie } from "@/lib/auth";

const OAUTH_STATE_COOKIE = "marketplace_oauth_state";
const OAUTH_REDIRECT_COOKIE = "marketplace_oauth_redirect";

function getCookieOptions(maxAge = 60 * 10) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function getSafeCustomerRedirectPath(path?: string | null) {
  if (!path) return "";

  if (!path.startsWith("/")) return "";

  if (path.startsWith("//")) return "";

  if (path.startsWith("/admin")) return "";

  if (path.startsWith("/vendor")) return "";

  if (path.startsWith("/reports")) return "";

  if (path.startsWith("/settings")) return "";

  return path;
}

export function createRedirectUrl(path: string, errorMessage?: string) {
  const url = new URL(path, getAppUrl());

  if (errorMessage) {
    url.searchParams.set("error", errorMessage);
  }

  return url;
}

export async function createOAuthState(redirectPath?: string | null) {
  const state = randomBytes(32).toString("hex");
  const safeRedirectPath = getSafeCustomerRedirectPath(redirectPath) || "/customer";

  const cookieStore = await cookies();

  cookieStore.set(OAUTH_STATE_COOKIE, state, getCookieOptions());
  cookieStore.set(OAUTH_REDIRECT_COOKIE, safeRedirectPath, getCookieOptions());

  return state;
}

export async function verifyOAuthState(receivedState?: string | null) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!savedState || !receivedState) {
    return false;
  }

  return savedState === receivedState;
}

export async function getOAuthRedirectPath() {
  const cookieStore = await cookies();
  const redirectPath = cookieStore.get(OAUTH_REDIRECT_COOKIE)?.value;

  cookieStore.delete(OAUTH_REDIRECT_COOKIE);

  return getSafeCustomerRedirectPath(redirectPath) || "/customer";
}

function createLockedSocialPassword() {
  return `SOCIAL-LOGIN-${randomBytes(32).toString("hex")}`;
}

export async function signInSocialCustomer({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || normalizedEmail.split("@")[0] || "Customer";

  if (!normalizedEmail) {
    throw new Error("Email not found from social account.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    if (existingUser.role !== "CUSTOMER") {
      throw new Error(
        "This email is already registered as vendor/admin. Please login with password."
      );
    }

    const updatedUser = existingUser.emailVerifiedAt
      ? existingUser
      : await prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            emailVerifiedAt: new Date(),
          },
        });

    const token = await createAuthToken({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    await setAuthCookie(token);

    return updatedUser;
  }

  const lockedPassword = await hashPassword(createLockedSocialPassword());

  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: normalizedEmail,
      password: lockedPassword,
      phone: null,
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    },
  });

  const token = await createAuthToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  await setAuthCookie(token);

  return user;
}