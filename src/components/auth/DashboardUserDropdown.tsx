"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Info,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";

type DashboardUserDropdownProps = {
  isVendorArea: boolean;
};

export default function DashboardUserDropdown({
  isVendorArea,
}: DashboardUserDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName = isVendorArea ? "Vendor Account" : "Admin Account";
  const userEmail = isVendorArea ? "vendor@marketplace.com" : "admin@marketplace.com";

  const profileLink = isVendorArea ? "/vendor/profile" : "/settings/general";
  const settingsLink = isVendorArea ? "/vendor/profile" : "/settings/general";
  const supportLink = isVendorArea ? "/vendor/notifications" : "/admin/notifications";

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setIsOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("LOGOUT_ERROR", error);
      alert("Logout nahi ho paya. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {isVendorArea ? "V" : "A"}
        </span>

        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
            {isVendorArea ? "Vendor" : "Admin"}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-99999 w-[260px] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-2 pb-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {userName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {userEmail}
            </p>
          </div>

          <div className="py-2">
            <Link
              href={profileLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <UserCircle size={19} className="text-gray-500" />
              Edit profile
            </Link>

            <Link
              href={settingsLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Settings size={19} className="text-gray-500" />
              Account settings
            </Link>

            <Link
              href={supportLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Info size={19} className="text-gray-500" />
              Support
            </Link>
          </div>

          <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            >
              <LogOut size={19} />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}