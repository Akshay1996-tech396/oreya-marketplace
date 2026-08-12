import { NextResponse } from "next/server";
import {
  createOAuthState,
  createRedirectUrl,
  getAppUrl,
} from "@/lib/social-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const INVALID_GOOGLE_CLIENT_IDS = new Set([
  "your_google_client_id",
  "actual_google_client_id_here",
  "your-google-client-id",
]);

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return null;
  }

  if (INVALID_GOOGLE_CLIENT_IDS.has(clientId)) {
    return null;
  }

  return clientId;
}

export async function GET(request: Request) {
  try {
    const clientId = getGoogleClientId();

    if (!clientId) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Google login is not configured.")
      );
    }

    const requestUrl = new URL(request.url);
    const redirectPath = requestUrl.searchParams.get("redirect");

    const state = await createOAuthState(redirectPath);
    const callbackUrl = `${getAppUrl()}/api/auth/google/callback`;

    const googleUrl = new URL(GOOGLE_AUTH_URL);

    googleUrl.searchParams.set("client_id", clientId);
    googleUrl.searchParams.set("redirect_uri", callbackUrl);
    googleUrl.searchParams.set("response_type", "code");
    googleUrl.searchParams.set("scope", "openid email profile");
    googleUrl.searchParams.set("state", state);
    googleUrl.searchParams.set("prompt", "select_account");
    googleUrl.searchParams.set("access_type", "online");

    return NextResponse.redirect(googleUrl);
  } catch (error) {
    console.error("GOOGLE_AUTH_START_ERROR", error);

    return NextResponse.redirect(
      createRedirectUrl(
        "/login",
        "Unable to start Google login. Please try again."
      )
    );
  }
}