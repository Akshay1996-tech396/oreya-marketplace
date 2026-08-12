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

type OperatingHourInput = {
  dayOfWeek?: number;
  isClosed?: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  slotMinutes?: number | null;
  lastReservationTime?: string | null;
};

type UpdateOperatingHoursRequestBody = {
  hours?: OperatingHourInput[];
};

function isValidTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function parseTimeToMinutes(value: unknown) {
  if (!isValidTime(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalTime(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeOptionalSlotMinutes(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const slotMinutes = Number(value);

  return Number.isInteger(slotMinutes) ? slotMinutes : Number.NaN;
}

function formatOperatingHour(hour: {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  slotMinutes: number | null;
  lastReservationTime: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: hour.id,
    restaurantId: hour.restaurantId,
    dayOfWeek: hour.dayOfWeek,
    isClosed: hour.isClosed,
    openTime: hour.openTime,
    closeTime: hour.closeTime,
    slotMinutes: hour.slotMinutes,
    lastReservationTime: hour.lastReservationTime,
    createdAt: hour.createdAt.toISOString(),
    updatedAt: hour.updatedAt.toISOString(),
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

async function getVendorRestaurant(restaurantId: string, vendorId: string) {
  return prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      vendorId,
    },
    select: {
      id: true,
      name: true,
      vendorId: true,
      reservationSlotMinutes: true,
    },
  });
}

function validateOperatingHours(
  hours: OperatingHourInput[],
  defaultSlotMinutes: number
) {
  if (!Array.isArray(hours)) {
    return "Operating hours must be provided as an array.";
  }

  if (hours.length === 0) {
    return "At least one operating hour record is required.";
  }

  const usedDays = new Set<number>();

  for (const hour of hours) {
    const dayOfWeek = Number(hour.dayOfWeek);
    const isClosed = hour.isClosed === true;

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return "Each operating hour must have a valid day of week between 0 and 6.";
    }

    if (usedDays.has(dayOfWeek)) {
      return "Duplicate operating hour records are not allowed for the same day.";
    }

    usedDays.add(dayOfWeek);

    if (isClosed) {
      continue;
    }

    const openTime = normalizeOptionalTime(hour.openTime);
    const closeTime = normalizeOptionalTime(hour.closeTime);
    const lastReservationTime = normalizeOptionalTime(hour.lastReservationTime);
    const slotMinutesOverride = normalizeOptionalSlotMinutes(hour.slotMinutes);
    const effectiveSlotMinutes =
      slotMinutesOverride === null
        ? defaultSlotMinutes
        : slotMinutesOverride;

    if (!isValidTime(openTime)) {
      return "Opening time must be a valid time in HH:mm format.";
    }

    if (!isValidTime(closeTime)) {
      return "Closing time must be a valid time in HH:mm format.";
    }

    const openMinutes = parseTimeToMinutes(openTime);
    const closeMinutes = parseTimeToMinutes(closeTime);

    if (
      openMinutes === null ||
      closeMinutes === null ||
      closeMinutes <= openMinutes
    ) {
      return "Closing time must be later than opening time.";
    }

    if (
      !Number.isInteger(effectiveSlotMinutes) ||
      effectiveSlotMinutes < 15 ||
      effectiveSlotMinutes > 240
    ) {
      return "Slot duration must be between 15 and 240 minutes.";
    }

    if (closeMinutes - openMinutes < effectiveSlotMinutes) {
      return "At least one reservation slot must fit between opening time and closing time.";
    }

    if (lastReservationTime) {
      if (!isValidTime(lastReservationTime)) {
        return "Last reservation time must be a valid time in HH:mm format.";
      }

      const lastReservationMinutes = parseTimeToMinutes(lastReservationTime);

      if (
        lastReservationMinutes === null ||
        lastReservationMinutes < openMinutes ||
        lastReservationMinutes > closeMinutes
      ) {
        return "Last reservation time must be between opening time and closing time.";
      }
    }
  }

  return null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          hours: [],
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can access restaurant operating hours.",
          hours: [],
        },
        { status: 403 }
      );
    }

    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant ID is required.",
          hours: [],
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
          hours: [],
        },
        { status: 404 }
      );
    }

    const restaurant = await getVendorRestaurant(restaurantId, vendor.id);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
          hours: [],
        },
        { status: 404 }
      );
    }

    const operatingHours = await prisma.restaurantOperatingHour.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        dayOfWeek: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Operating hours loaded successfully.",
      hours: operatingHours.map(formatOperatingHour),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_OPERATING_HOURS_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load restaurant operating hours.",
        hours: [],
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          hours: [],
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update restaurant operating hours.",
          hours: [],
        },
        { status: 403 }
      );
    }

    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant ID is required.",
          hours: [],
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
          hours: [],
        },
        { status: 404 }
      );
    }

    const restaurant = await getVendorRestaurant(restaurantId, vendor.id);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
          hours: [],
        },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | UpdateOperatingHoursRequestBody
      | null;

    if (!body || !Array.isArray(body.hours)) {
      return NextResponse.json(
        {
          success: false,
          message: "Operating hours are required.",
          hours: [],
        },
        { status: 400 }
      );
    }

    const validationError = validateOperatingHours(
      body.hours,
      restaurant.reservationSlotMinutes
    );

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
          hours: [],
        },
        { status: 400 }
      );
    }

    const createData: Prisma.RestaurantOperatingHourCreateManyInput[] =
      body.hours.map((hour) => {
        const isClosed = hour.isClosed === true;

        return {
          restaurantId,
          dayOfWeek: Number(hour.dayOfWeek),
          isClosed,
          openTime: isClosed ? null : normalizeOptionalTime(hour.openTime),
          closeTime: isClosed ? null : normalizeOptionalTime(hour.closeTime),
          slotMinutes: isClosed
            ? null
            : normalizeOptionalSlotMinutes(hour.slotMinutes),
          lastReservationTime: isClosed
            ? null
            : normalizeOptionalTime(hour.lastReservationTime),
        };
      });

    await prisma.$transaction([
      prisma.restaurantOperatingHour.deleteMany({
        where: {
          restaurantId,
        },
      }),
      prisma.restaurantOperatingHour.createMany({
        data: createData,
      }),
    ]);

    const updatedOperatingHours =
      await prisma.restaurantOperatingHour.findMany({
        where: {
          restaurantId,
        },
        orderBy: {
          dayOfWeek: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      message: "Operating hours saved successfully.",
      hours: updatedOperatingHours.map(formatOperatingHour),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_OPERATING_HOURS_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save restaurant operating hours.",
        hours: [],
      },
      { status: 500 }
    );
  }
}