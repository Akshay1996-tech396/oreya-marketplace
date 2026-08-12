import Link from "next/link";
import { redirect } from "next/navigation";

import ProductForm from "@/components/vendor/ProductForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export default async function NewVendorProductPage() {
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

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!vendor) {
    redirect("/login");
  }

  if (vendor.status !== "APPROVED") {
    redirect("/vendor/dashboard");
  }

  const [categories, imageUploadSizeSetting, contentLimits] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
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

  const maxImageUploadSizeMb =
    getMaximumImageUploadSize(
      imageUploadSizeSetting?.value
    );

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Vendor Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Add Product
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Create a product with secure image uploads,
              inventory details, variants, specifications,
              and customer-facing policies.
            </p>
          </div>

          <Link
            href="/vendor/dashboard"
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Back to Vendor Dashboard
          </Link>
        </div>

        <ProductForm
          categories={categories}
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
        />
      </div>
    </main>
  );
}