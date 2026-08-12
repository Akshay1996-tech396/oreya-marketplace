import { NextResponse } from "next/server";
import {
  SignJWT,
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
} from "jose";
import {
  createRedirectUrl,
  getAppUrl,
  getOAuthRedirectPath,
  signInSocialCustomer,
  verifyOAuthState,
} from "@/lib/social-auth";

export const dynamic = "force-dynamic";

const appleJWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

type AppleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

function getRequiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} missing hai.`);
  }

  return value;
}

async function createAppleClientSecret() {
  const teamId = getRequiredEnv("APPLE_TEAM_ID");
  const clientId = getRequiredEnv("APPLE_CLIENT_ID");
  const keyId = getRequiredEnv("APPLE_KEY_ID");
  const privateKeyText = getRequiredEnv("APPLE_PRIVATE_KEY").replace(
    /\\n/g,
    "\n"
  );

  const privateKey = await importPKCS8(privateKeyText, "ES256");

  return new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: keyId,
    })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(privateKey);
}

function getAppleName(userJson: string | null, email: string) {
  if (!userJson) {
    return email.split("@")[0];
  }

  try {
    const parsed = JSON.parse(userJson) as {
      name?: {
        firstName?: string;
        lastName?: string;
      };
    };

    const firstName = parsed.name?.firstName || "";
    const lastName = parsed.name?.lastName || "";

    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || email.split("@")[0];
  } catch {
    return email.split("@")[0];
  }
}

async function handleAppleCallback(params: URLSearchParams) {
  try {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const appleUserJson = params.get("user");

    if (error) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Apple login cancelled.")
      );
    }

    const isStateValid = await verifyOAuthState(state);

    if (!isStateValid) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Invalid Apple login request.")
      );
    }

    if (!code) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Apple authorization code not found.")
      );
    }

    const clientId = getRequiredEnv("APPLE_CLIENT_ID");
    const callbackUrl = `${getAppUrl()}/api/auth/apple/callback`;
    const clientSecret = await createAppleClientSecret();

    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = (await tokenResponse.json()) as AppleTokenResponse;

    if (!tokenResponse.ok || !tokenData.id_token) {
      console.error("APPLE_TOKEN_ERROR", tokenData);

      return NextResponse.redirect(
        createRedirectUrl("/login", "Apple token verify nahi hua.")
      );
    }

    const { payload } = await jwtVerify(tokenData.id_token, appleJWKS, {
      issuer: "https://appleid.apple.com",
      audience: clientId,
    });

    const email = typeof payload.email === "string" ? payload.email : "";

    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";

    if (!email || !emailVerified) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Verified Apple email nahi mila.")
      );
    }

    await signInSocialCustomer({
      email,
      name: getAppleName(appleUserJson, email),
    });

    const redirectPath = await getOAuthRedirectPath();

    return NextResponse.redirect(createRedirectUrl(redirectPath));
  } catch (error) {
    console.error("APPLE_CALLBACK_ERROR", error);

    return NextResponse.redirect(
      createRedirectUrl(
        "/login",
        error instanceof Error ? error.message : "Apple login failed."
      )
    );
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  return handleAppleCallback(requestUrl.searchParams);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = new URLSearchParams();

  formData.forEach((value, key) => {
    params.set(key, String(value));
  });

  return handleAppleCallback(params);
}