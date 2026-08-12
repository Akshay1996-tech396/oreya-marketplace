"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDOR" | "CUSTOMER";
};

type AuthMeResponse = {
  authenticated: boolean;
  user: AuthUser | null;
  role: "ADMIN" | "VENDOR" | "CUSTOMER" | null;
  dashboardPath: string | null;
  dashboardLabel: string | null;
  isAdmin: boolean;
  isVendor: boolean;
  isCustomer: boolean;
};

export default function HeaderAuthLinks() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboardPath, setDashboardPath] = useState<string | null>(null);
  const [dashboardLabel, setDashboardLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  async function loadUser() {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        setDashboardPath(null);
        setDashboardLabel(null);
        return;
      }

      const data = (await response.json()) as AuthMeResponse;

      if (!data.authenticated || !data.user) {
        setUser(null);
        setDashboardPath(null);
        setDashboardLabel(null);
        return;
      }

      setUser(data.user);
      setDashboardPath(data.dashboardPath);
      setDashboardLabel(data.dashboardLabel);
    } catch (error) {
      console.error("HEADER_AUTH_ERROR", error);
      setUser(null);
      setDashboardPath(null);
      setDashboardLabel(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();

    function handleFocus() {
      loadUser();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  async function handleLogout() {
    try {
      setLogoutLoading(true);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      setDashboardPath(null);
      setDashboardLabel(null);

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("LOGOUT_ERROR", error);
    } finally {
      setLogoutLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium hover:underline">
          Sign In
        </Link>

        <Link
          href="/vendor/register"
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
        >
          Become Partner
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href={dashboardPath || "/customer"}
        className="text-sm font-medium hover:underline"
      >
        {dashboardLabel || "Dashboard"}
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutLoading}
        className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {logoutLoading ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}