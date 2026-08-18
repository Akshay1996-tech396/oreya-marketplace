import Link from "next/link";
import { redirect } from "next/navigation";

import RestaurantForm from "@/components/vendor/restaurants/RestaurantForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const IMAGE_UPLOAD_SIZE_SETTING_KEY = "maxImageUploadSizeMb";
const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

function getMaximumImageUploadSize(settingValue: string | undefined) {
  const parsedValue = Number(settingValue);
  if (!Number.isFinite(parsedValue) || parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB || parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }
  return parsedValue;
}

export default async function AddAdminRestaurantPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const [vendors, imageUploadSizeSetting, contentLimits] = await Promise.all([
    prisma.vendorProfile.findMany({
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true, status: true },
    }),
    prisma.setting.findUnique({
      where: { key: IMAGE_UPLOAD_SIZE_SETTING_KEY },
      select: { value: true },
    }),
    getContentLimits(),
  ]);

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <Link href="/admin/restaurants" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white">
            ← Back to Restaurants
          </Link>
          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Add Restaurant</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a restaurant from the admin dashboard and associate it with a vendor.</p>
        </div>

        <RestaurantForm
          mode="create"
          maxImageUploadSizeMb={getMaximumImageUploadSize(imageUploadSizeSetting?.value)}
          contentLimits={contentLimits}
          vendorOptions={vendors}
          saveEndpoint="/api/admin/restaurants/manage"
          redirectPath="/admin/restaurants"
          allowDelete={false}
        />
      </div>
    </main>
  );
}
