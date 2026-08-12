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
  if (status === "PAID" || status === "COMPLETED" || status === "PROCESSING") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "CANCELLED" || status === "FAILED" || status === "REFUNDED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminCustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          orders: true,
          bookings: true,
          reviews: true,
          notifications: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Customers
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all real marketplace customers.
          </p>
        </div>

        <div className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          Total Customers: {customers.length}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Customers List
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Phone
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Orders
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Bookings
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Reviews
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Last Order
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Joined
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const lastOrder = customer.orders[0];

                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {customer.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {customer.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {customer.phone || "N/A"}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {customer._count.orders}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {customer._count.bookings}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {customer._count.reviews}
                      </td>

                      <td className="px-4 py-4 align-top">
                        {lastOrder ? (
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {formatMoney(lastOrder.currency, lastOrder.total)}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                  lastOrder.status
                                )}`}
                              >
                                {lastOrder.status}
                              </span>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                  lastOrder.paymentStatus
                                )}`}
                              >
                                {lastOrder.paymentStatus}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No order
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-500">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View
                        </Link>
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
  );
}