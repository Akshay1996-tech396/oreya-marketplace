import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { DeliveryTimePeriod, Prisma } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBagShopping,
  faCalendarDays,
  faCheck,
  faCircleInfo,
  faClock,
  faCreditCard,
  faEnvelope,
  faLocationDot,
  faReceipt,
  faTruck,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const orderTrackingInclude = {
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

type TrackingOrder = Prisma.OrderGetPayload<{
  include: typeof orderTrackingInclude;
}>;

type TrackingOrderItem = TrackingOrder["items"][number];

type TrackingOrderItemWithVariation = TrackingOrderItem & {
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
  requestedDeliveryTimePeriod: DeliveryTimePeriod | null;
};

type TrackingStep = {
  key: string;
  title: string;
  description: string;
};

const trackingSteps: TrackingStep[] = [
  {
    key: "PENDING",
    title: "Order Received",
    description: "Your order has been placed successfully.",
  },
  {
    key: "ACCEPTED",
    title: "Order Accepted",
    description: "Your order has been accepted for fulfillment.",
  },
  {
    key: "PROCESSING",
    title: "In Progress",
    description: "Your order is being prepared, processed, or shipped.",
  },
  {
    key: "COMPLETED",
    title: "Delivered",
    description: "Your order has reached the final delivery stage.",
  },
];

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function formatDateStable(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  return `${day}-${month}-${year}, ${hours}:${minutes} ${period}`;
}

function formatDateOnlyStable(date: Date | string | null | undefined) {
  if (!date) {
    return "Not selected";
  }

  const deliveryDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(deliveryDate.getTime())) {
    return "Not selected";
  }

  const day = String(deliveryDate.getUTCDate()).padStart(2, "0");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[deliveryDate.getUTCMonth()];
  const year = deliveryDate.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

function formatDeliveryTimePeriod(
  value: DeliveryTimePeriod | string | null | undefined
) {
  if (value === "MORNING") {
    return "Morning (8:00 AM – 12:00 PM)";
  }

  if (value === "AFTERNOON") {
    return "Afternoon (12:00 PM – 5:00 PM)";
  }

  if (value === "EVENING") {
    return "Evening (5:00 PM – 9:00 PM)";
  }

  return "Time period not selected";
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

function getPaymentStatusClass(status: string) {
  if (status === "PAID") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getOrderStatusClass(status: string) {
  if (
    status === "COMPLETED" ||
    status === "DELIVERED" ||
    status === "ACCEPTED"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "REFUNDED"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "PROCESSING" || status === "SHIPPED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getCurrentStepIndex(status: string) {
  if (status === "PENDING") {
    return 0;
  }

  if (status === "ACCEPTED") {
    return 1;
  }

  if (status === "PROCESSING" || status === "SHIPPED") {
    return 2;
  }

  if (
    status === "DELIVERED" ||
    status === "COMPLETED" ||
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "REFUNDED"
  ) {
    return 3;
  }

  return 0;
}

function getStepState(status: string, index: number) {
  const currentIndex = getCurrentStepIndex(status);
  const isNegativeFinalStatus =
    status === "REJECTED" || status === "CANCELLED" || status === "REFUNDED";

  if (isNegativeFinalStatus) {
    if (index < 3) {
      return "completed";
    }

    return "rejected";
  }

  if (index < currentIndex) {
    return "completed";
  }

  if (index === currentIndex) {
    return "active";
  }

  return "pending";
}

function getStepCircleClass(state: string) {
  if (state === "completed") {
    return "border-green-600 bg-green-600 text-white";
  }

  if (state === "active") {
    return "border-black bg-black text-white";
  }

  if (state === "rejected") {
    return "border-red-600 bg-red-600 text-white";
  }

  return "border-gray-300 bg-white text-gray-400";
}

function getStepTextClass(state: string) {
  if (state === "completed") {
    return "text-green-700";
  }

  if (state === "active") {
    return "text-black";
  }

  if (state === "rejected") {
    return "text-red-700";
  }

  return "text-gray-400";
}

function getProgressLineClass(state: string) {
  if (state === "completed") {
    return "bg-green-600";
  }

  return "bg-gray-200";
}

function getFinalStepTitle(status: string) {
  if (status === "REJECTED") {
    return "Rejected";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "DELIVERED" || status === "COMPLETED") {
    return "Delivered";
  }

  return "Delivered";
}

function getFinalStepDescription(status: string) {
  if (status === "REJECTED") {
    return "This order has been rejected.";
  }

  if (status === "CANCELLED") {
    return "This order has been cancelled.";
  }

  if (status === "REFUNDED") {
    return "This order has been refunded.";
  }

  if (status === "DELIVERED" || status === "COMPLETED") {
    return "Your order has been delivered successfully.";
  }

  return "Your order will be completed after delivery.";
}

function getTrackingMessage(status: string) {
  if (status === "PENDING") {
    return "Your order has been placed and is awaiting review.";
  }

  if (status === "ACCEPTED") {
    return "Your order has been accepted and will be fulfilled shortly.";
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

  if (status === "REJECTED") {
    return "Your order has been rejected.";
  }

  if (status === "CANCELLED") {
    return "Your order has been cancelled.";
  }

  if (status === "REFUNDED") {
    return "Your order has been refunded.";
  }

  return "Your order status is being updated.";
}

function getItemType(item: TrackingOrderItem) {
  if (item.productId) {
    return "Product";
  }

  if (item.serviceId) {
    return "Service";
  }

  return "Item";
}

function getItemTitle(item: TrackingOrderItem) {
  return (
    item.title || item.product?.title || item.service?.title || "Order Item"
  );
}

function getItemVendorName(item: TrackingOrderItem) {
  if (item.product) {
    return item.product.vendor?.businessName || "Oreya Marketplace";
  }

  if (item.service) {
    return item.service.vendor?.businessName || "Oreya Marketplace";
  }

  return "Oreya Marketplace";
}

function getGoogleMapOpenUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
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

function getOrderItemImage(item: TrackingOrderItemWithVariation) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

function getShortAddress(order: TrackingOrder & OrderDeliveryFields) {
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

export default async function CustomerOrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/customer/orders");
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: user.id,
    },
    include: orderTrackingInclude,
  });

  if (!order) {
    notFound();
  }

  const orderWithDelivery = order as TrackingOrder & OrderDeliveryFields;

  const orderStatus = String(orderWithDelivery.status);
  const paymentStatus = String(orderWithDelivery.paymentStatus);
  const paymentMethod = orderWithDelivery.payment?.method
    ? formatStatus(String(orderWithDelivery.payment.method))
    : "Pending";

  const isPaid = paymentStatus === "PAID";
  const amountLabel = isPaid ? "Total Paid" : "Amount to Pay";
  const requestedDeliveryDateLabel = formatDateOnlyStable(
    orderWithDelivery.requestedDeliveryDate
  );

  const requestedDeliveryTimePeriodLabel = formatDeliveryTimePeriod(
    orderWithDelivery.requestedDeliveryTimePeriod
  );

  const hasRequestedDeliverySchedule = Boolean(
    orderWithDelivery.requestedDeliveryDate ||
      orderWithDelivery.requestedDeliveryTimePeriod
  );

  const requestedDeliveryScheduleValue = hasRequestedDeliverySchedule
    ? requestedDeliveryDateLabel
    : "Standard schedule";

  const requestedDeliveryScheduleHelper = hasRequestedDeliverySchedule
    ? requestedDeliveryTimePeriodLabel
    : "No specific date or time requested";

  const deliveryLatitude = orderWithDelivery.deliveryLatitude
    ? orderWithDelivery.deliveryLatitude.toString()
    : "";

  const deliveryLongitude = orderWithDelivery.deliveryLongitude
    ? orderWithDelivery.deliveryLongitude.toString()
    : "";

  const deliveryAddress = getShortAddress(orderWithDelivery);
  const hasDeliveryCoordinates = Boolean(deliveryLatitude && deliveryLongitude);

  const hasDeliveryDetails = Boolean(
    orderWithDelivery.deliveryFullName ||
      orderWithDelivery.deliveryPhone ||
      orderWithDelivery.deliveryEmail ||
      orderWithDelivery.deliveryAddress ||
      orderWithDelivery.deliveryAddressLine1 ||
      orderWithDelivery.deliveryAddressLine2 ||
      orderWithDelivery.deliveryCountry ||
      orderWithDelivery.deliveryState ||
      orderWithDelivery.deliveryCity ||
      orderWithDelivery.deliveryArea ||
      orderWithDelivery.deliveryZipCode ||
      orderWithDelivery.deliveryNote ||
      orderWithDelivery.requestedDeliveryDate ||
      orderWithDelivery.requestedDeliveryTimePeriod
  );

  const summaryCards = [
    {
      label: amountLabel,
      value: formatAmount(
        orderWithDelivery.currency,
        Number(orderWithDelivery.total)
      ),
      helper: `${orderWithDelivery.items.length} item${
        orderWithDelivery.items.length === 1 ? "" : "s"
      } in this order`,
      icon: faReceipt,
    },
    {
      label: "Order Status",
      value: formatStatus(orderStatus),
      helper: getTrackingMessage(orderStatus),
      icon: faTruck,
    },
    {
      label: "Payment Status",
      value: formatStatus(paymentStatus),
      helper: paymentMethod,
      icon: faCreditCard,
    },
    {
      label: "Preferred Delivery",
      value: requestedDeliveryScheduleValue,
      helper: requestedDeliveryScheduleHelper,
      icon: faCalendarDays,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-8">
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Back to Orders
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
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

            <h1 className="break-all font-heading text-3xl uppercase tracking-wide">
              Track Order
            </h1>

            <p className="mt-2 break-all text-sm text-gray-500">
              Order #{orderWithDelivery.id}
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              View your order progress, delivery details, ordered items, payment
              summary, and receipt from one place.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 md:min-w-[240px] md:text-right">
            <p className="text-sm text-gray-500">{amountLabel}</p>

            <p className="mt-1 text-2xl font-semibold">
              {formatAmount(
                orderWithDelivery.currency,
                Number(orderWithDelivery.total)
              )}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Ordered on {formatDateStable(orderWithDelivery.createdAt)}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>

                  <p className="mt-2 text-xl font-semibold">{card.value}</p>
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

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-heading text-2xl uppercase">
                    Order Overview
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    This section shows the current status and basic information
                    for your order.
                  </p>

                  <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                        Order Date
                      </p>

                      <p className="mt-1 font-semibold">
                        {formatDateStable(orderWithDelivery.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faCreditCard}
                          className="h-4 w-4"
                        />
                        Payment Method
                      </p>

                      <p className="mt-1 font-semibold">{paymentMethod}</p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faBagShopping}
                          className="h-4 w-4"
                        />
                        Ordered Items
                      </p>

                      <p className="mt-1 font-semibold">
                        {orderWithDelivery.items.length} item
                        {orderWithDelivery.items.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          className="h-4 w-4"
                        />
                        Preferred Delivery Date
                      </p>

                      <p className="mt-1 font-semibold">
                        {hasRequestedDeliverySchedule
                          ? requestedDeliveryDateLabel
                          : "Standard schedule"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                        Preferred Delivery Time
                      </p>

                      <p className="mt-1 font-semibold">
                        {hasRequestedDeliverySchedule
                          ? requestedDeliveryTimePeriodLabel
                          : "No specific time requested"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 md:min-w-[220px] md:text-right">
                  <p className="text-sm text-gray-500">Current Status</p>

                  <p className="mt-1 text-xl font-semibold">
                    {formatStatus(orderStatus)}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {getTrackingMessage(orderStatus)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-500">
                  Current Update
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {getTrackingMessage(orderStatus)}
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-200 p-6 shadow-sm">
              <h2 className="font-heading text-2xl uppercase">
                Order Tracking
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                The latest progress of your order will appear here.
              </p>

              <div className="mt-8 space-y-6">
                {trackingSteps.map((step, index) => {
                  const state = getStepState(orderStatus, index);
                  const isLast = index === trackingSteps.length - 1;
                  const isFinalStep = index === trackingSteps.length - 1;

                  return (
                    <div key={step.key} className="relative flex gap-4">
                      {!isLast ? (
                        <div
                          className={`absolute left-6 top-12 h-[calc(100%+8px)] w-[2px] ${getProgressLineClass(
                            state
                          )}`}
                        />
                      ) : null}

                      <div
                        className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${getStepCircleClass(
                          state
                        )}`}
                      >
                        {state === "completed" ? (
                          <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                        ) : state === "rejected" ? (
                          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                        ) : step.key === "PROCESSING" ? (
                          <FontAwesomeIcon icon={faTruck} className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>

                      <div className="pb-3">
                        <h3
                          className={`text-base font-bold ${getStepTextClass(
                            state
                          )}`}
                        >
                          {isFinalStep
                            ? getFinalStepTitle(orderStatus)
                            : step.title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {isFinalStep
                            ? getFinalStepDescription(orderStatus)
                            : step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-200 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5" />

                <h2 className="font-heading text-2xl uppercase">
                  Delivery Details
                </h2>
              </div>

              {hasDeliveryDetails ? (
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-2 text-gray-500">
                      <FontAwesomeIcon
                        icon={faCalendarDays}
                        className="h-4 w-4"
                      />
                      Preferred Delivery Date
                    </p>

                    <p className="mt-1 font-semibold">
                      {hasRequestedDeliverySchedule
                        ? requestedDeliveryDateLabel
                        : "Standard schedule"}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500">
                      <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                      Preferred Delivery Time
                    </p>

                    <p className="mt-1 font-semibold">
                      {hasRequestedDeliverySchedule
                        ? requestedDeliveryTimePeriodLabel
                        : "No specific time requested"}
                    </p>
                  </div>

                  {!hasRequestedDeliverySchedule ? (
                    <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-800">
                      <p className="font-semibold">Standard delivery schedule</p>

                      <p className="mt-1 text-xs leading-5">
                        No preferred delivery date or time was selected. This
                        order will follow the vendor&apos;s standard preparation
                        and delivery process.
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="flex items-center gap-2 text-gray-500">
                      <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                      Full Name
                    </p>

                    <p className="mt-1 font-semibold">
                      {orderWithDelivery.deliveryFullName || "Not added"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Phone Number</p>

                    <p className="mt-1 font-semibold">
                      {orderWithDelivery.deliveryPhone || "Not added"}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500">
                      <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />
                      Email Address
                    </p>

                    <p className="mt-1 break-all font-semibold">
                      {orderWithDelivery.deliveryEmail || "Not added"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">City / Area</p>

                    <p className="mt-1 font-semibold">
                      {[
                        orderWithDelivery.deliveryCity,
                        orderWithDelivery.deliveryArea,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not added"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-gray-500">Full Address</p>

                    <p className="mt-1 font-semibold leading-6">
                      {deliveryAddress || "Not added"}
                    </p>
                  </div>

                  {orderWithDelivery.deliveryNote ? (
                    <div className="md:col-span-2 rounded-2xl bg-gray-50 p-4">
                      <p className="text-gray-500">Order Note</p>

                      <p className="mt-1 font-semibold leading-6">
                        {orderWithDelivery.deliveryNote}
                      </p>
                    </div>
                  ) : null}

                  {hasDeliveryCoordinates ? (
                    <div className="md:col-span-2">
                      <p className="text-gray-500">Delivery Location</p>

                      <Link
                        href={getGoogleMapOpenUrl(
                          deliveryLatitude,
                          deliveryLongitude
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-semibold underline"
                      >
                        Open delivery location in Google Maps
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Delivery details were not found for this order.
                </p>
              )}
            </div>

            <div className="rounded-[30px] border border-gray-200 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <FontAwesomeIcon icon={faReceipt} className="h-5 w-5" />

                <h2 className="font-heading text-2xl uppercase">
                  Ordered Items
                </h2>
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
                        const orderItem = item as TrackingOrderItemWithVariation;

                        const itemType = getItemType(orderItem);
                        const itemTitle = getItemTitle(orderItem);
                        const vendorName = getItemVendorName(orderItem);
                        const lineTotal =
                          Number(orderItem.price) * Number(orderItem.quantity);

                        const variantEntries = getVariantEntries(
                          orderItem.variantOptions
                        );
                        const itemImage = getOrderItemImage(orderItem);

                        const hasVariantDetails =
                          Boolean(orderItem.variantTitle) ||
                          Boolean(orderItem.variantSku) ||
                          variantEntries.length > 0;

                        return (
                          <tr key={orderItem.id} className="align-top">
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
                                      {formatStatus(String(orderItem.status))}
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
                              <p className="font-medium text-black">{itemType}</p>

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
                                      {variantEntries.map(([name, value]) => (
                                        <span
                                          key={`${orderItem.id}-${name}-${value}`}
                                          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700"
                                        >
                                          {name}: {value}
                                        </span>
                                      ))}
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

                            <td className="px-4 py-4 text-center font-semibold">
                              {orderItem.quantity}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatAmount(
                                orderItem.currency,
                                Number(orderItem.price)
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-bold">
                              {formatAmount(orderItem.currency, lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-[30px] border border-gray-200 p-6 shadow-sm">
            <h2 className="font-heading text-2xl uppercase">
              Payment Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Subtotal</span>

                <span className="font-semibold">
                  {formatAmount(
                    orderWithDelivery.currency,
                    Number(orderWithDelivery.subtotal)
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Shipping / Delivery</span>

                <span className="font-semibold">
                  {formatAmount(
                    orderWithDelivery.currency,
                    Number(orderWithDelivery.shipping)
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tax</span>

                <span className="font-semibold">
                  {formatAmount(
                    orderWithDelivery.currency,
                    Number(orderWithDelivery.tax)
                  )}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{amountLabel}</span>

                  <span className="text-xl font-bold">
                    {formatAmount(
                      orderWithDelivery.currency,
                      Number(orderWithDelivery.total)
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-gray-500">Payment Method</p>

                <p className="mt-1 font-semibold">{paymentMethod}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-gray-500">Payment Status</p>

                <p className="mt-1 font-semibold">
                  {formatStatus(paymentStatus)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-gray-500">Order Status</p>

                <p className="mt-1 font-semibold">{formatStatus(orderStatus)}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-gray-500">Preferred Delivery</p>

                <p className="mt-1 font-semibold">
                  {requestedDeliveryScheduleValue}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {requestedDeliveryScheduleHelper}
                </p>
              </div>

              {!isPaid ? (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                  This is a Cash on Delivery order. Payment will be collected at
                  the time of delivery.
                </div>
              ) : null}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
                <div className="flex gap-3">
                  <FontAwesomeIcon
                    icon={faCircleInfo}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />

                  <p className="text-xs leading-5">
                    Order tracking is updated when the admin or vendor changes
                    the fulfillment status.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={`/checkout/success?orderId=${orderWithDelivery.id}`}
                className="flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
              >
                View Receipt
              </Link>

              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}