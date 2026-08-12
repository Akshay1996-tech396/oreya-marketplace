import {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { stableSerializeCheckoutData } from "./checkout-data";
import type {
  PaymentProvider,
  PaymentProviderMetadata,
} from "./payment-provider";

export type CreateOnlinePaymentInput = {
  customer: {
    id: string;
    name: string;
    email: string;
    billingCountry?: string | null;
  };
  purpose: PaymentPurpose;
  amount: Prisma.Decimal | number | string;
  currency: string;
  idempotencyKey: string;
  checkoutKey: string;
  checkoutData: Prisma.InputJsonValue;
  reference: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  metadata?: PaymentProviderMetadata;
};

export type OnlinePaymentSessionResult = {
  paymentId: string;
  providerSessionId: string;
  redirectUrl: string | null;
  paymentSession: Record<string, unknown>;
  reused: boolean;
};

export type RegisterWebhookEventInput = {
  provider: string;
  eventId: string;
  eventType: string;
  paymentId?: string | null;
};

function normalizeCurrency(value: string) {
  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("A valid three-letter payment currency is required.");
  }

  return currency;
}

function normalizeIdempotencyKey(value: string) {
  const key = value.trim();

  if (
    key.length < 16 ||
    key.length > 100 ||
    !/^[A-Za-z0-9._-]+$/.test(key)
  ) {
    throw new Error("A valid payment idempotency key is required.");
  }

  return key;
}

function normalizeCheckoutKey(value: string) {
  const key = value.trim();

  if (!key || key.length > 200) {
    throw new Error("A valid checkout key is required.");
  }

  return key;
}

function asJsonObject(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}


function getStoredRedirectUrl(
  sessionData: Record<string, unknown> | null,
) {
  const value = sessionData?.url;
  return typeof value === "string" && value.trim() ? value : null;
}

const SESSION_INITIALIZATION_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const LEGACY_SESSION_CREATING = "SESSION_CREATING";
const LEGACY_SESSION_CREATION_FAILED = "SESSION_CREATION_FAILED";
const PAYMENT_SCOPED_SESSION_CREATING = "SESSION_CREATING_PAYMENT_SCOPED";
const PAYMENT_SCOPED_SESSION_CREATION_FAILED =
  "SESSION_CREATION_FAILED_PAYMENT_SCOPED";

function getProviderSessionIdempotencyKey(
  provider: PaymentProvider,
  paymentId: string,
) {
  return `${provider.name}-session-${paymentId}`;
}

function isSessionInitializationStale(updatedAt: Date) {
  return (
    Date.now() - updatedAt.getTime() >= SESSION_INITIALIZATION_LOCK_TIMEOUT_MS
  );
}

async function releaseStaleSessionInitialization(payment: {
  id: string;
  status: PaymentStatus;
  providerSessionId: string | null;
  providerStatus: string | null;
  updatedAt: Date;
}) {
  if (
    payment.status !== PaymentStatus.PENDING ||
    payment.providerSessionId ||
    !isSessionInitializationStale(payment.updatedAt) ||
    (payment.providerStatus !== LEGACY_SESSION_CREATING &&
      payment.providerStatus !== PAYMENT_SCOPED_SESSION_CREATING)
  ) {
    return false;
  }

  const failedStatus =
    payment.providerStatus === LEGACY_SESSION_CREATING
      ? LEGACY_SESSION_CREATION_FAILED
      : PAYMENT_SCOPED_SESSION_CREATION_FAILED;

  const released = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.PENDING,
      providerSessionId: null,
      providerStatus: payment.providerStatus,
    },
    data: {
      providerStatus: failedStatus,
      failureReason:
        "Payment session initialization was interrupted and will be retried safely.",
    },
  });

  return released.count === 1;
}

async function getReusablePendingSession(
  provider: PaymentProvider,
  payment: {
    id: string;
    providerSessionId: string | null;
    providerSessionData: Prisma.JsonValue | null;
  },
): Promise<OnlinePaymentSessionResult | null> {
  const existingSession = asJsonObject(payment.providerSessionData);

  if (!payment.providerSessionId || !existingSession) {
    return null;
  }

  try {
    const providerPayment = await provider.getPaymentDetails(
      payment.providerSessionId,
    );

    if (providerPayment.outcome === "FAILED") {
      const failed = await markPaymentFailed(
        payment.id,
        providerPayment.status,
        "The existing provider payment session failed before checkout could be resumed.",
      );

      if (failed.count === 1) {
        return null;
      }
    } else if (providerPayment.outcome === "CANCELLED") {
      const cancelled = await markPaymentCancelled(
        payment.id,
        providerPayment.status,
        "The existing provider checkout session was cancelled or expired.",
      );

      if (cancelled.count === 1) {
        return null;
      }
    }
  } catch (error) {
    // A transient provider lookup failure must never create a second payment
    // session. Reusing the stored session is safer than risking a duplicate.
    console.error("PAYMENT_SESSION_RECONCILIATION_ERROR", error);
  }

  return {
    paymentId: payment.id,
    providerSessionId: payment.providerSessionId,
    redirectUrl: getStoredRedirectUrl(existingSession),
    paymentSession: existingSession,
    reused: true,
  };
}

function paymentMatchesCheckout(
  payment: {
    customerId: string | null;
    purpose: PaymentPurpose | null;
    amount: Prisma.Decimal;
    currency: string;
    provider: string | null;
    checkoutData: Prisma.JsonValue | null;
  },
  input: CreateOnlinePaymentInput,
  provider: PaymentProvider,
  amount: Prisma.Decimal,
  currency: string,
) {
  return (
    payment.customerId === input.customer.id &&
    payment.purpose === input.purpose &&
    payment.amount.equals(amount) &&
    payment.currency.toUpperCase() === currency &&
    payment.provider === provider.name &&
    payment.checkoutData !== null &&
    stableSerializeCheckoutData(payment.checkoutData) ===
      stableSerializeCheckoutData(input.checkoutData)
  );
}

export function toMinorCurrencyUnit(
  amount: Prisma.Decimal | number | string,
) {
  const decimalAmount =
    amount instanceof Prisma.Decimal
      ? amount
      : new Prisma.Decimal(amount);

  if (decimalAmount.lte(0)) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const minorAmount = decimalAmount.mul(100).toDecimalPlaces(
    0,
    Prisma.Decimal.ROUND_HALF_UP,
  );

  const value = minorAmount.toNumber();

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Payment amount is outside the supported range.");
  }

  return value;
}

/**
 * Creates or safely reuses a pending online payment attempt, then delegates
 * provider-session creation through the provider-independent interface.
 */
export async function createOnlinePaymentSession(
  provider: PaymentProvider,
  input: CreateOnlinePaymentInput,
): Promise<OnlinePaymentSessionResult> {
  const currency = normalizeCurrency(input.currency);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const checkoutKey = normalizeCheckoutKey(input.checkoutKey);
  const amount =
    input.amount instanceof Prisma.Decimal
      ? input.amount
      : new Prisma.Decimal(input.amount);

  let payment = await prisma.payment.findFirst({
    where: {
      OR: [{ idempotencyKey }, { checkoutKey }],
    },
  });

  if (payment) {
    if (
      !paymentMatchesCheckout(payment, input, provider, amount, currency)
    ) {
      throw new Error(
        "This payment request has already been used for different checkout details.",
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new Error("This checkout has already been paid.");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      const releasedTerminalAttempt = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          orderId: null,
          bookingId: null,
          restaurantReservationId: null,
          status: {
            in: [
              PaymentStatus.FAILED,
              PaymentStatus.CANCELLED,
              PaymentStatus.REFUNDED,
            ],
          },
          OR: [{ idempotencyKey }, { checkoutKey }],
        },
        data: {
          idempotencyKey: null,
          checkoutKey: null,
        },
      });

      if (releasedTerminalAttempt.count !== 1) {
        throw new Error(
          "This payment attempt is no longer active. Please refresh and try again.",
        );
      }

      payment = null;
    }

    if (payment) {
      const reusableSession = await getReusablePendingSession(
        provider,
        payment,
      );

      if (reusableSession) {
        return reusableSession;
      }

      const refreshedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      if (refreshedPayment?.status !== PaymentStatus.PENDING) {
        payment = null;
      }
    }
  }

  if (!payment) {
    try {
      payment = await prisma.payment.create({
        data: {
          customerId: input.customer.id,
          purpose: input.purpose,
          amount,
          currency,
          method: PaymentMethod.CARD,
          status: PaymentStatus.PENDING,
          idempotencyKey,
          checkoutKey,
          provider: provider.name,
          checkoutData: input.checkoutData,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrentPayment = await prisma.payment.findFirst({
          where: {
            OR: [{ idempotencyKey }, { checkoutKey }],
          },
        });

        if (
          concurrentPayment &&
          paymentMatchesCheckout(
            concurrentPayment,
            input,
            provider,
            amount,
            currency,
          )
        ) {
          if (concurrentPayment.status === PaymentStatus.PENDING) {
            const reusableSession = await getReusablePendingSession(
              provider,
              concurrentPayment,
            );

            if (reusableSession) {
              return reusableSession;
            }

            const refreshedConcurrentPayment = await prisma.payment.findUnique({
              where: { id: concurrentPayment.id },
              select: { status: true },
            });

            if (
              refreshedConcurrentPayment &&
              refreshedConcurrentPayment.status !== PaymentStatus.PENDING
            ) {
              return createOnlinePaymentSession(provider, input);
            }
          }
        }

        throw new Error(
          "Another payment attempt is already active for this checkout. Please refresh and try again.",
        );
      }

      throw error;
    }
  }

  const useLegacyProviderIdempotency =
    payment.providerStatus === LEGACY_SESSION_CREATION_FAILED;
  const sessionCreatingStatus = useLegacyProviderIdempotency
    ? LEGACY_SESSION_CREATING
    : PAYMENT_SCOPED_SESSION_CREATING;
  const sessionCreationFailedStatus = useLegacyProviderIdempotency
    ? LEGACY_SESSION_CREATION_FAILED
    : PAYMENT_SCOPED_SESSION_CREATION_FAILED;

  const sessionClaim = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: PaymentStatus.PENDING,
      providerSessionId: null,
      OR: [
        { providerStatus: null },
        { providerStatus: LEGACY_SESSION_CREATION_FAILED },
        { providerStatus: PAYMENT_SCOPED_SESSION_CREATION_FAILED },
      ],
    },
    data: {
      providerStatus: sessionCreatingStatus,
      failureReason: null,
    },
  });

  if (sessionClaim.count !== 1) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    if (currentPayment?.status === PaymentStatus.PENDING) {
      const reusableSession = await getReusablePendingSession(
        provider,
        currentPayment,
      );

      if (reusableSession) {
        return reusableSession;
      }

      const refreshedCurrentPayment = await prisma.payment.findUnique({
        where: { id: currentPayment.id },
        select: { status: true },
      });

      if (
        refreshedCurrentPayment &&
        refreshedCurrentPayment.status !== PaymentStatus.PENDING
      ) {
        return createOnlinePaymentSession(provider, input);
      }

      const staleInitializationReleased =
        await releaseStaleSessionInitialization(currentPayment);

      if (staleInitializationReleased) {
        return createOnlinePaymentSession(provider, input);
      }
    }

    throw new Error(
      "This payment session is already being initialized. Please try again shortly.",
    );
  }

  const providerSessionIdempotencyKey = useLegacyProviderIdempotency
    ? idempotencyKey
    : getProviderSessionIdempotencyKey(provider, payment.id);

  try {
    const providerSession = await provider.createPaymentSession({
      amountMinor: toMinorCurrencyUnit(amount),
      currency,
      reference: input.reference,
      description: input.description,
      customer: input.customer,
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      idempotencyKey: providerSessionIdempotencyKey,
      metadata: {
        marketplace_payment_id: payment.id,
        marketplace_payment_purpose: input.purpose,
        ...(input.metadata ?? {}),
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerSessionId: providerSession.id,
        providerSessionData: providerSession.raw as Prisma.InputJsonValue,
        providerStatus: "SESSION_CREATED",
        failureReason: null,
      },
    });

    return {
      paymentId: payment.id,
      providerSessionId: providerSession.id,
      redirectUrl: providerSession.redirectUrl,
      paymentSession: providerSession.raw,
      reused: false,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment session creation failed.";

    await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.PENDING,
        providerSessionId: null,
      },
      data: {
        providerStatus: sessionCreationFailedStatus,
        failureReason: message,
      },
    });

    throw error;
  }
}

/**
 * Verifies provider-owned payment details against the local payment attempt.
 * This function deliberately does not mark the payment PAID. Marketplace
 * finalization must still succeed before the local payment becomes PAID.
 */
export async function verifyOnlinePayment(
  provider: PaymentProvider,
  paymentId: string,
  providerReferenceId: string,
) {
  const details = await provider.getPaymentDetails(providerReferenceId);
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment record was not found.");
  }

  if (payment.provider !== provider.name) {
    throw new Error(
      "Payment provider does not match the payment attempt.",
    );
  }

  const hasLegacySessionPlaceholder = Boolean(
    payment.providerPaymentId &&
      payment.providerSessionId &&
      payment.providerPaymentId === payment.providerSessionId &&
      /^cs_(test|live)_[A-Za-z0-9]+$/.test(payment.providerPaymentId),
  );

  if (
    payment.providerPaymentId &&
    details.paymentId &&
    payment.providerPaymentId !== details.paymentId &&
    !hasLegacySessionPlaceholder
  ) {
    throw new Error(
      "This marketplace payment is already linked to a different provider payment.",
    );
  }

  if (
    payment.providerSessionId &&
    details.sessionId &&
    payment.providerSessionId !== details.sessionId
  ) {
    throw new Error(
      "Verified payment session does not match the marketplace payment session.",
    );
  }

  if (
    details.amountMinor !== null &&
    details.amountMinor !== toMinorCurrencyUnit(payment.amount)
  ) {
    throw new Error(
      "Verified payment amount does not match the marketplace payment amount.",
    );
  }

  if (
    details.currency !== null &&
    details.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    throw new Error(
      "Verified payment currency does not match the marketplace payment currency.",
    );
  }

  const metadataPaymentId =
    typeof details.metadata.marketplace_payment_id === "string"
      ? details.metadata.marketplace_payment_id
      : null;

  if (metadataPaymentId !== payment.id) {
    throw new Error(
      "Verified payment metadata does not match the marketplace payment.",
    );
  }

  const metadataPurpose =
    typeof details.metadata.marketplace_payment_purpose === "string"
      ? details.metadata.marketplace_payment_purpose
      : null;

  if (payment.purpose && metadataPurpose !== payment.purpose) {
    throw new Error(
      "Verified payment purpose does not match the marketplace payment.",
    );
  }

  const bindingConditions: Prisma.PaymentWhereInput[] = [];

  if (details.sessionId) {
    bindingConditions.push({
      OR: [
        { providerSessionId: null },
        { providerSessionId: details.sessionId },
      ],
    });
  }

  if (details.paymentId) {
    bindingConditions.push({
      OR: [
        { providerPaymentId: null },
        { providerPaymentId: details.paymentId },
        ...(hasLegacySessionPlaceholder && payment.providerPaymentId
          ? [{ providerPaymentId: payment.providerPaymentId }]
          : []),
      ],
    });
  }

  try {
    const updated = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        provider: provider.name,
        ...(bindingConditions.length > 0
          ? { AND: bindingConditions }
          : {}),
      },
      data: {
        ...(details.sessionId
          ? { providerSessionId: details.sessionId }
          : {}),
        ...(details.paymentId
          ? {
              providerPaymentId: details.paymentId,
              transactionId: details.paymentId,
            }
          : {}),
        providerStatus: details.status,
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        "Provider payment identifiers changed while the payment was being verified.",
      );
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "The verified provider session or payment is already linked to another marketplace payment.",
      );
    }

    throw error;
  }

  const updatedPayment = await prisma.payment.findUnique({
    where: { id: payment.id },
  });

  if (!updatedPayment) {
    throw new Error("Payment record was not found after verification.");
  }

  return {
    payment: updatedPayment,
    providerPayment: details,
  };
}

export async function markPaymentFailed(
  paymentId: string,
  providerStatus: string,
  failureReason: string,
) {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      orderId: null,
      bookingId: null,
      restaurantReservationId: null,
      status: PaymentStatus.PENDING,
      processedAt: null,
    },
    data: {
      status: PaymentStatus.FAILED,
      idempotencyKey: null,
      checkoutKey: null,
      providerStatus,
      failureReason,
    },
  });
}

export async function markPaymentCancelled(
  paymentId: string,
  providerStatus: string,
  failureReason: string,
) {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      orderId: null,
      bookingId: null,
      restaurantReservationId: null,
      status: PaymentStatus.PENDING,
      processedAt: null,
    },
    data: {
      status: PaymentStatus.CANCELLED,
      idempotencyKey: null,
      checkoutKey: null,
      providerStatus,
      failureReason,
    },
  });
}

export async function registerPaymentWebhookEvent(
  input: RegisterWebhookEventInput,
) {
  const provider = input.provider.trim();
  const eventId = input.eventId.trim();
  const eventType = input.eventType.trim();

  if (!provider || !eventId || !eventType) {
    throw new Error("Webhook provider, event ID, and event type are required.");
  }

  try {
    const event = await prisma.paymentWebhookEvent.create({
      data: {
        paymentId: input.paymentId ?? null,
        provider,
        eventId,
        eventType,
      },
    });

    return { event, duplicate: false } as const;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const event = await prisma.paymentWebhookEvent.findUnique({
        where: {
          provider_eventId: {
            provider,
            eventId,
          },
        },
      });

      if (!event) {
        throw error;
      }

      return { event, duplicate: true } as const;
    }

    throw error;
  }
}

export async function markPaymentWebhookProcessed(eventId: string) {
  return prisma.paymentWebhookEvent.update({
    where: { id: eventId },
    data: {
      processedAt: new Date(),
      processingError: null,
    },
  });
}

export async function markPaymentWebhookFailed(
  eventId: string,
  errorMessage: string,
) {
  return prisma.paymentWebhookEvent.update({
    where: { id: eventId },
    data: {
      processingError: errorMessage,
    },
  });
}

export async function requestPaymentReversal(
  provider: PaymentProvider,
  paymentId: string,
  reason: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment?.providerPaymentId) {
    throw new Error(
      "A provider payment identifier is required before requesting a reversal.",
    );
  }

  if (payment.provider !== provider.name) {
    throw new Error(
      "Payment provider does not match the payment attempt.",
    );
  }

  const reversal = await provider.reversePayment({
    providerPaymentId: payment.providerPaymentId,
    idempotencyKey: `reverse-${payment.id}`,
    reference: `REV-${payment.id}`.slice(0, 50),
    metadata: {
      marketplace_payment_id: payment.id,
      reason: reason.slice(0, 255),
    },
  });

  if (reversal.outcome === "FAILED") {
    throw new Error(
      `The provider rejected the payment reversal with status ${reversal.status}.`,
    );
  }

  return reversal;
}