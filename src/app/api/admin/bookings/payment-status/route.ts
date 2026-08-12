import { BookingStatus, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createManyNotifications,
  getPaymentStatusNotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type UpdateAdminBookingPaymentStatusBody = {
  bookingId?: string;
  paymentStatus?: string;
};

const allowedPaymentStatuses: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
];

function isValidPaymentStatus(status: string): status is PaymentStatus {
  return allowedPaymentStatuses.includes(status as PaymentStatus);
}

function getPaymentStatusTitle(paymentStatus: PaymentStatus) {
  if (paymentStatus === PaymentStatus.PAID) return "Payment Marked As Paid";
  if (paymentStatus === PaymentStatus.FAILED) return "Payment Failed";
  if (paymentStatus === PaymentStatus.REFUNDED) return "Payment Refunded";

  return "Payment Status Updated";
}

function getCustomerPaymentMessage({
  paymentStatus,
  ownerName,
  serviceTitle,
}: {
  paymentStatus: PaymentStatus;
  ownerName: string;
  serviceTitle: string;
}) {
  if (paymentStatus === PaymentStatus.PAID) {
    return `${ownerName} has marked your ${serviceTitle} appointment payment as paid.`;
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    return `${ownerName} has marked your ${serviceTitle} appointment payment as failed.`;
  }

  if (paymentStatus === PaymentStatus.REFUNDED) {
    return `${ownerName} has marked your ${serviceTitle} appointment payment as refunded.`;
  }

  return `${ownerName} has updated your ${serviceTitle} appointment payment status.`;
}

function getVendorPaymentMessage({
  paymentStatus,
  customerName,
  serviceTitle,
}: {
  paymentStatus: PaymentStatus;
  customerName: string;
  serviceTitle: string;
}) {
  if (paymentStatus === PaymentStatus.PAID) {
    return `${customerName}'s ${serviceTitle} appointment payment has been marked as paid by admin.`;
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    return `${customerName}'s ${serviceTitle} appointment payment has been marked as failed by admin.`;
  }

  if (paymentStatus === PaymentStatus.REFUNDED) {
    return `${customerName}'s ${serviceTitle} appointment payment has been marked as refunded by admin.`;
  }

  return `${customerName}'s ${serviceTitle} appointment payment status has been updated by admin.`;
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
    vendorName: booking.vendor?.businessName || "Admin Service",
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
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can update booking payment status.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateAdminBookingPaymentStatusBody;

    const bookingId = body.bookingId?.trim();
    const requestedPaymentStatus = String(body.paymentStatus || "")
      .trim()
      .toUpperCase();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Booking ID is required." },
        { status: 400 }
      );
    }

    if (!isValidPaymentStatus(requestedPaymentStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment status." },
        { status: 400 }
      );
    }

    const nextPaymentStatus = requestedPaymentStatus as PaymentStatus;

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
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
        { success: false, message: "Booking was not found." },
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

    const ownerName = updatedBooking.vendor?.businessName || "Admin team";
    const ownerType = updatedBooking.vendor ? "VENDOR" : "ADMIN";
    const notifications: Parameters<typeof createManyNotifications>[0] = [];

    if (previousPaymentStatus !== updatedBooking.paymentStatus) {
      notifications.push({
        userId: updatedBooking.customerId,
        title: getPaymentStatusTitle(updatedBooking.paymentStatus),
        message: getCustomerPaymentMessage({
          paymentStatus: updatedBooking.paymentStatus,
          ownerName,
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
          ownerName,
          ownerType,
          vendorId: updatedBooking.vendorId,
          vendorName: updatedBooking.vendor?.businessName || null,
          serviceId: updatedBooking.serviceId,
          serviceTitle: updatedBooking.service.title,
          bookingDate: updatedBooking.bookingDate.toISOString(),
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
          amount: Number(updatedBooking.amount),
          currency: updatedBooking.currency,
          updatedBy: "ADMIN",
        },
      });

      if (updatedBooking.vendor?.userId) {
        notifications.push({
          userId: updatedBooking.vendor.userId,
          title: getPaymentStatusTitle(updatedBooking.paymentStatus),
          message: getVendorPaymentMessage({
            paymentStatus: updatedBooking.paymentStatus,
            customerName: updatedBooking.customer.name,
            serviceTitle: updatedBooking.service.title,
          }),
          type: getPaymentStatusNotificationType(updatedBooking.paymentStatus),
          link: "/vendor",
          metadata: {
            bookingId: updatedBooking.id,
            previousPaymentStatus,
            currentPaymentStatus: updatedBooking.paymentStatus,
            bookingStatus: updatedBooking.status,
            customerId: updatedBooking.customerId,
            customerName: updatedBooking.customer.name,
            ownerName,
            ownerType,
            vendorId: updatedBooking.vendorId,
            vendorName: updatedBooking.vendor.businessName,
            serviceId: updatedBooking.serviceId,
            serviceTitle: updatedBooking.service.title,
            bookingDate: updatedBooking.bookingDate.toISOString(),
            startTime: updatedBooking.startTime,
            endTime: updatedBooking.endTime,
            amount: Number(updatedBooking.amount),
            currency: updatedBooking.currency,
            updatedBy: "ADMIN",
          },
        });
      }
    }

    if (notifications.length > 0) {
      await createManyNotifications(notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Booking payment status updated successfully.",
      booking: formatBooking(updatedBooking),
    });
  } catch (error) {
    console.error("ADMIN_UPDATE_BOOKING_PAYMENT_STATUS_ERROR", error);

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