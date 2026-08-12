import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import RestaurantForm from "@/components/vendor/restaurants/RestaurantForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const IMAGE_UPLOAD_SIZE_SETTING_KEY =
  "maxImageUploadSizeMb";

const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function getMaximumImageUploadSize(
  settingValue: string | undefined
) {
  const parsedValue = Number(settingValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB ||
    parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB
  ) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }

  return parsedValue;
}

export default async function AddRestaurantPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const [vendor, imageUploadSizeSetting, contentLimits] =
    await Promise.all([
      prisma.vendorProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          status: true,
          address: true,
          addressLine1: true,
          addressLine2: true,
          country: true,
          state: true,
          city: true,
          zipCode: true,
        },
      }),

      prisma.setting.findUnique({
        where: {
          key: IMAGE_UPLOAD_SIZE_SETTING_KEY,
        },
        select: {
          value: true,
        },
      }),
      getContentLimits(),
    ]);

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  if (vendor.status !== "APPROVED") {
    redirect("/vendor/dashboard");
  }

  const maxImageUploadSizeMb =
    getMaximumImageUploadSize(
      imageUploadSizeSetting?.value
    );

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <Link
            href="/vendor/restaurants"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
          >
            <ChevronLeft size={17} />
            Back to Restaurants
          </Link>

          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">
            Add Restaurant
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your restaurant profile and submit it for administrator
            approval.
          </p>
        </div>

        <RestaurantForm
          mode="create"
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
          vendorAddress={{
            address: vendor.address,
            addressLine1: vendor.addressLine1,
            addressLine2: vendor.addressLine2,
            country: vendor.country,
            state: vendor.state,
            city: vendor.city,
            zipCode: vendor.zipCode,
          }}
        />
      </div>
    </main>
  );
}
