import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CreateSlotBody = {
  serviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: string | number;
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

async function getApprovedVendor(userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!vendor) {
    return {
      vendor: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Vendor profile nahi mila.",
        },
        { status: 404 }
      ),
    };
  }

  if (vendor.status !== "APPROVED") {
    return {
      vendor: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only approved vendors can manage appointment slots.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    vendor,
    response: null,
  };
}

export async function GET() {
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
          message: "Only vendors can view appointment slots.",
        },
        { status: 403 }
      );
    }

    const { vendor, response } = await getApprovedVendor(user.id);

    if (response) {
      return response;
    }

    const slots = await prisma.appointmentSlot.findMany({
      where: {
        vendorId: vendor!.id,
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            duration: true,
            status: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      slots: slots.map((slot) => ({
        id: slot.id,
        serviceId: slot.serviceId,
        serviceTitle: slot.service.title,
        serviceSlug: slot.service.slug,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        bookingsCount: slot._count.bookings,
        isActive: slot.isActive,
        note: slot.note,
        serviceStatus: slot.service.status,
        createdAt: slot.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET_VENDOR_APPOINTMENT_SLOTS_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Appointment slots load nahi ho paaye.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
          message: "Only vendors can create appointment slots.",
        },
        { status: 403 }
      );
    }

    const { vendor, response } = await getApprovedVendor(user.id);

    if (response) {
      return response;
    }

    const body = (await request.json()) as CreateSlotBody;

    const serviceId = body.serviceId?.trim();
    const date = body.date?.trim();
    const startTime = body.startTime?.trim();
    const endTime = body.endTime?.trim();
    const capacity = Number(body.capacity || 1);
    const note = body.note?.trim() || null;
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : true;

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a service.",
        },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select appointment date.",
        },
        { status: 400 }
      );
    }

    if (!startTime || !isValidTime(startTime)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select valid start time.",
        },
        { status: 400 }
      );
    }

    if (!endTime || !isValidTime(endTime)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select valid end time.",
        },
        { status: 400 }
      );
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        {
          success: false,
          message: "End time start time se bada hona chahiye.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Capacity minimum 1 honi chahiye.",
        },
        { status: 400 }
      );
    }

    const slotDate = createDateOnly(date);

    if (Number.isNaN(slotDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date selected.",
        },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        vendorId: vendor!.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service nahi mili ya ye service aapki nahi hai.",
        },
        { status: 404 }
      );
    }

    if (service.status === "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Inactive service ke liye slot create nahi kar sakte.",
        },
        { status: 400 }
      );
    }

    const durationMinutes = endMinutes - startMinutes;

    const slot = await prisma.appointmentSlot.create({
      data: {
        vendorId: vendor!.id,
        serviceId: service.id,
        date: slotDate,
        startTime,
        endTime,
        durationMinutes,
        capacity,
        isActive,
        note,
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Appointment slot created successfully.",
        slot: {
          id: slot.id,
          serviceId: slot.serviceId,
          serviceTitle: slot.service.title,
          serviceSlug: slot.service.slug,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          durationMinutes: slot.durationMinutes,
          capacity: slot.capacity,
          bookedCount: slot.bookedCount,
          isActive: slot.isActive,
          note: slot.note,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_VENDOR_APPOINTMENT_SLOT_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Same service ke liye same date aur same time ka slot already exist hai.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Appointment slot create nahi ho paaya.",
      },
      { status: 500 }
    );
  }
}