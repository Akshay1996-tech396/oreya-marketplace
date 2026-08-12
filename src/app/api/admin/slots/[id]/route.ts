import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAdminSlotBody = {
  serviceId?: string;
  vendorId?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number | string;
  note?: string;
  isActive?: boolean;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function convertTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getTodayDateOnly() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return today;
}

function parseOptionalText(value: unknown) {
  const text = String(value || "").trim();

  return text.length > 0 ? text : null;
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
          message: "Only admins can update appointment slots.",
          redirectTo: getDashboardPath(user.role),
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingSlot = await prisma.appointmentSlot.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        vendorId: true,
        serviceId: true,
        bookedCount: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!existingSlot) {
      return NextResponse.json(
        {
          success: false,
          message: "Appointment slot not found.",
        },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UpdateAdminSlotBody;

    const serviceId = String(body.serviceId || "").trim();
    const incomingVendorId = String(body.vendorId || "").trim() || null;
    const dateValue = String(body.date || "").trim();
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();
    const capacity = Number(body.capacity || 0);
    const note = parseOptionalText(body.note);
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!serviceId) {
      return NextResponse.json(
        { success: false, message: "Please select a service." },
        { status: 400 }
      );
    }

    const slotDate = parseDateOnly(dateValue);

    if (!slotDate) {
      return NextResponse.json(
        { success: false, message: "Please select a valid appointment date." },
        { status: 400 }
      );
    }

    if (slotDate < getTodayDateOnly()) {
      return NextResponse.json(
        {
          success: false,
          message: "Appointment date cannot be in the past.",
        },
        { status: 400 }
      );
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select valid start time and end time.",
        },
        { status: 400 }
      );
    }

    const startMinutes = convertTimeToMinutes(startTime);
    const endMinutes = convertTimeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "End time must be later than start time.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Capacity must be a whole number greater than zero.",
        },
        { status: 400 }
      );
    }

    if (capacity < existingSlot.bookedCount) {
      return NextResponse.json(
        {
          success: false,
          message: `Capacity cannot be less than current booked count (${existingSlot.bookedCount}).`,
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected service was not found.",
        },
        { status: 404 }
      );
    }

    if (service.status === "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Inactive services cannot have appointment slots.",
        },
        { status: 400 }
      );
    }

    if (incomingVendorId && incomingVendorId !== service.vendorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected vendor does not match the owner of the selected service.",
        },
        { status: 400 }
      );
    }

    if (service.vendorId) {
      if (!service.vendor) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected service vendor was not found.",
          },
          { status: 404 }
        );
      }

      if (service.vendor.status !== "APPROVED") {
        return NextResponse.json(
          {
            success: false,
            message: "Only approved vendor services can have appointment slots.",
          },
          { status: 400 }
        );
      }
    }

    if (
      existingSlot._count.bookings > 0 &&
      (existingSlot.serviceId !== service.id ||
        existingSlot.vendorId !== service.vendorId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This slot already has bookings. Service or owner cannot be changed.",
        },
        { status: 400 }
      );
    }

    const overlappingSlot = await prisma.appointmentSlot.findFirst({
      where: {
        id: {
          not: id,
        },
        serviceId: service.id,
        date: slotDate,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
      select: {
        id: true,
      },
    });

    if (overlappingSlot) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another slot already exists for this service within the selected time range.",
        },
        { status: 409 }
      );
    }

    const updatedSlot = await prisma.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.update({
        where: {
          id,
        },
        data: {
          service: {
            connect: {
              id: service.id,
            },
          },
          vendor: service.vendorId
            ? {
                connect: {
                  id: service.vendorId,
                },
              }
            : {
                disconnect: true,
              },
          date: slotDate,
          startTime,
          endTime,
          durationMinutes,
          capacity,
          isActive,
          note,
        },
        select: {
          id: true,
          vendorId: true,
          serviceId: true,
          date: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          capacity: true,
          bookedCount: true,
          isActive: true,
          note: true,
        },
      });

      await tx.booking.updateMany({
        where: {
          slotId: id,
        },
        data: {
          bookingDate: slotDate,
          startTime,
          endTime,
          durationMinutes,
        },
      });

      return slot;
    });

    return NextResponse.json({
      success: true,
      message: "Appointment slot updated successfully.",
      slot: updatedSlot,
    });
  } catch (error) {
    console.error("ADMIN_UPDATE_APPOINTMENT_SLOT_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A slot already exists for this service, date and time.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid service or slot reference.",
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
            : "Something went wrong while updating the appointment slot.",
      },
      { status: 500 }
    );
  }
}