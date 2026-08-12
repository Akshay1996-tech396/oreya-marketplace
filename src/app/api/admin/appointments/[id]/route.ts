import { BookingStatus, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createManyNotifications,
  getBookingStatusNotificationType,
  getPaymentStatusNotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAdminAppointmentBody = {
  status?: string;
  paymentStatus?: string;
  vendorNote?: string;
  cancelReason?: string;
};

const nonActiveBookingStatuses: BookingStatus[] = [
  BookingStatus.REJECTED,
  BookingStatus.CANCELLED,
];

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function isNonActiveBookingStatus(status: BookingStatus) {
  return nonActiveBookingStatuses.includes(status);
}

function isValidBookingStatus(status: string): status is BookingStatus {
  return (
    status === BookingStatus.PENDING ||
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.REJECTED ||
    status === BookingStatus.CANCELLED ||
    status === BookingStatus.COMPLETED
  );
}

function isValidPaymentStatus(status: string): status is PaymentStatus {
  return (
    status === PaymentStatus.PENDING ||
    status === PaymentStatus.PAID ||
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.REFUNDED
  );
}

function parseOptionalText(value: unknown) {
  const text = String(value || "").trim();

  return text.length > 0 ? text : null;
}

function getStatusTitle(status: BookingStatus) {
  if (status === BookingStatus.CONFIRMED) {
    return "Booking Confirmed";
  }

  if (status === BookingStatus.REJECTED) {
    return "Booking Rejected";
  }

  if (status === BookingStatus.CANCELLED) {
    return "Booking Cancelled";
  }

  if (status === BookingStatus.COMPLETED) {
    return "Booking Completed";
  }

  return "Booking Status Updated";
}

function getCustomerStatusMessage({
  status,
  ownerName,
  serviceTitle,
}: {
  status: BookingStatus;
  ownerName: string;
  serviceTitle: string;
}) {
  if (status === BookingStatus.CONFIRMED) {
    return `${ownerName} has confirmed your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.REJECTED) {
    return `${ownerName} has rejected your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.CANCELLED) {
    return `${ownerName} has cancelled your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.COMPLETED) {
    return `${ownerName} has marked your ${serviceTitle} appointment as completed.`;
  }

  return `${ownerName} has updated your ${serviceTitle} appointment status.`;
}

function getVendorStatusMessage({
  status,
  customerName,
  serviceTitle,
}: {
  status: BookingStatus;
  customerName: string;
  serviceTitle: string;
}) {
  if (status === BookingStatus.CONFIRMED) {
    return `${customerName}'s ${serviceTitle} appointment has been confirmed by admin.`;
  }

  if (status === BookingStatus.REJECTED) {
    return `${customerName}'s ${serviceTitle} appointment has been rejected by admin.`;
  }

  if (status === BookingStatus.CANCELLED) {
    return `${customerName}'s ${serviceTitle} appointment has been cancelled by admin.`;
  }

  if (status === BookingStatus.COMPLETED) {
    return `${customerName}'s ${serviceTitle} appointment has been marked as completed by admin.`;
  }

  return `${customerName}'s ${serviceTitle} appointment status has been updated by admin.`;
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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
          redirectTo: "/login",
        },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can update appointments.",
          redirectTo: getDashboardPath(user.role),
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateAdminAppointmentBody;

    const nextStatusValue = String(body.status || "").trim().toUpperCase();
    const nextPaymentStatusValue = String(body.paymentStatus || "")
      .trim()
      .toUpperCase();

    const vendorNote = parseOptionalText(body.vendorNote);
    const cancelReason = parseOptionalText(body.cancelReason);

    if (!isValidBookingStatus(nextStatusValue)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking status.",
        },
        { status: 400 }
      );
    }

    if (!isValidPaymentStatus(nextPaymentStatusValue)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment status.",
        },
        { status: 400 }
      );
    }

    const nextStatus = nextStatusValue as BookingStatus;
    const nextPaymentStatus = nextPaymentStatusValue as PaymentStatus;

    if (
      (nextStatus === BookingStatus.CANCELLED ||
        nextStatus === BookingStatus.REJECTED) &&
      !cancelReason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cancel reason is required when appointment status is Cancelled or Rejected.",
        },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        slot: true,
        payment: {
          select: {
            provider: true,
            purpose: true,
            status: true,
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Appointment booking was not found.",
        },
        { status: 404 }
      );
    }

    const previousStatus = existingBooking.status;
    const previousPaymentStatus = existingBooking.paymentStatus;

    const isStripeControlledServicePayment =
      existingBooking.payment?.provider === "stripe" &&
      existingBooking.payment.purpose === PaymentPurpose.SERVICE_BOOKING;

    if (
      isStripeControlledServicePayment &&
      nextPaymentStatus !== previousPaymentStatus
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

    const wasSlotOccupied = !isNonActiveBookingStatus(previousStatus);
    const willSlotBeOccupied = !isNonActiveBookingStatus(nextStatus);

    const updatedBooking = await prisma.$transaction(async (tx) => {
      if (wasSlotOccupied && !willSlotBeOccupied) {
        await tx.appointmentSlot.updateMany({
          where: {
            id: existingBooking.slotId,
            bookedCount: {
              gt: 0,
            },
          },
          data: {
            bookedCount: {
              decrement: 1,
            },
          },
        });
      }

      if (!wasSlotOccupied && willSlotBeOccupied) {
        const updatedSlot = await tx.appointmentSlot.updateMany({
          where: {
            id: existingBooking.slotId,
            bookedCount: {
              lt: existingBooking.slot.capacity,
            },
          },
          data: {
            bookedCount: {
              increment: 1,
            },
          },
        });

        if (updatedSlot.count === 0) {
          throw new Error("SLOT_FULL");
        }
      }

      const booking = await tx.booking.update({
        where: {
          id: existingBooking.id,
        },
        data: {
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          vendorNote,
          cancelReason: isNonActiveBookingStatus(nextStatus)
            ? cancelReason
            : null,
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

      if (!isStripeControlledServicePayment) {
        await tx.payment.updateMany({
          where: {
            bookingId: existingBooking.id,
          },
          data: {
            status: nextPaymentStatus,
          },
        });
      }

      return booking;
    });

    const ownerName = updatedBooking.vendor?.businessName || "Admin team";
    const ownerId = updatedBooking.vendorId;
    const ownerType = updatedBooking.vendor ? "VENDOR" : "ADMIN";

    const notifications = [];

    if (previousStatus !== updatedBooking.status) {
      notifications.push({
        userId: updatedBooking.customerId,
        title: getStatusTitle(updatedBooking.status),
        message: getCustomerStatusMessage({
          status: updatedBooking.status,
          ownerName,
          serviceTitle: updatedBooking.service.title,
        }),
        type: getBookingStatusNotificationType(updatedBooking.status),
        link: "/customer",
        metadata: {
          bookingId: updatedBooking.id,
          previousStatus,
          currentStatus: updatedBooking.status,
          customerId: updatedBooking.customerId,
          customerName: updatedBooking.customer.name,
          ownerId,
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
          vendorNote,
          cancelReason: updatedBooking.cancelReason,
          updatedBy: "ADMIN",
        },
      });

      if (updatedBooking.vendor?.userId) {
        notifications.push({
          userId: updatedBooking.vendor.userId,
          title: getStatusTitle(updatedBooking.status),
          message: getVendorStatusMessage({
            status: updatedBooking.status,
            customerName: updatedBooking.customer.name,
            serviceTitle: updatedBooking.service.title,
          }),
          type: getBookingStatusNotificationType(updatedBooking.status),
          link: "/vendor",
          metadata: {
            bookingId: updatedBooking.id,
            previousStatus,
            currentStatus: updatedBooking.status,
            customerId: updatedBooking.customerId,
            customerName: updatedBooking.customer.name,
            ownerId,
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
            vendorNote,
            cancelReason: updatedBooking.cancelReason,
            updatedBy: "ADMIN",
          },
        });
      }
    }

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
          ownerId,
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
            ownerId,
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
      message: "Appointment updated successfully.",
      booking: formatBooking(updatedBooking),
    });
  } catch (error) {
    console.error("ADMIN_APPOINTMENT_UPDATE_ERROR", error);

    if (error instanceof Error && error.message === "SLOT_FULL") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This slot is already full. Appointment status cannot be changed to an active status.",
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Appointment booking was not found.",
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
            : "Something went wrong while updating the appointment.",
      },
      { status: 500 }
    );
  }
}