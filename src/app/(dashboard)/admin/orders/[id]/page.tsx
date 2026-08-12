import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBagShopping,
  faCalendarDays,
  faCheck,
  faCircleInfo,
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

const orderStatusOptions: Array<{
  value: OrderStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REFUNDED", label: "Refunded" },
];

const paymentStatusOptions: Array<{
  value: PaymentStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const progressSteps = [
  {
    title: "Order Received",
    description: "The customer order has been placed successfully.",
  },
  {
    title: "Order Accepted",
    description: "The order has been accepted for fulfillment.",
  },
  {
    title: "In Progress",
    description: "The order is being prepared, shipped, or processed.",
  },
  {
    title: "Completed",
    description: "The order has reached the final fulfillment stage.",
  },
];

const adminOrderInclude = {
  payment: true,
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
          id: true,
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
          id: true,
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
} satisfies Prisma.OrderInclude;

type AdminOrder = Prisma.OrderGetPayload<{
  include: typeof adminOrderInclude;
}>;

type AdminOrderItem = AdminOrder["items"][number];

type AdminOrderItemWithVariation = AdminOrderItem & {
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: Prisma.JsonValue | null;
  variantImage?: string | null;
};

type DeliveryTimePeriodValue =
  | "MORNING"
  | "AFTERNOON"
  | "EVENING";

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

  deliveryNote: string | null;
  requestedDeliveryDate: Date | null;
  requestedDeliveryTimePeriod: DeliveryTimePeriodValue | null;
  deliveryLeadTimeHours: number | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getCleanString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function updateAdminOrderStatus(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Only administrators can update order status.");
  }

  const orderId = getCleanString(formData.get("orderId"));
  const status = getCleanString(formData.get("status")) as OrderStatus;

  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  const allowedStatuses = orderStatusOptions.map((option) => option.value);

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid order status.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
    });

    await tx.orderItem.updateMany({
      where: {
        orderId,
      },
      data: {
        status,
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath(`/vendor/orders/${orderId}`);
  revalidatePath("/customer/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath(`/customer/order/${orderId}`);
  revalidatePath("/checkout/success");
  revalidatePath("/reports/orders");
  revalidatePath("/reports/sales");
  revalidatePath("/vendor/reports/orders");
  revalidatePath("/vendor/reports/sales");
}

async function updateAdminPaymentStatus(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Only administrators can update payment status.");
  }

  const orderId = getCleanString(formData.get("orderId"));
  const status = getCleanString(formData.get("paymentStatus")) as PaymentStatus;

  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  const allowedStatuses = paymentStatusOptions.map((option) => option.value);

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid payment status.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: status,
      },
    });

    const payment = await tx.payment.findUnique({
      where: {
        orderId,
      },
      select: {
        id: true,
      },
    });

    if (payment) {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status,
        },
      });
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath(`/vendor/orders/${orderId}`);
  revalidatePath("/customer/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath(`/customer/order/${orderId}`);
  revalidatePath("/checkout/success");
  revalidatePath("/reports/orders");
  revalidatePath("/reports/sales");
  revalidatePath("/vendor/reports/orders");
  revalidatePath("/vendor/reports/sales");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(
  date: Date | string | null | undefined
) {
  if (!date) {
    return "Not selected";
  }

  const deliveryDate =
    date instanceof Date ? date : new Date(date);

  if (Number.isNaN(deliveryDate.getTime())) {
    return "Not selected";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(deliveryDate);
}

function formatDeliveryTimePeriod(
  period: DeliveryTimePeriodValue | null | undefined
) {
  if (period === "MORNING") {
    return "Morning";
  }

  if (period === "AFTERNOON") {
    return "Afternoon";
  }

  if (period === "EVENING") {
    return "Evening";
  }

  return "Standard schedule";
}

function getDeliveryTimeRange(
  period: DeliveryTimePeriodValue | null | undefined
) {
  if (period === "MORNING") {
    return "8:00 AM to 12:00 PM";
  }

  if (period === "AFTERNOON") {
    return "12:00 PM to 5:00 PM";
  }

  if (period === "EVENING") {
    return "5:00 PM to 9:00 PM";
  }

  return null;
}

function formatDeliveryLeadTime(
  hours: number | null | undefined
) {
  const leadTimeHours = Number(hours || 24);

  if (
    !Number.isFinite(leadTimeHours) ||
    leadTimeHours <= 0
  ) {
    return "24 hours";
  }

  return `${leadTimeHours} hour${
    leadTimeHours === 1 ? "" : "s"
  }`;
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

function getStatusClass(status: string) {
  if (
    status === "PAID" ||
    status === "COMPLETED" ||
    status === "DELIVERED" ||
    status === "ACCEPTED" ||
    status === "APPROVED"
  ) {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
  }

  if (
    status === "PROCESSING" ||
    status === "PENDING" ||
    status === "SHIPPED"
  ) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  if (
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "REJECTED"
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  }

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
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

function getItemType(item: AdminOrderItem) {
  if (item.productId) {
    return "Product";
  }

  if (item.serviceId) {
    return "Service";
  }

  return "Item";
}

function getItemTitle(item: AdminOrderItem) {
  return (
    item.title || item.product?.title || item.service?.title || "Order Item"
  );
}

function getItemVendorName(item: AdminOrderItem) {
  if (item.product) {
    return item.product.vendor?.businessName || "Oreya Marketplace";
  }

  if (item.service) {
    return item.service.vendor?.businessName || "Oreya Marketplace";
  }

  return "Oreya Marketplace";
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

function getItemImage(item: AdminOrderItemWithVariation) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

function getShortAddress(order: AdminOrder & OrderDeliveryFields) {
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

function getProgressStepIndex(status: string) {
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
    status === "CANCELLED" ||
    status === "REJECTED" ||
    status === "REFUNDED"
  ) {
    return 3;
  }

  return 0;
}

function getProgressStepState(status: string, index: number) {
  const currentIndex = getProgressStepIndex(status);
  const isNegativeStatus =
    status === "CANCELLED" || status === "REJECTED" || status === "REFUNDED";

  if (isNegativeStatus) {
    if (index < 3) {
      return "completed";
    }

    return "failed";
  }

  if (index < currentIndex) {
    return "completed";
  }

  if (index === currentIndex) {
    return "active";
  }

  return "pending";
}

function getProgressCircleClass(state: string) {
  if (state === "completed") {
    return "border-green-600 bg-green-600 text-white";
  }

  if (state === "active") {
    return "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black";
  }

  if (state === "failed") {
    return "border-red-600 bg-red-600 text-white";
  }

  return "border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-500";
}

function getProgressLineClass(state: string) {
  if (state === "completed") {
    return "bg-green-600";
  }

  return "bg-gray-200 dark:bg-gray-800";
}

function getFinalProgressTitle(status: string) {
  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "DELIVERED") {
    return "Delivered";
  }

  return "Completed";
}

function getFinalProgressDescription(status: string) {
  if (status === "CANCELLED") {
    return "The order has been cancelled.";
  }

  if (status === "REJECTED") {
    return "The order has been rejected.";
  }

  if (status === "REFUNDED") {
    return "The order has been refunded.";
  }

  if (status === "DELIVERED") {
    return "The order has been delivered.";
  }

  return "The order has been completed.";
}

function getStatusMessage(status: string) {
  if (status === "PENDING") {
    return "This order is waiting for review.";
  }

  if (status === "ACCEPTED") {
    return "This order has been accepted.";
  }

  if (status === "PROCESSING") {
    return "This order is currently being processed.";
  }

  if (status === "SHIPPED") {
    return "This order has been shipped.";
  }

  if (status === "DELIVERED") {
    return "This order has been delivered.";
  }

  if (status === "COMPLETED") {
    return "This order has been completed.";
  }

  if (status === "CANCELLED") {
    return "This order has been cancelled.";
  }

  if (status === "REJECTED") {
    return "This order has been rejected.";
  }

  if (status === "REFUNDED") {
    return "This order has been refunded.";
  }

  return "This order status is being updated.";
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: {
      id,
    },
    include: adminOrderInclude,
  });

  if (!order) {
    notFound();
  }

  const orderWithDelivery = order as AdminOrder & OrderDeliveryFields;

  const paymentMethod = order.payment?.method
    ? formatStatus(String(order.payment.method))
    : "Pending";

  const deliveryAddress = getShortAddress(orderWithDelivery);
  const requestedDeliveryDateLabel = formatDateOnly(
    orderWithDelivery.requestedDeliveryDate
  );

  const requestedDeliveryTimePeriod =
    orderWithDelivery.requestedDeliveryTimePeriod;

  const requestedDeliveryTimePeriodLabel =
    formatDeliveryTimePeriod(
      requestedDeliveryTimePeriod
    );

  const requestedDeliveryTimeRange =
    getDeliveryTimeRange(
      requestedDeliveryTimePeriod
    );

  const hasPreferredDeliverySchedule =
    Boolean(
      orderWithDelivery.requestedDeliveryDate ||
        requestedDeliveryTimePeriod
    );

  const deliveryScheduleSummary =
    orderWithDelivery.requestedDeliveryDate
      ? requestedDeliveryDateLabel
      : "Standard schedule";

  const deliveryScheduleHelper =
    requestedDeliveryTimeRange
      ? `${requestedDeliveryTimePeriodLabel} · ${requestedDeliveryTimeRange}`
      : orderWithDelivery.requestedDeliveryDate
        ? "Preferred time period was not selected for this order."
        : `Preparation lead time: ${formatDeliveryLeadTime(
            orderWithDelivery.deliveryLeadTimeHours
          )}`;

  const orderStatus = String(order.status);
  const paymentStatus = String(order.paymentStatus);

  const summaryCards = [
    {
      label: "Full Order Total",
      value: formatAmount(order.currency, Number(order.total)),
      helper: `${order.items.length} item${order.items.length === 1 ? "" : "s"} in this order`,
      icon: faReceipt,
    },
    {
      label: "Order Status",
      value: formatStatus(orderStatus),
      helper: getStatusMessage(orderStatus),
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
      value: deliveryScheduleSummary,
      helper: deliveryScheduleHelper,
      icon: faCalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/orders"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Back to Orders
          </Link>

          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Admin Order Details
          </p>

          <h1
            title={order.id}
            className="mt-2 font-heading text-2xl text-gray-900 dark:text-white"
          >
            Order #{order.id}
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            View customer information, vendor items, order progress, payment
            status, delivery details, and complete order summary from one place.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
            orderStatus
          )}`}
        >
          {formatStatus(orderStatus)}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>

                <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {card.value}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <FontAwesomeIcon icon={card.icon} className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {card.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                      orderStatus
                    )}`}
                  >
                    {formatStatus(orderStatus)}
                  </span>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                      paymentStatus
                    )}`}
                  >
                    Payment {formatStatus(paymentStatus)}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                      Customer Name
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {order.customer.name || "Customer"}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />
                      Customer Email
                    </p>

                    <p className="mt-1 break-all font-semibold text-gray-900 dark:text-white">
                      {order.customer.email}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon
                        icon={faCalendarDays}
                        className="h-4 w-4"
                      />
                      Order Date
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon icon={faTruck} className="h-4 w-4" />
                      Preferred Delivery Date
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {orderWithDelivery.requestedDeliveryDate
                        ? requestedDeliveryDateLabel
                        : "Standard schedule"}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon
                        icon={faCalendarDays}
                        className="h-4 w-4"
                      />
                      Preferred Delivery Period
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {requestedDeliveryTimePeriodLabel}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {requestedDeliveryTimeRange ||
                        `Preparation lead time: ${formatDeliveryLeadTime(
                          orderWithDelivery.deliveryLeadTimeHours
                        )}`}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FontAwesomeIcon
                        icon={faCreditCard}
                        className="h-4 w-4"
                      />
                      Payment Method
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {paymentMethod}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900 lg:min-w-[220px] lg:text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Full Order Total
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatAmount(order.currency, Number(order.total))}
                </p>

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Order Progress
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This timeline shows the current fulfillment progress for the
                complete customer order.
              </p>
            </div>

            <div className="space-y-6">
              {progressSteps.map((step, index) => {
                const state = getProgressStepState(orderStatus, index);
                const isLast = index === progressSteps.length - 1;
                const isFinal = index === progressSteps.length - 1;

                return (
                  <div key={step.title} className="relative flex gap-4">
                    {!isLast ? (
                      <div
                        className={`absolute left-6 top-12 h-[calc(100%+8px)] w-[2px] ${getProgressLineClass(
                          state
                        )}`}
                      />
                    ) : null}

                    <div
                      className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${getProgressCircleClass(
                        state
                      )}`}
                    >
                      {state === "completed" ? (
                        <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                      ) : state === "failed" ? (
                        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="pb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {isFinal ? getFinalProgressTitle(orderStatus) : step.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                        {isFinal
                          ? getFinalProgressDescription(orderStatus)
                          : step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Admin Status Controls
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Update the full order status or payment status. Order status
                updates are also applied to every item in this order to keep the
                admin, vendor, and customer views consistent.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form
                action={updateAdminOrderStatus}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <input type="hidden" name="orderId" value={order.id} />

                <label
                  htmlFor="admin-order-status"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Full Order Status
                </label>

                <select
                  id="admin-order-status"
                  name="status"
                  defaultValue={String(order.status)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                >
                  {orderStatusOptions.map((option) => (
                    <option key={`order-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Update Order Status
                </button>
              </form>

              <form
                action={updateAdminPaymentStatus}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <input type="hidden" name="orderId" value={order.id} />

                <label
                  htmlFor="admin-payment-status"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Payment Status
                </label>

                <select
                  id="admin-payment-status"
                  name="paymentStatus"
                  defaultValue={String(order.paymentStatus)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                >
                  {paymentStatusOptions.map((option) => (
                    <option
                      key={`payment-${option.value}`}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Update Payment Status
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Ordered Items
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Complete list of products and services included in this order.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Item
                      </th>

                      <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Vendor / Owner
                      </th>

                      <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Variation
                      </th>

                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        Quantity
                      </th>

                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Unit Price
                      </th>

                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {order.items.map((item) => {
                      const orderItem = item as AdminOrderItemWithVariation;

                      const itemType = getItemType(orderItem);
                      const vendorName = getItemVendorName(orderItem);
                      const itemTitle = getItemTitle(orderItem);
                      const itemImage = getItemImage(orderItem);
                      const lineTotal =
                        Number(orderItem.price) * Number(orderItem.quantity);

                      const variantEntries = getVariantEntries(
                        orderItem.variantOptions
                      );

                      const hasVariationDetails =
                        Boolean(orderItem.variantTitle) ||
                        Boolean(orderItem.variantSku) ||
                        variantEntries.length > 0;

                      return (
                        <tr key={orderItem.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="flex min-w-0 gap-4">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                                {itemImage ? (
                                  <img
                                    src={itemImage}
                                    alt={itemTitle}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                                    <FontAwesomeIcon
                                      icon={faBagShopping}
                                      className="h-5 w-5"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    {itemType}
                                  </span>

                                  <span
                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClass(
                                      String(orderItem.status)
                                    )}`}
                                  >
                                    {formatStatus(String(orderItem.status))}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                  {itemTitle}
                                </p>

                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Item ID: {orderItem.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {vendorName}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {hasVariationDetails ? (
                              <div className="space-y-2">
                                {orderItem.variantTitle ? (
                                  <span className="inline-flex rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-black">
                                    {orderItem.variantTitle}
                                  </span>
                                ) : null}

                                {variantEntries.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {variantEntries.map(([name, value]) => (
                                      <span
                                        key={`${orderItem.id}-${name}-${value}`}
                                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                      >
                                        {name}: {value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}

                                {orderItem.variantSku ? (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    SKU: {orderItem.variantSku}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Standard
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                            {orderItem.quantity}
                          </td>

                          <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                            {formatAmount(
                              orderItem.currency,
                              Number(orderItem.price)
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                            {formatAmount(orderItem.currency, lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5 flex items-center gap-3">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="h-5 w-5 text-gray-700 dark:text-gray-300"
              />

              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Delivery Information
              </h2>
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Preferred Delivery Date
                </p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {orderWithDelivery.requestedDeliveryDate
                    ? requestedDeliveryDateLabel
                    : "Standard schedule"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Preferred Delivery Period
                </p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {requestedDeliveryTimePeriodLabel}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {requestedDeliveryTimeRange ||
                    (hasPreferredDeliverySchedule
                      ? "Preferred time period was not selected for this order."
                      : `Preparation lead time: ${formatDeliveryLeadTime(
                          orderWithDelivery.deliveryLeadTimeHours
                        )}`)}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">Full Name</p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {orderWithDelivery.deliveryFullName || "Not added"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Phone Number
                </p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {orderWithDelivery.deliveryPhone || "Not added"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Email Address
                </p>

                <p className="mt-1 break-all font-semibold text-gray-900 dark:text-white">
                  {orderWithDelivery.deliveryEmail || "Not added"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">City / Area</p>

                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {[
                    orderWithDelivery.deliveryCity,
                    orderWithDelivery.deliveryArea,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not added"}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-gray-500 dark:text-gray-400">Address</p>

                <p className="mt-1 font-semibold leading-6 text-gray-900 dark:text-white">
                  {deliveryAddress || "Not added"}
                </p>
              </div>

              {orderWithDelivery.deliveryNote ? (
                <div className="md:col-span-2 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                  <p className="text-gray-500 dark:text-gray-400">Delivery Note</p>

                  <p className="mt-1 font-semibold leading-6 text-gray-900 dark:text-white">
                    {orderWithDelivery.deliveryNote}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Order Summary
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                Subtotal
              </span>

              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(order.currency, Number(order.subtotal))}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">
                Shipping / Delivery
              </span>

              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(order.currency, Number(order.shipping))}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">Tax</span>

              <span className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(order.currency, Number(order.tax))}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">
                  Total
                </span>

                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatAmount(order.currency, Number(order.total))}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                Preferred Delivery
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {deliveryScheduleSummary}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {deliveryScheduleHelper}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                Payment Method
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {paymentMethod}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">
                Payment Status
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {formatStatus(paymentStatus)}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-gray-500 dark:text-gray-400">Order Status</p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {formatStatus(orderStatus)}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
              <div className="flex gap-3">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />

                <p className="text-xs leading-5">
                  Admin order status updates are applied to the full order and
                  all order items, so the admin, vendor, and customer tracking
                  pages stay consistent.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}