import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrderItemVariationSnapshot = {
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: Prisma.JsonValue | null;
  variantImage?: string | null;
};

type SalesReportRow = {
  id: string;
  type: "Product Sale" | "Service Sale" | "Appointment Booking";
  title: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  date: Date;
  link: string;
  image?: string | null;
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: Prisma.JsonValue | null;
};

function formatMoney(currency: string, amount: unknown) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusClass(status: string) {
  if (
    status === "PAID" ||
    status === "COMPLETED" ||
    status === "CONFIRMED" ||
    status === "DELIVERED"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    status === "PENDING" ||
    status === "PROCESSING" ||
    status === "ACCEPTED" ||
    status === "SHIPPED"
  ) {
    return "bg-yellow-50 text-yellow-700";
  }

  if (
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "CANCELLED" ||
    status === "REJECTED"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
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

function getVariantOptions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const optionRecord = value as Record<string, unknown>;
  const options: Record<string, string> = {};

  Object.entries(optionRecord).forEach(([name, selectedValue]) => {
    const optionName = String(name || "").trim();
    const optionValue = String(selectedValue || "").trim();

    if (!optionName || !optionValue) {
      return;
    }

    options[optionName] = optionValue;
  });

  return options;
}

function getVariantEntries(value: unknown) {
  return Object.entries(getVariantOptions(value));
}

function getOrderItemImage(
  item: OrderItemVariationSnapshot & {
    product?: {
      images?: string[] | null;
    } | null;
  }
) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

export default async function VendorSalesReportPage() {
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
            slug: true,
            images: true,
          },
        },
        service: {
          select: {
            title: true,
            slug: true,
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
    .filter((item) => String(item.order.paymentStatus) === "PAID")
    .sort(
      (firstItem, secondItem) =>
        secondItem.order.createdAt.getTime() -
        firstItem.order.createdAt.getTime()
    );

  const productSales = paidOrderItems
    .filter((item) => item.productId)
    .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const serviceOrderSales = paidOrderItems
    .filter((item) => item.serviceId)
    .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const bookingSales = paidBookings.reduce((sum, booking) => {
    return sum + Number(booking.amount);
  }, 0);

  const totalSales = productSales + serviceOrderSales + bookingSales;

  const totalItemsSold = paidOrderItems.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  const totalPaidRecords = paidOrderItems.length + paidBookings.length;

  const uniquePaidOrderIds = Array.from(
    new Set(paidOrderItems.map((item) => item.orderId))
  );

  const reportCurrency =
    paidOrderItems[0]?.currency || paidBookings[0]?.currency || "AED";

  const salesRows: SalesReportRow[] = [
    ...paidOrderItems.map((item) => {
      const orderItem = item as typeof item & OrderItemVariationSnapshot;

      const title =
        orderItem.title ||
        orderItem.product?.title ||
        orderItem.service?.title ||
        "Sales Item";

      const saleType: SalesReportRow["type"] = orderItem.productId
        ? "Product Sale"
        : "Service Sale";

      return {
        id: orderItem.id,
        type: saleType,
        title,
        customerName: orderItem.order.customer.name,
        customerEmail: orderItem.order.customer.email,
        quantity: orderItem.quantity,
        amount: Number(orderItem.price) * orderItem.quantity,
        currency: orderItem.currency,
        status: String(orderItem.order.paymentStatus),
        date: orderItem.order.createdAt,
        link: `/vendor/orders/${orderItem.orderId}`,
        image: getOrderItemImage(orderItem),
        variantTitle: orderItem.variantTitle,
        variantSku: orderItem.variantSku,
        variantOptions: orderItem.variantOptions,
      };
    }),

    ...paidBookings.map((booking) => {
      const bookingType: SalesReportRow["type"] = "Appointment Booking";

      return {
        id: booking.id,
        type: bookingType,
        title: booking.service.title,
        customerName: booking.customer.name,
        customerEmail: booking.customer.email,
        quantity: 1,
        amount: Number(booking.amount),
        currency: booking.currency,
        status: String(booking.paymentStatus),
        date: booking.createdAt,
        link: "/vendor/appointments",
        image: null,
        variantTitle: null,
        variantSku: null,
        variantOptions: null,
      };
    }),
  ].sort(
    (firstRow, secondRow) =>
      secondRow.date.getTime() - firstRow.date.getTime()
  );

  const summaryCards = [
    {
      label: "Total Sales",
      value: formatMoney(reportCurrency, totalSales),
      helper: "Paid product, service, and appointment revenue.",
    },
    {
      label: "Product Sales",
      value: formatMoney(reportCurrency, productSales),
      helper: "Revenue from paid product order items.",
    },
    {
      label: "Service Sales",
      value: formatMoney(reportCurrency, serviceOrderSales),
      helper: "Revenue from paid service order items.",
    },
    {
      label: "Booking Sales",
      value: formatMoney(reportCurrency, bookingSales),
      helper: "Revenue from paid appointment bookings.",
    },
    {
      label: "Paid Orders",
      value: String(uniquePaidOrderIds.length),
      helper: "Unique paid orders containing your items.",
    },
    {
      label: "Paid Records",
      value: String(totalPaidRecords),
      helper: "Paid order items and appointment bookings.",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Vendor Sales Report
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review paid product sales, service sales, and appointment booking
            revenue for {vendor.businessName}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/vendor/orders"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
          >
            View Orders
          </Link>

          <Link
            href="/vendor/appointments"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            View Appointments
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {card.label}
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {card.value}
            </h2>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {card.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Items Sold
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {totalItemsSold}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Total product and service quantity from paid orders.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Paid Appointments
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {paidBookings.length}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Appointment bookings with paid payment status.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Average Paid Record
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatMoney(
              reportCurrency,
              totalPaidRecords > 0 ? totalSales / totalPaidRecords : 0
            )}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Average amount across all paid sales records.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Sales History
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Paid product sales, service sales, and appointment bookings with
              customer and variation details.
            </p>
          </div>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total Sales: {formatMoney(reportCurrency, totalSales)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left">
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
              {salesRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No paid sales records found.
                  </td>
                </tr>
              ) : (
                salesRows.map((row) => {
                  const variantEntries = getVariantEntries(row.variantOptions);

                  const hasVariationDetails =
                    Boolean(row.variantTitle) ||
                    Boolean(row.variantSku) ||
                    variantEntries.length > 0;

                  return (
                    <tr
                      key={`${row.type}-${row.id}`}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-[340px] gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                            {row.image ? (
                              <img
                                src={row.image}
                                alt={row.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {hasVariationDetails ? (
                                <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                  Variation
                                </span>
                              ) : null}
                            </div>

                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {row.title}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Record ID: {row.id.slice(0, 12)}...
                            </p>

                            {hasVariationDetails ? (
                              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                    Selected Variation
                                  </span>

                                  {row.variantTitle ? (
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                      {row.variantTitle}
                                    </span>
                                  ) : null}
                                </div>

                                {variantEntries.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {variantEntries.map(([name, value]) => (
                                      <span
                                        key={`${row.id}-${name}-${value}`}
                                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                      >
                                        {name}: {value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}

                                {row.variantSku ? (
                                  <p className="mt-2 text-[11px] text-gray-500">
                                    SKU: {row.variantSku}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {row.type}
                        </span>
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
                          {formatStatus(row.status)}
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