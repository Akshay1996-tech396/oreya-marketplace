import { BookingStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  getBookingStatusNotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type UpdateBookingStatusBody = {
  bookingId?: string;
  status?: string;
  vendorNote?: string;
};

const allowedBookingStatuses = [
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

function getStatusMessage({
  status,
  vendorName,
  serviceTitle,
}: {
  status: BookingStatus;
  vendorName: string;
  serviceTitle: string;
}) {
  if (status === BookingStatus.CONFIRMED) {
    return `${vendorName} has confirmed your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.REJECTED) {
    return `${vendorName} has rejected your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.CANCELLED) {
    return `${vendorName} has cancelled your ${serviceTitle} appointment.`;
  }

  if (status === BookingStatus.COMPLETED) {
    return `${vendorName} has marked your ${serviceTitle} appointment as completed.`;
  }

  return `${vendorName} has updated your ${serviceTitle} appointment status.`;
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
  paymentStatus: string;
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
          message: "Only vendors can update booking status.",
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
          message: "Only approved vendors can update booking status.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateBookingStatusBody;

    const bookingId = body.bookingId?.trim();
    const requestedStatus = String(body.status || "").trim().toUpperCase();
    const vendorNote = parseOptionalText(body.vendorNote);

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidBookingStatus(requestedStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking status.",
        },
        { status: 400 }
      );
    }

    const nextStatus = requestedStatus as BookingStatus;

    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        vendorId: vendor.id,
      },
      include: {
        slot: true,
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
          vendorNote,
          cancelReason: isNonActiveBookingStatus(nextStatus)
            ? vendorNote || `Marked as ${nextStatus.toLowerCase()} by vendor.`
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

    if (previousStatus !== updatedBooking.status) {
      await createNotification({
        userId: updatedBooking.customerId,
        title: getStatusTitle(updatedBooking.status),
        message: getStatusMessage({
          status: updatedBooking.status,
          vendorName: updatedBooking.vendor.businessName,
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
          updatedBy: "VENDOR",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Booking status updated successfully.",
      booking: formatBooking(updatedBooking),
    });
  } catch (error) {
    console.error("UPDATE_BOOKING_STATUS_ERROR", error);

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
            : "Unable to update booking status.",
      },
      { status: 500 }
    );
  }
}