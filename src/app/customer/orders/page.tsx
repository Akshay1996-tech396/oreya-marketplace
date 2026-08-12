import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faBoxOpen,
  faChevronRight,
  faClock,
  faCreditCard,
  faLocationDot,
  faReceipt,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const customerOrderInclude = {
  payment: true,
  items: {
    include: {
      product: {
        include: {
          vendor: true,
        },
      },
      service: {
        include: {
          vendor: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type CustomerOrder = Prisma.OrderGetPayload<{
  include: typeof customerOrderInclude;
}>;

type CustomerOrderItem = CustomerOrder["items"][number];

type CustomerOrderItemWithVariation = CustomerOrderItem & {
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: Prisma.JsonValue | null;
  variantImage?: string | null;
};

type OrderDeliveryFields = {
  deliveryFullName: string | null;
  deliveryPhone: string | null;
  deliveryEmail: string | null;

  deliveryAddress: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCountry: string | null;
  deliveryState: string | null;
  deliveryCity: string | null;
  deliveryArea: string | null;
  deliveryZipCode: string | null;

  deliveryLatitude: { toString: () => string } | null;
  deliveryLongitude: { toString: () => string } | null;

  deliveryNote: string | null;
  requestedDeliveryDate: Date | null;
  requestedDeliveryTimePeriod:
    | "MORNING"
    | "AFTERNOON"
    | "EVENING"
    | null;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDeliveryDate(date: Date | null) {
  if (!date) {
    return "Not selected";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDeliveryTimePeriod(
  timePeriod:
    | "MORNING"
    | "AFTERNOON"
    | "EVENING"
    | null
) {
  if (timePeriod === "MORNING") {
    return "Morning (8:00 AM – 12:00 PM)";
  }

  if (timePeriod === "AFTERNOON") {
    return "Afternoon (12:00 PM – 5:00 PM)";
  }

  if (timePeriod === "EVENING") {
    return "Evening (5:00 PM – 9:00 PM)";
  }

  return "Standard delivery schedule";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatAmount(currency: string, amount: unknown) {
  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${numericAmount.toFixed(2)}`;
}

function getOrderStatusClass(status: string) {
  if (
    status === "DELIVERED" ||
    status === "COMPLETED" ||
    status === "ACCEPTED"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "PROCESSING" || status === "SHIPPED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    status === "CANCELLED" ||
    status === "REJECTED" ||
    status === "REFUNDED"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getPaymentStatusClass(status: string) {
  if (status === "PAID") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getStatusDescription(status: string) {
  if (status === "PENDING") {
    return "Your order has been placed and is waiting for review.";
  }

  if (status === "ACCEPTED") {
    return "Your order has been accepted for fulfillment.";
  }

  if (status === "PROCESSING") {
    return "Your order is currently being processed.";
  }

  if (status === "SHIPPED") {
    return "Your order has been shipped.";
  }

  if (status === "DELIVERED") {
    return "Your order has been delivered.";
  }

  if (status === "COMPLETED") {
    return "Your order has been completed successfully.";
  }

  if (status === "CANCELLED") {
    return "Your order has been cancelled.";
  }

  if (status === "REJECTED") {
    return "Your order has been rejected.";
  }

  if (status === "REFUNDED") {
    return "Your order has been refunded.";
  }

  return "Your order status is being updated.";
}

function isActiveOrderStatus(status: string) {
  return ![
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "REFUNDED",
  ].includes(status);
}

function isCompletedOrderStatus(status: string) {
  return status === "DELIVERED" || status === "COMPLETED";
}

function getItemType(item: CustomerOrderItem) {
  if (item.productId) {
    return "Product";
  }

  if (item.serviceId) {
    return "Service";
  }

  return "Item";
}

function getItemTitle(item: CustomerOrderItem) {
  return (
    item.title || item.product?.title || item.service?.title || "Order Item"
  );
}

function getItemVendorName(item: CustomerOrderItem) {
  if (item.product) {
    return item.product.vendor?.businessName || "Oreya Marketplace";
  }

  if (item.service) {
    return item.service.vendor?.businessName || "Oreya Marketplace";
  }

  return "Oreya Marketplace";
}

function getShortAddress(order: CustomerOrder & OrderDeliveryFields) {
  if (order.deliveryAddress) {
    return order.deliveryAddress;
  }

  return [
    order.deliveryAddressLine1,
    order.deliveryAddressLine2,
    order.deliveryArea,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryCountry,
    order.deliveryZipCode,
  ]
    .filter(Boolean)
    .join(", ");
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

function getOrderItemImage(item: CustomerOrderItemWithVariation) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

export default async function CustomerOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/customer/orders");
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  const orders = await prisma.order.findMany({
    where: {
      customerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: customerOrderInclude,
  });

  const activeOrders = orders.filter((order) =>
    isActiveOrderStatus(String(order.status))
  ).length;

  const completedOrders = orders.filter((order) =>
    isCompletedOrderStatus(String(order.status))
  ).length;

  const pendingPayments = orders.filter(
    (order) => String(order.paymentStatus) === "PENDING"
  ).length;

  const totalOrderValue = orders.reduce((total, order) => {
    return total + Number(order.total || 0);
  }, 0);

  const reportCurrency = orders[0]?.currency || "AED";

  const summaryCards = [
    {
      label: "Total Orders",
      value: String(orders.length),
      helper: "All product and service orders",
      icon: faReceipt,
    },
    {
      label: "Active Orders",
      value: String(activeOrders),
      helper: "Orders currently in progress",
      icon: faTruck,
    },
    {
      label: "Completed Orders",
      value: String(completedOrders),
      helper: "Orders delivered or completed",
      icon: faBoxOpen,
    },
    {
      label: "Total Order Value",
      value: formatAmount(reportCurrency, totalOrderValue),
      helper: `${pendingPayments} pending payment${
        pendingPayments === 1 ? "" : "s"
      }`,
      icon: faCreditCard,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-20">
        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Customer Orders
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
              My Orders
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              Welcome, {user.name || "Customer"}. Review your order history,
              track fulfillment progress, view receipts, and check delivery
              information from one place.
            </p>
          </div>

          <Link
            href="/"
            className="w-fit rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Continue Shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-gray-300 p-12 text-center">
            <FontAwesomeIcon
              icon={faBoxOpen}
              className="mx-auto h-12 w-12 text-gray-400"
            />

            <h2 className="mt-5 font-heading text-2xl uppercase">
              No Orders Yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              You have not placed any orders yet. Start shopping and your order
              history will appear here.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white"
              >
                Start Shopping
              </Link>

              <Link
                href="/customer"
                className="rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-black hover:bg-gray-100"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>

                      <p className="mt-2 text-xl font-semibold">
                        {card.value}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <FontAwesomeIcon icon={card.icon} className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    {card.helper}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {orders.map((order) => {
                const orderWithDelivery = order as CustomerOrder &
                  OrderDeliveryFields;

                const orderStatus = String(orderWithDelivery.status);
                const paymentStatus = String(orderWithDelivery.paymentStatus);
                const paymentMethod = orderWithDelivery.payment?.method
                  ? formatStatus(String(orderWithDelivery.payment.method))
                  : "Pending";

                const isPaid = paymentStatus === "PAID";
                const totalLabel = isPaid ? "Total Paid" : "Amount to Pay";

                const deliveryCityArea = [
                  orderWithDelivery.deliveryCity,
                  orderWithDelivery.deliveryArea,
                ]
                  .filter(Boolean)
                  .join(", ");

                const shortAddress = getShortAddress(orderWithDelivery);
                const requestedDeliveryDate =
                  orderWithDelivery.requestedDeliveryDate || null;

                const requestedDeliveryTimePeriod =
                  orderWithDelivery.requestedDeliveryTimePeriod || null;

                const requestedDeliveryTimePeriodLabel =
                  formatDeliveryTimePeriod(requestedDeliveryTimePeriod);

                const hasPreferredDeliverySchedule = Boolean(
                  requestedDeliveryDate || requestedDeliveryTimePeriod
                );

                const preferredDeliveryScheduleLabel = [
                  requestedDeliveryDate
                    ? formatDeliveryDate(requestedDeliveryDate)
                    : null,
                  requestedDeliveryTimePeriod
                    ? requestedDeliveryTimePeriodLabel
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const hasDeliveryInfo = Boolean(
                  deliveryCityArea ||
                    shortAddress ||
                    orderWithDelivery.deliveryPhone ||
                    orderWithDelivery.deliveryNote ||
                    requestedDeliveryDate ||
                    requestedDeliveryTimePeriod
                );

                return (
                  <article
                    key={orderWithDelivery.id}
                    className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm md:p-6"
                  >
                    <div className="flex flex-col gap-5 border-b border-gray-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getOrderStatusClass(
                              orderStatus
                            )}`}
                          >
                            {formatStatus(orderStatus)}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getPaymentStatusClass(
                              paymentStatus
                            )}`}
                          >
                            Payment {formatStatus(paymentStatus)}
                          </span>
                        </div>

                        <h2 className="break-all font-heading text-2xl uppercase">
                          Order #{orderWithDelivery.id}
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                          {getStatusDescription(orderStatus)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faClock}
                              className="h-4 w-4"
                            />
                            {formatDate(orderWithDelivery.createdAt)}
                          </span>

                          <span className="inline-flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faBagShopping}
                              className="h-4 w-4"
                            />
                            {orderWithDelivery.items.length} item
                            {orderWithDelivery.items.length === 1 ? "" : "s"}
                          </span>

                          <span className="inline-flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={faCreditCard}
                              className="h-4 w-4"
                            />
                            {paymentMethod}
                          </span>

                          {deliveryCityArea ? (
                            <span className="inline-flex items-center gap-2">
                              <FontAwesomeIcon
                                icon={faLocationDot}
                                className="h-4 w-4"
                              />
                              {deliveryCityArea}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4 text-left lg:min-w-[240px] lg:text-right">
                        <p className="text-sm text-gray-500">{totalLabel}</p>

                        <p className="mt-1 whitespace-nowrap text-2xl font-semibold">
                          {formatAmount(
                            orderWithDelivery.currency,
                            Number(orderWithDelivery.total)
                          )}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {preferredDeliveryScheduleLabel ||
                            "Standard delivery schedule"}
                        </p>
                      </div>
                    </div>

                    {hasDeliveryInfo ? (
                      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faLocationDot}
                            className="h-4 w-4"
                          />

                          <h3 className="font-semibold uppercase tracking-wide">
                            Delivery Information
                          </h3>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                          <div>
                            <p className="text-gray-500">City / Area</p>

                            <p className="mt-1 font-semibold">
                              {deliveryCityArea || "Not added"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">Phone Number</p>

                            <p className="mt-1 font-semibold">
                              {orderWithDelivery.deliveryPhone || "Not added"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">Full Name</p>

                            <p className="mt-1 font-semibold">
                              {orderWithDelivery.deliveryFullName ||
                                user.name ||
                                "Customer"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">
                              Preferred Delivery Date
                            </p>

                            <p className="mt-1 font-semibold">
                              {formatDeliveryDate(requestedDeliveryDate)}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500">
                              Preferred Delivery Time
                            </p>

                            <p className="mt-1 font-semibold">
                              {requestedDeliveryTimePeriodLabel}
                            </p>
                          </div>
                        </div>

                        {shortAddress ? (
                          <div className="mt-4">
                            <p className="text-gray-500">Complete Address</p>

                            <p className="mt-1 font-semibold leading-6">
                              {shortAddress}
                            </p>
                          </div>
                        ) : null}

                        {orderWithDelivery.deliveryNote ? (
                          <div className="mt-4">
                            <p className="text-gray-500">Delivery Note</p>

                            <p className="mt-1 whitespace-pre-wrap font-semibold leading-6">
                              {orderWithDelivery.deliveryNote}
                            </p>
                          </div>
                        ) : null}

                        {!hasPreferredDeliverySchedule ? (
                          <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-600">
                            No preferred delivery date and time were selected.
                            This order will follow the standard preparation and
                            delivery schedule.
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <div className="mb-4 flex items-center gap-3">
                        <FontAwesomeIcon icon={faReceipt} className="h-5 w-5" />

                        <h3 className="font-heading text-xl uppercase">
                          Ordered Items
                        </h3>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 font-semibold text-gray-600">
                                  Item Details
                                </th>

                                <th className="px-4 py-3 font-semibold text-gray-600">
                                  Type / Vendor
                                </th>

                                <th className="px-4 py-3 font-semibold text-gray-600">
                                  Variation
                                </th>

                                <th className="px-4 py-3 text-center font-semibold text-gray-600">
                                  Quantity
                                </th>

                                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                  Unit Price
                                </th>

                                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                  Amount
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {orderWithDelivery.items.map((item) => {
                                const orderItem =
                                  item as CustomerOrderItemWithVariation;

                                const itemType = getItemType(orderItem);
                                const itemTitle = getItemTitle(orderItem);
                                const vendorName =
                                  getItemVendorName(orderItem);
                                const lineTotal =
                                  Number(orderItem.price) *
                                  Number(orderItem.quantity);

                                const variantEntries = getVariantEntries(
                                  orderItem.variantOptions
                                );
                                const itemImage =
                                  getOrderItemImage(orderItem);

                                const hasVariantDetails =
                                  Boolean(orderItem.variantTitle) ||
                                  Boolean(orderItem.variantSku) ||
                                  variantEntries.length > 0;

                                return (
                                  <tr
                                    key={orderItem.id}
                                    className="align-top"
                                  >
                                    <td className="px-4 py-4">
                                      <div className="flex min-w-0 gap-4">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                                          {itemImage ? (
                                            <img
                                              src={itemImage}
                                              alt={itemTitle}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                              <FontAwesomeIcon
                                                icon={faBagShopping}
                                                className="h-5 w-5 text-gray-300"
                                              />
                                            </div>
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span
                                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getOrderStatusClass(
                                                String(orderItem.status)
                                              )}`}
                                            >
                                              {formatStatus(
                                                String(orderItem.status)
                                              )}
                                            </span>
                                          </div>

                                          <p className="mt-2 font-semibold text-black">
                                            {itemTitle}
                                          </p>

                                          <p className="mt-1 text-xs text-gray-500">
                                            Item ID: {orderItem.id}
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-4 py-4">
                                      <p className="font-medium text-black">
                                        {itemType}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        {vendorName}
                                      </p>
                                    </td>

                                    <td className="px-4 py-4">
                                      {hasVariantDetails ? (
                                        <div className="space-y-2">
                                          {orderItem.variantTitle ? (
                                            <span className="inline-flex rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                              {orderItem.variantTitle}
                                            </span>
                                          ) : null}

                                          {variantEntries.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                              {variantEntries.map(
                                                ([name, value]) => (
                                                  <span
                                                    key={`${orderItem.id}-${name}-${value}`}
                                                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700"
                                                  >
                                                    {name}: {value}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          ) : null}

                                          {orderItem.variantSku ? (
                                            <p className="text-[11px] text-gray-500">
                                              SKU: {orderItem.variantSku}
                                            </p>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-500">
                                          Standard
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-4 py-4 text-center font-semibold text-gray-700">
                                      {orderItem.quantity}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-700">
                                      {formatAmount(
                                        orderItem.currency,
                                        Number(orderItem.price)
                                      )}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-black">
                                      {formatAmount(
                                        orderItem.currency,
                                        lineTotal
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 rounded-2xl border border-gray-200 p-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-gray-500">Subtotal</p>

                        <p className="mt-1 whitespace-nowrap font-semibold">
                          {formatAmount(
                            orderWithDelivery.currency,
                            Number(orderWithDelivery.subtotal)
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Shipping / Delivery</p>

                        <p className="mt-1 whitespace-nowrap font-semibold">
                          {formatAmount(
                            orderWithDelivery.currency,
                            Number(orderWithDelivery.shipping)
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Tax</p>

                        <p className="mt-1 whitespace-nowrap font-semibold">
                          {formatAmount(
                            orderWithDelivery.currency,
                            Number(orderWithDelivery.tax)
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Total</p>

                        <p className="mt-1 whitespace-nowrap font-semibold">
                          {formatAmount(
                            orderWithDelivery.currency,
                            Number(orderWithDelivery.total)
                          )}
                        </p>
                      </div>
                    </div>

                    {!isPaid ? (
                      <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                        Payment is pending. For Cash on Delivery orders, payment
                        will be collected at the time of delivery.
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/customer/orders/${orderWithDelivery.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                      >
                        Track Order
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="h-3 w-3"
                        />
                      </Link>

                      <Link
                        href={`/checkout/success?orderId=${orderWithDelivery.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                      >
                        View Receipt
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="h-3 w-3"
                        />
                      </Link>

                      <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                      >
                        Continue Shopping
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}