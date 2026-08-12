import { PaymentPurpose } from "@prisma/client";
import { NextResponse } from "next/server";

import { finalizeProductOrderPayment } from "@/lib/payments/product-order-payment";
import { finalizeServiceBookingPayment } from "@/lib/payments/service-booking-payment";
import { finalizeRestaurantReservationPayment } from "@/lib/payments/restaurant-reservation-payment";
import {
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentWebhookFailed,
  markPaymentWebhookProcessed,
  registerPaymentWebhookEvent,
  verifyOnlinePayment,
} from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeWebhookPayload = {
  id?: unknown;
  type?: unknown;
  data?: {
    object?: unknown;
  };
};

const relevantEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    if (!stripePaymentProvider.verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Stripe webhook signature.",
        },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_CONFIGURATION_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Stripe webhook verification is not configured.",
      },
      { status: 500 },
    );
  }

  let payload: StripeWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as StripeWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid Stripe webhook payload.",
      },
      { status: 400 },
    );
  }

  const eventId = asString(payload.id)?.trim();
  const eventType = asString(payload.type)?.trim();

  if (!eventId || !eventType) {
    return NextResponse.json(
      {
        success: false,
        message: "Stripe webhook event ID and event type are required.",
      },
      { status: 400 },
    );
  }

  if (!relevantEventTypes.has(eventType)) {
    return NextResponse.json({
      success: true,
      ignored: true,
      message: "Stripe webhook event is not used by the OREYA payment flow.",
    });
  }

  const eventObject = asRecord(payload.data?.object);
  const providerSessionId = asString(eventObject.id)?.trim() || null;
  const metadata = asRecord(eventObject.metadata);
  const metadataPaymentId =
    asString(metadata.marketplace_payment_id)?.trim() || null;

  let localPaymentId = metadataPaymentId;

  if (localPaymentId) {
    const metadataLinkedPayment = await prisma.payment.findUnique({
      where: { id: localPaymentId },
      select: { id: true },
    });

    if (!metadataLinkedPayment) {
      localPaymentId = null;
    }
  }

  if (!localPaymentId && providerSessionId) {
    const linkedPayment = await prisma.payment.findFirst({
      where: {
        provider: stripePaymentProvider.name,
        providerSessionId,
      },
      select: { id: true },
    });

    localPaymentId = linkedPayment?.id ?? null;
  }

  let webhookEventId: string | null = null;

  try {
    const registration = await registerPaymentWebhookEvent({
      provider: stripePaymentProvider.name,
      eventId,
      eventType,
      paymentId: localPaymentId,
    });

    webhookEventId = registration.event.id;

    if (registration.duplicate && registration.event.processedAt) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Webhook event was already processed.",
      });
    }

    if (!localPaymentId || !providerSessionId) {
      await markPaymentWebhookProcessed(registration.event.id);

      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Webhook event is not linked to an OREYA payment attempt.",
      });
    }

    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(providerSessionId)) {
      await markPaymentWebhookProcessed(registration.event.id);

      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Webhook event does not contain a Stripe Checkout Session.",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: localPaymentId },
      select: {
        id: true,
        provider: true,
        providerSessionId: true,
        purpose: true,
      },
    });

    if (!payment || payment.provider !== stripePaymentProvider.name) {
      await markPaymentWebhookProcessed(registration.event.id);

      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Webhook payment does not match an active Stripe payment.",
      });
    }

    if (
      payment.providerSessionId &&
      payment.providerSessionId !== providerSessionId
    ) {
      throw new Error(
        "Stripe webhook checkout session does not match the marketplace payment.",
      );
    }

    if (
      payment.purpose ===
      PaymentPurpose.PRODUCT_ORDER
    ) {
      const result =
        await finalizeProductOrderPayment({
          paymentId: payment.id,
          providerSessionId,
        });

      if (result.state === "PENDING") {
        throw new Error(
          `Product payment webhook finalization is still pending: ${result.message}`,
        );
      }

      await markPaymentWebhookProcessed(
        registration.event.id,
      );

      return NextResponse.json({
        success: true,
        duplicate:
          registration.duplicate,
        paymentId: payment.id,
        providerSessionId,
        outcome: result.state,
        orderId: result.orderId,
        message: result.message,
      });
    }

    if (
      payment.purpose ===
      PaymentPurpose.SERVICE_BOOKING
    ) {
      const result =
        await finalizeServiceBookingPayment({
          paymentId: payment.id,
          providerSessionId,
        });

      if (result.state === "PENDING") {
        throw new Error(
          `Service payment webhook finalization is still pending: ${result.message}`,
        );
      }

      await markPaymentWebhookProcessed(
        registration.event.id,
      );

      return NextResponse.json({
        success: true,
        duplicate:
          registration.duplicate,
        paymentId: payment.id,
        providerSessionId,
        outcome: result.state,
        bookingId: result.bookingId,
        message: result.message,
      });
    }

    if (
      payment.purpose ===
      PaymentPurpose.RESTAURANT_RESERVATION
    ) {
      const result =
        await finalizeRestaurantReservationPayment({
          paymentId: payment.id,
          providerSessionId,
        });

      if (result.state === "PENDING") {
        throw new Error(
          `Restaurant payment webhook finalization is still pending: ${result.message}`,
        );
      }

      await markPaymentWebhookProcessed(
        registration.event.id,
      );

      return NextResponse.json({
        success: true,
        duplicate:
          registration.duplicate,
        paymentId: payment.id,
        providerSessionId,
        outcome: result.state,
        restaurantReservationId:
          result.restaurantReservationId,
        message: result.message,
      });
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
        `Stripe webhook ${eventType} reported a failed payment.`,
      );
    } else if (providerPayment.outcome === "CANCELLED") {
      await markPaymentCancelled(
        payment.id,
        providerPayment.status,
        `Stripe webhook ${eventType} reported a cancelled or expired checkout session.`,
      );
    }

    if (
      providerPayment.outcome === "PENDING" ||
      providerPayment.outcome === "UNKNOWN"
    ) {
      throw new Error(
        `Stripe payment webhook is not in a terminal state: ${providerPayment.status}.`,
      );
    }

    await markPaymentWebhookProcessed(registration.event.id);

    return NextResponse.json({
      success: true,
      duplicate: registration.duplicate,
      paymentId: payment.id,
      providerSessionId,
      providerPaymentId: providerPayment.paymentId,
      providerStatus: providerPayment.status,
      outcome: providerPayment.outcome,
      message:
        providerPayment.outcome === "SUCCESS"
          ? "Payment webhook was verified and is awaiting marketplace finalization."
          : "Stripe payment webhook was processed successfully.",
    });
  } catch (error) {
    console.error("STRIPE_PAYMENT_WEBHOOK_ERROR", error);

    if (webhookEventId) {
      try {
        await markPaymentWebhookFailed(
          webhookEventId,
          error instanceof Error
            ? error.message
            : "Stripe webhook processing failed.",
        );
      } catch (eventError) {
        console.error("STRIPE_WEBHOOK_EVENT_FAILURE_UPDATE_ERROR", eventError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process Stripe webhook.",
      },
      { status: 500 },
    );
  }
}