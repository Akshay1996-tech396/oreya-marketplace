import Link from "next/link";
import { redirect } from "next/navigation";

import ProductEditForm from "@/components/vendor/ProductEditForm";
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

export default async function EditVendorProductPage({
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

  const [product, categories, imageUploadSizeSetting, contentLimits] =
    await Promise.all([
      prisma.product.findFirst({
        where: {
          id,
          vendorId: vendor.id,
        },
        select: {
          id: true,
          title: true,
          categoryId: true,
          description: true,
          price: true,
          currency: true,
          stock: true,
          status: true,
          images: true,

          specifications: true,
          specificationImage: true,
          exchangePolicy: true,
          refundPolicy: true,
          aboutBrand: true,
          brandImage: true,

          options: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              id: true,
              name: true,
              values: true,
              sortOrder: true,
            },
          },

          variants: {
            orderBy: [
              {
                isDefault: "desc",
              },
              {
                createdAt: "asc",
              },
            ],
            select: {
              id: true,
              title: true,
              sku: true,
              options: true,
              price: true,
              currency: true,
              stock: true,
              image: true,
              isActive: true,
              isDefault: true,
            },
          },
        },
      }),
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

  if (!product) {
    redirect("/vendor/dashboard");
  }

  const maxImageUploadSizeMb =
    getMaximumImageUploadSize(
      imageUploadSizeSetting?.value
    );

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Vendor Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Edit Product
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Update product details, secure media, specifications, policies,
              options, and variants.
            </p>
          </div>

          <Link
            href="/vendor/dashboard"
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Back to Vendor Dashboard
          </Link>
        </div>

        <ProductEditForm
          categories={categories}
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
          product={{
            id: product.id,
            title: product.title,
            categoryId: product.categoryId,
            description: product.description || "",
            price: Number(product.price),
            currency: product.currency,
            stock: product.stock,
            status: product.status,
            images: product.images,

            specifications:
              product.specifications,
            specificationImage:
              product.specificationImage,
            exchangePolicy:
              product.exchangePolicy,
            refundPolicy: product.refundPolicy,
            aboutBrand: product.aboutBrand,
            brandImage: product.brandImage,

            options: product.options.map(
              (option) => ({
                id: option.id,
                name: option.name,
                values: option.values,
                sortOrder: option.sortOrder,
              })
            ),

            variants: product.variants.map(
              (variant) => ({
                id: variant.id,
                title: variant.title,
                sku: variant.sku,
                options: variant.options,
                price: Number(variant.price),
                currency: variant.currency,
                stock: variant.stock,
                image: variant.image,
                isActive: variant.isActive,
                isDefault: variant.isDefault,
              })
            ),
          }}
        />
      </div>
    </main>
  );
}