"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type VendorProfileAccessGuardProps = {
  children: ReactNode;
  vendorProfileComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
};

const VENDOR_PROFILE_PATH = "/vendor/profile";

function isVendorProfileRoute(pathname: string) {
  return (
    pathname === VENDOR_PROFILE_PATH ||
    pathname.startsWith(`${VENDOR_PROFILE_PATH}/`)
  );
}

export default function VendorProfileAccessGuard({
  children,
  vendorProfileComplete,
  completionPercentage,
  missingFields,
}: VendorProfileAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isProfilePage = isVendorProfileRoute(pathname);

  const shouldRedirect =
    !vendorProfileComplete && !isProfilePage;

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    const searchParams = new URLSearchParams({
      onboarding: "1",
      completion: String(completionPercentage),
    });

    if (missingFields.length > 0) {
      searchParams.set(
        "missing",
        missingFields.join(",")
      );
    }

    router.replace(
      `${VENDOR_PROFILE_PATH}?${searchParams.toString()}`
    );
  }, [
    shouldRedirect,
    router,
    completionPercentage,
    missingFields,
  ]);

  if (shouldRedirect) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black dark:border-gray-700 dark:border-t-white" />

          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            Redirecting to vendor profile completion...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}