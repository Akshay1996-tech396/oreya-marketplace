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
  if (status === "PAID") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const payments = await prisma.payment.findMany({
    include: {
      order: {
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              title: true,
              quantity: true,
              currency: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalPaid = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Payments
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all real payment records.
          </p>
        </div>

        <div className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          Total Paid: AED {totalPaid.toFixed(2)}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Payments List
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total Records: {payments.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Payment
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Order
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Items
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Amount
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Method
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Provider
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Transaction
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Status
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Date
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {payment.id.slice(0, 12)}...
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Payment ID
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      {payment.order ? (
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {payment.order.id.slice(0, 12)}...
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">No order</p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      {payment.order?.customer ? (
                        <>
                          <p className="text-sm text-gray-800 dark:text-white/90">
                            {payment.order.customer.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {payment.order.customer.email}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">N/A</p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1">
                        {payment.order?.items?.length ? (
                          payment.order.items.map((item) => (
                            <p
                              key={item.id}
                              className="text-sm text-gray-700 dark:text-gray-300"
                            >
                              {item.title} × {item.quantity}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No items</p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(payment.currency, payment.amount)}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {payment.method}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {payment.provider || "N/A"}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {payment.transactionId || "N/A"}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      {payment.orderId ? (
                        <Link
                          href={`/admin/orders/${payment.orderId}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View Order
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}