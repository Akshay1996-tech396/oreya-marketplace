import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createManyNotifications,
  getBookingStatusNotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type UpdateAdminBookingStatusBody = {
  bookingId?: string;
  status?: string;
  note?: string;
};

const allowedBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.REJECTED,
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
];

const nonActiveStatuses: BookingStatus[] = [
  BookingStatus.REJECTED,
  BookingStatus.CANCELLED,
];

function isValidBookingStatus(status: string): status is BookingStatus {
  return allowedBookingStatuses.includes(status as BookingStatus);
}

function isNonActiveBookingStatus(status: BookingStatus) {
  return nonActiveStatuses.includes(status);
}

function parseOptionalText(value: unknown) {
  const text = String(value || "").trim();

  return text.length > 0 ? text : null;
}

function getStatusTitle(status: BookingStatus) {
  if (status === BookingStatus.CONFIRMED) return "Booking Confirmed";
  if (status === BookingStatus.REJECTED) return "Booking Rejected";
  if (status === BookingStatus.CANCELLED) return "Booking Cancelled";
  if (status === BookingStatus.COMPLETED) return "Booking Completed";

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
        { success: false, message: "Only admins can update booking status." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateAdminBookingStatusBody;

    const bookingId = body.bookingId?.trim();
    const requestedStatus = String(body.status || "").trim().toUpperCase();
    const note = parseOptionalText(body.note);

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Booking ID is required." },
        { status: 400 }
      );
    }

    if (!isValidBookingStatus(requestedStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking status." },
        { status: 400 }
      );
    }

    const nextStatus = requestedStatus as BookingStatus;

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        slot: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, message: "Booking was not found." },
        { status: 404 }
      );
    }

    const previousStatus = existingBooking.status;

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

      return tx.booking.update({
        where: {
          id: existingBooking.id,
        },
        data: {
          status: nextStatus,
          vendorNote: note,
          cancelReason: isNonActiveBookingStatus(nextStatus) ? note : null,
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
    });

    const ownerName = updatedBooking.vendor?.businessName || "Admin team";
    const ownerType = updatedBooking.vendor ? "VENDOR" : "ADMIN";
    const notifications: Parameters<typeof createManyNotifications>[0] = [];

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
          note,
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
            note,
            cancelReason: updatedBooking.cancelReason,
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
      message: "Booking status updated successfully.",
      booking: formatBooking(updatedBooking),
    });
  } catch (error) {
    console.error("ADMIN_UPDATE_BOOKING_STATUS_ERROR", error);

    if (error instanceof Error && error.message === "SLOT_FULL") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This slot is already full. Booking status cannot be changed to an active status.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update booking status.",
      },
      { status: 500 }
    );
  }
}