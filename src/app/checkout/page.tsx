import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getCustomerCart } from "../../lib/cart";
import { prisma } from "../../lib/prisma";
import PlaceOrderButton from "../../components/checkout/PlaceOrderButton";
import RequestedDeliveryDatePicker from "../../components/checkout/RequestedDeliveryDatePicker";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faCalendarDays,
  faCreditCard,
  faLocationDot,
  faMapPin,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ParsedRestaurantMenuItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  totalPrice: number;
  image: string;
};

type RestaurantReservationCheckout = {
  checkoutType: "restaurant-reservation";
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  tableId: string;
  tableNumber: string;
  tableCapacity: string;
  guests: string;
  slotMinutes: string;
  bufferMinutes: string;
  amount: number;
  currency: string;
  image: string;
  menuItems: ParsedRestaurantMenuItem[];
  menuItemsJson: string;
  menuItemIds: string;
  menuItemNames: string;
  menuItemQuantity: string;
  menuItemTotalPrice: string;
};

type ServiceBookingRequest = {
  checkoutType: "service-booking";
  serviceId: string;
  slotId: string;
  customerNote: string;
  returnPath: string;
};

type ServiceBookingCheckout = {
  checkoutType: "service-booking";
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  serviceImage: string;
  slotId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  amount: number;
  currency: string;
  customerNote: string;
  returnPath: string;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function getItemTypeLabel(type: string) {
  if (type === "PRODUCT") return "Product";
  if (type === "SERVICE") return "Service";
  if (type === "MENU_ITEM") return "Restaurant Menu Item";
  return type;
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function buildQueryString(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          params.append(key, item);
        }
      });
      return;
    }

    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

function parseAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return amount;
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return value.toFixed(2);
}

function formatReservationDate(value: string) {
  if (!value) {
    return "Not selected";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAppointmentDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDuration(minutes: number | null) {
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

function getTodayDateOnly() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function getSafePublicReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/products";
  }

  if (
    value.startsWith("/admin") ||
    value.startsWith("/vendor") ||
    value.startsWith("/customer") ||
    value.startsWith("/checkout")
  ) {
    return "/products";
  }

  return value;
}

function getMinimumDeliveryDateValue(leadTimeHours: number) {
  const minimumDeliveryDate = new Date();

  minimumDeliveryDate.setHours(
    minimumDeliveryDate.getHours() + leadTimeHours
  );

  const year = minimumDeliveryDate.getFullYear();
  const month = String(minimumDeliveryDate.getMonth() + 1).padStart(2, "0");
  const day = String(minimumDeliveryDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDeliveryLeadTimeLabel(leadTimeHours: number) {
  if (leadTimeHours === 1) {
    return "1 hour";
  }

  if (leadTimeHours < 24) {
    return `${leadTimeHours} hours`;
  }

  const days = leadTimeHours / 24;

  if (Number.isInteger(days)) {
    return days === 1 ? "24 hours" : `${days} days`;
  }

  return `${leadTimeHours} hours`;
}

const defaultProductDeliveryPreparationHoursKey =
  "defaultProductDeliveryPreparationHours";

const fallbackProductDeliveryPreparationHours = 24;
const maximumProductDeliveryPreparationHours = 720;

function normalizeDeliveryPreparationHours(
  value: unknown,
  fallback = fallbackProductDeliveryPreparationHours
) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsedValue),
    maximumProductDeliveryPreparationHours
  );
}

async function getAdminDefaultDeliveryPreparationHours() {
  const setting = await prisma.setting.findUnique({
    where: {
      key: defaultProductDeliveryPreparationHoursKey,
    },
    select: {
      value: true,
    },
  });

  return normalizeDeliveryPreparationHours(setting?.value);
}

async function getCheckoutDeliveryPreparationHours(customerId: string) {
  const adminDefaultPreparationHours =
    await getAdminDefaultDeliveryPreparationHours();

  const cartItems = await prisma.cartItem.findMany({
    where: {
      cart: {
        customerId,
      },
    },
    select: {
      product: {
        select: {
          vendor: {
            select: {
              deliveryPreparationHours: true,
            },
          },
        },
      },
      service: {
        select: {
          vendor: {
            select: {
              deliveryPreparationHours: true,
            },
          },
        },
      },
    },
  });

  const itemPreparationHours = cartItems.map((item) => {
    const productVendorPreparationHours =
      item.product?.vendor?.deliveryPreparationHours;
    const serviceVendorPreparationHours =
      item.service?.vendor?.deliveryPreparationHours;

    return normalizeDeliveryPreparationHours(
      productVendorPreparationHours ??
        serviceVendorPreparationHours ??
        adminDefaultPreparationHours,
      adminDefaultPreparationHours
    );
  });

  return Math.max(adminDefaultPreparationHours, ...itemPreparationHours);
}

function getVariantEntries(options?: Record<string, string>) {
  if (!options) {
    return [];
  }

  return Object.entries(options).filter(([name, value]) => {
    return Boolean(name.trim()) && Boolean(value.trim());
  });
}

function parseRestaurantMenuItems(
  rawValue: string,
  fallbackCurrency: string,
  fallbackSingleItem: {
    id: string;
    name: string;
    price: string;
    currency: string;
    quantity: string;
    totalPrice: string;
    image: string;
  }
) {
  try {
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;

    if (Array.isArray(parsedValue)) {
      return parsedValue
        .map((item) => {
          const price = parseAmount(String(item.price || "0"));
          const quantityValue = Number(item.quantity);
          const quantity =
            Number.isFinite(quantityValue) && quantityValue > 0
              ? Math.floor(quantityValue)
              : 1;

          const totalPriceFromPayload = parseAmount(
            String(item.totalPrice || "")
          );
          const totalPrice =
            totalPriceFromPayload > 0
              ? totalPriceFromPayload
              : price * quantity;

          return {
            id: String(item.id || ""),
            name: String(item.name || "Menu Item"),
            price,
            currency: String(item.currency || fallbackCurrency || "AED"),
            quantity,
            totalPrice,
            image: String(item.image || ""),
          };
        })
        .filter((item) => item.name.trim().length > 0);
    }
  } catch (error) {
    console.error("CHECKOUT_MENU_ITEMS_PARSE_ERROR", error);
  }

  if (fallbackSingleItem.name) {
    const price = parseAmount(fallbackSingleItem.price);
    const quantityValue = Number(fallbackSingleItem.quantity);
    const quantity =
      Number.isFinite(quantityValue) && quantityValue > 0
        ? Math.floor(quantityValue)
        : 1;

    const totalPriceFromPayload = parseAmount(fallbackSingleItem.totalPrice);
    const totalPrice =
      totalPriceFromPayload > 0 ? totalPriceFromPayload : price * quantity;

    return [
      {
        id: fallbackSingleItem.id,
        name: fallbackSingleItem.name,
        price,
        currency: fallbackSingleItem.currency || fallbackCurrency || "AED",
        quantity,
        totalPrice,
        image: fallbackSingleItem.image,
      },
    ];
  }

  return [];
}

function getRestaurantReservationCheckout(
  searchParams: Record<string, string | string[] | undefined>
): RestaurantReservationCheckout | null {
  const checkoutType = getSearchParam(searchParams, "checkoutType");

  if (checkoutType !== "restaurant-reservation") {
    return null;
  }

  const currency = getSearchParam(searchParams, "currency") || "AED";

  const fallbackSingleItem = {
    id: getSearchParam(searchParams, "menuItemId"),
    name: getSearchParam(searchParams, "menuItemName"),
    price: getSearchParam(searchParams, "menuItemPrice"),
    currency: getSearchParam(searchParams, "menuItemCurrency") || currency,
    quantity: getSearchParam(searchParams, "menuItemQuantity"),
    totalPrice: getSearchParam(searchParams, "menuItemTotalPrice"),
    image: getSearchParam(searchParams, "image"),
  };

  const menuItems = parseRestaurantMenuItems(
    getSearchParam(searchParams, "menuItems"),
    currency,
    fallbackSingleItem
  );

  const menuItemsTotal = menuItems.reduce((total, item) => {
    return total + item.totalPrice;
  }, 0);

  const amountFromParams = parseAmount(getSearchParam(searchParams, "amount"));
  const amount = amountFromParams > 0 ? amountFromParams : menuItemsTotal;

  const normalizedMenuItemsJson = JSON.stringify(menuItems);

  return {
    checkoutType: "restaurant-reservation",
    restaurantId: getSearchParam(searchParams, "restaurantId"),
    restaurantSlug: getSearchParam(searchParams, "restaurantSlug"),
    restaurantName:
      getSearchParam(searchParams, "restaurantName") || "Restaurant Reservation",
    reservationDate: getSearchParam(searchParams, "reservationDate"),
    startTime: getSearchParam(searchParams, "startTime"),
    endTime: getSearchParam(searchParams, "endTime"),
    slotLabel: getSearchParam(searchParams, "slotLabel"),
    tableId: getSearchParam(searchParams, "tableId"),
    tableNumber: getSearchParam(searchParams, "tableNumber"),
    tableCapacity: getSearchParam(searchParams, "tableCapacity"),
    guests: getSearchParam(searchParams, "guests") || "1",
    slotMinutes: getSearchParam(searchParams, "slotMinutes"),
    bufferMinutes: getSearchParam(searchParams, "bufferMinutes"),
    amount,
    currency,
    image: getSearchParam(searchParams, "image"),
    menuItems,
    menuItemsJson: normalizedMenuItemsJson,
    menuItemIds:
      getSearchParam(searchParams, "menuItemIds") ||
      menuItems.map((item) => item.id).join(","),
    menuItemNames:
      getSearchParam(searchParams, "menuItemNames") ||
      menuItems.map((item) => item.name).join(", "),
    menuItemQuantity:
      getSearchParam(searchParams, "menuItemQuantity") ||
      String(
        menuItems.reduce((total, item) => {
          return total + item.quantity;
        }, 0)
      ),
    menuItemTotalPrice:
      getSearchParam(searchParams, "menuItemTotalPrice") ||
      formatAmount(amount),
  };
}

function getServiceBookingRequest(
  searchParams: Record<string, string | string[] | undefined>
): ServiceBookingRequest | null {
  const checkoutType = getSearchParam(searchParams, "checkoutType");

  if (checkoutType !== "service-booking") {
    return null;
  }

  return {
    checkoutType: "service-booking",
    serviceId: getSearchParam(searchParams, "serviceId"),
    slotId: getSearchParam(searchParams, "slotId"),
    customerNote: getSearchParam(searchParams, "customerNote"),
    returnPath: getSafePublicReturnPath(
      getSearchParam(searchParams, "returnPath")
    ),
  };
}

async function getServiceBookingCheckout(
  request: ServiceBookingRequest
): Promise<ServiceBookingCheckout | null> {
  if (!request.serviceId || !request.slotId) {
    return null;
  }

  const slot = await prisma.appointmentSlot.findFirst({
    where: {
      id: request.slotId,
      serviceId: request.serviceId,
      isActive: true,
      date: {
        gte: getTodayDateOnly(),
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      capacity: true,
      bookedCount: true,
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          currency: true,
          duration: true,
          images: true,
          status: true,
        },
      },
    },
  });

  if (
    !slot ||
    slot.bookedCount >= slot.capacity ||
    String(slot.service.status) !== "ACTIVE"
  ) {
    return null;
  }

  return {
    checkoutType: "service-booking",
    serviceId: slot.service.id,
    serviceSlug: slot.service.slug,
    serviceTitle: slot.service.title,
    serviceImage: slot.service.images?.[0] || "",
    slotId: slot.id,
    appointmentDate: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes:
      slot.durationMinutes ?? slot.service.duration ?? null,
    amount: Number(slot.service.price),
    currency: slot.service.currency || "AED",
    customerNote: request.customerNote,
    returnPath: request.returnPath,
  };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const paymentNotice =
    getSearchParam(
      resolvedSearchParams,
      "payment"
    );

  const restaurantReservationCheckout =
    getRestaurantReservationCheckout(resolvedSearchParams);
  const serviceBookingRequest =
    getServiceBookingRequest(resolvedSearchParams);

  const isRestaurantReservationCheckout = Boolean(
    restaurantReservationCheckout
  );
  const isServiceBookingCheckout = Boolean(serviceBookingRequest);
  const isDirectCheckout =
    isRestaurantReservationCheckout || isServiceBookingCheckout;

  const queryString = buildQueryString(resolvedSearchParams);
  const redirectPath = queryString ? `/checkout?${queryString}` : "/checkout";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  if (
    isRestaurantReservationCheckout &&
    !restaurantReservationCheckout?.restaurantId
  ) {
    redirect("/restaurants");
  }

  const serviceBookingCheckout = serviceBookingRequest
    ? await getServiceBookingCheckout(serviceBookingRequest)
    : null;

  if (isServiceBookingCheckout && !serviceBookingCheckout) {
    redirect(serviceBookingRequest?.returnPath || "/products");
  }

  const cart = isDirectCheckout
    ? null
    : await getCustomerCart(user.id);

  if (!isDirectCheckout) {
    if (!cart || cart.items.length === 0) {
      redirect("/cart");
    }

    if (cart.hasUnavailableItems) {
      redirect("/cart");
    }
  }

  const shipping = 0;
  const tax = 0;

  const subtotal = isRestaurantReservationCheckout
    ? restaurantReservationCheckout?.amount || 0
    : isServiceBookingCheckout
      ? serviceBookingCheckout?.amount || 0
      : cart?.subtotal || 0;

  const currency = isRestaurantReservationCheckout
    ? restaurantReservationCheckout?.currency || "AED"
    : isServiceBookingCheckout
      ? serviceBookingCheckout?.currency || "AED"
      : cart?.currency || "AED";

  const total = subtotal + shipping + tax;
  const deliveryLeadTimeHours = isDirectCheckout
    ? fallbackProductDeliveryPreparationHours
    : await getCheckoutDeliveryPreparationHours(user.id);
  const minimumDeliveryDateValue =
    getMinimumDeliveryDateValue(deliveryLeadTimeHours);
  const deliveryLeadTimeLabel = getDeliveryLeadTimeLabel(deliveryLeadTimeHours);

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-10 border-b border-gray-200 pb-8">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Checkout
          </p>

          <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
            {isRestaurantReservationCheckout
              ? "Complete Your Reservation"
              : isServiceBookingCheckout
                ? "Complete Your Appointment"
                : "Complete Your Order"}
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Welcome, {user.name}.{" "}
            {isRestaurantReservationCheckout
              ? "Please review your restaurant reservation and selected menu items before confirming."
              : isServiceBookingCheckout
                ? "Please review the selected service, appointment schedule, and contact information before confirming."
                : "Please review your selected products and services before placing your order."}
          </p>
        </div>

        {paymentNotice === "cancelled" ? (
          <div className="mb-8 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
            {isRestaurantReservationCheckout
              ? "Online restaurant checkout was closed before payment was completed. No restaurant reservation was created and no table was reserved."
              : isServiceBookingCheckout
                ? "Online appointment checkout was closed before payment was completed. No appointment was created and no slot capacity was consumed."
                : "Online checkout was closed before payment was completed. Your cart has not been cleared, and no paid order was created."}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 p-6">
              <div className="mb-5 flex items-center gap-3">
                <FontAwesomeIcon
                  icon={isServiceBookingCheckout ? faCalendarDays : faLocationDot}
                  className="h-5 w-5"
                />

                <h2 className="font-heading text-2xl uppercase">
                  {isRestaurantReservationCheckout
                    ? "Reservation Contact Details"
                    : isServiceBookingCheckout
                      ? "Appointment Contact Details"
                      : "Delivery Details"}
                </h2>
              </div>

              <form id="checkout-delivery-form" className="space-y-6">
                {restaurantReservationCheckout ? (
                  <>
                    <input
                      type="hidden"
                      name="checkoutType"
                      value={restaurantReservationCheckout.checkoutType}
                    />
                    <input
                      type="hidden"
                      name="restaurantId"
                      value={restaurantReservationCheckout.restaurantId}
                    />
                    <input
                      type="hidden"
                      name="restaurantSlug"
                      value={restaurantReservationCheckout.restaurantSlug}
                    />
                    <input
                      type="hidden"
                      name="restaurantName"
                      value={restaurantReservationCheckout.restaurantName}
                    />
                    <input
                      type="hidden"
                      name="reservationDate"
                      value={restaurantReservationCheckout.reservationDate}
                    />
                    <input
                      type="hidden"
                      name="startTime"
                      value={restaurantReservationCheckout.startTime}
                    />
                    <input
                      type="hidden"
                      name="endTime"
                      value={restaurantReservationCheckout.endTime}
                    />
                    <input
                      type="hidden"
                      name="slotLabel"
                      value={restaurantReservationCheckout.slotLabel}
                    />
                    <input
                      type="hidden"
                      name="tableId"
                      value={restaurantReservationCheckout.tableId}
                    />
                    <input
                      type="hidden"
                      name="tableNumber"
                      value={restaurantReservationCheckout.tableNumber}
                    />
                    <input
                      type="hidden"
                      name="tableCapacity"
                      value={restaurantReservationCheckout.tableCapacity}
                    />
                    <input
                      type="hidden"
                      name="guests"
                      value={restaurantReservationCheckout.guests}
                    />
                    <input
                      type="hidden"
                      name="slotMinutes"
                      value={restaurantReservationCheckout.slotMinutes}
                    />
                    <input
                      type="hidden"
                      name="bufferMinutes"
                      value={restaurantReservationCheckout.bufferMinutes}
                    />
                    <input
                      type="hidden"
                      name="amount"
                      value={formatAmount(restaurantReservationCheckout.amount)}
                    />
                    <input
                      type="hidden"
                      name="currency"
                      value={restaurantReservationCheckout.currency}
                    />
                    <input
                      type="hidden"
                      name="image"
                      value={restaurantReservationCheckout.image}
                    />
                    <input
                      type="hidden"
                      name="menuItems"
                      value={restaurantReservationCheckout.menuItemsJson}
                    />
                    <input
                      type="hidden"
                      name="menuItemIds"
                      value={restaurantReservationCheckout.menuItemIds}
                    />
                    <input
                      type="hidden"
                      name="menuItemNames"
                      value={restaurantReservationCheckout.menuItemNames}
                    />
                    <input
                      type="hidden"
                      name="menuItemQuantity"
                      value={restaurantReservationCheckout.menuItemQuantity}
                    />
                    <input
                      type="hidden"
                      name="menuItemTotalPrice"
                      value={restaurantReservationCheckout.menuItemTotalPrice}
                    />
                  </>
                ) : null}

                {serviceBookingCheckout ? (
                  <>
                    <input
                      type="hidden"
                      name="checkoutType"
                      value={serviceBookingCheckout.checkoutType}
                    />
                    <input
                      type="hidden"
                      name="serviceId"
                      value={serviceBookingCheckout.serviceId}
                    />
                    <input
                      type="hidden"
                      name="slotId"
                      value={serviceBookingCheckout.slotId}
                    />
                    <input
                      type="hidden"
                      name="returnPath"
                      value={serviceBookingCheckout.returnPath}
                    />
                  </>
                ) : null}

                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Customer Information
                  </h3>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="deliveryFullName"
                        className="mb-2 block text-sm font-medium"
                      >
                        Full Name *
                      </label>

                      <input
                        id="deliveryFullName"
                        name="deliveryFullName"
                        type="text"
                        defaultValue={user.name}
                        className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="deliveryEmail"
                        className="mb-2 block text-sm font-medium"
                      >
                        Email Address
                      </label>

                      <input
                        id="deliveryEmail"
                        name="deliveryEmail"
                        type="email"
                        defaultValue={user.email}
                        className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="deliveryPhone"
                        className="mb-2 block text-sm font-medium"
                      >
                        Phone Number *
                      </label>

                      <input
                        id="deliveryPhone"
                        name="deliveryPhone"
                        type="text"
                        defaultValue=""
                        className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {isRestaurantReservationCheckout ? (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                      <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" />
                      Reservation Note
                    </h3>

                    <textarea
                      id="customerNote"
                      name="customerNote"
                      placeholder="Example: Please arrange a quiet table, birthday setup request, allergy note, or any special instruction."
                      className="min-h-[100px] w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none focus:border-black"
                    />
                  </div>
                ) : isServiceBookingCheckout ? (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                      <FontAwesomeIcon
                        icon={faCalendarDays}
                        className="h-4 w-4"
                      />
                      Appointment Note
                    </h3>

                    <textarea
                      id="customerNote"
                      name="customerNote"
                      defaultValue={serviceBookingCheckout?.customerNote || ""}
                      maxLength={1000}
                      placeholder="Add any special request or instruction for the service provider."
                      className="min-h-[100px] w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none focus:border-black"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                      <FontAwesomeIcon icon={faMapPin} className="h-4 w-4" />
                      Delivery Address
                    </h3>

                    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          className="h-4 w-4 text-gray-500"
                        />

                        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                          Preferred Delivery Date
                        </h4>
                      </div>

                      <RequestedDeliveryDatePicker
                        minimumDeliveryDate={minimumDeliveryDateValue}
                        deliveryLeadTimeHours={deliveryLeadTimeHours}
                        deliveryLeadTimeLabel={deliveryLeadTimeLabel}
                        earliestDeliveryLabel={formatReservationDate(
                          minimumDeliveryDateValue
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label
                          htmlFor="deliveryAddress"
                          className="mb-2 block text-sm font-medium"
                        >
                          Full Delivery Address *
                        </label>

                        <textarea
                          id="deliveryAddress"
                          name="deliveryAddress"
                          placeholder="House or building, street, landmark, area, and city"
                          className="min-h-[110px] w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none focus:border-black"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryAddressLine1"
                          className="mb-2 block text-sm font-medium"
                        >
                          Address Line 1
                        </label>

                        <input
                          id="deliveryAddressLine1"
                          name="deliveryAddressLine1"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="House, flat, or building name"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryAddressLine2"
                          className="mb-2 block text-sm font-medium"
                        >
                          Address Line 2
                        </label>

                        <input
                          id="deliveryAddressLine2"
                          name="deliveryAddressLine2"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="Street, landmark, or additional details"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryCountry"
                          className="mb-2 block text-sm font-medium"
                        >
                          Country
                        </label>

                        <input
                          id="deliveryCountry"
                          name="deliveryCountry"
                          type="text"
                          defaultValue="United Arab Emirates"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="Country"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryState"
                          className="mb-2 block text-sm font-medium"
                        >
                          State
                        </label>

                        <input
                          id="deliveryState"
                          name="deliveryState"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="State"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryCity"
                          className="mb-2 block text-sm font-medium"
                        >
                          City *
                        </label>

                        <input
                          id="deliveryCity"
                          name="deliveryCity"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="City"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryArea"
                          className="mb-2 block text-sm font-medium"
                        >
                          Area
                        </label>

                        <input
                          id="deliveryArea"
                          name="deliveryArea"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="Area or neighborhood"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryZipCode"
                          className="mb-2 block text-sm font-medium"
                        >
                          ZIP / Postal Code
                        </label>

                        <input
                          id="deliveryZipCode"
                          name="deliveryZipCode"
                          type="text"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="ZIP or postal code"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryLatitude"
                          className="mb-2 block text-sm font-medium"
                        >
                          Delivery Latitude
                        </label>

                        <input
                          id="deliveryLatitude"
                          name="deliveryLatitude"
                          type="number"
                          step="any"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="Optional"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="deliveryLongitude"
                          className="mb-2 block text-sm font-medium"
                        >
                          Delivery Longitude
                        </label>

                        <input
                          id="deliveryLongitude"
                          name="deliveryLongitude"
                          type="number"
                          step="any"
                          className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none focus:border-black"
                          placeholder="Optional"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label
                          htmlFor="deliveryNote"
                          className="mb-2 block text-sm font-medium"
                        >
                          Order Note / Delivery Instructions
                        </label>

                        <textarea
                          id="deliveryNote"
                          name="deliveryNote"
                          placeholder="Example: Please call before delivery, leave the order at reception, or add any special delivery instruction."
                          className="min-h-[90px] w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none focus:border-black"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="rounded-[28px] border border-gray-200 p-6">
              <div className="mb-5 flex items-center gap-3">
                <FontAwesomeIcon icon={faCreditCard} className="h-5 w-5" />

                <h2 className="font-heading text-2xl uppercase">
                  Payment Method
                </h2>
              </div>

              {isServiceBookingCheckout ? (
                <div className="rounded-2xl border border-black bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        Online Card Payment
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Service appointments require secure online payment through Stripe Sandbox. Your appointment will be created only after Stripe verifies the payment successfully.
                      </p>
                    </div>

                    <input
                      form="checkout-delivery-form"
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      checked
                      readOnly
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : isRestaurantReservationCheckout ? (
                <div className="rounded-2xl border border-black bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        Online Card Payment
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Restaurant reservations require secure online payment through Stripe Sandbox. Your reservation will be created only after Stripe verifies the payment successfully.
                      </p>
                    </div>

                    <input
                      form="checkout-delivery-form"
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      checked
                      readOnly
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Place the order now and pay when the products are delivered. Payment will remain pending until collection.
                      </p>
                    </div>

                    <input
                      form="checkout-delivery-form"
                      type="radio"
                      name="paymentMethod"
                      value="CASH_ON_DELIVERY"
                      defaultChecked
                      className="mt-1"
                    />
                  </label>

                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        Online Card Payment
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Pay securely through Stripe Sandbox. Your order will be finalized only after Stripe verifies the payment successfully.
                      </p>
                    </div>

                    <input
                      form="checkout-delivery-form"
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      className="mt-1"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-[28px] border border-gray-200 p-6">
            <div className="mb-5 flex items-center gap-3">
              <FontAwesomeIcon icon={faBagShopping} className="h-5 w-5" />

              <h2 className="font-heading text-2xl uppercase">
                {isRestaurantReservationCheckout
                  ? "Reservation Summary"
                  : isServiceBookingCheckout
                    ? "Appointment Summary"
                    : "Order Summary"}
              </h2>
            </div>

            {restaurantReservationCheckout ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" />
                    <p className="text-sm font-semibold uppercase tracking-wide">
                      Restaurant Reservation
                    </p>
                  </div>

                  <p className="font-heading text-xl uppercase">
                    {restaurantReservationCheckout.restaurantName}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between gap-4">
                      <span>Date</span>
                      <span className="text-right font-medium text-black">
                        {formatReservationDate(
                          restaurantReservationCheckout.reservationDate
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Time</span>
                      <span className="text-right font-medium text-black">
                        {restaurantReservationCheckout.slotLabel ||
                          `${restaurantReservationCheckout.startTime} - ${restaurantReservationCheckout.endTime}`}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Guests</span>
                      <span className="font-medium text-black">
                        {restaurantReservationCheckout.guests}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Table</span>
                      <span className="text-right font-medium text-black">
                        Table {restaurantReservationCheckout.tableNumber}
                        {restaurantReservationCheckout.tableCapacity
                          ? ` · ${restaurantReservationCheckout.tableCapacity} capacity`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Selected Menu Items
                  </h3>

                  <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                    {restaurantReservationCheckout.menuItems.length > 0 ? (
                      restaurantReservationCheckout.menuItems.map(
                        (item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4"
                          >
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                                  Menu Item
                                </span>

                                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                  Qty {item.quantity}
                                </span>
                              </div>

                              <p className="line-clamp-2 text-sm font-medium">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {item.quantity} × {item.currency}{" "}
                                {formatAmount(item.price)}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-medium">
                              {item.currency} {formatAmount(item.totalPrice)}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        No menu item details found. The reservation amount will
                        still be used for checkout.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : serviceBookingCheckout ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faCalendarDays}
                      className="h-4 w-4"
                    />
                    <p className="text-sm font-semibold uppercase tracking-wide">
                      Service Appointment
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    {serviceBookingCheckout.serviceImage ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <img
                          src={serviceBookingCheckout.serviceImage}
                          alt={serviceBookingCheckout.serviceTitle}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="min-w-0">
                      <p className="font-heading text-xl uppercase">
                        {serviceBookingCheckout.serviceTitle}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        {formatDuration(
                          serviceBookingCheckout.durationMinutes
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between gap-4">
                      <span>Date</span>
                      <span className="text-right font-medium text-black">
                        {formatAppointmentDate(
                          serviceBookingCheckout.appointmentDate
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Time</span>
                      <span className="text-right font-medium text-black">
                        {serviceBookingCheckout.startTime} -{" "}
                        {serviceBookingCheckout.endTime}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span>Service Amount</span>
                      <span className="text-right font-medium text-black">
                        {serviceBookingCheckout.currency}{" "}
                        {formatAmount(serviceBookingCheckout.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {serviceBookingCheckout.customerNote ? (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Appointment Note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {serviceBookingCheckout.customerNote}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
                {cart?.items.map((item) => {
                  const itemType = String(item.type);
                  const isRestaurantItem = itemType === "MENU_ITEM";
                  const variantEntries = getVariantEntries(item.variantOptions);

                  const hasVariantDetails =
                    Boolean(item.variantTitle) ||
                    Boolean(item.variantSku) ||
                    variantEntries.length > 0;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4"
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
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
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              {getItemTypeLabel(itemType)}
                            </span>

                            {isRestaurantItem && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
                                <FontAwesomeIcon
                                  icon={faUtensils}
                                  className="h-3 w-3"
                                />
                                Food
                              </span>
                            )}
                          </div>

                          <p className="line-clamp-2 text-sm font-medium">
                            {item.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {isRestaurantItem ? "Restaurant" : "Vendor"}:{" "}
                            {item.vendor}
                          </p>

                          {hasVariantDetails ? (
                            <div className="mt-3 rounded-2xl bg-gray-50 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-gray-800">
                                  Selected Variation
                                </span>

                                {item.variantTitle ? (
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700">
                                    {item.variantTitle}
                                  </span>
                                ) : null}
                              </div>

                              {variantEntries.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {variantEntries.map(([name, value]) => (
                                    <span
                                      key={`${item.id}-${name}-${value}`}
                                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700"
                                    >
                                      {name}: {value}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {item.variantSku ? (
                                <p className="mt-2 text-[11px] text-gray-500">
                                  SKU: {item.variantSku}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <p className="mt-2 text-xs text-gray-500">
                            Quantity: {item.quantity} × {item.currency}{" "}
                            {formatAmount(item.price)}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-medium">
                        {item.currency} {formatAmount(item.total)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>

                <span>
                  {currency} {formatAmount(subtotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  {isRestaurantReservationCheckout
                    ? "Reservation Service Charge"
                    : isServiceBookingCheckout
                      ? "Appointment Service Charge"
                      : "Shipping / Delivery"}
                </span>

                <span>
                  {currency} {shipping.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>

                <span>
                  {currency} {tax.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>

                  <span>
                    {currency} {formatAmount(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <PlaceOrderButton formId="checkout-delivery-form" />
            </div>

            <Link
              href={
                restaurantReservationCheckout?.restaurantSlug
                  ? `/restaurants/${restaurantReservationCheckout.restaurantSlug}`
                  : serviceBookingCheckout?.serviceSlug
                    ? `/products/${serviceBookingCheckout.serviceSlug}`
                    : "/cart"
              }
              className="mt-4 block text-center text-sm text-gray-500 underline"
            >
              {isRestaurantReservationCheckout
                ? "Back to Restaurant"
                : isServiceBookingCheckout
                  ? "Back to Service"
                  : "Back to Cart"}
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}