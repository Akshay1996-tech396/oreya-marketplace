"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

export default function RegisterForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      if (!firstName.trim()) {
        setErrorMessage("Please enter your first name.");
        return;
      }

      if (!lastName.trim()) {
        setErrorMessage("Please enter your last name.");
        return;
      }

      if (!email.trim()) {
        setErrorMessage("Please enter your email address.");
        return;
      }

      if (!password.trim()) {
        setErrorMessage("Please enter your password.");
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          fullName,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
          role: "CUSTOMER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Unable to create your account.");
        return;
      }

      setSuccessMessage(
        data.message || "Your account has been created successfully."
      );

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-black">
          Become an OREYA member
        </p>

        <p className="mt-6 text-sm leading-6 text-black">
          Create your OREYA member profile, and get access to an enhanced
          shopping, service, and booking experience.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name*"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
          required
        />

        <input
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last name*"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
          required
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email*"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
          required
        />

        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone"
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black"
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

        <p className="px-2 pt-3 text-center text-xs leading-5 text-black">
          By creating an account, you agree to OREYA&apos;s{" "}
          <Link href="/privacy-policy" className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms-of-service" className="underline">
            Terms of Use
          </Link>
          .
        </p>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Join"}
        </button>
      </form>

      {/*
      <div className="mt-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase text-gray-400">OR</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="h-10 rounded-md border border-gray-300 bg-white text-sm text-black transition-colors duration-200 hover:border-black"
          >
            Sign in with Google
          </button>

          <button
            type="button"
            className="h-10 rounded-md border border-gray-300 bg-white text-sm text-black transition-colors duration-200 hover:border-black"
          >
            Sign in with Apple
          </button>
        </div>
      </div>
      */}

      <div className="mt-6 text-center text-sm text-black">
        Already a member?{" "}
        <Link href="/login" className="font-medium underline">
          Sign in.
        </Link>
      </div>

      <div className="mt-3 text-center text-sm text-gray-600">
        Want to sell?{" "}
        <Link href="/vendor/register" className="font-medium text-black underline">
          Become our partner
        </Link>
      </div>
    </div>
  );
}