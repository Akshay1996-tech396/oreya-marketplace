import {
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RestaurantMenuType,
  RestaurantReservationSource,
  RestaurantReservationStatus,
  RestaurantTableStatus,
} from "@prisma/client";

import {
  markPaymentCancelled,
  markPaymentFailed,
  requestPaymentReversal,
  verifyOnlinePayment,
} from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";
import { validateRestaurantTableSlotAvailability } from "@/lib/restaurant-slots";

type RestaurantReservationCheckoutMenuItem = {
  id: string;
  name: string;
  price: string;
  currency: string;
  quantity: number;
  totalPrice: string;
  image: string | null;
};

export type BuildRestaurantReservationCheckoutDataInput = {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  tableId: string;
  tableNumber: string;
  tableCapacity: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  slotMinutes: number;
  bufferMinutes: number;
  guests: number;
  amount: Prisma.Decimal | number | string;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  image: string | null;
  menuItems: RestaurantReservationCheckoutMenuItem[];
};

type RestaurantReservationCheckoutData = {
  version: 1;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  tableId: string;
  tableNumber: string;
  tableCapacity: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  slotMinutes: number;
  bufferMinutes: number;
  guests: number;
  amount: string;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  image: string | null;
  menuItems: RestaurantReservationCheckoutMenuItem[];
};

export type RestaurantReservationPaymentFinalizationResult = {
  state: "FINALIZED" | "PENDING" | "FAILED" | "CANCELLED" | "REFUNDED";
  paymentId: string;
  restaurantReservationId: string | null;
  message: string;
};

const FINALIZATION_IN_PROGRESS =
  "RESTAURANT_PAYMENT_FINALIZATION_IN_PROGRESS";

const MARKETPLACE_TIME_ZONE =
  process.env.MARKETPLACE_TIME_ZONE || "Asia/Dubai";

function moneyString(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
}

function cleanRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `${fieldName} is missing from the restaurant reservation checkout data.`,
    );
  }

  return value.trim();
}

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parsePositiveInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${fieldName} is invalid in the restaurant reservation checkout data.`,
    );
  }

  return parsed;
}

function parseNonNegativeInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `${fieldName} is invalid in the restaurant reservation checkout data.`,
    );
  }

  return parsed;
}

function parseMoney(value: unknown, fieldName: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(
      `${fieldName} is invalid in the restaurant reservation checkout data.`,
    );
  }

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new Error(
      `${fieldName} is invalid in the restaurant reservation checkout data.`,
    );
  }

  return decimal.toDecimalPlaces(2);
}

function parseCurrency(value: unknown) {
  const currency = cleanRequiredString(value, "Currency").toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      "Currency is invalid in the restaurant reservation checkout data.",
    );
  }

  return currency;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDatabaseDate(value: string) {
  if (!isValidDateString(value)) {
    throw new Error(
      "Reservation date is invalid in the restaurant reservation checkout data.",
    );
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      "Reservation date is invalid in the restaurant reservation checkout data.",
    );
  }

  return date;
}

function parseTimeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function isSerializableTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runSerializableRestaurantTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error) {
      if (attempt < maxAttempts && isSerializableTransactionConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Restaurant reservation transaction could not be completed safely.",
  );
}

function getCurrentMarketplaceDate() {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKETPLACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    const currentDate = new Date();

    return new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
      ),
    );
  }

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function parseCheckoutMenuItems(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error(
      "Restaurant menu items are invalid in the reservation checkout data.",
    );
  }

  return value.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new Error(
        "Restaurant menu items are invalid in the reservation checkout data.",
      );
    }

    const item = rawItem as Record<string, unknown>;

    return {
      id: cleanRequiredString(item.id, "Menu item ID"),
      name: cleanRequiredString(item.name, "Menu item name"),
      price: parseMoney(item.price, "Menu item price").toFixed(2),
      currency: parseCurrency(item.currency),
      quantity: parsePositiveInteger(item.quantity, "Menu item quantity"),
      totalPrice: parseMoney(item.totalPrice, "Menu item total").toFixed(2),
      image: cleanOptionalString(item.image),
    };
  });
}

function parseRestaurantReservationCheckoutData(
  value: Prisma.JsonValue | null,
): RestaurantReservationCheckoutData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Restaurant reservation checkout data was not found for this payment.",
    );
  }

  const data = value as Record<string, unknown>;

  if (data.version !== 1) {
    throw new Error("Unsupported restaurant reservation checkout data version.");
  }

  const reservationDate = cleanRequiredString(
    data.reservationDate,
    "Reservation date",
  );
  toDatabaseDate(reservationDate);

  return {
    version: 1,
    restaurantId: cleanRequiredString(data.restaurantId, "Restaurant ID"),
    restaurantSlug: cleanRequiredString(
      data.restaurantSlug,
      "Restaurant slug",
    ),
    restaurantName: cleanRequiredString(
      data.restaurantName,
      "Restaurant name",
    ),
    tableId: cleanRequiredString(data.tableId, "Restaurant table ID"),
    tableNumber: cleanRequiredString(data.tableNumber, "Table number"),
    tableCapacity: parsePositiveInteger(data.tableCapacity, "Table capacity"),
    reservationDate,
    startTime: cleanRequiredString(data.startTime, "Reservation start time"),
    endTime: cleanRequiredString(data.endTime, "Reservation end time"),
    slotLabel: cleanRequiredString(data.slotLabel, "Reservation slot label"),
    slotMinutes: parsePositiveInteger(data.slotMinutes, "Reservation slot duration"),
    bufferMinutes: parseNonNegativeInteger(
      data.bufferMinutes,
      "Reservation buffer duration",
    ),
    guests: parsePositiveInteger(data.guests, "Guest count"),
    amount: parseMoney(data.amount, "Reservation amount").toFixed(2),
    currency: parseCurrency(data.currency),
    customerName: cleanOptionalString(data.customerName),
    customerEmail: cleanOptionalString(data.customerEmail),
    customerPhone: cleanOptionalString(data.customerPhone),
    customerNote: cleanOptionalString(data.customerNote),
    image: cleanOptionalString(data.image),
    menuItems: parseCheckoutMenuItems(data.menuItems),
  };
}

export function buildRestaurantReservationCheckoutData(
  input: BuildRestaurantReservationCheckoutDataInput,
): Prisma.InputJsonValue {
  const checkoutData: RestaurantReservationCheckoutData = {
    version: 1,
    restaurantId: input.restaurantId,
    restaurantSlug: input.restaurantSlug,
    restaurantName: input.restaurantName,
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    tableCapacity: input.tableCapacity,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
    slotLabel: input.slotLabel,
    slotMinutes: input.slotMinutes,
    bufferMinutes: input.bufferMinutes,
    guests: input.guests,
    amount: moneyString(input.amount),
    currency: input.currency.toUpperCase(),
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerNote: input.customerNote,
    image: input.image,
    menuItems: input.menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: moneyString(item.price),
      currency: item.currency.toUpperCase(),
      quantity: item.quantity,
      totalPrice: moneyString(item.totalPrice),
      image: item.image,
    })),
  };

  return checkoutData as unknown as Prisma.InputJsonValue;
}

function generateReservationCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RR-${timestamp}-${randomPart}`;
}

function buildMenuNote(menuItems: RestaurantReservationCheckoutMenuItem[]) {
  if (menuItems.length === 0) {
    return "";
  }

  const lines = menuItems.map((item) => {
    return `- ${item.name} × ${item.quantity} (${item.currency} ${item.price} each) = ${item.currency} ${item.totalPrice}`;
  });

  return `Selected menu items:\n${lines.join("\n")}`;
}

function buildCustomerNoteWithMenuItems(
  customerNote: string | null,
  menuItems: RestaurantReservationCheckoutMenuItem[],
) {
  const menuNote = buildMenuNote(menuItems);
  return [customerNote, menuNote].filter(Boolean).join("\n\n") || null;
}

async function getPaymentForFinalization(
  paymentId: string | undefined,
  providerSessionId: string,
) {
  if (paymentId) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
    });
  }

  return prisma.payment.findFirst({
    where: {
      provider: stripePaymentProvider.name,
      providerSessionId,
    },
  });
}

async function getCurrentMenuItems(
  restaurantId: string,
  checkoutItems: RestaurantReservationCheckoutMenuItem[],
) {
  if (checkoutItems.length === 0) {
    return [];
  }

  const currentItems = await prisma.restaurantMenuItem.findMany({
    where: {
      restaurantId,
      id: {
        in: checkoutItems.map((item) => item.id),
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      image: true,
      isActive: true,
      menuType: true,
      validFrom: true,
      validUntil: true,
    },
  });

  if (currentItems.length !== checkoutItems.length) {
    throw new Error(
      "One or more selected menu items are no longer available.",
    );
  }

  const currentMarketplaceDate = getCurrentMarketplaceDate();
  const currentItemMap = new Map(currentItems.map((item) => [item.id, item]));

  return checkoutItems.map((checkoutItem) => {
    const currentItem = currentItemMap.get(checkoutItem.id);

    if (!currentItem) {
      throw new Error(
        "One or more selected menu items are no longer available.",
      );
    }

    if (!currentItem.isActive) {
      throw new Error(`${currentItem.name} is currently unavailable.`);
    }

    if (currentItem.menuType === RestaurantMenuType.COMBO) {
      if (!currentItem.validFrom || !currentItem.validUntil) {
        throw new Error(
          `${currentItem.name} does not have a valid Combo availability period.`,
        );
      }

      if (
        currentMarketplaceDate.getTime() < currentItem.validFrom.getTime() ||
        currentMarketplaceDate.getTime() > currentItem.validUntil.getTime()
      ) {
        throw new Error(
          `${currentItem.name} is no longer available for reservation.`,
        );
      }
    }

    const currentPrice = currentItem.price.toDecimalPlaces(2);
    const currentCurrency = currentItem.currency.toUpperCase();
    const checkoutPrice = new Prisma.Decimal(checkoutItem.price).toDecimalPlaces(2);

    if (!currentPrice.equals(checkoutPrice)) {
      throw new Error(
        `${currentItem.name} price changed before payment was finalized.`,
      );
    }

    if (currentCurrency !== checkoutItem.currency.toUpperCase()) {
      throw new Error(
        `${currentItem.name} currency changed before payment was finalized.`,
      );
    }

    const totalPrice = currentPrice
      .mul(checkoutItem.quantity)
      .toDecimalPlaces(2);

    if (!totalPrice.equals(new Prisma.Decimal(checkoutItem.totalPrice))) {
      throw new Error(
        `${currentItem.name} total changed before payment was finalized.`,
      );
    }

    return {
      id: currentItem.id,
      name: currentItem.name,
      price: currentPrice.toFixed(2),
      currency: currentCurrency,
      quantity: checkoutItem.quantity,
      totalPrice: totalPrice.toFixed(2),
      image: currentItem.image,
    } satisfies RestaurantReservationCheckoutMenuItem;
  });
}

async function notifyReservationCreated(reservationId: string) {
  try {
    const reservation = await prisma.restaurantReservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            vendor: {
              select: {
                userId: true,
              },
            },
          },
        },
        table: {
          select: {
            tableNumber: true,
          },
        },
      },
    });

    if (!reservation) {
      return;
    }

    const metadata = {
      reservationId: reservation.id,
      reservationCode: reservation.reservationCode,
      restaurantId: reservation.restaurantId,
      amount: reservation.amount.toFixed(2),
      currency: reservation.currency,
    };

    await prisma.notification.create({
      data: {
        userId: reservation.restaurant.vendor.userId,
        title: "New Restaurant Reservation",
        message: `${reservation.customerName || "A customer"} reserved table ${reservation.table?.tableNumber || ""} for ${reservation.guests} guest(s).`,
        type: NotificationType.RESTAURANT_RESERVATION_CREATED,
        link: "/vendor/restaurant-reservations",
        metadata,
      },
    });

    if (reservation.customerId) {
      await prisma.notification.create({
        data: {
          userId: reservation.customerId,
          title: "Reservation Created",
          message: `Your reservation at ${reservation.restaurant.name} has been created successfully.`,
          type: NotificationType.RESTAURANT_RESERVATION_CREATED,
          link: "/customer/restaurant-reservations",
          metadata,
        },
      });
    }
  } catch (error) {
    console.error("RESTAURANT_RESERVATION_NOTIFICATION_ERROR", error);
  }
}

const REVERSAL_PROCESSING_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function requiresReservationReversalRecovery(providerStatus: string | null) {
  return Boolean(
    providerStatus?.startsWith("RESERVATION_FINALIZATION_FAILED_") ||
      providerStatus?.startsWith("RESERVATION_FINALIZATION_REFUND_PENDING:"),
  );
}

function isStaleReversalProcessingLock(processedAt: Date | null) {
  if (!processedAt) {
    return false;
  }

  return Date.now() - processedAt.getTime() >= REVERSAL_PROCESSING_LOCK_TIMEOUT_MS;
}

async function refundAfterFinalizationFailure(
  paymentId: string,
  reason: string,
): Promise<RestaurantReservationPaymentFinalizationResult> {
  const reversalStartedAt = new Date();

  const reversalClaim = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      restaurantReservationId: null,
      status: PaymentStatus.PENDING,
      processedAt: null,
    },
    data: {
      processedAt: reversalStartedAt,
      providerStatus: "RESERVATION_FINALIZATION_FAILED_REVERSING",
      failureReason: reason,
    },
  });

  if (reversalClaim.count !== 1) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        restaurantReservationId: true,
        failureReason: true,
      },
    });

    if (
      currentPayment?.status === PaymentStatus.PAID &&
      currentPayment.restaurantReservationId
    ) {
      return {
        state: "FINALIZED",
        paymentId,
        restaurantReservationId: currentPayment.restaurantReservationId,
        message: "Restaurant reservation was finalized successfully.",
      };
    }

    if (currentPayment?.status === PaymentStatus.REFUNDED) {
      return {
        state: "REFUNDED",
        paymentId,
        restaurantReservationId: null,
        message:
          currentPayment.failureReason ||
          "The payment was refunded because the restaurant reservation could not be finalized.",
      };
    }

    return {
      state: "PENDING",
      paymentId,
      restaurantReservationId:
        currentPayment?.restaurantReservationId ?? null,
      message:
        "The restaurant payment is already being finalized or reversed. Please check the payment status again shortly.",
    };
  }

  try {
    const reversal = await requestPaymentReversal(
      stripePaymentProvider,
      paymentId,
      reason,
    );

    if (reversal.outcome === "PENDING") {
      await prisma.payment.updateMany({
        where: {
          id: paymentId,
          restaurantReservationId: null,
          status: PaymentStatus.PENDING,
          processedAt: reversalStartedAt,
        },
        data: {
          processedAt: null,
          providerStatus: `RESERVATION_FINALIZATION_REFUND_PENDING:${reversal.status}`,
          failureReason: reason,
        },
      });

      return {
        state: "PENDING",
        paymentId,
        restaurantReservationId: null,
        message:
          "The payment succeeded, but the restaurant reservation could not be finalized. The refund is still being processed by the payment provider.",
      };
    }

    const refunded = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        restaurantReservationId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        status: PaymentStatus.REFUNDED,
        idempotencyKey: null,
        checkoutKey: null,
        processedAt: new Date(),
        providerStatus: `REFUNDED_AFTER_RESERVATION_FINALIZATION_FAILURE:${reversal.status}`,
        failureReason: reason,
      },
    });

    if (refunded.count !== 1) {
      throw new Error(
        "The refund succeeded, but the local restaurant payment state could not be synchronized.",
      );
    }

    return {
      state: "REFUNDED",
      paymentId,
      restaurantReservationId: null,
      message:
        "The payment succeeded, but the restaurant reservation could not be finalized. The payment was refunded automatically.",
    };
  } catch (reversalError) {
    console.error("RESTAURANT_PAYMENT_REVERSAL_ERROR", reversalError);

    await prisma.payment.updateMany({
      where: {
        id: paymentId,
        restaurantReservationId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        processedAt: null,
        providerStatus: "RESERVATION_FINALIZATION_FAILED_REVERSAL_OR_SYNC_FAILED",
        failureReason: reason,
      },
    });

    throw new Error(
      "The payment was verified, but the restaurant reservation could not be finalized automatically. Please contact support before attempting another payment.",
    );
  }
}

export async function finalizeRestaurantReservationPayment(input: {
  providerSessionId: string;
  paymentId?: string;
  customerId?: string;
}): Promise<RestaurantReservationPaymentFinalizationResult> {
  const providerSessionId = input.providerSessionId.trim();

  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(providerSessionId)) {
    throw new Error("Invalid Stripe checkout session identifier.");
  }

  const payment = await getPaymentForFinalization(
    input.paymentId?.trim() || undefined,
    providerSessionId,
  );

  if (!payment) {
    throw new Error("Restaurant payment record was not found.");
  }

  const paymentCustomerId = payment.customerId;

  if (!paymentCustomerId) {
    throw new Error("Restaurant payment does not have a customer owner.");
  }

  if (input.customerId && paymentCustomerId !== input.customerId) {
    throw new Error("Restaurant payment record was not found.");
  }

  if (payment.purpose !== PaymentPurpose.RESTAURANT_RESERVATION) {
    throw new Error("Payment purpose does not match a restaurant reservation.");
  }

  if (payment.provider !== stripePaymentProvider.name) {
    throw new Error("Payment provider does not match Stripe.");
  }

  if (
    payment.providerSessionId &&
    payment.providerSessionId !== providerSessionId
  ) {
    throw new Error("Stripe checkout session does not match this payment.");
  }

  if (
    payment.status === PaymentStatus.PAID &&
    payment.restaurantReservationId
  ) {
    return {
      state: "FINALIZED",
      paymentId: payment.id,
      restaurantReservationId: payment.restaurantReservationId,
      message: "Restaurant reservation was already finalized successfully.",
    };
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    return {
      state: "REFUNDED",
      paymentId: payment.id,
      restaurantReservationId: null,
      message:
        payment.failureReason ||
        "The payment was refunded because the restaurant reservation could not be finalized.",
    };
  }

  if (payment.status === PaymentStatus.FAILED) {
    return {
      state: "FAILED",
      paymentId: payment.id,
      restaurantReservationId: null,
      message: payment.failureReason || "The Stripe payment failed.",
    };
  }

  if (payment.status === PaymentStatus.CANCELLED) {
    return {
      state: "CANCELLED",
      paymentId: payment.id,
      restaurantReservationId: null,
      message:
        payment.failureReason ||
        "The Stripe checkout session was cancelled or expired.",
    };
  }

  if (
    payment.status === PaymentStatus.PENDING &&
    requiresReservationReversalRecovery(payment.providerStatus)
  ) {
    if (payment.processedAt && !isStaleReversalProcessingLock(payment.processedAt)) {
      return {
        state: "PENDING",
        paymentId: payment.id,
        restaurantReservationId: payment.restaurantReservationId,
        message: "The restaurant payment refund is already being processed. Please check the payment status again shortly.",
      };
    }

    if (payment.processedAt) {
      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          restaurantReservationId: null,
          status: PaymentStatus.PENDING,
          processedAt: payment.processedAt,
          providerStatus: payment.providerStatus,
        },
        data: {
          processedAt: null,
        },
      });
    }

    return refundAfterFinalizationFailure(
      payment.id,
      payment.failureReason ||
        "The restaurant reservation could not be finalized after payment.",
    );
  }

  if (payment.status === PaymentStatus.PENDING && payment.processedAt) {
    return {
      state: "PENDING",
      paymentId: payment.id,
      restaurantReservationId: payment.restaurantReservationId,
      message:
        "The restaurant payment is already being finalized or reversed. Please check the payment status again shortly.",
    };
  }

  const verification = await verifyOnlinePayment(
    stripePaymentProvider,
    payment.id,
    providerSessionId,
  );

  const providerPayment = verification.providerPayment;

  if (providerPayment.outcome === "FAILED") {
    await markPaymentFailed(
      payment.id,
      providerPayment.status,
      "Stripe reported that the restaurant reservation payment failed.",
    );

    return {
      state: "FAILED",
      paymentId: payment.id,
      restaurantReservationId: null,
      message: "The online payment failed. No restaurant reservation was created.",
    };
  }

  if (providerPayment.outcome === "CANCELLED") {
    await markPaymentCancelled(
      payment.id,
      providerPayment.status,
      "Stripe reported that the restaurant reservation checkout session was cancelled or expired.",
    );

    return {
      state: "CANCELLED",
      paymentId: payment.id,
      restaurantReservationId: null,
      message:
        "The online payment was cancelled. No restaurant reservation was created.",
    };
  }

  if (providerPayment.outcome !== "SUCCESS") {
    return {
      state: "PENDING",
      paymentId: payment.id,
      restaurantReservationId: null,
      message: "The online payment is still being processed by Stripe.",
    };
  }

  const providerPaymentId = providerPayment.paymentId;

  if (!providerPaymentId) {
    throw new Error(
      "Stripe did not return a PaymentIntent identifier for the successful restaurant payment.",
    );
  }

  const checkoutData = parseRestaurantReservationCheckoutData(
    payment.checkoutData,
  );
  const checkoutAmount = new Prisma.Decimal(checkoutData.amount).toDecimalPlaces(2);

  if (!checkoutAmount.equals(payment.amount)) {
    throw new Error(
      "Restaurant reservation checkout amount does not match the payment amount.",
    );
  }

  if (checkoutData.currency !== payment.currency.toUpperCase()) {
    throw new Error(
      "Restaurant reservation checkout currency does not match the payment currency.",
    );
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: {
        id: checkoutData.restaurantId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        currency: true,
        priceForTwo: true,
        reservationAutoConfirm: true,
        isTableReservationAvailable: true,
      },
    });

    if (!restaurant) {
      throw new Error("Restaurant was not found.");
    }

    if (restaurant.status !== "ACTIVE") {
      throw new Error("This restaurant is no longer accepting reservations.");
    }

    if (!restaurant.isTableReservationAvailable) {
      throw new Error(
        "Table reservation is currently disabled for this restaurant.",
      );
    }

    const selectedMenuItems = await getCurrentMenuItems(
      restaurant.id,
      checkoutData.menuItems,
    );

    let currentAmount: Prisma.Decimal;
    let currentCurrency: string;

    if (selectedMenuItems.length > 0) {
      const selectedCurrencies = Array.from(
        new Set(selectedMenuItems.map((item) => item.currency.toUpperCase())),
      );

      if (selectedCurrencies.length !== 1) {
        throw new Error(
          "Selected menu items no longer use a single payment currency.",
        );
      }

      currentAmount = selectedMenuItems.reduce(
        (total, item) => total.add(item.totalPrice),
        new Prisma.Decimal(0),
      );
      currentCurrency = selectedCurrencies[0];
    } else {
      if (!restaurant.priceForTwo || restaurant.priceForTwo.lte(0)) {
        throw new Error(
          "The restaurant reservation price is no longer available.",
        );
      }

      currentAmount = restaurant.priceForTwo.toDecimalPlaces(2);
      currentCurrency = restaurant.currency.toUpperCase();
    }

    currentAmount = currentAmount.toDecimalPlaces(2);

    if (!currentAmount.equals(checkoutAmount)) {
      throw new Error(
        "Restaurant reservation price changed before payment was finalized.",
      );
    }

    if (currentCurrency !== checkoutData.currency) {
      throw new Error(
        "Restaurant reservation currency changed before payment was finalized.",
      );
    }

    const availability = await validateRestaurantTableSlotAvailability({
      restaurantId: checkoutData.restaurantId,
      tableId: checkoutData.tableId,
      date: checkoutData.reservationDate,
      startTime: checkoutData.startTime,
      guestCount: checkoutData.guests,
    });

    if (!availability.success || !availability.slot || !availability.table) {
      throw new Error(
        availability.message ||
          "The selected restaurant table and time slot are no longer available.",
      );
    }

    // Preserve the validated non-null slot and table references before entering
    // the transaction callback. TypeScript does not retain property narrowing
    // for mutable object properties across nested async closures.
    const availableSlot = availability.slot;
    const availableTable = availability.table;

    if (availableSlot.endTime !== checkoutData.endTime) {
      throw new Error(
        "Reservation end time changed before payment was finalized.",
      );
    }

    if (availability.slotMinutes !== checkoutData.slotMinutes) {
      throw new Error(
        "Reservation slot duration changed before payment was finalized.",
      );
    }

    if (availability.bufferMinutes !== checkoutData.bufferMinutes) {
      throw new Error(
        "Reservation buffer duration changed before payment was finalized.",
      );
    }

    if (availableTable.capacity !== checkoutData.tableCapacity) {
      throw new Error(
        "Selected table capacity changed before payment was finalized.",
      );
    }

    const databaseDate = toDatabaseDate(checkoutData.reservationDate);
    const finalCustomerNote = buildCustomerNoteWithMenuItems(
      checkoutData.customerNote,
      selectedMenuItems,
    );
    const reservationStatus = restaurant.reservationAutoConfirm
      ? RestaurantReservationStatus.CONFIRMED
      : RestaurantReservationStatus.PENDING;

    const transactionResult = await runSerializableRestaurantTransaction(
      async (tx) => {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          select: {
            id: true,
            status: true,
            restaurantReservationId: true,
            processedAt: true,
            providerSessionId: true,
          },
        });

        if (!currentPayment) {
          throw new Error("Restaurant payment record was not found.");
        }

        if (
          currentPayment.status === PaymentStatus.PAID &&
          currentPayment.restaurantReservationId
        ) {
          return {
            restaurantReservationId:
              currentPayment.restaurantReservationId,
            created: false,
          };
        }

        const claim = await tx.payment.updateMany({
          where: {
            id: currentPayment.id,
            status: PaymentStatus.PENDING,
            processedAt: null,
            restaurantReservationId: null,
            providerSessionId,
          },
          data: {
            processedAt: new Date(),
            providerStatus: `FINALIZING:${providerPayment.status}`,
            failureReason: null,
          },
        });

        if (claim.count !== 1) {
          const concurrentlyFinalizedPayment = await tx.payment.findUnique({
            where: { id: currentPayment.id },
            select: {
              status: true,
              restaurantReservationId: true,
            },
          });

          if (
            concurrentlyFinalizedPayment?.status === PaymentStatus.PAID &&
            concurrentlyFinalizedPayment.restaurantReservationId
          ) {
            return {
              restaurantReservationId:
                concurrentlyFinalizedPayment.restaurantReservationId,
              created: false,
            };
          }

          throw new Error(FINALIZATION_IN_PROGRESS);
        }

        const lockedTables = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "restaurant_tables"
          WHERE "id" = ${availableTable.id}
          FOR UPDATE
        `;

        if (lockedTables.length !== 1) {
          throw new Error(
            "The selected restaurant table is no longer available.",
          );
        }

        const lockedTable = await tx.restaurantTable.findUnique({
          where: { id: availableTable.id },
          select: {
            restaurantId: true,
            capacity: true,
            status: true,
            isReservable: true,
          },
        });

        if (
          !lockedTable ||
          lockedTable.restaurantId !== restaurant.id ||
          lockedTable.status !== RestaurantTableStatus.ACTIVE ||
          !lockedTable.isReservable ||
          lockedTable.capacity < checkoutData.guests ||
          lockedTable.capacity !== checkoutData.tableCapacity
        ) {
          throw new Error(
            "The selected restaurant table is no longer available for this reservation.",
          );
        }

        const selectedStartMinutes = parseTimeToMinutes(availableSlot.startTime);
        const selectedEndMinutes = parseTimeToMinutes(availableSlot.endTime);

        if (selectedStartMinutes === null || selectedEndMinutes === null) {
          throw new Error(
            "The selected restaurant reservation time is invalid.",
          );
        }

        const blockingReservations = await tx.restaurantReservation.findMany({
          where: {
            restaurantId: restaurant.id,
            tableId: availableTable.id,
            reservationDate: databaseDate,
            status: {
              in: [
                RestaurantReservationStatus.PENDING,
                RestaurantReservationStatus.CONFIRMED,
              ],
            },
          },
          select: {
            startTime: true,
            endTime: true,
          },
        });

        const hasBlockingReservation = blockingReservations.some(
          (reservation) => {
            const reservationStartMinutes = parseTimeToMinutes(
              reservation.startTime,
            );
            const reservationEndMinutes = parseTimeToMinutes(
              reservation.endTime,
            );

            if (
              reservationStartMinutes === null ||
              reservationEndMinutes === null
            ) {
              return false;
            }

            return rangesOverlap(
              selectedStartMinutes,
              selectedEndMinutes,
              reservationStartMinutes,
              reservationEndMinutes,
            );
          },
        );

        if (hasBlockingReservation) {
          throw new Error(
            "The selected restaurant table was reserved by another customer before this payment could be finalized.",
          );
        }

        const blockingSlots = await tx.restaurantBlockedSlot.findMany({
          where: {
            restaurantId: restaurant.id,
            date: databaseDate,
            OR: [
              { tableId: null },
              { tableId: availableTable.id },
            ],
          },
          select: {
            startTime: true,
            endTime: true,
          },
        });

        const hasBlockingSlot = blockingSlots.some((blockedSlot) => {
          const blockedStartMinutes = parseTimeToMinutes(blockedSlot.startTime);
          const blockedEndMinutes = parseTimeToMinutes(blockedSlot.endTime);

          if (blockedStartMinutes === null || blockedEndMinutes === null) {
            return false;
          }

          return rangesOverlap(
            selectedStartMinutes,
            selectedEndMinutes,
            blockedStartMinutes,
            blockedEndMinutes,
          );
        });

        if (hasBlockingSlot) {
          throw new Error(
            "The selected restaurant table or time slot was blocked before this payment could be finalized.",
          );
        }

        const createdReservation = await tx.restaurantReservation.create({
          data: {
            reservationCode: generateReservationCode(),
            customerId: paymentCustomerId,
            restaurantId: restaurant.id,
            tableId: availableTable.id,
            reservationDate: databaseDate,
            startTime: availableSlot.startTime,
            endTime: availableSlot.endTime,
            slotMinutes: availability.slotMinutes,
            guests: checkoutData.guests,
            amount: currentAmount,
            currency: currentCurrency,
            status: reservationStatus,
            source: RestaurantReservationSource.CUSTOMER,
            paymentStatus: PaymentStatus.PAID,
            customerName: checkoutData.customerName,
            customerEmail: checkoutData.customerEmail,
            customerPhone: checkoutData.customerPhone,
            customerNote: finalCustomerNote,
            confirmedAt:
              reservationStatus === RestaurantReservationStatus.CONFIRMED
                ? new Date()
                : null,
          },
          select: {
            id: true,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            restaurantReservationId: createdReservation.id,
            status: PaymentStatus.PAID,
            providerPaymentId,
            transactionId: providerPaymentId,
            providerStatus: providerPayment.status,
            processedAt: new Date(),
            failureReason: null,
          },
        });

        return {
          restaurantReservationId: createdReservation.id,
          created: true,
        };
      },
    );

    if (transactionResult.created) {
      await notifyReservationCreated(
        transactionResult.restaurantReservationId,
      );
    }

    return {
      state: "FINALIZED",
      paymentId: payment.id,
      restaurantReservationId:
        transactionResult.restaurantReservationId,
      message: transactionResult.created
        ? "Restaurant reservation was finalized successfully."
        : "Restaurant reservation was already finalized successfully.",
    };
  } catch (error) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: {
        status: true,
        restaurantReservationId: true,
        failureReason: true,
      },
    });

    if (
      currentPayment?.status === PaymentStatus.PAID &&
      currentPayment.restaurantReservationId
    ) {
      return {
        state: "FINALIZED",
        paymentId: payment.id,
        restaurantReservationId: currentPayment.restaurantReservationId,
        message: "Restaurant reservation was finalized successfully.",
      };
    }

    if (error instanceof Error && error.message === FINALIZATION_IN_PROGRESS) {
      return {
        state: "PENDING",
        paymentId: payment.id,
        restaurantReservationId: null,
        message:
          "The restaurant payment is already being finalized. Please check the payment status again shortly.",
      };
    }

    if (currentPayment?.status === PaymentStatus.REFUNDED) {
      return {
        state: "REFUNDED",
        paymentId: payment.id,
        restaurantReservationId: null,
        message:
          currentPayment.failureReason ||
          "The payment was refunded because the restaurant reservation could not be finalized.",
      };
    }

    const reason =
      error instanceof Error
        ? error.message
        : "The restaurant reservation could not be finalized after payment.";

    return refundAfterFinalizationFailure(payment.id, reason);
  }
}