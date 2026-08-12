import { PaymentPurpose, PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { finalizeProductOrderPayment } from "@/lib/payments/product-order-payment";
import { finalizeServiceBookingPayment } from "@/lib/payments/service-booking-payment";
import { finalizeRestaurantReservationPayment } from "@/lib/payments/restaurant-reservation-payment";
import {
  markPaymentCancelled,
  markPaymentFailed,
  verifyOnlinePayment,
} from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyPaymentBody = {
  paymentId?: string;
  providerSessionId?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 },
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Only customers can verify checkout payments.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as VerifyPaymentBody;
    const paymentId = body.paymentId?.trim();
    const providerSessionId = body.providerSessionId?.trim();

    if (!paymentId || !providerSessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment ID and Stripe checkout session ID are required.",
        },
        { status: 400 },
      );
    }

    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(providerSessionId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Stripe checkout session identifier.",
        },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        customerId: true,
        status: true,
        provider: true,
        providerSessionId: true,
        purpose: true,
        orderId: true,
        bookingId: true,
        restaurantReservationId: true,
      },
    });

    if (!payment || payment.customerId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment record was not found.",
        },
        { status: 404 },
      );
    }

    if (payment.provider !== stripePaymentProvider.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment provider does not match this checkout.",
        },
        { status: 409 },
      );
    }

    if (
      payment.providerSessionId &&
      payment.providerSessionId !== providerSessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Stripe checkout session does not match this payment.",
        },
        { status: 409 },
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
          customerId: user.id,
        });

      return NextResponse.json({
        success: true,
        verified:
          result.state ===
            "FINALIZED" ||
          result.state ===
            "REFUNDED",
        finalized:
          result.state ===
          "FINALIZED",
        outcome:
          result.state,
        paymentId:
          result.paymentId,
        paymentStatus:
          result.state ===
          "FINALIZED"
            ? PaymentStatus.PAID
            : result.state ===
                "REFUNDED"
              ? PaymentStatus.REFUNDED
              : result.state ===
                  "FAILED"
                ? PaymentStatus.FAILED
                : result.state ===
                    "CANCELLED"
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.PENDING,
        orderId: result.orderId,
        providerSessionId,
        purpose:
          PaymentPurpose.PRODUCT_ORDER,
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
          customerId: user.id,
        });

      return NextResponse.json({
        success: true,
        verified:
          result.state ===
            "FINALIZED" ||
          result.state ===
            "REFUNDED",
        finalized:
          result.state ===
          "FINALIZED",
        outcome:
          result.state,
        paymentId:
          result.paymentId,
        paymentStatus:
          result.state ===
          "FINALIZED"
            ? PaymentStatus.PAID
            : result.state ===
                "REFUNDED"
              ? PaymentStatus.REFUNDED
              : result.state ===
                  "FAILED"
                ? PaymentStatus.FAILED
                : result.state ===
                    "CANCELLED"
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.PENDING,
        bookingId: result.bookingId,
        providerSessionId,
        purpose:
          PaymentPurpose.SERVICE_BOOKING,
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
          customerId: user.id,
        });

      return NextResponse.json({
        success: true,
        verified:
          result.state ===
            "FINALIZED" ||
          result.state ===
            "REFUNDED",
        finalized:
          result.state ===
          "FINALIZED",
        outcome:
          result.state,
        paymentId:
          result.paymentId,
        paymentStatus:
          result.state ===
          "FINALIZED"
            ? PaymentStatus.PAID
            : result.state ===
                "REFUNDED"
              ? PaymentStatus.REFUNDED
              : result.state ===
                  "FAILED"
                ? PaymentStatus.FAILED
                : result.state ===
                    "CANCELLED"
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.PENDING,
        restaurantReservationId:
          result.restaurantReservationId,
        providerSessionId,
        purpose:
          PaymentPurpose.RESTAURANT_RESERVATION,
        message: result.message,
      });
    }

    if (payment.status === PaymentStatus.PAID) {
      return NextResponse.json({
        success: true,
        verified: true,
        finalized: true,
        paymentId: payment.id,
        paymentStatus: payment.status,
        message: "Payment has already been finalized successfully.",
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
        "Stripe reported that the payment failed.",
      );
    } else if (providerPayment.outcome === "CANCELLED") {
      await markPaymentCancelled(
        payment.id,
        providerPayment.status,
        "Stripe reported that the checkout session was cancelled or expired.",
      );
    }

    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        status: true,
        providerStatus: true,
        providerPaymentId: true,
        providerSessionId: true,
        purpose: true,
      },
    });

    if (!currentPayment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment record was not found after verification.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      verified: providerPayment.outcome === "SUCCESS",
      finalized: currentPayment.status === PaymentStatus.PAID,
      outcome: providerPayment.outcome,
      paymentId: currentPayment.id,
      paymentStatus: currentPayment.status,
      providerStatus: currentPayment.providerStatus,
      providerPaymentId: currentPayment.providerPaymentId,
      providerSessionId: currentPayment.providerSessionId,
      purpose: currentPayment.purpose,
      message:
        providerPayment.outcome === "SUCCESS"
          ? "Payment was verified successfully and is awaiting marketplace finalization."
          : providerPayment.outcome === "PENDING"
            ? "Payment is still pending with Stripe."
            : providerPayment.outcome === "FAILED"
              ? "Payment failed."
              : providerPayment.outcome === "CANCELLED"
                ? "Payment was cancelled or the Stripe checkout session expired."
                : "Payment status could not yet be finalized.",
    });
  } catch (error) {
    console.error("VERIFY_STRIPE_PAYMENT_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify the payment.",
      },
      { status: 500 },
    );
  }
}