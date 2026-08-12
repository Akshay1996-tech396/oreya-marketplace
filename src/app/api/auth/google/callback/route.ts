import { NextResponse } from "next/server";
import {
  createRedirectUrl,
  getAppUrl,
  getOAuthRedirectPath,
  signInSocialCustomer,
  verifyOAuthState,
} from "@/lib/social-auth";

export const dynamic = "force-dynamic";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);

    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const error = requestUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Google login cancelled.")
      );
    }

    const isStateValid = await verifyOAuthState(state);

    if (!isStateValid) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Invalid Google login request.")
      );
    }

    if (!code) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Google authorization code not found.")
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        createRedirectUrl("/login", "Google login is not configured.")
      );
    }

    const callbackUrl = `${getAppUrl()}/api/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("GOOGLE_TOKEN_ERROR", tokenData);

      return NextResponse.redirect(
        createRedirectUrl("/login", "Google token verify nahi hua.")
      );
    }

    const userInfoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfoResponse;

    if (!userInfoResponse.ok || !userInfo.email || !userInfo.email_verified) {
      console.error("GOOGLE_USER_INFO_ERROR", userInfo);

      return NextResponse.redirect(
        createRedirectUrl("/login", "Verified Google email nahi mila.")
      );
    }

    await signInSocialCustomer({
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split("@")[0],
    });

    const redirectPath = await getOAuthRedirectPath();

    return NextResponse.redirect(createRedirectUrl(redirectPath));
  } catch (error) {
    console.error("GOOGLE_CALLBACK_ERROR", error);

    return NextResponse.redirect(
      createRedirectUrl(
        "/login",
        error instanceof Error ? error.message : "Google login failed."
      )
    );
  }
}