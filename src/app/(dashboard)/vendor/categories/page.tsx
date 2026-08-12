import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

export default async function VendorCategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/vendor/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        {
          products: {
            some: {
              vendorId: vendor.id,
            },
          },
        },
        {
          services: {
            some: {
              vendorId: vendor.id,
            },
          },
        },
      ],
    },
    include: {
      products: {
        where: {
          vendorId: vendor.id,
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      services: {
        where: {
          vendorId: vendor.id,
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalProducts = categories.reduce(
    (total, category) => total + category.products.length,
    0
  );

  const totalServices = categories.reduce(
    (total, category) => total + category.services.length,
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Vendor Panel</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Vendor Categories
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Categories currently used by products and services of{" "}
            {vendor.businessName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white">
            Used Categories: {categories.length}
          </div>

          <Link
            href="/vendor/categories/add"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Request Category
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Used Categories
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {categories.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Products Linked
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {totalProducts}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Services Linked
          </p>

          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {totalServices}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        This page shows only the categories already used by your products or
        services. To use a category, add a product or service and select an
        admin-created category. If the required category is not available, click
        “Request Category”.
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl text-gray-900 dark:text-white">
              Real Vendor Categories
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              These categories are linked with your products and services.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/vendor/products/add"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Add Product
            </Link>

            <Link
              href="/vendor/services/add"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Add Service
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Category
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </th>

                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  My Products
                </th>

                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  My Services
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Latest Items
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </th>

                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {categories.length > 0 ? (
                categories.map((category) => {
                  const latestItems = [
                    ...category.products.map((product) => ({
                      id: product.id,
                      title: product.title,
                      type: "Product",
                      createdAt: product.createdAt,
                    })),
                    ...category.services.map((service) => ({
                      id: service.id,
                      title: service.title,
                      type: "Service",
                      createdAt: service.createdAt,
                    })),
                  ]
                    .sort(
                      (a, b) =>
                        b.createdAt.getTime() - a.createdAt.getTime()
                    )
                    .slice(0, 3);

                  return (
                    <tr
                      key={category.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </p>

                          {category.description ? (
                            <p className="mt-1 line-clamp-2 max-w-[320px] text-xs text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400">
                              No description added.
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                        {category.slug}
                      </td>

                      <td className="px-4 py-4 text-center align-top text-sm text-gray-700 dark:text-gray-300">
                        {category.products.length}
                      </td>

                      <td className="px-4 py-4 text-center align-top text-sm text-gray-700 dark:text-gray-300">
                        {category.services.length}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          {latestItems.length > 0 ? (
                            latestItems.map((item) => (
                              <p
                                key={`${item.type}-${item.id}`}
                                className="text-sm text-gray-700 dark:text-gray-300"
                              >
                                {item.title}{" "}
                                <span className="text-xs text-gray-500">
                                  ({item.type})
                                </span>
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No linked items.
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(category.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-right align-top">
                        <Link
                          href={`/vendor/categories/${category.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div className="mx-auto max-w-md">
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        No vendor categories found.
                      </p>

                      <p className="mt-2 leading-6">
                        Categories will appear here after you add products or
                        services and assign categories to them.
                      </p>

                      <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <Link
                          href="/vendor/products/add"
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          Add Product
                        </Link>

                        <Link
                          href="/vendor/services/add"
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                          Add Service
                        </Link>

                        <Link
                          href="/vendor/categories/add"
                          className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                        >
                          Request Category
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}