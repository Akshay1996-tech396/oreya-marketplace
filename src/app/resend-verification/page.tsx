"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Verification email send nahi hui.");
        return;
      }

      setSuccessMessage(
        data.message ||
          "Verification email sent successfully. Please check your inbox."
      );
    } catch (error) {
      console.error("Resend verification form error:", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] bg-gray-50 px-4 py-20">
      <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Email Verification
          </p>

          <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900">
            Resend Link
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Enter your registered customer email. We will send a fresh
            verification link.
          </p>
        </div>

        {successMessage ? (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your registered email"
              className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Resend Verification Email"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already verified?{" "}
          <Link href="/login" className="font-medium text-black underline">
            Sign in
          </Link>
        </div>

        <div className="mt-2 text-center text-sm text-gray-500">
          New customer?{" "}
          <Link href="/register" className="font-medium text-black underline">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}