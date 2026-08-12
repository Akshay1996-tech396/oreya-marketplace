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

function formatMoney(currency: string, amount: unknown) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function getStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  if (status === "INACTIVE" || status === "OUT_OF_STOCK") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminProductsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const products = await prisma.product.findMany({
    include: {
      vendor: {
        select: {
          businessName: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
          reviews: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const adminOwnedProducts = products.filter((product) => !product.vendor);
  const vendorOwnedProducts = products.filter((product) => product.vendor);

  return (
    <main className="mx-auto w-full min-w-0 max-w-(--breakpoint-2xl) overflow-hidden p-4 md:p-6">
      <div className="mx-auto w-full min-w-0 max-w-screen-2xl overflow-hidden">
        <div className="mb-8 flex min-w-0 flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Products
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Manage all marketplace products, including vendor-owned and
              admin-owned products.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/admin/products/add"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Add Product
            </Link>
          </div>
        </div>

        <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Products
            </p>

            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vendor-Owned Products
            </p>

            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {vendorOwnedProducts.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Admin-Owned Products
            </p>

            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {adminOwnedProducts.length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-500">
                Product Management
              </p>

              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Products List
              </h2>
            </div>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {products.length} product{products.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[1150px] text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Product
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Owner
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Category
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Price
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Orders
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Reviews
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Created
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const ownerName =
                      product.vendor?.businessName || "Admin Product";

                    const ownerEmail =
                      product.vendor?.user?.email || "Owned by admin";

                    return (
                      <tr
                        key={product.id}
                        className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                      >
                        <td className="max-w-[220px] px-4 py-4 align-top">
                          <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
                            {product.title}
                          </p>

                          <p className="mt-1 break-words text-xs text-gray-500">
                            {product.slug}
                          </p>
                        </td>

                        <td className="max-w-[220px] px-4 py-4 align-top">
                          <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
                            {ownerName}
                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">
                            {ownerEmail}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                          {product.category.name}
                        </td>

                        <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                          {formatMoney(product.currency, product.price)}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                          {product.stock}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                          {product._count.orderItems}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                          {product._count.reviews}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              product.status
                            )}`}
                          >
                            {product.status}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-gray-500">
                          {formatDate(product.createdAt)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                            >
                              View
                            </Link>

                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}