"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PlaceOrderButtonProps = {
  formId?: string;
};

type DeliveryTimePeriod =
  | "MORNING"
  | "AFTERNOON"
  | "EVENING";

type ProductPaymentMethod =
  | "CASH_ON_DELIVERY"
  | "CARD";

type DeliveryPayload = {
  paymentMethod: ProductPaymentMethod;

  deliveryFullName?: string;
  deliveryPhone?: string;
  deliveryEmail?: string;

  deliveryAddress?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryCountry?: string;
  deliveryState?: string;
  deliveryCity?: string;
  deliveryArea?: string;
  deliveryZipCode?: string;

  deliveryLatitude?: string;
  deliveryLongitude?: string;

  deliveryNote?: string;

  isRequestedDeliveryDateEnabled?: boolean;
  requestedDeliveryDate?: string;
  requestedDeliveryTimePeriod?: DeliveryTimePeriod;
  deliveryLeadTimeHours?: number;
};

type RestaurantMenuPayloadItem = {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  quantity: number;
  totalPrice: number | string;
  image?: string;
};

type RestaurantReservationPayload = {
  checkoutType: "restaurant-reservation";
  paymentMethod: "CARD";

  restaurantId: string;
  restaurantSlug?: string;
  restaurantName?: string;

  reservationDate: string;
  startTime: string;
  endTime: string;
  slotLabel?: string;

  tableId: string;
  tableNumber?: string;
  tableCapacity?: string;

  guests: number;
  slotMinutes?: number;
  bufferMinutes?: number;

  amount: number;
  currency: string;
  image?: string;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNote?: string;

  menuItems: RestaurantMenuPayloadItem[];

  menuItemIds?: string;
  menuItemNames?: string;
  menuItemQuantity?: string;
  menuItemTotalPrice?: string;
};

type ServiceBookingPayload = {
  checkoutType: "service-booking";
  serviceId: string;
  slotId: string;
  customerNote?: string;
  returnPath?: string;
};

function getFormString(
  formData: FormData,
  key: string
) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getFormNumber(
  formData: FormData,
  key: string,
  fallback = 0
) {
  const value = Number(
    getFormString(formData, key)
  );

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function getFormBoolean(
  formData: FormData,
  key: string
) {
  const value = getFormString(
    formData,
    key
  ).toLowerCase();

  return (
    value === "true" ||
    value === "1" ||
    value === "yes" ||
    value === "on"
  );
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function parseDeliveryTimePeriod(
  value: string
): DeliveryTimePeriod | null {
  const normalizedValue = value
    .trim()
    .toUpperCase();

  if (normalizedValue === "MORNING") {
    return "MORNING";
  }

  if (normalizedValue === "AFTERNOON") {
    return "AFTERNOON";
  }

  if (normalizedValue === "EVENING") {
    return "EVENING";
  }

  return null;
}

function parseMenuItems(
  value: string
): RestaurantMenuPayloadItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => {
        const quantityValue = Number(
          item.quantity
        );

        const quantity =
          Number.isFinite(quantityValue) &&
          quantityValue > 0
            ? Math.floor(quantityValue)
            : 1;

        return {
          id: String(item.id || ""),
          name: String(
            item.name || "Menu Item"
          ),
          price: item.price || "0",
          currency: String(
            item.currency || "AED"
          ),
          quantity,
          totalPrice:
            item.totalPrice || "0",
          image: item.image
            ? String(item.image)
            : "",
        };
      })
      .filter(
        (item) => item.id || item.name
      );
  } catch (error) {
    console.error(
      "PLACE_ORDER_MENU_ITEMS_PARSE_ERROR",
      error
    );

    return [];
  }
}

export default function PlaceOrderButton({
  formId,
}: PlaceOrderButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [
    isReservationCheckout,
    setIsReservationCheckout,
  ] = useState(false);

  const [
    isServiceCheckout,
    setIsServiceCheckout,
  ] = useState(false);

  function refreshCartState() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new Event("cart-updated")
      );
    }

    router.refresh();
  }

  function getCheckoutForm(
    showAlert = true
  ) {
    if (!formId) {
      return null;
    }

    if (typeof document === "undefined") {
      return null;
    }

    const formElement =
      document.getElementById(formId);

    if (
      !formElement ||
      !(
        formElement instanceof
        HTMLFormElement
      )
    ) {
      if (showAlert) {
        alert(
          "Checkout form not found. Please refresh the page and try again."
        );
      }

      return null;
    }

    const isValid =
      formElement.reportValidity();

    if (!isValid) {
      return null;
    }

    return formElement;
  }

  function getCheckoutTypeFromForm() {
    if (
      !formId ||
      typeof document === "undefined"
    ) {
      return "";
    }

    const formElement =
      document.getElementById(formId);

    if (
      !formElement ||
      !(
        formElement instanceof
        HTMLFormElement
      )
    ) {
      return "";
    }

    const formData = new FormData(
      formElement
    );

    return getFormString(
      formData,
      "checkoutType"
    );
  }

  function isRestaurantReservationCheckout() {
    return (
      getCheckoutTypeFromForm() ===
      "restaurant-reservation"
    );
  }

  function isServiceBookingCheckout() {
    return (
      getCheckoutTypeFromForm() ===
      "service-booking"
    );
  }

  useEffect(() => {
    setIsReservationCheckout(
      isRestaurantReservationCheckout()
    );

    setIsServiceCheckout(
      isServiceBookingCheckout()
    );
  }, [formId]);

  function getDeliveryPayload():
    | DeliveryPayload
    | null {
    const payload: DeliveryPayload = {
      paymentMethod:
        "CASH_ON_DELIVERY",
    };

    if (!formId) {
      return payload;
    }

    const formElement =
      getCheckoutForm();

    if (!formElement) {
      return null;
    }

    const formData = new FormData(
      formElement
    );

    const paymentMethod =
      getFormString(
        formData,
        "paymentMethod"
      ).toUpperCase();

    if (
      paymentMethod !==
        "CASH_ON_DELIVERY" &&
      paymentMethod !== "CARD"
    ) {
      alert(
        "Please select a valid payment method."
      );

      return null;
    }

    payload.paymentMethod =
      paymentMethod as ProductPaymentMethod;

    payload.deliveryFullName =
      getFormString(
        formData,
        "deliveryFullName"
      );

    payload.deliveryPhone =
      getFormString(
        formData,
        "deliveryPhone"
      );

    payload.deliveryEmail =
      getFormString(
        formData,
        "deliveryEmail"
      );

    payload.deliveryAddress =
      getFormString(
        formData,
        "deliveryAddress"
      );

    payload.deliveryAddressLine1 =
      getFormString(
        formData,
        "deliveryAddressLine1"
      );

    payload.deliveryAddressLine2 =
      getFormString(
        formData,
        "deliveryAddressLine2"
      );

    payload.deliveryCountry =
      getFormString(
        formData,
        "deliveryCountry"
      );

    payload.deliveryState =
      getFormString(
        formData,
        "deliveryState"
      );

    payload.deliveryCity =
      getFormString(
        formData,
        "deliveryCity"
      );

    payload.deliveryArea =
      getFormString(
        formData,
        "deliveryArea"
      );

    payload.deliveryZipCode =
      getFormString(
        formData,
        "deliveryZipCode"
      );

    payload.deliveryLatitude =
      getFormString(
        formData,
        "deliveryLatitude"
      );

    payload.deliveryLongitude =
      getFormString(
        formData,
        "deliveryLongitude"
      );

    payload.deliveryNote =
      getFormString(
        formData,
        "deliveryNote"
      );

    const isRequestedDeliveryEnabled =
      getFormBoolean(
        formData,
        "isRequestedDeliveryDateEnabled"
      );

    payload.isRequestedDeliveryDateEnabled =
      isRequestedDeliveryEnabled;

    payload.deliveryLeadTimeHours =
      getFormNumber(
        formData,
        "deliveryLeadTimeHours",
        24
      );

    if (
      isRequestedDeliveryEnabled
    ) {
      const requestedDeliveryDate =
        getFormString(
          formData,
          "requestedDeliveryDate"
        );

      const requestedDeliveryTimePeriod =
        parseDeliveryTimePeriod(
          getFormString(
            formData,
            "requestedDeliveryTimePeriod"
          )
        );

      if (
        !requestedDeliveryDate ||
        !isValidDateString(
          requestedDeliveryDate
        )
      ) {
        alert(
          "Please select a valid preferred delivery date."
        );

        return null;
      }

      if (
        !requestedDeliveryTimePeriod
      ) {
        alert(
          "Please select a preferred delivery time."
        );

        return null;
      }

      payload.requestedDeliveryDate =
        requestedDeliveryDate;

      payload.requestedDeliveryTimePeriod =
        requestedDeliveryTimePeriod;
    }

    return payload;
  }

  function getServiceBookingPayload():
    | ServiceBookingPayload
    | null {
    const formElement =
      getCheckoutForm();

    if (!formElement) {
      return null;
    }

    const formData = new FormData(
      formElement
    );

    const checkoutType =
      getFormString(
        formData,
        "checkoutType"
      );

    if (
      checkoutType !==
      "service-booking"
    ) {
      return null;
    }

    const serviceId =
      getFormString(
        formData,
        "serviceId"
      );

    const slotId =
      getFormString(
        formData,
        "slotId"
      );

    if (!serviceId || !slotId) {
      alert(
        "Appointment details are incomplete. Please return to the service page and select the appointment again."
      );

      return null;
    }

    return {
      checkoutType:
        "service-booking",
      serviceId,
      slotId,
      customerNote:
        getFormString(
          formData,
          "customerNote"
        ),
      returnPath:
        getFormString(
          formData,
          "returnPath"
        ),
    };
  }

  function getRestaurantReservationPayload():
    | RestaurantReservationPayload
    | null {
    const formElement =
      getCheckoutForm();

    if (!formElement) {
      return null;
    }

    const formData = new FormData(
      formElement
    );

    const checkoutType =
      getFormString(
        formData,
        "checkoutType"
      );

    if (
      checkoutType !==
      "restaurant-reservation"
    ) {
      return null;
    }

    const restaurantId =
      getFormString(
        formData,
        "restaurantId"
      );

    const reservationDate =
      getFormString(
        formData,
        "reservationDate"
      );

    const startTime =
      getFormString(
        formData,
        "startTime"
      );

    const endTime =
      getFormString(
        formData,
        "endTime"
      );

    const tableId =
      getFormString(
        formData,
        "tableId"
      );

    if (
      !restaurantId ||
      !reservationDate ||
      !startTime ||
      !endTime ||
      !tableId
    ) {
      alert(
        "Reservation details are incomplete. Please go back and try again."
      );

      return null;
    }

    const menuItems =
      parseMenuItems(
        getFormString(
          formData,
          "menuItems"
        )
      );

    const payload: RestaurantReservationPayload =
      {
        checkoutType:
          "restaurant-reservation",

        paymentMethod:
          "CARD",

        restaurantId,

        restaurantSlug:
          getFormString(
            formData,
            "restaurantSlug"
          ),

        restaurantName:
          getFormString(
            formData,
            "restaurantName"
          ),

        reservationDate,
        startTime,
        endTime,

        slotLabel:
          getFormString(
            formData,
            "slotLabel"
          ),

        tableId,

        tableNumber:
          getFormString(
            formData,
            "tableNumber"
          ),

        tableCapacity:
          getFormString(
            formData,
            "tableCapacity"
          ),

        guests: Math.max(
          1,
          getFormNumber(
            formData,
            "guests",
            1
          )
        ),

        slotMinutes:
          getFormNumber(
            formData,
            "slotMinutes",
            60
          ),

        bufferMinutes:
          getFormNumber(
            formData,
            "bufferMinutes",
            0
          ),

        amount:
          getFormNumber(
            formData,
            "amount",
            0
          ),

        currency:
          getFormString(
            formData,
            "currency"
          ) || "AED",

        image:
          getFormString(
            formData,
            "image"
          ),

        customerName:
          getFormString(
            formData,
            "deliveryFullName"
          ),

        customerEmail:
          getFormString(
            formData,
            "deliveryEmail"
          ),

        customerPhone:
          getFormString(
            formData,
            "deliveryPhone"
          ),

        customerNote:
          getFormString(
            formData,
            "customerNote"
          ),

        menuItems,

        menuItemIds:
          getFormString(
            formData,
            "menuItemIds"
          ),

        menuItemNames:
          getFormString(
            formData,
            "menuItemNames"
          ),

        menuItemQuantity:
          getFormString(
            formData,
            "menuItemQuantity"
          ),

        menuItemTotalPrice:
          getFormString(
            formData,
            "menuItemTotalPrice"
          ),
      };

    return payload;
  }

  async function placeServiceBooking() {
    const payload =
      getServiceBookingPayload();

    if (!payload) {
      return;
    }

    const response = await fetch(
      "/api/bookings",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          serviceId: payload.serviceId,
          slotId: payload.slotId,
          customerNote:
            payload.customerNote,
          returnPath:
            payload.returnPath,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (response.status === 401) {
      const redirectPath =
        typeof window === "undefined"
          ? "/checkout"
          : `${window.location.pathname}${window.location.search}`;

      router.push(
        `/login?redirect=${encodeURIComponent(
          redirectPath
        )}`
      );

      return;
    }

    if (response.status === 403) {
      alert(
        data?.message ||
          "Only customers can book service appointments."
      );

      return;
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      alert(
        data?.message ||
          "The appointment could not be booked."
      );

      return;
    }

    if (
      data.requiresOnlinePayment &&
      typeof data.redirectUrl ===
        "string" &&
      data.redirectUrl
    ) {
      window.location.assign(
        data.redirectUrl
      );

      return;
    }

    alert(
      "The secure payment session could not be started. Please try again."
    );
  }

  async function placeRestaurantReservation() {
    const payload =
      getRestaurantReservationPayload();

    if (!payload) {
      return;
    }

    const response = await fetch(
      `/api/restaurants/${payload.restaurantId}/reservations`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials: "include",

        body: JSON.stringify(payload),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (response.status === 401) {
      router.push(
        "/login?redirect=/checkout"
      );

      return;
    }

    if (response.status === 403) {
      alert(
        data?.message ||
          "Only customers can place reservations."
      );

      return;
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      alert(
        data?.message ||
          "Reservation could not be placed."
      );

      return;
    }

    if (
      data.requiresOnlinePayment &&
      typeof data.redirectUrl ===
        "string" &&
      data.redirectUrl
    ) {
      window.location.assign(
        data.redirectUrl
      );

      return;
    }

    alert(
      "The secure payment session could not be started. Please try again."
    );
  }

  async function placeCartOrder() {
    const payload =
      getDeliveryPayload();

    if (!payload) {
      return;
    }

    const response = await fetch(
      "/api/orders/place",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials: "include",

        body: JSON.stringify(payload),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (response.status === 401) {
      router.push(
        "/login?redirect=/checkout"
      );

      return;
    }

    if (response.status === 403) {
      alert(
        data?.message ||
          "Only customers can place orders."
      );

      return;
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      alert(
        data?.message ||
          "Order could not be placed."
      );

      return;
    }

    if (
      data.requiresOnlinePayment &&
      typeof data.redirectUrl ===
        "string" &&
      data.redirectUrl
    ) {
      window.location.assign(
        data.redirectUrl
      );

      return;
    }

    if (!data.orderId) {
      alert(
        "The order was created, but its confirmation details could not be loaded."
      );

      return;
    }

    refreshCartState();

    router.push(
      `/checkout/success?orderId=${data.orderId}`
    );
  }

  async function placeOrder() {
    try {
      setLoading(true);

      if (
        isServiceBookingCheckout()
      ) {
        await placeServiceBooking();
        return;
      }

      if (
        isRestaurantReservationCheckout()
      ) {
        await placeRestaurantReservation();
        return;
      }

      await placeCartOrder();
    } catch (error) {
      console.error(
        "PLACE_ORDER_BUTTON_ERROR",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel =
    isServiceCheckout
      ? loading
        ? "Opening Secure Payment..."
        : "Pay & Confirm Appointment"
      : isReservationCheckout
        ? loading
          ? "Opening Secure Payment..."
          : "Pay & Confirm Reservation"
        : loading
          ? "Placing Order..."
          : "Place Order";

  return (
    <button
      type="button"
      onClick={placeOrder}
      disabled={loading}
      className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {buttonLabel}
    </button>
  );
}