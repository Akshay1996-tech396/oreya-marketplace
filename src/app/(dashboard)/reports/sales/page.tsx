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

function getVendorNames(
  items: {
    product?: {
      vendor?: {
        businessName: string;
      } | null;
    } | null;
    service?: {
      vendor?: {
        businessName: string;
      } | null;
    } | null;
  }[]
) {
  const vendorNames = new Set<string>();

  items.forEach((item) => {
    if (item.product?.vendor?.businessName) {
      vendorNames.add(item.product.vendor.businessName);
    }

    if (item.service?.vendor?.businessName) {
      vendorNames.add(item.service.vendor.businessName);
    }
  });

  return Array.from(vendorNames);
}

export default async function SalesReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        paymentStatus: "PAID",
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                title: true,
                slug: true,
                images: true,
                vendor: {
                  select: {
                    businessName: true,
                  },
                },
              },
            },
            service: {
              select: {
                title: true,
                slug: true,
                vendor: {
                  select: {
                    businessName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.payment.findMany({
      where: {
        status: "PAID",
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalSales = orders.reduce((sum, order) => {
    return sum + Number(order.total);
  }, 0);

  const totalPaidPayments = payments.reduce((sum, payment) => {
    return sum + Number(payment.amount);
  }, 0);

  const totalItemsSold = orders.reduce((sum, order) => {
    return (
      sum +
      order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    );
  }, 0);

  const totalOrderItems = orders.reduce((sum, order) => {
    return sum + order.items.length;
  }, 0);

  const productItems = orders.reduce((sum, order) => {
    return sum + order.items.filter((item) => item.productId).length;
  }, 0);

  const serviceItems = orders.reduce((sum, order) => {
    return sum + order.items.filter((item) => item.serviceId).length;
  }, 0);

  const averageOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

  const reportCurrency = orders[0]?.currency || payments[0]?.currency || "AED";

  const summaryCards = [
    {
      label: "Total Sales",
      value: formatMoney(reportCurrency, totalSales),
      helper: "Paid marketplace order revenue.",
    },
    {
      label: "Paid Payments",
      value: formatMoney(reportCurrency, totalPaidPayments),
      helper: "All paid payment records in the system.",
    },
    {
      label: "Paid Orders",
      value: String(orders.length),
      helper: "Customer orders with paid payment status.",
    },
    {
      label: "Average Order Value",
      value: formatMoney(reportCurrency, averageOrderValue),
      helper: "Average paid order amount.",
    },
    {
      label: "Items Sold",
      value: String(totalItemsSold),
      helper: "Total quantity sold across paid orders.",
    },
    {
      label: "Order Items",
      value: String(totalOrderItems),
      helper: "Product and service line items.",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Sales Report
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review paid marketplace orders, sold items, vendor revenue records,
            and selected product variation details.
          </p>
        </div>

        <Link
          href="/admin/orders"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
        >
          View Orders
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
            Product Items
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {productItems}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Product line items included in paid orders.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Service Items
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {serviceItems}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Service line items included in paid orders.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Payment Records
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {payments.length}
          </h2>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Paid payment records across orders, bookings, and reservations.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Real Paid Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Paid customer orders with customer details, vendor details, order
              items, and selected product variations.
            </p>
          </div>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Items Sold: {totalItemsSold}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Order
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Vendor
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Items
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Total
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Payment
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
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No paid sales found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const vendorNames = getVendorNames(order.items);

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {order.id.slice(0, 12)}...
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {order.items.length} item
                          {order.items.length === 1 ? "" : "s"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {order.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {order.customer.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        {vendorNames.length > 0 ? (
                          <div className="flex max-w-[220px] flex-wrap gap-2">
                            {vendorNames.map((vendorName) => (
                              <span
                                key={`${order.id}-${vendorName}`}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {vendorName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Not available
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-4">
                          {order.items.map((item) => {
                            const orderItem = item as typeof item &
                              OrderItemVariationSnapshot;

                            const itemTitle =
                              orderItem.title ||
                              orderItem.product?.title ||
                              orderItem.service?.title ||
                              "Sales Item";

                            const itemType = orderItem.productId
                              ? "Product"
                              : "Service";

                            const vendorName =
                              orderItem.product?.vendor?.businessName ||
                              orderItem.service?.vendor?.businessName ||
                              "Not available";

                            const itemImage = getOrderItemImage(orderItem);

                            const variantEntries = getVariantEntries(
                              orderItem.variantOptions
                            );

                            const hasVariationDetails =
                              Boolean(orderItem.variantTitle) ||
                              Boolean(orderItem.variantSku) ||
                              variantEntries.length > 0;

                            return (
                              <div
                                key={orderItem.id}
                                className="flex min-w-[420px] gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900"
                              >
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={itemTitle}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-400">
                                      No Image
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                      {itemType}
                                    </span>

                                    {hasVariationDetails ? (
                                      <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                        Variation
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {itemTitle}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    Vendor: {vendorName}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    Quantity: {orderItem.quantity} ×{" "}
                                    {formatMoney(
                                      orderItem.currency,
                                      orderItem.price
                                    )}{" "}
                                    ={" "}
                                    {formatMoney(
                                      orderItem.currency,
                                      Number(orderItem.price) *
                                        orderItem.quantity
                                    )}
                                  </p>

                                  {hasVariationDetails ? (
                                    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                          Selected Variation
                                        </span>

                                        {orderItem.variantTitle ? (
                                          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                            {orderItem.variantTitle}
                                          </span>
                                        ) : null}
                                      </div>

                                      {variantEntries.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {variantEntries.map(
                                            ([name, value]) => (
                                              <span
                                                key={`${orderItem.id}-${name}-${value}`}
                                                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                              >
                                                {name}: {value}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      ) : null}

                                      {orderItem.variantSku ? (
                                        <p className="mt-2 text-[11px] text-gray-500">
                                          SKU: {orderItem.variantSku}
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatMoney(order.currency, order.total)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            String(order.paymentStatus)
                          )}`}
                        >
                          {formatStatus(String(order.paymentStatus))}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View Order
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