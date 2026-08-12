"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AdminLoginFormProps = {
  title: string;
  subtitle: string;
  defaultRedirectPath: string;
};

function getSafeAdminRedirectPath(path: string | null) {
  if (!path) {
    return "";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "";
  }

  return path.startsWith("/admin") ? path : "";
}

export default function AdminLoginForm({
  title,
  subtitle,
  defaultRedirectPath,
}: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = getSafeAdminRedirectPath(
    searchParams.get("redirect")
  );

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loadingAction, setLoadingAction] = useState<
    "credentials" | "verify" | "resend" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((currentValue) => Math.max(0, currentValue - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingAction("credentials");
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/auth/admin/start-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: login,
          username: login,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(data?.message || "Administrator sign in failed.");
        return;
      }

      setChallengeId(String(data?.challengeId || ""));
      setMaskedEmail(String(data?.maskedEmail || "your registered email"));
      setOtp("");
      setPassword("");
      setResendSeconds(Number(data?.resendCooldownSeconds || 60));
      setSuccessMessage(
        data?.message ||
          "A verification code has been sent to your registered email."
      );
      setStep("otp");
    } catch (error) {
      console.error("ADMIN_LOGIN_FORM_START_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoadingAction("verify");
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/auth/admin/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          challengeId,
          otp,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(data?.message || "Verification failed.");
        return;
      }

      router.push(redirectPath || data?.redirectTo || defaultRedirectPath);
      router.refresh();
    } catch (error) {
      console.error("ADMIN_LOGIN_FORM_VERIFY_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResendOtp() {
    if (!challengeId || resendSeconds > 0 || loadingAction) {
      return;
    }

    try {
      setLoadingAction("resend");
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/auth/admin/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          challengeId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (Number(data?.retryAfterSeconds) > 0) {
          setResendSeconds(Number(data.retryAfterSeconds));
        }

        setErrorMessage(data?.message || "Unable to resend verification code.");
        return;
      }

      setChallengeId(String(data?.challengeId || challengeId));
      setMaskedEmail(String(data?.maskedEmail || maskedEmail));
      setOtp("");
      setResendSeconds(Number(data?.resendCooldownSeconds || 60));
      setSuccessMessage(
        data?.message ||
          "A new verification code has been sent to your registered email."
      );
    } catch (error) {
      console.error("ADMIN_LOGIN_FORM_RESEND_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setChallengeId("");
    setMaskedEmail("");
    setOtp("");
    setResendSeconds(0);
    setErrorMessage("");
    setSuccessMessage("");
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
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-black">
          <p>{successMessage}</p>
        </div>
      ) : null}

      {step === "credentials" ? (
        <form onSubmit={handleCredentialSubmit} className="space-y-3">
          <input
            type="text"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="Email or username*"
            autoComplete="username"
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
            required
          />

          <div className="relative">
            <input
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password*"
              autoComplete="current-password"
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
              <FontAwesomeIcon
                icon={isPasswordVisible ? faEyeSlash : faEye}
                className="h-5 w-5"
                fixedWidth
                aria-hidden="true"
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={loadingAction !== null}
            className="h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "credentials"
              ? "Verifying credentials..."
              : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-3">
          <div className="text-center text-sm leading-6 text-gray-600">
            Enter the 6-digit verification code sent to{" "}
            <span className="font-medium text-black">{maskedEmail}</span>.
          </div>

          <input
            type="text"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit verification code*"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-center text-sm tracking-[0.3em] text-black outline-none transition-colors duration-200 placeholder:tracking-normal placeholder:text-gray-500 focus:border-black"
            required
            autoFocus
          />

          <button
            type="submit"
            disabled={loadingAction !== null || otp.length !== 6}
            className="h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "verify" ? "Verifying..." : "Verify and sign in"}
          </button>

          <div className="pt-2 text-center text-sm text-gray-600">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendSeconds > 0 || loadingAction !== null}
              className="font-medium text-black underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
            >
              {loadingAction === "resend"
                ? "Sending..."
                : resendSeconds > 0
                  ? `Resend code in ${resendSeconds}s`
                  : "Resend code"}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loadingAction !== null}
              className="font-medium text-black underline disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Use a different account
            </button>
          </div>
        </form>
      )}
    </div>
  );
}