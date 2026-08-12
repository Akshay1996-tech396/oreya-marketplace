import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faCalendarDays,
  faCircleCheck,
  faCircleInfo,
  faClock,
  faCreditCard,
  faLocationDot,
  faReceipt,
  faTruck,
  faUtensils,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { getCurrentUser } from "@/lib/auth";
import { finalizeProductOrderPayment } from "@/lib/payments/product-order-payment";
import { finalizeServiceBookingPayment } from "@/lib/payments/service-booking-payment";
import { finalizeRestaurantReservationPayment } from "@/lib/payments/restaurant-reservation-payment";
import { prisma } from "@/lib/prisma";

type SuccessPageProps = {
  searchParams: Promise<{
    orderId?: string;
    bookingId?: string;
    reservationId?: string;
    reservationCode?: string;
    session_id?: string;
    type?: string;
  }>;
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
};

type OrderItemVariationSnapshot = {
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: Prisma.JsonValue | null;
  variantImage?: string | null;
  product?: {
    title?: string | null;
    images?: string[] | null;
  } | null;
  service?: {
    title?: string | null;
  } | null;
};

type ParsedReservationMenuLine = {
  foodPackage: string;
  quantity: string;
  amount: string;
};

type ReservationWithMenuJson = {
  menuItemsJson?: Prisma.JsonValue | null;
};

export const dynamic = "force-dynamic";

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

function formatReservationDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateOnly(date: Date | null | undefined) {
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

function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) {
    return "Flexible duration";
  }

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"} ${remainingMinutes} ${
    remainingMinutes === 1 ? "minute" : "minutes"
  }`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

function formatCurrencyAmount(currency: string, value: unknown) {
  return `${currency} ${formatAmount(value)}`;
}

function getItemType(item: {
  productId: string | null;
  serviceId: string | null;
}) {
  if (item.productId) {
    return "Product";
  }

  if (item.serviceId) {
    return "Service";
  }

  return "Item";
}

function getGoogleMapOpenUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function getRestaurantMapUrl(restaurant: {
  latitude: { toString: () => string } | null;
  longitude: { toString: () => string } | null;
  address: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}) {
  const latitude = restaurant.latitude ? restaurant.latitude.toString() : "";
  const longitude = restaurant.longitude ? restaurant.longitude.toString() : "";

  if (latitude && longitude) {
    return getGoogleMapOpenUrl(latitude, longitude);
  }

  const address = [
    restaurant.address,
    restaurant.area,
    restaurant.city,
    restaurant.state,
    restaurant.country,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || "restaurant"
  )}`;
}

function splitReservationNote(customerNote: string | null) {
  if (!customerNote) {
    return {
      plainNote: "",
      menuLines: [] as string[],
    };
  }

  const marker = "Selected menu items:";
  const markerIndex = customerNote.indexOf(marker);

  if (markerIndex === -1) {
    return {
      plainNote: customerNote.trim(),
      menuLines: [] as string[],
    };
  }

  const plainNote = customerNote.slice(0, markerIndex).trim();
  const menuText = customerNote.slice(markerIndex + marker.length).trim();

  const menuLines = menuText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, ""));

  return {
    plainNote,
    menuLines,
  };
}

function parseMenuLineForTable(line: string): ParsedReservationMenuLine {
  const match = line.match(/^(.*?)\s×\s(\d+)\s\((.*?)\)\s=\s(.+)$/);

  if (!match) {
    return {
      foodPackage: line,
      quantity: "-",
      amount: "-",
    };
  }

  return {
    foodPackage: match[1].trim(),
    quantity: match[2].trim(),
    amount: match[4].trim(),
  };
}

function getStringFromUnknown(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function getReservationMenuItemsFromJson(
  value: unknown,
  fallbackLines: string[]
): ParsedReservationMenuLine[] {
  if (Array.isArray(value)) {
    const parsedItems = value
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }

        const itemRecord = item as Record<string, unknown>;

        const title =
          getStringFromUnknown(itemRecord.title) ||
          getStringFromUnknown(itemRecord.name) ||
          getStringFromUnknown(itemRecord.foodPackage) ||
          "Food Package";

        const quantityValue = Number(itemRecord.quantity || 1);
        const quantity = Number.isFinite(quantityValue)
          ? String(quantityValue)
          : "1";

        const currency = getStringFromUnknown(itemRecord.currency);
        const priceValue = Number(itemRecord.price || 0);
        const amountValue = Number(itemRecord.amount || priceValue * quantityValue);

        const amount = Number.isFinite(amountValue)
          ? `${currency ? `${currency} ` : ""}${formatAmount(amountValue)}`
          : getStringFromUnknown(itemRecord.amount) || "-";

        return {
          foodPackage: title,
          quantity,
          amount,
        };
      })
      .filter(Boolean) as ParsedReservationMenuLine[];

    if (parsedItems.length > 0) {
      return parsedItems;
    }
  }

  return fallbackLines.map((line) => parseMenuLineForTable(line));
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

function getOrderItemImage(item: OrderItemVariationSnapshot) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

function getOrderItemTitle(item: OrderItemVariationSnapshot & { title?: string | null }) {
  return item.title || item.product?.title || item.service?.title || "Order Item";
}

function getShortAddress(order: OrderDeliveryFields) {
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

function getStatusBadgeClass(status: string) {
  if (
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "DELIVERED" ||
    status === "ACCEPTED"
  ) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "PENDING" || status === "PROCESSING" || status === "SHIPPED") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "CANCELLED" ||
    status === "REJECTED"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  const params = await searchParams;
  const orderId = params.orderId || "";
  const bookingId = params.bookingId || "";
  const reservationId = params.reservationId || "";
  const reservationCode = params.reservationCode || "";
  const stripeSessionId = params.session_id || "";
  const successType = params.type || "";

  const isProductOnlinePaymentSuccess =
    successType === "product-payment";

  const isServiceOnlinePaymentSuccess =
    successType === "service-payment";

  const isRestaurantOnlinePaymentSuccess =
    successType === "restaurant-payment";

  const isServiceBookingSuccess =
    successType === "service-booking" ||
    Boolean(bookingId);

  const isRestaurantReservationSuccess =
    successType === "restaurant-reservation" ||
    Boolean(reservationId) ||
    Boolean(reservationCode);

  if (isProductOnlinePaymentSuccess) {
    if (!stripeSessionId) {
      notFound();
    }

    let paymentResult;

    try {
      paymentResult =
        await finalizeProductOrderPayment({
          providerSessionId:
            stripeSessionId,
          customerId: user.id,
        });
    } catch (error) {
      console.error(
        "PRODUCT_PAYMENT_SUCCESS_FINALIZATION_ERROR",
        error
      );

      return (
        <main className="min-h-screen bg-white text-black">
          <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-sm md:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="h-9 w-9 text-red-600"
                />
              </div>

              <h1 className="mt-6 font-heading text-3xl uppercase">
                Payment Verification Needs Attention
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Your Stripe payment could not be finalized automatically. Please do not make another payment until the current payment status has been checked.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/customer/orders"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  View My Orders
                </Link>

                <Link
                  href="/cart"
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    if (
      paymentResult.state ===
        "FINALIZED" &&
      paymentResult.orderId
    ) {
      redirect(
        `/checkout/success?orderId=${paymentResult.orderId}`
      );
    }

    const isPending =
      paymentResult.state === "PENDING";

    const isRefunded =
      paymentResult.state === "REFUNDED";

    const title = isPending
      ? "Payment Processing"
      : isRefunded
        ? "Payment Refunded"
        : "Payment Not Completed";

    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                isPending
                  ? "bg-yellow-50"
                  : isRefunded
                    ? "bg-blue-50"
                    : "bg-red-50"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  isPending
                    ? faClock
                    : faCircleInfo
                }
                className={`h-9 w-9 ${
                  isPending
                    ? "text-yellow-600"
                    : isRefunded
                      ? "text-blue-600"
                      : "text-red-600"
                }`}
              />
            </div>

            <h1 className="mt-6 font-heading text-3xl uppercase">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              {paymentResult.message}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isPending ? (
                <Link
                  href={`/checkout/success?type=product-payment&session_id=${encodeURIComponent(
                    stripeSessionId
                  )}`}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Check Payment Status Again
                </Link>
              ) : (
                <Link
                  href="/cart"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Return to Cart
                </Link>
              )}

              <Link
                href="/customer/orders"
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
              >
                View My Orders
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isServiceOnlinePaymentSuccess) {
    if (!stripeSessionId) {
      notFound();
    }

    let paymentResult;

    try {
      paymentResult =
        await finalizeServiceBookingPayment({
          providerSessionId:
            stripeSessionId,
          customerId: user.id,
        });
    } catch (error) {
      console.error(
        "SERVICE_PAYMENT_SUCCESS_FINALIZATION_ERROR",
        error
      );

      return (
        <main className="min-h-screen bg-white text-black">
          <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-sm md:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="h-9 w-9 text-red-600"
                />
              </div>

              <h1 className="mt-6 font-heading text-3xl uppercase">
                Payment Verification Needs Attention
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Your Stripe payment could not be finalized into an appointment automatically. Please do not make another payment until the current payment status has been checked.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/customer"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  View My Appointments
                </Link>

                <Link
                  href="/services"
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
                >
                  Browse Services
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    if (
      paymentResult.state ===
        "FINALIZED" &&
      paymentResult.bookingId
    ) {
      redirect(
        `/checkout/success?type=service-booking&bookingId=${paymentResult.bookingId}`
      );
    }

    const isPending =
      paymentResult.state === "PENDING";

    const isRefunded =
      paymentResult.state === "REFUNDED";

    const title = isPending
      ? "Payment Processing"
      : isRefunded
        ? "Payment Refunded"
        : "Payment Not Completed";

    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                isPending
                  ? "bg-yellow-50"
                  : isRefunded
                    ? "bg-blue-50"
                    : "bg-red-50"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  isPending
                    ? faClock
                    : faCircleInfo
                }
                className={`h-9 w-9 ${
                  isPending
                    ? "text-yellow-600"
                    : isRefunded
                      ? "text-blue-600"
                      : "text-red-600"
                }`}
              />
            </div>

            <h1 className="mt-6 font-heading text-3xl uppercase">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              {paymentResult.message}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isPending ? (
                <Link
                  href={`/checkout/success?type=service-payment&session_id=${encodeURIComponent(
                    stripeSessionId
                  )}`}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Check Payment Status Again
                </Link>
              ) : (
                <Link
                  href="/services"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Browse Services
                </Link>
              )}

              <Link
                href="/customer"
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
              >
                View My Appointments
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isRestaurantOnlinePaymentSuccess) {
    if (!stripeSessionId) {
      notFound();
    }

    let paymentResult;

    try {
      paymentResult =
        await finalizeRestaurantReservationPayment({
          providerSessionId:
            stripeSessionId,
          customerId: user.id,
        });
    } catch (error) {
      console.error(
        "RESTAURANT_PAYMENT_SUCCESS_FINALIZATION_ERROR",
        error
      );

      return (
        <main className="min-h-screen bg-white text-black">
          <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-sm md:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="h-9 w-9 text-red-600"
                />
              </div>

              <h1 className="mt-6 font-heading text-3xl uppercase">
                Payment Verification Needs Attention
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Your Stripe payment could not be finalized into a restaurant reservation automatically. Please do not make another payment until the current payment status has been checked.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/customer/restaurant-reservations"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  View My Reservations
                </Link>

                <Link
                  href="/restaurants"
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
                >
                  Browse Restaurants
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    if (
      paymentResult.state ===
        "FINALIZED" &&
      paymentResult.restaurantReservationId
    ) {
      redirect(
        `/checkout/success?type=restaurant-reservation&reservationId=${paymentResult.restaurantReservationId}`
      );
    }

    const isPending =
      paymentResult.state === "PENDING";

    const isRefunded =
      paymentResult.state === "REFUNDED";

    const title = isPending
      ? "Payment Processing"
      : isRefunded
        ? "Payment Refunded"
        : "Payment Not Completed";

    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                isPending
                  ? "bg-yellow-50"
                  : isRefunded
                    ? "bg-blue-50"
                    : "bg-red-50"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  isPending
                    ? faClock
                    : faCircleInfo
                }
                className={`h-9 w-9 ${
                  isPending
                    ? "text-yellow-600"
                    : isRefunded
                      ? "text-blue-600"
                      : "text-red-600"
                }`}
              />
            </div>

            <h1 className="mt-6 font-heading text-3xl uppercase">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              {paymentResult.message}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isPending ? (
                <Link
                  href={`/checkout/success?type=restaurant-payment&session_id=${encodeURIComponent(
                    stripeSessionId
                  )}`}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Check Payment Status Again
                </Link>
              ) : (
                <Link
                  href="/restaurants"
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Browse Restaurants
                </Link>
              )}

              <Link
                href="/customer/restaurant-reservations"
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold"
              >
                View My Reservations
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isServiceBookingSuccess) {
    if (!bookingId) {
      notFound();
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: user.id,
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            duration: true,
          },
        },
        vendor: {
          select: {
            businessName: true,
            slug: true,
          },
        },
        payment: {
          select: {
            method: true,
            provider: true,
          },
        },
      },
    });

    if (!booking) {
      notFound();
    }

    const appointmentDuration =
      booking.durationMinutes ??
      booking.service.duration ??
      null;

    const isPaymentPaid =
      String(booking.paymentStatus) ===
      "PAID";

    const totalLabel = isPaymentPaid
      ? "Total Paid"
      : "Amount to Pay";

    const isStripePayment =
      booking.payment?.provider === "stripe";

    const bookingPaymentMethod = isStripePayment
      ? "Online Card Payment"
      : booking.payment?.method
        ? formatStatus(String(booking.payment.method))
        : "Not available";

    const bookingSummaryCards = [
      {
        label: "Appointment Amount",
        value: formatCurrencyAmount(
          booking.currency,
          booking.amount
        ),
        helper: totalLabel,
        icon: faReceipt,
      },
      {
        label: "Booking Status",
        value: formatStatus(
          String(booking.status)
        ),
        helper:
          "Your appointment booking status",
        icon: faCircleCheck,
      },
      {
        label: "Payment Status",
        value: formatStatus(
          String(booking.paymentStatus)
        ),
        helper: isStripePayment
          ? "Verified securely through Stripe"
          : "Current appointment payment status",
        icon: faCreditCard,
      },
      {
        label: "Duration",
        value: formatDuration(
          appointmentDuration
        ),
        helper:
          "Duration of the selected appointment",
        icon: faClock,
      },
    ];

    const serviceImage =
      booking.service.images?.[0] || "";

    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="h-10 w-10 text-green-600"
                />
              </div>

              <h1 className="mt-6 font-heading text-4xl uppercase">
                Appointment Booked Successfully
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Your service appointment has been booked successfully. Please
                review the appointment details below.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                    String(booking.status)
                  )}`}
                >
                  {formatStatus(
                    String(booking.status)
                  )}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                    String(
                      booking.paymentStatus
                    )
                  )}`}
                >
                  Payment{" "}
                  {formatStatus(
                    String(
                      booking.paymentStatus
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {bookingSummaryCards.map(
                (card) => (
                  <div
                    key={card.label}
                    className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500">
                          {card.label}
                        </p>

                        <p className="mt-2 break-words text-xl font-semibold">
                          {card.value}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                        <FontAwesomeIcon
                          icon={card.icon}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      {card.helper}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="min-w-0 space-y-6">
                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <FontAwesomeIcon
                      icon={faBagShopping}
                      className="h-5 w-5"
                    />

                    <h2 className="font-heading text-2xl uppercase">
                      Service Details
                    </h2>
                  </div>

                  <div className="flex flex-col gap-5 sm:flex-row">
                    {serviceImage ? (
                      <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 sm:w-40">
                        <img
                          src={serviceImage}
                          alt={
                            booking.service.title
                          }
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="grid flex-1 grid-cols-1 gap-4 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-gray-500">
                          Service
                        </p>
                        <p className="mt-1 font-medium">
                          {booking.service.title}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">
                          Service Provider
                        </p>
                        <p className="mt-1 font-medium">
                          {booking.vendor?.businessName ||
                            "OREYA"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">
                          Duration
                        </p>
                        <p className="mt-1 font-medium">
                          {formatDuration(
                            appointmentDuration
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">
                          Booking ID
                        </p>
                        <p className="mt-1 break-all font-medium">
                          {booking.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="h-5 w-5"
                    />

                    <h2 className="font-heading text-2xl uppercase">
                      Appointment Schedule
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          className="h-4 w-4"
                        />
                        <p>Date</p>
                      </div>

                      <p className="font-medium">
                        {formatReservationDate(
                          booking.bookingDate
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faClock}
                          className="h-4 w-4"
                        />
                        <p>Time</p>
                      </div>

                      <p className="font-medium">
                        {booking.startTime} -{" "}
                        {booking.endTime}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faClock}
                          className="h-4 w-4"
                        />
                        <p>Duration</p>
                      </div>

                      <p className="font-medium">
                        {formatDuration(
                          appointmentDuration
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {booking.customerNote ? (
                  <div className="rounded-3xl border border-gray-200 p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={faCircleInfo}
                        className="h-5 w-5"
                      />

                      <h2 className="font-heading text-2xl uppercase">
                        Appointment Note
                      </h2>
                    </div>

                    <p className="text-sm leading-6 text-gray-700">
                      {booking.customerNote}
                    </p>
                  </div>
                ) : null}
              </div>

              <aside className="h-fit min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                <h2 className="font-heading text-2xl uppercase">
                  Payment Summary
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <span className="min-w-0 text-gray-500">
                      Appointment Amount
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold">
                      {formatCurrencyAmount(
                        booking.currency,
                        booking.amount
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <span className="inline-flex min-w-0 items-center text-gray-500">
                      <FontAwesomeIcon
                        icon={faCreditCard}
                        className="mr-2 h-4 w-4 shrink-0"
                      />
                      Payment Method
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold">
                      {bookingPaymentMethod}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-lg font-semibold">
                      <span className="min-w-0">
                        {totalLabel}
                      </span>
                      <span className="whitespace-nowrap text-right">
                        {formatCurrencyAmount(
                          booking.currency,
                          booking.amount
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-gray-500">
                      Created At
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(
                        booking.createdAt
                      )}
                    </p>
                  </div>

                  {!isPaymentPaid ? (
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                      This appointment does not have a completed payment. Stripe-paid appointments are created only after successful payment verification.
                    </div>
                  ) : isStripePayment ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                      This appointment payment was verified successfully through Stripe.
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3">
                  <Link
                    href="/services"
                    className="flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                  >
                    Browse Services
                  </Link>

                  <Link
                    href={`/products/${booking.service.slug}`}
                    className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    View Service
                  </Link>

                  <Link
                    href="/customer"
                    className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    View My Appointments
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isRestaurantReservationSuccess) {
    if (!reservationId && !reservationCode) {
      notFound();
    }

    const reservation = await prisma.restaurantReservation.findFirst({
      where: reservationId
        ? {
            id: reservationId,
            customerId: user.id,
          }
        : {
            reservationCode,
            customerId: user.id,
          },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            area: true,
            city: true,
            state: true,
            country: true,
            latitude: true,
            longitude: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            seatingArea: true,
          },
        },
        payment: {
          select: {
            method: true,
            provider: true,
          },
        },
      },
    });

    if (!reservation) {
      notFound();
    }

    const reservationWithMenuJson = reservation as typeof reservation &
      ReservationWithMenuJson;

    const isPaymentPaid = String(reservation.paymentStatus) === "PAID";
    const paymentMethodLabel =
      String(reservation.payment?.method || "") === "CARD" &&
      reservation.payment?.provider === "stripe"
        ? "Online Card Payment"
        : String(reservation.payment?.method || "") === "CASH_ON_DELIVERY"
          ? "Cash on Delivery"
          : isPaymentPaid
            ? "Online Payment"
            : "Payment Pending";
    const totalLabel = isPaymentPaid ? "Total Paid" : "Amount to Pay";
    const reservationNoteDetails = splitReservationNote(
      reservation.customerNote
    );
    const selectedMenuItems = getReservationMenuItemsFromJson(
      reservationWithMenuJson.menuItemsJson,
      reservationNoteDetails.menuLines
    );

    const reservationSummaryCards = [
      {
        label: "Reservation Amount",
        value: formatCurrencyAmount(reservation.currency, reservation.amount),
        helper: totalLabel,
        icon: faReceipt,
      },
      {
        label: "Reservation Status",
        value: formatStatus(String(reservation.status)),
        helper: "Your table reservation status",
        icon: faCircleCheck,
      },
      {
        label: "Payment Status",
        value: formatStatus(String(reservation.paymentStatus)),
        helper: "Payment will be handled as selected",
        icon: faCreditCard,
      },
      {
        label: "Guests",
        value: String(reservation.guests),
        helper: "Total guests included in this reservation",
        icon: faUserGroup,
      },
    ];

    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm md:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="h-10 w-10 text-green-600"
                />
              </div>

              <h1 className="mt-6 font-heading text-4xl uppercase">
                Reservation Created Successfully
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Your restaurant reservation has been created successfully.
                Please review your reservation details below.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                    String(reservation.status)
                  )}`}
                >
                  {formatStatus(String(reservation.status))}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                    String(reservation.paymentStatus)
                  )}`}
                >
                  Payment {formatStatus(String(reservation.paymentStatus))}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {reservationSummaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="mt-2 break-words text-xl font-semibold">{card.value}</p>
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

            <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="min-w-0 space-y-6">
                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />

                    <h2 className="font-heading text-2xl uppercase">
                      Restaurant Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-gray-500">Restaurant</p>
                      <p className="mt-1 font-medium">
                        {reservation.restaurant.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Table</p>
                      <p className="mt-1 font-medium">
                        {reservation.table
                          ? `Table ${reservation.table.tableNumber} · ${reservation.table.capacity} capacity`
                          : "Table not available"}
                      </p>
                    </div>

                    {reservation.table?.seatingArea ? (
                      <div>
                        <p className="text-gray-500">Seating Area</p>
                        <p className="mt-1 font-medium">
                          {reservation.table.seatingArea}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <p className="text-gray-500">Area / City</p>
                      <p className="mt-1 font-medium">
                        {[reservation.restaurant.area, reservation.restaurant.city]
                          .filter(Boolean)
                          .join(", ") || "Not added"}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-gray-500">Location</p>

                      <Link
                        href={getRestaurantMapUrl(reservation.restaurant)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block font-medium underline"
                      >
                        Open restaurant location in Google Maps
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" />

                    <h2 className="font-heading text-2xl uppercase">
                      Reservation Schedule
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          className="h-4 w-4"
                        />
                        <p>Date</p>
                      </div>

                      <p className="font-medium">
                        {formatReservationDate(reservation.reservationDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                        <p>Time</p>
                      </div>

                      <p className="font-medium">
                        {reservation.startTime} - {reservation.endTime}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <FontAwesomeIcon
                          icon={faUserGroup}
                          className="h-4 w-4"
                        />
                        <p>Guests</p>
                      </div>

                      <p className="font-medium">{reservation.guests}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <FontAwesomeIcon icon={faBagShopping} className="h-5 w-5" />

                    <h2 className="font-heading text-2xl uppercase">
                      Selected Menu Items
                    </h2>
                  </div>

                  {selectedMenuItems.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-gray-600">
                              Food Package
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-600">
                              Quantity
                            </th>

                            <th className="px-4 py-3 text-right font-semibold text-gray-600">
                              Amount
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {selectedMenuItems.map((menuItem, index) => (
                            <tr key={`${menuItem.foodPackage}-${index}`}>
                              <td className="px-4 py-3 font-medium text-black">
                                {menuItem.foodPackage}
                              </td>

                              <td className="px-4 py-3 text-center text-gray-700">
                                {menuItem.quantity}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-black">
                                {menuItem.amount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No selected menu item details were found for this
                      reservation.
                    </p>
                  )}

                  {reservationNoteDetails.plainNote ? (
                    <div className="mt-5 rounded-2xl border border-gray-100 p-4">
                      <p className="text-sm text-gray-500">Customer Note</p>
                      <p className="mt-1 text-sm font-medium leading-6">
                        {reservationNoteDetails.plainNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="h-fit min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                <h2 className="font-heading text-2xl uppercase">
                  Payment Summary
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <span className="min-w-0 text-gray-500">
                      Reservation Amount
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold">
                      {formatCurrencyAmount(
                        reservation.currency,
                        reservation.amount
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <span className="inline-flex min-w-0 items-center text-gray-500">
                      <FontAwesomeIcon
                        icon={faCreditCard}
                        className="mr-2 h-4 w-4 shrink-0"
                      />
                      Payment Method
                    </span>
                    <span className="whitespace-nowrap text-right font-semibold">
                      {paymentMethodLabel}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-lg font-semibold">
                      <span className="min-w-0">{totalLabel}</span>
                      <span className="whitespace-nowrap text-right">
                        {formatCurrencyAmount(
                          reservation.currency,
                          reservation.amount
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-gray-500">Reservation Code</p>
                    <p className="mt-1 break-all font-semibold">
                      {reservation.reservationCode}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-gray-500">Created At</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(reservation.createdAt)}
                    </p>
                  </div>

                  {!isPaymentPaid ? (
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                      Payment is currently pending. Please verify the payment status before taking any further action on this reservation.
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3">
                  <Link
                    href="/restaurants"
                    className="flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                  >
                    Browse Restaurants
                  </Link>

                  <Link
                    href={`/restaurants/${reservation.restaurant.slug}`}
                    className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    View Restaurant
                  </Link>

                  <Link
                    href="/customer/restaurant-reservations"
                    className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                  >
                    View My Reservations
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: user.id,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              title: true,
              images: true,
            },
          },
          service: {
            select: {
              title: true,
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    notFound();
  }

  const orderWithDelivery = order as typeof order & OrderDeliveryFields;

  const isPaymentPaid = String(orderWithDelivery.paymentStatus) === "PAID";
  const totalLabel = isPaymentPaid ? "Total Paid" : "Amount to Pay";

  const paymentMethod = orderWithDelivery.payment?.method
    ? formatStatus(String(orderWithDelivery.payment.method))
    : "Pending";

  const requestedDeliveryDateLabel = formatDateOnly(
    orderWithDelivery.requestedDeliveryDate
  );

  const deliveryLatitude = orderWithDelivery.deliveryLatitude
    ? orderWithDelivery.deliveryLatitude.toString()
    : "";

  const deliveryLongitude = orderWithDelivery.deliveryLongitude
    ? orderWithDelivery.deliveryLongitude.toString()
    : "";

  const deliveryAddress = getShortAddress(orderWithDelivery);
  const hasDeliveryCoordinates = Boolean(deliveryLatitude && deliveryLongitude);

  const hasDeliveryDetails = Boolean(
    orderWithDelivery.requestedDeliveryDate ||
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
      orderWithDelivery.deliveryNote
  );

  const orderSummaryCards = [
    {
      label: totalLabel,
      value: formatCurrencyAmount(orderWithDelivery.currency, orderWithDelivery.total),
      helper: `${orderWithDelivery.items.length} item${
        orderWithDelivery.items.length === 1 ? "" : "s"
      } in this order`,
      icon: faReceipt,
    },
    {
      label: "Order Status",
      value: formatStatus(String(orderWithDelivery.status)),
      helper: "Your order has been created successfully",
      icon: faTruck,
    },
    {
      label: "Payment Status",
      value: formatStatus(String(orderWithDelivery.paymentStatus)),
      helper: paymentMethod,
      icon: faCreditCard,
    },
    {
      label: "Requested Delivery",
      value: requestedDeliveryDateLabel,
      helper: "Your selected delivery preference",
      icon: faCalendarDays,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <FontAwesomeIcon
                icon={faCircleCheck}
                className="h-10 w-10 text-green-600"
              />
            </div>

            <h1 className="mt-6 font-heading text-4xl uppercase">
              Order Placed Successfully
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Your order has been created successfully. You can review the order
              summary below or track the latest fulfillment progress from your
              customer dashboard.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                  String(orderWithDelivery.status)
                )}`}
              >
                {formatStatus(String(orderWithDelivery.status))}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                  String(orderWithDelivery.paymentStatus)
                )}`}
              >
                Payment {formatStatus(String(orderWithDelivery.paymentStatus))}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {orderSummaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="mt-2 break-words text-xl font-semibold">{card.value}</p>
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

          <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
              <div className="rounded-3xl border border-gray-200 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <FontAwesomeIcon icon={faReceipt} className="h-5 w-5" />

                  <h2 className="font-heading text-2xl uppercase">
                    Order Overview
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Order ID</p>
                    <p className="mt-1 break-all font-medium">
                      {orderWithDelivery.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Order Date</p>
                    <p className="mt-1 font-medium">
                      {formatDate(orderWithDelivery.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Requested Delivery Date</p>
                    <p className="mt-1 font-medium">
                      {requestedDeliveryDateLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Order Status</p>
                    <p className="mt-1 font-medium">
                      {formatStatus(String(orderWithDelivery.status))}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Payment Status</p>
                    <p className="mt-1 font-medium">
                      {formatStatus(String(orderWithDelivery.paymentStatus))}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Payment Method</p>
                    <p className="mt-1 font-medium">{paymentMethod}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5" />

                  <h2 className="font-heading text-2xl uppercase">
                    Delivery Details
                  </h2>
                </div>

                {hasDeliveryDetails ? (
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-gray-500">Requested Delivery Date</p>
                      <p className="mt-1 font-medium">
                        {requestedDeliveryDateLabel}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Full Name</p>
                      <p className="mt-1 font-medium">
                        {orderWithDelivery.deliveryFullName || "Not added"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Phone Number</p>
                      <p className="mt-1 font-medium">
                        {orderWithDelivery.deliveryPhone || "Not added"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Email Address</p>
                      <p className="mt-1 break-all font-medium">
                        {orderWithDelivery.deliveryEmail || "Not added"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">City / Area</p>
                      <p className="mt-1 font-medium">
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
                      <p className="mt-1 font-medium leading-6">
                        {deliveryAddress || "Not added"}
                      </p>
                    </div>

                    {orderWithDelivery.deliveryNote ? (
                      <div className="md:col-span-2 rounded-2xl bg-gray-50 p-4">
                        <p className="text-gray-500">Order Note</p>
                        <p className="mt-1 font-medium leading-6">
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
                          className="mt-1 inline-block text-sm font-medium underline"
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

              <div className="rounded-3xl border border-gray-200 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <FontAwesomeIcon icon={faBagShopping} className="h-5 w-5" />

                  <h2 className="font-heading text-2xl uppercase">
                    Ordered Items
                  </h2>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-600">
                            Item Details
                          </th>

                          <th className="px-4 py-3 text-center font-semibold text-gray-600">
                            Type
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
                          const orderItem = item as typeof item &
                            OrderItemVariationSnapshot;

                          const itemType = getItemType({
                            productId: orderItem.productId,
                            serviceId: orderItem.serviceId,
                          });

                          const itemTitle = getOrderItemTitle(orderItem);
                          const lineTotal =
                            Number(orderItem.price) *
                            Number(orderItem.quantity);

                          const itemImage = getOrderItemImage(orderItem);

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
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                                    {itemImage ? (
                                      <img
                                        src={itemImage}
                                        alt={itemTitle}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400">
                                        No Image
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-medium text-black">
                                      {itemTitle}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      Item ID: {orderItem.id}
                                    </p>

                                    {orderItem.variantSku ? (
                                      <p className="mt-1 text-xs text-gray-500">
                                        SKU: {orderItem.variantSku}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                  {itemType}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                {hasVariationDetails ? (
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
                                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-700"
                                          >
                                            {name}: {value}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              <td className="px-4 py-4 text-center font-medium text-gray-700">
                                {orderItem.quantity}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-right text-gray-700">
                                {formatCurrencyAmount(
                                  orderItem.currency,
                                  orderItem.price
                                )}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-black">
                                {formatCurrencyAmount(
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
            </div>

            <aside className="h-fit min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
              <h2 className="font-heading text-2xl uppercase">
                Payment Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <span className="min-w-0 text-gray-500">Subtotal</span>
                  <span className="whitespace-nowrap text-right font-semibold">
                    {formatCurrencyAmount(
                      orderWithDelivery.currency,
                      orderWithDelivery.subtotal
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <span className="min-w-0 text-gray-500">
                    Shipping / Delivery
                  </span>
                  <span className="whitespace-nowrap text-right font-semibold">
                    {formatCurrencyAmount(
                      orderWithDelivery.currency,
                      orderWithDelivery.shipping
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <span className="min-w-0 text-gray-500">Tax</span>
                  <span className="whitespace-nowrap text-right font-semibold">
                    {formatCurrencyAmount(
                      orderWithDelivery.currency,
                      orderWithDelivery.tax
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <span className="inline-flex min-w-0 items-center text-gray-500">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="mr-2 h-4 w-4 shrink-0"
                    />
                    Requested Delivery
                  </span>
                  <span className="max-w-[170px] break-words text-right font-semibold">
                    {requestedDeliveryDateLabel}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-lg font-semibold">
                    <span className="min-w-0">{totalLabel}</span>
                    <span className="whitespace-nowrap text-right">
                      {formatCurrencyAmount(
                        orderWithDelivery.currency,
                        orderWithDelivery.total
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
                    {formatStatus(String(orderWithDelivery.paymentStatus))}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-gray-500">Order Status</p>
                  <p className="mt-1 font-semibold">
                    {formatStatus(String(orderWithDelivery.status))}
                  </p>
                </div>

                {!isPaymentPaid ? (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                    Payment is currently pending. For Cash on Delivery orders,
                    the customer will complete the payment at the time of
                    delivery.
                  </div>
                ) : null}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
                  <div className="flex gap-3">
                    <FontAwesomeIcon
                      icon={faCircleInfo}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />

                    <p className="text-xs leading-5">
                      You can track this order anytime from your customer order
                      page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href="/"
                  className="flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
                >
                  Continue Shopping
                </Link>

                <Link
                  href={`/customer/orders/${orderWithDelivery.id}`}
                  className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                >
                  Track Order
                </Link>

                <Link
                  href="/customer/orders"
                  className="flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-100"
                >
                  View My Orders
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}