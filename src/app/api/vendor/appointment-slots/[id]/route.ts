import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateSlotBody = {
  serviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | string;
  note?: string;
  isActive?: boolean;
};

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function createDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please sign in first." },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update appointment slots.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateSlotBody;

    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor profile was not found." },
        { status: 404 }
      );
    }

    if (vendor.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Only approved vendors can update appointment slots.",
        },
        { status: 403 }
      );
    }

    const existingSlot = await prisma.appointmentSlot.findFirst({
      where: {
        id,
        vendorId: vendor.id,
      },
    });

    if (!existingSlot) {
      return NextResponse.json(
        {
          success: false,
          message: "The appointment slot was not found.",
        },
        { status: 404 }
      );
    }

    const serviceId = body.serviceId?.trim();
    const date = body.date?.trim();
    const startTime = body.startTime?.trim();
    const endTime = body.endTime?.trim();
    const capacity = Number(body.capacity);
    const note = body.note?.trim() || null;
    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : existingSlot.isActive;

    if (!serviceId || !date || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          message: "Complete all mandatory appointment slot fields.",
        },
        { status: 400 }
      );
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select valid start and end times.",
        },
        { status: 400 }
      );
    }

    const durationMinutes =
      timeToMinutes(endTime) - timeToMinutes(startTime);

    if (durationMinutes <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The end time must be later than the start time.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(capacity) ||
      capacity < Math.max(1, existingSlot.bookedCount)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Capacity must be at least ${Math.max(
            1,
            existingSlot.bookedCount
          )}.`,
        },
        { status: 400 }
      );
    }

    const hasBookings = existingSlot.bookedCount > 0;

    if (
      hasBookings &&
      (serviceId !== existingSlot.serviceId ||
        date !== existingSlot.date.toISOString().slice(0, 10) ||
        startTime !== existingSlot.startTime ||
        endTime !== existingSlot.endTime)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The service, date, and time cannot be changed because this slot already has bookings.",
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        vendorId: vendor.id,
        status: {
          not: "INACTIVE",
        },
      },
      select: {
        id: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid active service.",
        },
        { status: 400 }
      );
    }

    const updatedSlot = await prisma.appointmentSlot.update({
      where: {
        id: existingSlot.id,
      },
      data: {
        serviceId,
        date: createDateOnly(date),
        startTime,
        endTime,
        durationMinutes,
        capacity,
        note,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "The appointment slot was updated successfully.",
      slot: updatedSlot,
    });
  } catch (error) {
    console.error("UPDATE_VENDOR_APPOINTMENT_SLOT_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An appointment slot with the same service, date, and time already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "The appointment slot could not be updated.",
      },
      { status: 500 }
    );
  }
}