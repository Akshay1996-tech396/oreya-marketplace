import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AdminServiceEditForm from "@/components/admin/AdminServiceEditForm";
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

export default async function EditAdminServicePage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      vendorId: true,
      title: true,
      categoryId: true,
      description: true,
      price: true,
      currency: true,
      duration: true,
      images: true,
      status: true,
      specifications: true,
      specificationImage: true,
      exchangePolicy: true,
      refundPolicy: true,
    },
  });

  if (!service) {
    notFound();
  }

  const [
    categories,
    vendors,
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

    prisma.vendorProfile.findMany({
      orderBy: {
        businessName: "asc",
      },
      select: {
        id: true,
        businessName: true,
        status: true,
        user: {
          select: {
            email: true,
          },
        },
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

  const serviceForEdit = {
    id: service.id,
    vendorId: service.vendorId || "",
    title: service.title,
    categoryId: service.categoryId,
    description: service.description || "",
    price: Number(service.price),
    currency: service.currency,
    duration: service.duration,
    images: service.images,
    status: service.status,
    specifications: service.specifications,
    specificationImage:
      service.specificationImage || "",
    exchangePolicy:
      service.exchangePolicy || "",
    refundPolicy:
      service.refundPolicy || "",
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">
              Admin Dashboard
            </p>

            <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
              Edit Service
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Update service ownership, marketplace information, images,
              specifications and customer-facing policies.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/services/${service.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View Service
            </Link>

            <Link
              href="/admin/services"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Back to Services
            </Link>
          </div>
        </div>

        <AdminServiceEditForm
          service={serviceForEdit}
          categories={categories}
          vendors={vendors}
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
        />
      </div>
    </main>
  );
}