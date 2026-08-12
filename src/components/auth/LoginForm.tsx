"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

type LoginFormProps = {
  allowedRole: UserRole;
  title: string;
  subtitle: string;
  defaultRedirectPath: string;
  showCustomerLinks?: boolean;
  showVendorLinks?: boolean;
  showAdminHelpText?: boolean;
};

function getSafeRedirectPath(path: string | null, allowedRole: UserRole) {
  if (!path) {
    return "";
  }

  if (!path.startsWith("/")) {
    return "";
  }

  if (path.startsWith("//")) {
    return "";
  }

  if (allowedRole === "ADMIN") {
    return path.startsWith("/admin") ? path : "";
  }

  if (allowedRole === "VENDOR") {
    return path.startsWith("/vendor") ? path : "";
  }

  if (path.startsWith("/admin")) {
    return "";
  }

  if (path.startsWith("/vendor")) {
    return "";
  }

  if (path.startsWith("/reports")) {
    return "";
  }

  if (path.startsWith("/settings")) {
    return "";
  }

  return path;
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  if (isVisible) {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M10.58 10.58A2 2 0 0 0 13.42 13.42"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M9.88 4.24A9.99 9.99 0 0 1 12 4C17.52 4 21 9 21 12C21 13.02 20.6 14.27 19.86 15.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M6.62 6.63C4.35 8.2 3 10.61 3 12C3 15 6.48 20 12 20C13.53 20 14.89 19.62 16.05 19.01"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 12C3 9 6.48 4 12 4C17.52 4 21 9 21 12C21 15 17.52 20 12 20C6.48 20 3 15 3 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 15A3 3 0 1 0 12 9A3 3 0 0 0 12 15Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function LoginForm({
  allowedRole,
  title,
  subtitle,
  defaultRedirectPath,
  showCustomerLinks = false,
  showVendorLinks = false,
  showAdminHelpText = false,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = getSafeRedirectPath(
    searchParams.get("redirect"),
    allowedRole
  );

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showResendVerification =
    errorMessage.toLowerCase().includes("verify") ||
    errorMessage.toLowerCase().includes("verification");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: login,
          username: login,
          password,
          expectedRole: allowedRole,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(data?.message || "Sign in failed.");
        return;
      }

      router.push(redirectPath || data?.redirectTo || defaultRedirectPath);
      router.refresh();
    } catch (error) {
      console.error("LOGIN_FORM_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-black">
          {title}
        </p>

        <p className="mt-6 text-sm leading-6 text-black">{subtitle}</p>
      </div>

      {errorMessage ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <p>{errorMessage}</p>

          {showResendVerification ? (
            <p className="mt-2">
              Did not receive verification email?{" "}
              <Link
                href="/resend-verification"
                className="font-medium underline"
              >
                Resend email
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          placeholder="Email or username*"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
          required
        />

        <div className="relative">
          <input
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password*"
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 pr-12 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
            required
          />

          <button
            type="button"
            onClick={() =>
              setIsPasswordVisible((currentValue) => !currentValue)
            }
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-gray-600 transition-colors duration-200 hover:text-black"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          >
            <EyeIcon isVisible={isPasswordVisible} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {showCustomerLinks ? (
        <>
          <div className="mt-6 text-center text-sm text-black">
            Not a member?{" "}
            <Link href="/register" className="font-medium underline">
              Join us.
            </Link>
          </div>

          <div className="mt-3 text-center text-sm text-gray-600">
            Want to sell?{" "}
            <Link
              href="/vendor/register"
              className="font-medium text-black underline"
            >
              Become our partner
            </Link>
          </div>

          <div className="mt-2 text-center text-sm text-gray-600">
            Did not receive verification email?{" "}
            <Link
              href="/resend-verification"
              className="font-medium text-black underline"
            >
              Resend email
            </Link>
          </div>
        </>
      ) : null}

      {showVendorLinks ? (
        <div className="mt-6 text-center text-sm text-gray-600">
          New partner?{" "}
          <Link
            href="/vendor/register"
            className="font-medium text-black underline"
          >
            Register as a vendor
          </Link>
        </div>
      ) : null}

      {/* {showAdminHelpText ? (
        <p className="mt-6 text-center text-sm leading-6 text-gray-600">
          This area is restricted to authorized marketplace administrators only.
        </p>
      ) : null} */}
    </div>
  );
}