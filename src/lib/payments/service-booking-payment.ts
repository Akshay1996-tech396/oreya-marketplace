import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { createNotification } from "@/lib/notifications";
import {
  markPaymentCancelled,
  markPaymentFailed,
  requestPaymentReversal,
  verifyOnlinePayment,
} from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";

export type BuildServiceBookingCheckoutDataInput = {
  serviceId: string;
  serviceTitle: string;
  vendorId: string | null;
  slotId: string;
  slotVendorId: string | null;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  amount: Prisma.Decimal | number | string;
  currency: string;
  customerNote: string | null;
};

type ServiceBookingCheckoutData = {
  version: 1;
  serviceId: string;
  serviceTitle: string;
  vendorId: string | null;
  slotId: string;
  slotVendorId: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  amount: string;
  currency: string;
  customerNote: string | null;
};

export type ServiceBookingPaymentFinalizationResult = {
  state: "FINALIZED" | "PENDING" | "FAILED" | "CANCELLED" | "REFUNDED";
  paymentId: string;
  bookingId: string | null;
  message: string;
};

const FINALIZATION_IN_PROGRESS = "SERVICE_PAYMENT_FINALIZATION_IN_PROGRESS";

function moneyString(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
}

function cleanRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is missing from the service checkout data.`);
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

function parseMoney(value: unknown, fieldName: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${fieldName} is invalid in the service checkout data.`);
  }

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite() || decimal.lte(0)) {
    throw new Error(`${fieldName} is invalid in the service checkout data.`);
  }

  return decimal.toDecimalPlaces(2);
}

function parseCurrency(value: unknown) {
  const currency = cleanRequiredString(value, "Currency").toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency is invalid in the service checkout data.");
  }

  return currency;
}

function parseDate(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is invalid in the service checkout data.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid in the service checkout data.`);
  }

  return parsed;
}

function parseNullableInteger(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is invalid in the service checkout data.`);
  }

  return parsed;
}

function getTodayDateOnly() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function parseServiceBookingCheckoutData(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Service checkout data was not found for this payment.");
  }

  const data = value as Record<string, unknown>;

  if (data.version !== 1) {
    throw new Error("Unsupported service checkout data version.");
  }

  return {
    version: 1 as const,
    serviceId: cleanRequiredString(data.serviceId, "Service ID"),
    serviceTitle: cleanRequiredString(data.serviceTitle, "Service title"),
    vendorId: cleanOptionalString(data.vendorId),
    slotId: cleanRequiredString(data.slotId, "Appointment slot ID"),
    slotVendorId: cleanOptionalString(data.slotVendorId),
    bookingDate: parseDate(data.bookingDate, "Appointment date"),
    startTime: cleanRequiredString(data.startTime, "Appointment start time"),
    endTime: cleanRequiredString(data.endTime, "Appointment end time"),
    durationMinutes: parseNullableInteger(
      data.durationMinutes,
      "Appointment duration",
    ),
    amount: parseMoney(data.amount, "Service amount"),
    currency: parseCurrency(data.currency),
    customerNote: cleanOptionalString(data.customerNote),
  };
}

export function buildServiceBookingCheckoutData(
  input: BuildServiceBookingCheckoutDataInput,
): Prisma.InputJsonValue {
  const checkoutData: ServiceBookingCheckoutData = {
    version: 1,
    serviceId: input.serviceId,
    serviceTitle: input.serviceTitle,
    vendorId: input.vendorId,
    slotId: input.slotId,
    slotVendorId: input.slotVendorId,
    bookingDate: input.bookingDate.toISOString(),
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    amount: moneyString(input.amount),
    currency: input.currency.toUpperCase(),
    customerNote: input.customerNote,
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

async function notifyBookingCreated(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            userId: true,
            businessName: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!booking) {
      return;
    }

    if (booking.vendor?.userId) {
      await createNotification({
        userId: booking.vendor.userId,
        title: "New Booking Request",
        message: `${booking.customer.name} booked an appointment for ${booking.service.title}.`,
        type: "BOOKING_CREATED",
        link: "/vendor",
        metadata: {
          bookingId: booking.id,
          customerId: booking.customerId,
          customerName: booking.customer.name,
          vendorId: booking.vendorId,
          vendorName: booking.vendor.businessName,
          serviceId: booking.serviceId,
          serviceTitle: booking.service.title,
          bookingDate: booking.bookingDate.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          amount: Number(booking.amount),
          currency: booking.currency,
          ownerType: "VENDOR",
        },
      });

      return;
    }

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          title: "New Admin Service Booking",
          message: `${booking.customer.name} booked an appointment for admin-owned service ${booking.service.title}.`,
          type: "BOOKING_CREATED",
          link: `/admin/appointments/${booking.id}`,
          metadata: {
            bookingId: booking.id,
            customerId: booking.customerId,
            customerName: booking.customer.name,
            vendorId: null,
            vendorName: null,
            serviceId: booking.serviceId,
            serviceTitle: booking.service.title,
            bookingDate: booking.bookingDate.toISOString(),
            startTime: booking.startTime,
            endTime: booking.endTime,
            amount: Number(booking.amount),
            currency: booking.currency,
            ownerType: "ADMIN",
          },
        }),
      ),
    );
  } catch (error) {
    console.error("SERVICE_BOOKING_NOTIFICATION_ERROR", error);
  }
}

const REVERSAL_PROCESSING_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function requiresBookingReversalRecovery(providerStatus: string | null) {
  return Boolean(
    providerStatus?.startsWith("BOOKING_FINALIZATION_FAILED_") ||
      providerStatus?.startsWith("BOOKING_FINALIZATION_REFUND_PENDING:"),
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
): Promise<ServiceBookingPaymentFinalizationResult> {
  const reversalStartedAt = new Date();

  const reversalClaim = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      bookingId: null,
      status: PaymentStatus.PENDING,
      processedAt: null,
    },
    data: {
      processedAt: reversalStartedAt,
      providerStatus: "BOOKING_FINALIZATION_FAILED_REVERSING",
      failureReason: reason,
    },
  });

  if (reversalClaim.count !== 1) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        bookingId: true,
        failureReason: true,
      },
    });

    if (currentPayment?.status === PaymentStatus.PAID && currentPayment.bookingId) {
      return {
        state: "FINALIZED",
        paymentId,
        bookingId: currentPayment.bookingId,
        message: "Service booking was finalized successfully.",
      };
    }

    if (currentPayment?.status === PaymentStatus.REFUNDED) {
      return {
        state: "REFUNDED",
        paymentId,
        bookingId: null,
        message:
          currentPayment.failureReason ||
          "The payment was refunded because the appointment could not be finalized.",
      };
    }

    return {
      state: "PENDING",
      paymentId,
      bookingId: currentPayment?.bookingId ?? null,
      message:
        "The service payment is already being finalized or reversed. Please check the payment status again shortly.",
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
          bookingId: null,
          status: PaymentStatus.PENDING,
          processedAt: reversalStartedAt,
        },
        data: {
          processedAt: null,
          providerStatus: `BOOKING_FINALIZATION_REFUND_PENDING:${reversal.status}`,
          failureReason: reason,
        },
      });

      return {
        state: "PENDING",
        paymentId,
        bookingId: null,
        message:
          "The payment succeeded, but the appointment could not be finalized. The refund is still being processed by the payment provider.",
      };
    }

    const refunded = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        bookingId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        status: PaymentStatus.REFUNDED,
        idempotencyKey: null,
        checkoutKey: null,
        processedAt: new Date(),
        providerStatus: `REFUNDED_AFTER_BOOKING_FINALIZATION_FAILURE:${reversal.status}`,
        failureReason: reason,
      },
    });

    if (refunded.count !== 1) {
      throw new Error(
        "The refund succeeded, but the local service payment state could not be synchronized.",
      );
    }

    return {
      state: "REFUNDED",
      paymentId,
      bookingId: null,
      message:
        "The payment succeeded, but the appointment could not be finalized. The payment was refunded automatically.",
    };
  } catch (reversalError) {
    console.error("SERVICE_PAYMENT_REVERSAL_ERROR", reversalError);

    await prisma.payment.updateMany({
      where: {
        id: paymentId,
        bookingId: null,
        status: PaymentStatus.PENDING,
        processedAt: reversalStartedAt,
      },
      data: {
        processedAt: null,
        providerStatus: "BOOKING_FINALIZATION_FAILED_REVERSAL_OR_SYNC_FAILED",
        failureReason: reason,
      },
    });

    throw new Error(
      "The payment was verified, but the appointment could not be finalized automatically. Please contact support before attempting another payment.",
    );
  }
}

export async function finalizeServiceBookingPayment(input: {
  providerSessionId: string;
  paymentId?: string;
  customerId?: string;
}): Promise<ServiceBookingPaymentFinalizationResult> {
  const providerSessionId = input.providerSessionId.trim();

  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(providerSessionId)) {
    throw new Error("Invalid Stripe checkout session identifier.");
  }

  const payment = await getPaymentForFinalization(
    input.paymentId?.trim() || undefined,
    providerSessionId,
  );

  if (!payment) {
    throw new Error("Service payment record was not found.");
  }

  const paymentCustomerId = payment.customerId;

  if (!paymentCustomerId) {
    throw new Error("Service payment does not have a customer owner.");
  }

  if (input.customerId && paymentCustomerId !== input.customerId) {
    throw new Error("Service payment record was not found.");
  }

  if (payment.purpose !== PaymentPurpose.SERVICE_BOOKING) {
    throw new Error("Payment purpose does not match a service booking.");
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

  if (payment.status === PaymentStatus.PAID && payment.bookingId) {
    return {
      state: "FINALIZED",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      message: "Service booking was already finalized successfully.",
    };
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    return {
      state: "REFUNDED",
      paymentId: payment.id,
      bookingId: null,
      message:
        payment.failureReason ||
        "The payment was refunded because the appointment could not be finalized.",
    };
  }

  if (payment.status === PaymentStatus.FAILED) {
    return {
      state: "FAILED",
      paymentId: payment.id,
      bookingId: null,
      message: payment.failureReason || "The Stripe payment failed.",
    };
  }

  if (payment.status === PaymentStatus.CANCELLED) {
    return {
      state: "CANCELLED",
      paymentId: payment.id,
      bookingId: null,
      message:
        payment.failureReason ||
        "The Stripe checkout session was cancelled or expired.",
    };
  }

  if (
    payment.status === PaymentStatus.PENDING &&
    requiresBookingReversalRecovery(payment.providerStatus)
  ) {
    if (payment.processedAt && !isStaleReversalProcessingLock(payment.processedAt)) {
      return {
        state: "PENDING",
        paymentId: payment.id,
        bookingId: payment.bookingId,
        message: "The service payment refund is already being processed. Please check the payment status again shortly.",
      };
    }

    if (payment.processedAt) {
      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          bookingId: null,
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
        "The service booking could not be finalized after payment.",
    );
  }

  if (payment.status === PaymentStatus.PENDING && payment.processedAt) {
    return {
      state: "PENDING",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      message:
        "The service payment is already being finalized or reversed. Please check the payment status again shortly.",
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
      "Stripe reported that the service payment failed.",
    );

    return {
      state: "FAILED",
      paymentId: payment.id,
      bookingId: null,
      message: "The online payment failed. No appointment was created.",
    };
  }

  if (providerPayment.outcome === "CANCELLED") {
    await markPaymentCancelled(
      payment.id,
      providerPayment.status,
      "Stripe reported that the service checkout session was cancelled or expired.",
    );

    return {
      state: "CANCELLED",
      paymentId: payment.id,
      bookingId: null,
      message: "The online payment was cancelled. No appointment was created.",
    };
  }

  if (providerPayment.outcome !== "SUCCESS") {
    return {
      state: "PENDING",
      paymentId: payment.id,
      bookingId: null,
      message: "The online payment is still being processed by Stripe.",
    };
  }

  const providerPaymentId = providerPayment.paymentId;

  if (!providerPaymentId) {
    throw new Error(
      "Stripe did not return a PaymentIntent identifier for the successful service payment.",
    );
  }

  const checkoutData = parseServiceBookingCheckoutData(payment.checkoutData);

  if (!checkoutData.amount.equals(payment.amount)) {
    throw new Error("Service checkout amount does not match the payment amount.");
  }

  if (checkoutData.currency !== payment.currency.toUpperCase()) {
    throw new Error("Service checkout currency does not match the payment currency.");
  }

  let createdBookingId: string | null = null;

  try {
    const transactionResult = await prisma.$transaction(
      async (tx) => {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          select: {
            id: true,
            status: true,
            bookingId: true,
            processedAt: true,
            providerSessionId: true,
          },
        });

        if (!currentPayment) {
          throw new Error("Service payment record was not found.");
        }

        if (
          currentPayment.status === PaymentStatus.PAID &&
          currentPayment.bookingId
        ) {
          return {
            bookingId: currentPayment.bookingId,
            created: false,
          };
        }

        const finalizationStartedAt = new Date();

        const claim = await tx.payment.updateMany({
          where: {
            id: currentPayment.id,
            status: PaymentStatus.PENDING,
            processedAt: null,
            bookingId: null,
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
              bookingId: true,
            },
          });

          if (
            concurrentlyFinalizedPayment?.status === PaymentStatus.PAID &&
            concurrentlyFinalizedPayment.bookingId
          ) {
            return {
              bookingId: concurrentlyFinalizedPayment.bookingId,
              created: false,
            };
          }

          throw new Error(FINALIZATION_IN_PROGRESS);
        }

        const slot = await tx.appointmentSlot.findFirst({
          where: {
            id: checkoutData.slotId,
            serviceId: checkoutData.serviceId,
          },
          include: {
            service: {
              include: {
                vendor: true,
              },
            },
          },
        });

        if (!slot) {
          throw new Error("Selected appointment slot was not found.");
        }

        if (!slot.isActive) {
          throw new Error("Selected appointment slot is no longer active.");
        }

        if (slot.service.status !== "ACTIVE") {
          throw new Error("This service is no longer active.");
        }

        if (slot.service.vendorId) {
          if (!slot.service.vendor) {
            throw new Error("Service vendor was not found.");
          }

          if (slot.service.vendor.status !== "APPROVED") {
            throw new Error(
              "This vendor is no longer approved for appointment bookings.",
            );
          }
        }

        if ((slot.vendorId || null) !== (slot.service.vendorId || null)) {
          throw new Error(
            "Selected slot owner does not match the selected service owner.",
          );
        }

        if ((slot.service.vendorId || null) !== checkoutData.vendorId) {
          throw new Error("Service ownership changed before payment was finalized.");
        }

        if ((slot.vendorId || null) !== checkoutData.slotVendorId) {
          throw new Error("Appointment slot ownership changed before payment was finalized.");
        }

        if (slot.date < getTodayDateOnly()) {
          throw new Error("The selected appointment date has already passed.");
        }

        if (slot.date.getTime() !== checkoutData.bookingDate.getTime()) {
          throw new Error("Appointment date changed before payment was finalized.");
        }

        if (
          slot.startTime !== checkoutData.startTime ||
          slot.endTime !== checkoutData.endTime
        ) {
          throw new Error("Appointment time changed before payment was finalized.");
        }

        const currentDuration =
          slot.durationMinutes ?? slot.service.duration ?? null;

        if (currentDuration !== checkoutData.durationMinutes) {
          throw new Error("Appointment duration changed before payment was finalized.");
        }

        const currentAmount = slot.service.price.toDecimalPlaces(2);
        const currentCurrency = slot.service.currency.toUpperCase();

        if (!currentAmount.equals(checkoutData.amount)) {
          throw new Error("Service price changed before payment was finalized.");
        }

        if (currentCurrency !== checkoutData.currency) {
          throw new Error("Service currency changed before payment was finalized.");
        }

        const updatedSlot = await tx.appointmentSlot.updateMany({
          where: {
            id: slot.id,
            isActive: true,
            bookedCount: {
              lt: slot.capacity,
            },
          },
          data: {
            bookedCount: {
              increment: 1,
            },
          },
        });

        if (updatedSlot.count !== 1) {
          throw new Error("Selected appointment slot is now fully booked.");
        }

        const existingBooking = await tx.booking.findFirst({
          where: {
            customerId: paymentCustomerId,
            slotId: slot.id,
            status: {
              notIn: ["CANCELLED", "REJECTED"],
            },
          },
          select: {
            id: true,
          },
        });

        if (existingBooking) {
          throw new Error("You already have an active booking for this slot.");
        }

        const createdBooking = await tx.booking.create({
          data: {
            customerId: paymentCustomerId,
            vendorId: slot.vendorId,
            serviceId: slot.serviceId,
            slotId: slot.id,
            bookingDate: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationMinutes: currentDuration,
            amount: currentAmount,
            currency: currentCurrency,
            status: "PENDING",
            paymentStatus: PaymentStatus.PAID,
            customerNote: checkoutData.customerNote,
          },
          select: {
            id: true,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            bookingId: createdBooking.id,
            status: PaymentStatus.PAID,
            providerPaymentId,
            transactionId: providerPaymentId,
            providerStatus: providerPayment.status,
            processedAt: new Date(),
            failureReason: null,
          },
        });

        return {
          bookingId: createdBooking.id,
          created: true,
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    createdBookingId = transactionResult.created
      ? transactionResult.bookingId
      : null;

    if (createdBookingId) {
      await notifyBookingCreated(createdBookingId);
    }

    return {
      state: "FINALIZED",
      paymentId: payment.id,
      bookingId: transactionResult.bookingId,
      message: transactionResult.created
        ? "Service booking was finalized successfully."
        : "Service booking was already finalized successfully.",
    };
  } catch (error) {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: {
        status: true,
        bookingId: true,
        failureReason: true,
      },
    });

    if (currentPayment?.status === PaymentStatus.PAID && currentPayment.bookingId) {
      return {
        state: "FINALIZED",
        paymentId: payment.id,
        bookingId: currentPayment.bookingId,
        message: "Service booking was finalized successfully.",
      };
    }

    if (error instanceof Error && error.message === FINALIZATION_IN_PROGRESS) {
      return {
        state: "PENDING",
        paymentId: payment.id,
        bookingId: null,
        message:
          "The service payment is already being finalized. Please check the payment status again shortly.",
      };
    }

    if (currentPayment?.status === PaymentStatus.REFUNDED) {
      return {
        state: "REFUNDED",
        paymentId: payment.id,
        bookingId: null,
        message:
          currentPayment.failureReason ||
          "The payment was refunded because the appointment could not be finalized.",
      };
    }

    const reason =
      error instanceof Error
        ? error.message
        : "The service booking could not be finalized after payment.";

    return refundAfterFinalizationFailure(payment.id, reason);
  }
}