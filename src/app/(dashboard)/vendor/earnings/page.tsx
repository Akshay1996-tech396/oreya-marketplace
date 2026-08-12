import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(status: string) {
  if (status === "PAID" || status === "COMPLETED" || status === "CONFIRMED") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING" || status === "PROCESSING") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "FAILED" || status === "REFUNDED" || status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function VendorEarningsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
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
    redirect("/vendor/register");
  }

  const [orderItems, paidBookings] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        OR: [
          {
            product: {
              is: {
                vendorId: vendor.id,
              },
            },
          },
          {
            service: {
              is: {
                vendorId: vendor.id,
              },
            },
          },
        ],
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
    }),

    prisma.booking.findMany({
      where: {
        vendorId: vendor.id,
        paymentStatus: "PAID",
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const paidOrderItems = orderItems
    .filter((item) => item.order.paymentStatus === "PAID")
    .sort(
      (a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime()
    );

  const productEarnings = paidOrderItems
    .filter((item) => item.productId)
    .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const serviceOrderEarnings = paidOrderItems
    .filter((item) => item.serviceId)
    .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const bookingEarnings = paidBookings.reduce(
    (sum, booking) => sum + Number(booking.amount),
    0
  );

  const totalEarnings =
    productEarnings + serviceOrderEarnings + bookingEarnings;

  const totalOrderItemQty = paidOrderItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const earningRows = [
    ...paidOrderItems.map((item) => {
      const itemTitle =
        item.product?.title || item.service?.title || item.title;

      return {
        id: item.id,
        type: item.productId ? "Product Order" : "Service Order",
        title: itemTitle,
        customerName: item.order.customer.name,
        customerEmail: item.order.customer.email,
        quantity: item.quantity,
        amount: Number(item.price) * item.quantity,
        currency: item.currency,
        status: item.order.paymentStatus,
        date: item.order.createdAt,
        link: `/vendor/orders`,
      };
    }),

    ...paidBookings.map((booking) => ({
      id: booking.id,
      type: "Appointment Booking",
      title: booking.service.title,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      quantity: 1,
      amount: Number(booking.amount),
      currency: booking.currency,
      status: booking.paymentStatus,
      date: booking.createdAt,
      link: `/vendor/appointments`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
          Vendor Earnings
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real earnings report for {vendor.businessName}.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Total Earnings</p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatMoney("AED", totalEarnings)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Product Sales</p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatMoney("AED", productEarnings)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Service Orders</p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatMoney("AED", serviceOrderEarnings)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Booking Earnings</p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatMoney("AED", bookingEarnings)}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Items Sold</p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {totalOrderItemQty}
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Real Earnings History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Paid product orders, service orders and appointment bookings.
            </p>
          </div>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Records: {earningRows.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Record
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Type
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Qty
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Amount
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
              {earningRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No earnings found.
                  </td>
                </tr>
              ) : (
                earningRows.map((row) => (
                  <tr
                    key={`${row.type}-${row.id}`}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {row.id.slice(0, 12)}...
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.type}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {row.customerName}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {row.customerEmail}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.quantity}
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(row.currency, row.amount)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDate(row.date)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <Link
                        href={row.link}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                      >
                        View
                      </Link>
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