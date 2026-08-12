import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import VendorProfileAccessGuard from "@/components/vendor/VendorProfileAccessGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VendorLayoutProps = {
  children: ReactNode;
};

export default async function VendorLayout({
  children,
}: VendorLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/vendor/profile");
  }

  if (user.role !== "VENDOR") {
    if (user.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    redirect("/customer");
  }

  return (
    <VendorProfileAccessGuard
      vendorProfileComplete={user.vendorProfileComplete}
      completionPercentage={
        user.vendorProfileCompletionPercentage
      }
      missingFields={user.vendorProfileMissingFields}
    >
      {children}
    </VendorProfileAccessGuard>
  );
}