import { BookingStatus, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  getPaymentStatusNotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type UpdatePaymentStatusBody = {
  bookingId?: string;
  paymentStatus?: string;
};

const allowedPaymentStatuses: readonly PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
];

function isValidPaymentStatus(status: string): status is PaymentStatus {
  return allowedPaymentStatuses.includes(status as PaymentStatus);
}

function getPaymentStatusTitle(paymentStatus: PaymentStatus) {
  if (paymentStatus === PaymentStatus.PAID) {
    return "Payment Marked As Paid";
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    return "Payment Failed";
  }

  if (paymentStatus === PaymentStatus.REFUNDED) {
    return "Payment Refunded";
  }

  return "Payment Status Updated";
}

function getPaymentStatusMessage({
  paymentStatus,
  vendorName,
  serviceTitle,
}: {
  paymentStatus: PaymentStatus;
  vendorName: string;
  serviceTitle: string;
}) {
  if (paymentStatus === PaymentStatus.PAID) {
    return `${vendorName} has marked your ${serviceTitle} appointment payment as paid.`;
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    return `${vendorName} has marked your ${serviceTitle} appointment payment as failed.`;
  }

  if (paymentStatus === PaymentStatus.REFUNDED) {
    return `${vendorName} has marked your ${serviceTitle} appointment payment as refunded.`;
  }

  return `${vendorName} has updated your ${serviceTitle} appointment payment status.`;
}

function formatBooking(booking: {
  id: string;
  customerId: string;
  vendorId: string | null;
  serviceId: string;
  slotId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  amount: Prisma.Decimal;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  customerNote: string | null;
  vendorNote: string | null;
  cancelReason: string | null;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
  };
  vendor: {
    businessName: string;
  } | null;
  service: {
    title: string;
    slug: string;
  };
}) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    vendorId: booking.vendorId,
    vendorName: booking.vendor?.businessName || "Vendor",
    serviceId: booking.serviceId,
    serviceTitle: booking.service.title,
    serviceSlug: booking.service.slug,
    slotId: booking.slotId,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationMinutes: booking.durationMinutes,
    amount: Number(booking.amount),
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    customerNote: booking.customerNote,
    vendorNote: booking.vendorNote,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
  };
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update booking payment status.",
        },
        { status: 403 }
      );
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        businessName: true,
        status: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor profile was not found.",
        },
        { status: 404 }
      );
    }

    if (vendor.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Only approved vendors can update payment status.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdatePaymentStatusBody;

    const bookingId = body.bookingId?.trim();
    const requestedPaymentStatus = String(body.paymentStatus || "")
      .trim()
      .toUpperCase();

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidPaymentStatus(requestedPaymentStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment status.",
        },
        { status: 400 }
      );
    }

    const nextPaymentStatus = requestedPaymentStatus as PaymentStatus;

    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        vendorId: vendor.id,
      },
      select: {
        id: true,
        paymentStatus: true,
        payment: {
          select: {
            provider: true,
            purpose: true,
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Booking was not found or this booking does not belong to your vendor account.",
        },
        { status: 404 }
      );
    }

    if (
      existingBooking.payment?.provider === "stripe" &&
      existingBooking.payment.purpose === PaymentPurpose.SERVICE_BOOKING
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Stripe-controlled service payment status cannot be changed manually.",
        },
        { status: 409 }
      );
    }

    const previousPaymentStatus = existingBooking.paymentStatus;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: {
          id: existingBooking.id,
        },
        data: {
          paymentStatus: nextPaymentStatus,
        },
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
              slug: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: true,
            },
          },
          slot: true,
        },
      });

      await tx.payment.updateMany({
        where: {
          bookingId: existingBooking.id,
        },
        data: {
          status: nextPaymentStatus,
        },
      });

      return booking;
    });

    if (!updatedBooking.vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor booking owner was not found.",
        },
        { status: 404 }
      );
    }

    if (previousPaymentStatus !== updatedBooking.paymentStatus) {
      await createNotification({
        userId: updatedBooking.customerId,
        title: getPaymentStatusTitle(updatedBooking.paymentStatus),
        message: getPaymentStatusMessage({
          paymentStatus: updatedBooking.paymentStatus,
          vendorName: updatedBooking.vendor.businessName,
          serviceTitle: updatedBooking.service.title,
        }),
        type: getPaymentStatusNotificationType(updatedBooking.paymentStatus),
        link: "/customer",
        metadata: {
          bookingId: updatedBooking.id,
          previousPaymentStatus,
          currentPaymentStatus: updatedBooking.paymentStatus,
          bookingStatus: updatedBooking.status,
          customerId: updatedBooking.customerId,
          customerName: updatedBooking.customer.name,
          vendorId: updatedBooking.vendorId,
          vendorName: updatedBooking.vendor.businessName,
          serviceId: updatedBooking.serviceId,
          serviceTitle: updatedBooking.service.title,
          bookingDate: updatedBooking.bookingDate.toISOString(),
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
          amount: Number(updatedBooking.amount),
          currency: updatedBooking.currency,
          updatedBy: "VENDOR",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Booking payment status updated successfully.",
      booking: formatBooking(updatedBooking),
    });
  } catch (error) {
    console.error("UPDATE_BOOKING_PAYMENT_STATUS_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking record was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update booking payment status.",
      },
      { status: 500 }
    );
  }
}