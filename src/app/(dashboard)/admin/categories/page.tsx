import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
          services: true,
          restaurants: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Admin Panel</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Categories
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage marketplace categories used for products, services, and
            restaurants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white">
            Total Categories: {categories.length}
          </div>

          <Link
            href="/admin/categories/add"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Add Category
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-5">
          <h2 className="font-heading text-xl text-gray-900 dark:text-white">
            Real Categories List
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All categories created by admin are listed here.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Products
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Services
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Restaurants
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
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                              {category.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </p>

                          {category.description ? (
                            <p className="mt-1 line-clamp-1 max-w-[300px] text-xs text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400">
                              No description added.
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {category.slug}
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {category._count.products}
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {category._count.services}
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {category._count.restaurants}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(category.createdAt)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/categories/${category.id}/edit`}
                        className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No categories found. Click “Add Category” to create your
                    first marketplace category.
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