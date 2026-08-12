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

function formatLineTotal(currency: string, price: unknown, quantity: number) {
  return `${currency} ${(Number(price || 0) * quantity).toFixed(2)}`;
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

export default async function VendorOrdersReportPage() {
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

  const orderItems = await prisma.orderItem.findMany({
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
  });

  const sortedOrderItems = orderItems.sort(
    (firstItem, secondItem) =>
      secondItem.order.createdAt.getTime() - firstItem.order.createdAt.getTime()
  );

  const uniqueOrderIds = Array.from(
    new Set(sortedOrderItems.map((item) => item.orderId))
  );

  const paidItems = sortedOrderItems.filter(
    (item) => String(item.order.paymentStatus) === "PAID"
  );

  const pendingPaymentItems = sortedOrderItems.filter(
    (item) => String(item.order.paymentStatus) === "PENDING"
  );

  const processingItems = sortedOrderItems.filter(
    (item) => String(item.order.status) === "PROCESSING"
  );

  const completedItems = sortedOrderItems.filter((item) => {
    return (
      String(item.status) === "COMPLETED" ||
      String(item.status) === "DELIVERED"
    );
  });

  const totalQuantity = sortedOrderItems.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  const totalOrderValue = sortedOrderItems.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity;
  }, 0);

  const paidOrderValue = paidItems.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity;
  }, 0);

  const pendingPaymentValue = pendingPaymentItems.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity;
  }, 0);

  const reportCurrency = sortedOrderItems[0]?.currency || "AED";

  const summaryCards = [
    {
      label: "Total Orders",
      value: String(uniqueOrderIds.length),
      helper: "Unique orders containing your items.",
    },
    {
      label: "Order Items",
      value: String(sortedOrderItems.length),
      helper: "Product and service line items.",
    },
    {
      label: "Items Sold",
      value: String(totalQuantity),
      helper: "Total quantity across all order items.",
    },
    {
      label: "Total Value",
      value: formatMoney(reportCurrency, totalOrderValue),
      helper: "Total value before commission calculation.",
    },
    {
      label: "Paid Value",
      value: formatMoney(reportCurrency, paidOrderValue),
      helper: `${paidItems.length} paid item${paidItems.length === 1 ? "" : "s"}.`,
    },
    {
      label: "Pending Payment",
      value: formatMoney(reportCurrency, pendingPaymentValue),
      helper: `${pendingPaymentItems.length} pending payment item${
        pendingPaymentItems.length === 1 ? "" : "s"
      }.`,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Vendor Orders Report
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real order item report for {vendor.businessName}.
          </p>
        </div>

        <Link
          href="/vendor/orders"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
        >
          View Orders
        </Link>
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
            Paid Items
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {paidItems.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Processing Orders
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {processingItems.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Completed Items
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {completedItems.length}
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Order Items History
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Products and services ordered from this vendor, including selected
              product variations.
            </p>
          </div>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total Value: {formatMoney(reportCurrency, totalOrderValue)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Order
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Item
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
                  Payment
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Order Status
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Item Status
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
              {sortedOrderItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No order items found.
                  </td>
                </tr>
              ) : (
                sortedOrderItems.map((item) => {
                  const orderItem = item as typeof item &
                    OrderItemVariationSnapshot;

                  const itemTitle =
                    orderItem.title ||
                    orderItem.product?.title ||
                    orderItem.service?.title ||
                    "Order Item";

                  const itemType = orderItem.productId ? "Product" : "Service";
                  const lineTotal =
                    Number(orderItem.price) * Number(orderItem.quantity);
                  const itemImage = getOrderItemImage(orderItem);

                  const variantEntries = getVariantEntries(
                    orderItem.variantOptions
                  );

                  const hasVariationDetails =
                    Boolean(orderItem.variantTitle) ||
                    Boolean(orderItem.variantSku) ||
                    variantEntries.length > 0;

                  return (
                    <tr
                      key={orderItem.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {orderItem.orderId.slice(0, 12)}...
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Item: {orderItem.id.slice(0, 10)}...
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-[340px] gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
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

                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
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
                              Unit Price:{" "}
                              {formatMoney(
                                orderItem.currency,
                                orderItem.price
                              )}
                            </p>

                            {hasVariationDetails ? (
                              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                                    Selected Variation
                                  </span>

                                  {orderItem.variantTitle ? (
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                      {orderItem.variantTitle}
                                    </span>
                                  ) : null}
                                </div>

                                {variantEntries.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {variantEntries.map(([name, value]) => (
                                      <span
                                        key={`${orderItem.id}-${name}-${value}`}
                                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                      >
                                        {name}: {value}
                                      </span>
                                    ))}
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
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {orderItem.order.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {orderItem.order.customer.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {orderItem.quantity}
                      </td>

                      <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatMoney(orderItem.currency, lineTotal)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            String(orderItem.order.paymentStatus)
                          )}`}
                        >
                          {formatStatus(String(orderItem.order.paymentStatus))}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            String(orderItem.order.status)
                          )}`}
                        >
                          {formatStatus(String(orderItem.order.status))}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            String(orderItem.status)
                          )}`}
                        >
                          {formatStatus(String(orderItem.status))}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-500">
                        {formatDate(orderItem.order.createdAt)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/vendor/orders/${orderItem.orderId}`}
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