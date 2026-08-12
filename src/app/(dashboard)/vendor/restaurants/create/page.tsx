import Link from "next/link";
import { redirect } from "next/navigation";

import VendorRestaurantCreateForm from "@/components/vendor/restaurants/VendorRestaurantCreateForm";
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

export default async function CreateVendorRestaurantPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    if (user.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    redirect("/customer");
  }

  const [vendor, imageUploadSizeSetting, contentLimits] =
    await Promise.all([
      prisma.vendorProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          businessName: true,
          status: true,
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">
            Restaurant
          </p>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Add Restaurant
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add restaurant details, reservation settings and contact
            information.
          </p>
        </div>

        <Link
          href="/vendor/restaurants"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Back to Restaurants
        </Link>
      </div>

      <VendorRestaurantCreateForm
        vendor={{
          id: vendor.id,
          businessName: vendor.businessName,
          status: vendor.status,
        }}
        maxImageUploadSizeMb={
          maxImageUploadSizeMb
        }
        contentLimits={contentLimits}
      />
    </main>
  );
}
