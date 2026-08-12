import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  let title = "Invalid verification link";
  let message =
    "This email verification link is invalid or missing. Please register again or request a new verification email.";
  let success = false;

  if (token) {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        token,
      },
      include: {
        user: {
          select: {
            id: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!verificationToken) {
      title = "Invalid verification link";
      message =
        "This verification link does not exist. Please register again or request a new verification email.";
    } else if (verificationToken.usedAt) {
      title = "Email already verified";
      message =
        "This verification link has already been used. You can sign in now.";
      success = true;
    } else if (verificationToken.expiresAt < new Date()) {
      title = "Verification link expired";
      message =
        "This verification link has expired. Please request a new verification email.";
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: verificationToken.userId,
          },
          data: {
            emailVerifiedAt:
              verificationToken.user.emailVerifiedAt || new Date(),
          },
        }),

        prisma.emailVerificationToken.update({
          where: {
            id: verificationToken.id,
          },
          data: {
            usedAt: new Date(),
          },
        }),
      ]);

      title = "Email verified successfully";
      message =
        "Your email has been verified. You can now sign in and place orders or book services.";
      success = true;
    }
  }

  return (
    <main className="min-h-[70vh] bg-gray-50 px-4 py-20">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            success
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {success ? "✓" : "!"}
        </div>

        <h1 className="font-heading text-2xl text-gray-900">{title}</h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[#101828] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700"
          >
            Register
          </Link>

          <Link
            href="/resend-verification"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700"
          >
            Resend Email
          </Link>
        </div>
      </div>
    </main>
  );
}