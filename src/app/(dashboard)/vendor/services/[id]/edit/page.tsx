import Link from "next/link";
import { redirect } from "next/navigation";

import ServiceEditForm from "@/components/vendor/ServiceEditForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const IMAGE_UPLOAD_SIZE_SETTING_KEY =
  "maxImageUploadSizeMb";

const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function EditVendorServicePage({
  params,
}: PageProps) {
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

  const { id } = await params;

  const service = await prisma.service.findFirst({
    where: {
      id,
      vendorId: vendor.id,
    },
    select: {
      id: true,
      title: true,
      categoryId: true,
      description: true,
      specifications: true,
      specificationImage: true,
      exchangePolicy: true,
      refundPolicy: true,
      price: true,
      currency: true,
      duration: true,
      status: true,
      images: true,
    },
  });

  if (!service) {
    redirect("/vendor/services");
  }

  const [
    categories,
    imageUploadSizeSetting,
    contentLimits,
  ] = await Promise.all([
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
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">
              Vendor Dashboard
            </p>

            <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
              Edit Service
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Update the service information, images, specifications and
              customer-facing policies.
            </p>
          </div>

          <Link
            href="/vendor/services"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Back to Services
          </Link>
        </div>

        <ServiceEditForm
          categories={categories}
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
          service={{
            id: service.id,
            title: service.title,
            categoryId: service.categoryId,
            description:
              service.description || "",
            specifications:
              service.specifications,
            specificationImage:
              service.specificationImage || "",
            exchangePolicy:
              service.exchangePolicy || "",
            refundPolicy:
              service.refundPolicy || "",
            price: Number(service.price),
            currency: service.currency,
            duration: service.duration,
            status: service.status,
            images: service.images,
          }}
        />
      </div>
    </main>
  );
}