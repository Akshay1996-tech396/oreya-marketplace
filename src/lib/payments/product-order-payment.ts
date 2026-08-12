import {
  DeliveryTimePeriod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import {
  markPaymentCancelled,
  markPaymentFailed,
  requestPaymentReversal,
  verifyOnlinePayment,
} from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";

type ProductOrderCheckoutItemInput = {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  quantity: number;
  currency: string;
  variantTitle: string | null;
  variantSku: string | null;
  variantOptions: Prisma.InputJsonValue | null;
  variantImage: string | null;
};

export type BuildProductOrderCheckoutDataInput = {
  cartId: string;
  items: ProductOrderCheckoutItemInput[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  deliveryFullName: string;
  deliveryPhone: string;
  deliveryEmail: string | null;
  deliveryAddress: string;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCountry: string | null;
  deliveryState: string | null;
  deliveryCity: string;
  deliveryArea: string | null;
  deliveryZipCode: string | null;
  deliveryLatitude: Prisma.Decimal | null;
  deliveryLongitude: Prisma.Decimal | null;
  deliveryNote: string | null;
  requestedDeliveryDate: Date | null;
  requestedDeliveryTimePeriod: DeliveryTimePeriod | null;
  deliveryLeadTimeHours: number;
};

type ProductOrderCheckoutItem = {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  title: string;
  price: string;
  quantity: number;
  currency: string;
  variantTitle: string | null;
  variantSku: string | null;
  variantOptions: Prisma.JsonValue | null;
  variantImage: string | null;
};

type ProductOrderCheckoutData = {
  version: 1;
  cartId: string;
  items: ProductOrderCheckoutItem[];
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  deliveryFullName: string;
  deliveryPhone: string;
  deliveryEmail: string | null;
  deliveryAddress: string;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCountry: string | null;
  deliveryState: string | null;
  deliveryCity: string;
  deliveryArea: string | null;
  deliveryZipCode: string | null;
  deliveryLatitude: string | null;
  deliveryLongitude: string | null;
  deliveryNote: string | null;
  requestedDeliveryDate: string | null;
  requestedDeliveryTimePeriod: DeliveryTimePeriod | null;
  deliveryLeadTimeHours: number;
};

export type ProductOrderPaymentFinalizationResult = {
  state: "FINALIZED" | "PENDING" | "FAILED" | "CANCELLED" | "REFUNDED";
  paymentId: string;
  orderId: string | null;
  message: string;
};

function moneyString(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
}

function cleanRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is missing from the product checkout data.`);
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
    throw new Error(`${fieldName} is invalid in the product checkout data.`);
  }

  return parsed;
}

function parseMoney(value: unknown, fieldName: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${fieldName} is invalid in the product checkout data.`);
  }

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new Error(`${fieldName} is invalid in the product checkout data.`);
  }

  return decimal.toDecimalPlaces(2);
}

function parseCurrency(value: unknown) {
  const currency = cleanRequiredString(value, "Currency").toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency is invalid in the product checkout data.");
  }

  return currency;
}

function parseRequestedDeliveryTimePeriod(
  value: unknown,
): DeliveryTimePeriod | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    value === DeliveryTimePeriod.MORNING ||
    value === DeliveryTimePeriod.AFTERNOON ||
    value === DeliveryTimePeriod.EVENING
  ) {
    return value;
  }

  throw new Error(
    "Requested delivery time period is invalid in the product checkout data.",
  );
}

function parseRequestedDeliveryDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      "Requested delivery date is invalid in the product checkout data.",
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Requested delivery date is invalid in the product checkout data.",
    );
  }

  return date;
}

function parseVariantOptions(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function parseProductOrderCheckoutData(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Product checkout data was not found for this payment.");
  }

  const data = value as Record<string, unknown>;

  if (data.version !== 1) {
    throw new Error("Unsupported product checkout data version.");
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Product checkout items were not found for this payment.");
  }

  const items = data.items.map((rawItem, index): ProductOrderCheckoutItem => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new Error(`Product checkout item ${index + 1} is invalid.`);
    }

    const item = rawItem as Record<string, unknown>;
    const variantOptions =
      item.variantOptions &&
      typeof item.variantOptions === "object" &&
      !Array.isArray(item.variantOptions)
        ? (item.variantOptions as Prisma.JsonValue)
        : null;

    return {
      cartItemId: cleanRequiredString(item.cartItemId, "Cart item ID"),
      productId: cleanRequiredString(item.productId, "Product ID"),
      variantId: cleanOptionalString(item.variantId),
      title: cleanRequiredString(item.title, "Product title"),
      price: moneyString(parseMoney(item.price, "Product price")),
      quantity: parsePositiveInteger(item.quantity, "Product quantity"),
      currency: parseCurrency(item.currency),
      variantTitle: cleanOptionalString(item.variantTitle),
      variantSku: cleanOptionalString(item.variantSku),
      variantOptions,
      variantImage: cleanOptionalString(item.variantImage),
    };
  });

  const subtotal = parseMoney(data.subtotal, "Subtotal");
  const shipping = parseMoney(data.shipping, "Shipping");
  const tax = parseMoney(data.tax, "Tax");
  const total = parseMoney(data.total, "Total");

  const itemSubtotal = items.reduce((sum, item) => {
    return sum.plus(
      new Prisma.Decimal(item.price).mul(item.quantity),
    );
  }, new Prisma.Decimal(0));

  if (!itemSubtotal.equals(subtotal)) {
    throw new Error("Product checkout subtotal does not match the checkout items.");
  }

  if (!subtotal.plus(shipping).plus(tax).equals(total)) {
    throw new Error("Product checkout totals are inconsistent.");
  }

  return {
    version: 1 as const,
    cartId: cleanRequiredString(data.cartId, "Cart ID"),
    items,
    subtotal,
    shipping,
    tax,
    total,
    currency: parseCurrency(data.currency),
    deliveryFullName: cleanRequiredString(data.deliveryFullName, "Full name"),
    deliveryPhone: cleanRequiredString(data.deliveryPhone, "Phone number"),
    deliveryEmail: cleanOptionalString(data.deliveryEmail),
    deliveryAddress: cleanRequiredString(data.deliveryAddress, "Delivery address"),
    deliveryAddressLine1: cleanOptionalString(data.deliveryAddressLine1),
    deliveryAddressLine2: cleanOptionalString(data.deliveryAddressLine2),
    deliveryCountry: cleanOptionalString(data.deliveryCountry),
    deliveryState: cleanOptionalString(data.deliveryState),
    deliveryCity: cleanRequiredString(data.deliveryCity, "Delivery city"),
    deliveryArea: cleanOptionalString(data.deliveryArea),
    deliveryZipCode: cleanOptionalString(data.deliveryZipCode),
    deliveryLatitude: cleanOptionalString(data.deliveryLatitude),
    deliveryLongitude: cleanOptionalString(data.deliveryLongitude),
    deliveryNote: cleanOptionalString(data.deliveryNote),
    requestedDeliveryDate: parseRequestedDeliveryDate(data.requestedDeliveryDate),
    requestedDeliveryTimePeriod: parseRequestedDeliveryTimePeriod(
      data.requestedDeliveryTimePeriod,
    ),
    deliveryLeadTimeHours: parsePositiveInteger(
      data.deliveryLeadTimeHours,
      "Delivery lead time",
    ),
  };
}

export function buildProductOrderCheckoutData(
  input: BuildProductOrderCheckoutDataInput,
): Prisma.InputJsonValue {
  const checkoutData: ProductOrderCheckoutData = {
    version: 1,
    cartId: input.cartId,
    items: input.items.map((item) => ({
      cartItemId: item.cartItemId,
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      price: moneyString(item.price),
      quantity: item.quantity,
      currency: item.currency.toUpperCase(),
      variantTitle: item.variantTitle,
      variantSku: item.variantSku,
      variantOptions: (item.variantOptions ?? null) as Prisma.JsonValue | null,
      variantImage: item.variantImage,
    })),
    subtotal: moneyString(input.subtotal),
    shipping: moneyString(input.shipping),
    tax: moneyString(input.tax),
    total: moneyString(input.total),
    currency: input.currency.toUpperCase(),
    deliveryFullName: input.deliveryFullName,
    deliveryPhone: input.deliveryPhone,
    deliveryEmail: input.deliveryEmail,
    deliveryAddress: input.deliveryAddress,
    deliveryAddressLine1: input.deliveryAddressLine1,
    deliveryAddressLine2: input.deliveryAddressLine2,
    deliveryCountry: input.deliveryCountry,
    deliveryState: input.deliveryState,
    deliveryCity: input.deliveryCity,
    deliveryArea: input.deliveryArea,
    deliveryZipCode: input.deliveryZipCode,
    deliveryLatitude: input.deliveryLatitude?.toString() ?? null,
    deliveryLongitude: input.deliveryLongitude?.toString() ?? null,
    deliveryNote: input.deliveryNote,
    requestedDeliveryDate: input.requestedDeliveryDate?.toISOString() ?? null,
    requestedDeliveryTimePeriod: input.requestedDeliveryTimePeriod,
    deliveryLeadTimeHours: input.deliveryLeadTimeHours,
  };

  return checkoutData as unknown as Prisma.InputJsonValue;
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

const REVERSAL_PROCESSING_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function requiresOrderReversalRecovery(providerStatus: string | null) {
  return Boolean(
    providerStatus?.startsWith("ORDER_FINALIZATION_FAILED_") ||
      providerStatus?.startsWith("ORDER_FINALIZATION_REFUND_PENDING:"),
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
): Promise<ProductOrderPaymentFinalizationResult> {
  const reversalStartedAt = new Date();

  const reversalClaim = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      orderId: null,
      status: PaymentStatus.PENDING,
      processedAt: null,
    },
    data: {
      processedAt: reversalStartedAt,
      providerStatus: "ORDER_FINALIZATION_FAILED_REVERSING",
      failureReason: reason,
    },
  });

  if (reversalClaim.count !== 1) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        orderId: true,
        failureReason: true,
      },
    });

    if (currentPayment?.status === PaymentStatus.PAID && currentPayment.orderId) {
      return {
        state: "FINALIZED",
        paymentId,
        orderId: currentPayment.orderId,
        message: "Product order was finalized successfully.",
      };
    }

    if (currentPayment?.status === PaymentStatus.REFUNDED) {
      return {
        state: "REFUNDED",
        paymentId,
        orderId: null,
        message:
          currentPayment.failureReason ||
          "The payment was refunded because the order could not be finalized.",
      };
    }

    return {
      state: "PENDING",
      paymentId,
      orderId: currentPayment?.orderId ?? null,
      message:
        "The product payment is already being finalized or reversed. Please check the payment status again shortly.",
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
          orderId: null,
          status: PaymentStatus.PENDING,
          processedAt: reversalStartedAt,
        },
        data: {
          processedAt: null,
          providerStatus: `ORDER_FINALIZATION_REFUND_PENDING:${reversal.status}`,
          failureReason: reason,
        },
      });

      return {
        state: "PENDING",
        paymentId,
        orderId: null,
        message:
          "The payment succeeded, but the order could not be finalized. The refund is still being processed by the payment provider.",
      };
    }

    const refunded = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        orderId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        status: PaymentStatus.REFUNDED,
        idempotencyKey: null,
        checkoutKey: null,
        processedAt: new Date(),
        providerStatus: `REFUNDED_AFTER_ORDER_FINALIZATION_FAILURE:${reversal.status}`,
        failureReason: reason,
      },
    });

    if (refunded.count !== 1) {
      throw new Error(
        "The refund succeeded, but the local payment state could not be synchronized.",
      );
    }

    return {
      state: "REFUNDED",
      paymentId,
      orderId: null,
      message:
        "The payment succeeded, but the order could not be finalized. The payment was refunded automatically.",
    };
  } catch (reversalError) {
    console.error("PRODUCT_PAYMENT_REVERSAL_ERROR", reversalError);

    await prisma.payment.updateMany({
      where: {
        id: paymentId,
        orderId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        processedAt: null,
        providerStatus: "ORDER_FINALIZATION_FAILED_REVERSAL_OR_SYNC_FAILED",
        failureReason: reason,
      },
    });

    throw new Error(
      "The payment was verified, but the order could not be finalized automatically. Please contact support before attempting another payment.",
    );
  }
}

export async function finalizeProductOrderPayment(input: {
  providerSessionId: string;
  paymentId?: string;
  customerId?: string;
}): Promise<ProductOrderPaymentFinalizationResult> {
  const providerSessionId = input.providerSessionId.trim();

  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(providerSessionId)) {
    throw new Error("Invalid Stripe checkout session identifier.");
  }

  const payment = await getPaymentForFinalization(
    input.paymentId?.trim() || undefined,
    providerSessionId,
  );

  if (!payment) {
    throw new Error("Product payment record was not found.");
  }

  const paymentCustomerId = payment.customerId;

  if (!paymentCustomerId) {
    throw new Error("Product payment does not have a customer owner.");
  }

  if (input.customerId && paymentCustomerId !== input.customerId) {
    throw new Error("Product payment record was not found.");
  }

  if (payment.purpose !== PaymentPurpose.PRODUCT_ORDER) {
    throw new Error("Payment purpose does not match a product order.");
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

  if (payment.status === PaymentStatus.PAID && payment.orderId) {
    return {
      state: "FINALIZED",
      paymentId: payment.id,
      orderId: payment.orderId,
      message: "Product order was already finalized successfully.",
    };
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    return {
      state: "REFUNDED",
      paymentId: payment.id,
      orderId: null,
      message:
        payment.failureReason ||
        "The payment was refunded because the order could not be finalized.",
    };
  }

  if (payment.status === PaymentStatus.FAILED) {
    return {
      state: "FAILED",
      paymentId: payment.id,
      orderId: null,
      message: payment.failureReason || "The Stripe payment failed.",
    };
  }

  if (payment.status === PaymentStatus.CANCELLED) {
    return {
      state: "CANCELLED",
      paymentId: payment.id,
      orderId: null,
      message:
        payment.failureReason ||
        "The Stripe checkout session was cancelled or expired.",
    };
  }

  if (
    payment.status === PaymentStatus.PENDING &&
    requiresOrderReversalRecovery(payment.providerStatus)
  ) {
    if (payment.processedAt && !isStaleReversalProcessingLock(payment.processedAt)) {
      return {
        state: "PENDING",
        paymentId: payment.id,
        orderId: payment.orderId,
        message: "The product payment refund is already being processed. Please check the payment status again shortly.",
      };
    }

    if (payment.processedAt) {
      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          orderId: null,
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
        "The product order could not be finalized after payment.",
    );
  }

  if (payment.status === PaymentStatus.PENDING && payment.processedAt) {
    return {
      state: "PENDING",
      paymentId: payment.id,
      orderId: payment.orderId,
      message:
        "The product payment is already being finalized or reversed. Please check the payment status again shortly.",
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
      "Stripe reported that the product payment failed.",
    );

    return {
      state: "FAILED",
      paymentId: payment.id,
      orderId: null,
      message: "The online payment failed. No order was created.",
    };
  }

  if (providerPayment.outcome === "CANCELLED") {
    await markPaymentCancelled(
      payment.id,
      providerPayment.status,
      "Stripe reported that the product checkout session was cancelled or expired.",
    );

    return {
      state: "CANCELLED",
      paymentId: payment.id,
      orderId: null,
      message: "The online payment was cancelled. No order was created.",
    };
  }

  if (providerPayment.outcome !== "SUCCESS") {
    return {
      state: "PENDING",
      paymentId: payment.id,
      orderId: null,
      message: "The online payment is still being processed by Stripe.",
    };
  }

  const providerPaymentId = providerPayment.paymentId;

  if (!providerPaymentId) {
    throw new Error(
      "Stripe did not return a PaymentIntent identifier for the successful product payment.",
    );
  }

  const checkoutData = parseProductOrderCheckoutData(payment.checkoutData);

  if (!checkoutData.total.equals(payment.amount)) {
    throw new Error("Product checkout total does not match the payment amount.");
  }

  if (checkoutData.currency !== payment.currency.toUpperCase()) {
    throw new Error("Product checkout currency does not match the payment currency.");
  }

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        select: {
          id: true,
          status: true,
          orderId: true,
          processedAt: true,
          providerSessionId: true,
        },
      });

      if (!currentPayment) {
        throw new Error("Product payment record was not found.");
      }

      if (currentPayment.status === PaymentStatus.PAID && currentPayment.orderId) {
        return currentPayment.orderId;
      }

      const finalizationStartedAt = new Date();

      const claim = await tx.payment.updateMany({
        where: {
          id: currentPayment.id,
          status: PaymentStatus.PENDING,
          processedAt: null,
          orderId: null,
          providerSessionId,
        },
        data: {
          processedAt: finalizationStartedAt,
          providerStatus: `FINALIZING:${providerPayment.status}`,
          failureReason: null,
        },
      });

      if (claim.count !== 1) {
        const concurrentlyFinalizedPayment = await tx.payment.findUnique({
          where: { id: currentPayment.id },
          select: {
            status: true,
            orderId: true,
          },
        });

        if (
          concurrentlyFinalizedPayment?.status === PaymentStatus.PAID &&
          concurrentlyFinalizedPayment.orderId
        ) {
          return concurrentlyFinalizedPayment.orderId;
        }

        throw new Error(
          "This product payment is already being finalized. Please try again shortly.",
        );
      }

      for (const item of checkoutData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            stock: true,
            status: true,
            vendor: {
              select: {
                status: true,
              },
            },
            variants: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          },
        });

        if (!product || product.status !== "ACTIVE") {
          throw new Error(`${item.title} is no longer available.`);
        }

        if (product.vendor && product.vendor.status !== "APPROVED") {
          throw new Error(`${item.title} is no longer available from this vendor.`);
        }

        if (
          product.variants.length > 0 &&
          !item.variantId
        ) {
          throw new Error(
            `${item.title} now requires a product variation selection.`,
          );
        }

        let currentPrice = product.price;
        let currentCurrency = product.currency.toUpperCase();

        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: {
              id: true,
              productId: true,
              price: true,
              currency: true,
              stock: true,
              isActive: true,
            },
          });

          if (
            !variant ||
            variant.productId !== product.id ||
            !variant.isActive ||
            variant.stock < item.quantity
          ) {
            throw new Error(`${item.title} is no longer available in the requested quantity.`);
          }

          currentPrice = variant.price;
          currentCurrency = variant.currency.toUpperCase();
        }

        if (!currentPrice.equals(new Prisma.Decimal(item.price))) {
          throw new Error(`${item.title} price changed before the payment was finalized.`);
        }

        if (currentCurrency !== item.currency) {
          throw new Error(`${item.title} currency changed before the payment was finalized.`);
        }

        const productStockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            status: "ACTIVE",
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (productStockUpdate.count !== 1) {
          throw new Error(`${item.title} is no longer available in the requested quantity.`);
        }

        if (item.variantId) {
          const variantStockUpdate = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              productId: item.productId,
              isActive: true,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (variantStockUpdate.count !== 1) {
            throw new Error(`${item.title} is no longer available in the requested quantity.`);
          }
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          customerId: paymentCustomerId,
          subtotal: checkoutData.subtotal,
          shipping: checkoutData.shipping,
          tax: checkoutData.tax,
          total: checkoutData.total,
          currency: checkoutData.currency,
          status: "PROCESSING",
          paymentStatus: PaymentStatus.PAID,
          deliveryFullName: checkoutData.deliveryFullName,
          deliveryPhone: checkoutData.deliveryPhone,
          deliveryEmail: checkoutData.deliveryEmail,
          deliveryAddress: checkoutData.deliveryAddress,
          deliveryAddressLine1: checkoutData.deliveryAddressLine1,
          deliveryAddressLine2: checkoutData.deliveryAddressLine2,
          deliveryCountry: checkoutData.deliveryCountry,
          deliveryState: checkoutData.deliveryState,
          deliveryCity: checkoutData.deliveryCity,
          deliveryArea: checkoutData.deliveryArea,
          deliveryZipCode: checkoutData.deliveryZipCode,
          deliveryLatitude: checkoutData.deliveryLatitude
            ? new Prisma.Decimal(checkoutData.deliveryLatitude)
            : null,
          deliveryLongitude: checkoutData.deliveryLongitude
            ? new Prisma.Decimal(checkoutData.deliveryLongitude)
            : null,
          deliveryNote: checkoutData.deliveryNote,
          requestedDeliveryDate: checkoutData.requestedDeliveryDate,
          requestedDeliveryTimePeriod: checkoutData.requestedDeliveryTimePeriod,
          deliveryLeadTimeHours: checkoutData.deliveryLeadTimeHours,
          items: {
            create: checkoutData.items.map((item) => ({
              productId: item.productId,
              serviceId: null,
              title: item.title,
              price: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              currency: item.currency,
              variantId: item.variantId,
              variantTitle: item.variantTitle,
              variantSku: item.variantSku,
              variantImage: item.variantImage,
              ...(parseVariantOptions(item.variantOptions)
                ? {
                    variantOptions: parseVariantOptions(item.variantOptions),
                  }
                : {}),
            })),
          },
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          orderId: createdOrder.id,
          status: PaymentStatus.PAID,
          providerPaymentId,
          transactionId: providerPaymentId,
          providerStatus: providerPayment.status,
          processedAt: new Date(),
          failureReason: null,
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cartId: checkoutData.cartId,
          id: {
            in: checkoutData.items.map((item) => item.cartItemId),
          },
        },
      });

      const productIds = [...new Set(checkoutData.items.map((item) => item.productId))];
      const variantIds = [
        ...new Set(
          checkoutData.items
            .map((item) => item.variantId)
            .filter((variantId): variantId is string => Boolean(variantId)),
        ),
      ];

      for (const productId of productIds) {
        const currentProduct = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true },
        });

        if (currentProduct && currentProduct.stock <= 0) {
          await tx.product.update({
            where: { id: productId },
            data: { status: "OUT_OF_STOCK" },
          });
        }
      }

      for (const variantId of variantIds) {
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { stock: true },
        });

        if (currentVariant && currentVariant.stock <= 0) {
          await tx.productVariant.update({
            where: { id: variantId },
            data: { isActive: false },
          });
        }
      }

      return createdOrder.id;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return {
      state: "FINALIZED",
      paymentId: payment.id,
      orderId,
      message: "Product order was finalized successfully.",
    };
  } catch (error) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: {
        status: true,
        orderId: true,
      },
    });

    if (currentPayment?.status === PaymentStatus.PAID && currentPayment.orderId) {
      return {
        state: "FINALIZED",
        paymentId: payment.id,
        orderId: currentPayment.orderId,
        message: "Product order was finalized successfully.",
      };
    }

    const reason =
      error instanceof Error
        ? error.message
        : "The product order could not be finalized after payment.";

    return refundAfterFinalizationFailure(payment.id, reason);
  }
}