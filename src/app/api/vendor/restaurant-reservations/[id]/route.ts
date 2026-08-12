import { NextResponse } from "next/server";
import { Prisma, RestaurantReservationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateReservationRequestBody = {
  status?: string;
  cancellationReason?: string | null;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseReservationStatus(value: unknown) {
  if (value === RestaurantReservationStatus.PENDING) {
    return RestaurantReservationStatus.PENDING;
  }

  if (value === RestaurantReservationStatus.CONFIRMED) {
    return RestaurantReservationStatus.CONFIRMED;
  }

  if (value === RestaurantReservationStatus.REJECTED) {
    return RestaurantReservationStatus.REJECTED;
  }

  if (value === RestaurantReservationStatus.COMPLETED) {
    return RestaurantReservationStatus.COMPLETED;
  }

  if (value === RestaurantReservationStatus.CANCELLED) {
    return RestaurantReservationStatus.CANCELLED;
  }

  if (value === RestaurantReservationStatus.NO_SHOW) {
    return RestaurantReservationStatus.NO_SHOW;
  }

  return null;
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function canUpdateReservationStatus(
  currentStatus: RestaurantReservationStatus,
  nextStatus: RestaurantReservationStatus
) {
  if (currentStatus === nextStatus) {
    return {
      success: false,
      message: "Reservation is already in the selected status.",
    };
  }

  if (
    currentStatus === RestaurantReservationStatus.CANCELLED ||
    currentStatus === RestaurantReservationStatus.COMPLETED ||
    currentStatus === RestaurantReservationStatus.NO_SHOW ||
    currentStatus === RestaurantReservationStatus.REJECTED
  ) {
    return {
      success: false,
      message: "This reservation status cannot be updated further.",
    };
  }

  if (nextStatus === RestaurantReservationStatus.CONFIRMED) {
    return {
      success: currentStatus === RestaurantReservationStatus.PENDING,
      message:
        currentStatus === RestaurantReservationStatus.PENDING
          ? "Reservation can be confirmed."
          : "Only pending reservations can be confirmed.",
    };
  }

  if (nextStatus === RestaurantReservationStatus.COMPLETED) {
    return {
      success: currentStatus === RestaurantReservationStatus.CONFIRMED,
      message:
        currentStatus === RestaurantReservationStatus.CONFIRMED
          ? "Reservation can be completed."
          : "Only confirmed reservations can be completed.",
    };
  }

  if (nextStatus === RestaurantReservationStatus.NO_SHOW) {
    return {
      success:
        currentStatus === RestaurantReservationStatus.PENDING ||
        currentStatus === RestaurantReservationStatus.CONFIRMED,
      message:
        currentStatus === RestaurantReservationStatus.PENDING ||
        currentStatus === RestaurantReservationStatus.CONFIRMED
          ? "Reservation can be marked as no-show."
          : "Only pending or confirmed reservations can be marked as no-show.",
    };
  }

  if (nextStatus === RestaurantReservationStatus.CANCELLED) {
    return {
      success:
        currentStatus === RestaurantReservationStatus.PENDING ||
        currentStatus === RestaurantReservationStatus.CONFIRMED,
      message:
        currentStatus === RestaurantReservationStatus.PENDING ||
        currentStatus === RestaurantReservationStatus.CONFIRMED
          ? "Reservation can be cancelled."
          : "Only pending or confirmed reservations can be cancelled.",
    };
  }

  if (nextStatus === RestaurantReservationStatus.REJECTED) {
    return {
      success: currentStatus === RestaurantReservationStatus.PENDING,
      message:
        currentStatus === RestaurantReservationStatus.PENDING
          ? "Reservation can be rejected."
          : "Only pending reservations can be rejected.",
    };
  }

  return {
    success: false,
    message: "Invalid reservation status update.",
  };
}

function buildStatusUpdateData(
  nextStatus: RestaurantReservationStatus,
  cancellationReason: string | null
): Prisma.RestaurantReservationUpdateInput {
  const now = new Date();

  const data: Prisma.RestaurantReservationUpdateInput = {
    status: nextStatus,
  };

  if (nextStatus === RestaurantReservationStatus.CONFIRMED) {
    data.confirmedAt = now;
    data.cancelledAt = null;
    data.noShowAt = null;
    data.cancelReason = null;
  }

  if (nextStatus === RestaurantReservationStatus.COMPLETED) {
    data.completedAt = now;
  }

  if (nextStatus === RestaurantReservationStatus.NO_SHOW) {
    data.noShowAt = now;
  }

  if (nextStatus === RestaurantReservationStatus.CANCELLED) {
    data.cancelledAt = now;
    data.cancelReason = cancellationReason || "Cancelled by vendor.";
  }

  if (nextStatus === RestaurantReservationStatus.REJECTED) {
    data.cancelledAt = now;
    data.cancelReason = cancellationReason || "Rejected by vendor.";
  }

  return data;
}

function formatReservation(reservation: {
  id: string;
  reservationCode: string;
  restaurantId: string;
  tableId: string | null;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  guests: number;
  amount: Prisma.Decimal;
  currency: string;
  status: RestaurantReservationStatus;
  source: string;
  paymentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  noShowAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    coverImage: string | null;
    logo: string | null;
    city: string | null;
    area: string | null;
    phone: string | null;
    email: string | null;
  };
  table: {
    id: string;
    tableNumber: string;
    capacity: number;
    seatingArea: string | null;
  } | null;
}) {
  return {
    id: reservation.id,
    reservationCode: reservation.reservationCode,
    restaurantId: reservation.restaurantId,
    tableId: reservation.tableId,
    reservationDate: reservation.reservationDate.toISOString().slice(0, 10),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    slotMinutes: reservation.slotMinutes,
    guests: reservation.guests,
    amount: reservation.amount.toString(),
    currency: reservation.currency,
    status: reservation.status,
    source: reservation.source,
    paymentStatus: reservation.paymentStatus,
    customerName: reservation.customerName,
    customerEmail: reservation.customerEmail,
    customerPhone: reservation.customerPhone,
    customerNote: reservation.customerNote,
    cancellationReason: reservation.cancelReason,
    confirmedAt: reservation.confirmedAt
      ? reservation.confirmedAt.toISOString()
      : null,
    cancelledAt: reservation.cancelledAt
      ? reservation.cancelledAt.toISOString()
      : null,
    arrivedAt: null,
    completedAt: reservation.completedAt
      ? reservation.completedAt.toISOString()
      : null,
    noShowAt: reservation.noShowAt ? reservation.noShowAt.toISOString() : null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    restaurant: reservation.restaurant,
    table: reservation.table,
  };
}

async function getVendorProfile(userId: string) {
  return prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      businessName: true,
    },
  });
}

async function getVendorReservation(reservationId: string, vendorId: string) {
  return prisma.restaurantReservation.findFirst({
    where: {
      id: reservationId,
      restaurant: {
        vendorId,
      },
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          logo: true,
          city: true,
          area: true,
          phone: true,
          email: true,
        },
      },
      table: {
        select: {
          id: true,
          tableNumber: true,
          capacity: true,
          seatingArea: true,
        },
      },
    },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          reservation: null,
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can access restaurant reservations.",
          reservation: null,
        },
        { status: 403 }
      );
    }

    const { id: reservationId } = await params;

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation ID is required.",
          reservation: null,
        },
        { status: 400 }
      );
    }

    const vendor = await getVendorProfile(user.id);

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor profile was not found.",
          reservation: null,
        },
        { status: 404 }
      );
    }

    const reservation = await getVendorReservation(reservationId, vendor.id);

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation was not found or you do not have access to it.",
          reservation: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reservation loaded successfully.",
      reservation: formatReservation(reservation),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_RESERVATION_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load restaurant reservation.",
        reservation: null,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update restaurant reservations.",
        },
        { status: 403 }
      );
    }

    const { id: reservationId } = await params;

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation ID is required.",
        },
        { status: 400 }
      );
    }

    const vendor = await getVendorProfile(user.id);

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor profile was not found.",
        },
        { status: 404 }
      );
    }

    const existingReservation = await getVendorReservation(
      reservationId,
      vendor.id
    );

    if (!existingReservation) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation was not found or you do not have access to it.",
        },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | UpdateReservationRequestBody
      | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation update details are required.",
        },
        { status: 400 }
      );
    }

    const nextStatus = parseReservationStatus(body.status);

    if (!nextStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid reservation status.",
        },
        { status: 400 }
      );
    }

    const transitionValidation = canUpdateReservationStatus(
      existingReservation.status,
      nextStatus
    );

    if (!transitionValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: transitionValidation.message,
        },
        { status: 409 }
      );
    }

    const cancellationReason = normalizeOptionalText(body.cancellationReason);

    if (
      (nextStatus === RestaurantReservationStatus.CANCELLED ||
        nextStatus === RestaurantReservationStatus.REJECTED) &&
      !cancellationReason
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cancellation or rejection reason is required.",
        },
        { status: 400 }
      );
    }

    const updatedReservation = await prisma.restaurantReservation.update({
      where: {
        id: reservationId,
      },
      data: buildStatusUpdateData(nextStatus, cancellationReason),
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImage: true,
            logo: true,
            city: true,
            area: true,
            phone: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            seatingArea: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reservation marked as ${formatStatusLabel(
        updatedReservation.status
      )} successfully.`,
      reservation: formatReservation(updatedReservation),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_RESERVATION_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update restaurant reservation.",
      },
      { status: 500 }
    );
  }
}