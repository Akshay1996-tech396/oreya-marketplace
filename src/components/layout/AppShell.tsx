"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isCheckoutPage = pathname.startsWith("/checkout");

  const isVendorRegisterPage = pathname === "/vendor/register";

  const isDashboardPage =
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/vendor") && !isVendorRegisterPage) ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  if (isCheckoutPage || isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}