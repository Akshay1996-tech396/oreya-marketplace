import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createManyNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type CancelBookingBody = {
  bookingId?: string;
  cancelReason?: string;
};

const slotFreeStatuses = ["CANCELLED", "REJECTED"];

function isSlotFreeStatus(status: string) {
  return slotFreeStatuses.includes(status);
}

function formatBooking(booking: any) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    customerName: booking.customer?.name || "",
    customerEmail: booking.customer?.email || "",
    vendorId: booking.vendorId,
    vendorName: booking.vendor?.businessName || "Admin Service",
    serviceId: booking.serviceId,
    serviceTitle: booking.service?.title || "",
    serviceSlug: booking.service?.slug || "",
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

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Only customers can cancel bookings.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CancelBookingBody;

    const bookingId = body.bookingId?.trim();
    const cancelReason =
      body.cancelReason?.trim() || "Cancelled by customer.";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: user.id,
      },
      include: {
        slot: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking was not found or this booking does not belong to you.",
        },
        { status: 404 }
      );
    }

    if (existingBooking.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "This booking is already cancelled.",
        },
        { status: 400 }
      );
    }

    if (existingBooking.status === "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          message: "Rejected bookings cannot be cancelled.",
        },
        { status: 400 }
      );
    }

    if (existingBooking.status === "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          message: "Completed bookings cannot be cancelled.",
        },
        { status: 400 }
      );
    }

    const shouldDecreaseSlotCount = !isSlotFreeStatus(existingBooking.status);

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      if (shouldDecreaseSlotCount) {
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

      return tx.booking.update({
        where: {
          id: existingBooking.id,
        },
        data: {
          status: "CANCELLED",
          cancelReason,
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

    const ownerName = cancelledBooking.vendor?.businessName || "Admin Service";
    const ownerType = cancelledBooking.vendor ? "VENDOR" : "ADMIN";

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

    const notifications: Parameters<typeof createManyNotifications>[0] = [];

    if (cancelledBooking.vendor?.userId) {
      notifications.push({
        userId: cancelledBooking.vendor.userId,
        title: "Booking Cancelled",
        message: `${cancelledBooking.customer.name} cancelled the ${cancelledBooking.service.title} appointment.`,
        type: "BOOKING_CANCELLED",
        link: "/vendor",
        metadata: {
          bookingId: cancelledBooking.id,
          customerId: cancelledBooking.customerId,
          customerName: cancelledBooking.customer.name,
          vendorId: cancelledBooking.vendorId,
          vendorName: cancelledBooking.vendor.businessName,
          serviceId: cancelledBooking.serviceId,
          serviceTitle: cancelledBooking.service.title,
          bookingDate: cancelledBooking.bookingDate.toISOString(),
          startTime: cancelledBooking.startTime,
          endTime: cancelledBooking.endTime,
          amount: Number(cancelledBooking.amount),
          currency: cancelledBooking.currency,
          cancelReason,
          ownerType,
        },
      });
    }

    notifications.push(
      ...admins.map((admin) => ({
        userId: admin.id,
        title: "Customer Cancelled Booking",
        message: `${cancelledBooking.customer.name} cancelled the ${cancelledBooking.service.title} appointment for ${ownerName}.`,
        type: "BOOKING_CANCELLED" as const,
        link: `/admin/appointments/${cancelledBooking.id}`,
        metadata: {
          bookingId: cancelledBooking.id,
          customerId: cancelledBooking.customerId,
          customerName: cancelledBooking.customer.name,
          vendorId: cancelledBooking.vendorId,
          vendorName: cancelledBooking.vendor?.businessName || null,
          serviceId: cancelledBooking.serviceId,
          serviceTitle: cancelledBooking.service.title,
          bookingDate: cancelledBooking.bookingDate.toISOString(),
          startTime: cancelledBooking.startTime,
          endTime: cancelledBooking.endTime,
          amount: Number(cancelledBooking.amount),
          currency: cancelledBooking.currency,
          cancelReason,
          ownerType,
        },
      }))
    );

    if (notifications.length > 0) {
      await createManyNotifications(notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully.",
      booking: formatBooking(cancelledBooking),
    });
  } catch (error) {
    console.error("CUSTOMER_CANCEL_BOOKING_ERROR", error);

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
            : "Unable to cancel booking.",
      },
      { status: 500 }
    );
  }
}