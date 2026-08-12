import { NextResponse } from "next/server";
import { createOAuthState, createRedirectUrl, getAppUrl } from "@/lib/social-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const clientId = process.env.APPLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Apple login is not configured.")
      );
    }

    const requestUrl = new URL(request.url);
    const redirectPath = requestUrl.searchParams.get("redirect");

    const state = await createOAuthState(redirectPath);

    const callbackUrl = `${getAppUrl()}/api/auth/apple/callback`;

    const appleUrl = new URL("https://appleid.apple.com/auth/authorize");

    appleUrl.searchParams.set("client_id", clientId);
    appleUrl.searchParams.set("redirect_uri", callbackUrl);
    appleUrl.searchParams.set("response_type", "code");
    appleUrl.searchParams.set("response_mode", "form_post");
    appleUrl.searchParams.set("scope", "name email");
    appleUrl.searchParams.set("state", state);

    return NextResponse.redirect(appleUrl);
  } catch (error) {
    console.error("APPLE_AUTH_START_ERROR", error);

    return NextResponse.redirect(
      createRedirectUrl("/login", "Apple login start nahi ho paya.")
    );
  }
}