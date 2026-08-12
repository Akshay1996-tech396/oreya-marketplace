import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OperatingHourRequestItem = {
  dayOfWeek?: number | string;
  isClosed?: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  slotMinutes?: number | string | null;
  lastReservationTime?: string | null;
};

type OperatingHoursRequestBody = {
  hours?: OperatingHourRequestItem[];
};

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

function isValidTime(value: string | null) {
  if (value === null) {
    return true;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function parseTimeToMinutes(value: string | null) {
  if (!value || !isValidTime(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function parseDayOfWeek(value: unknown) {
  const dayOfWeek = Number(value);

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return null;
  }

  return dayOfWeek;
}

function parseSlotMinutes(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const slotMinutes = Number(value);

  if (!Number.isInteger(slotMinutes) || slotMinutes < 15 || slotMinutes > 240) {
    return null;
  }

  return slotMinutes;
}

function formatOperatingHour(hour: {
  id: string;
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

async function getVendorRestaurant(userId: string, restaurantId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    return null;
  }

  return prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      vendorId: vendor.id,
    },
    select: {
      id: true,
      name: true,
      vendorId: true,
    },
  });
}

function validateOperatingHours(hours: OperatingHourRequestItem[]) {
  const seenDays = new Set<number>();

  for (const hour of hours) {
    const dayOfWeek = parseDayOfWeek(hour.dayOfWeek);

    if (dayOfWeek === null) {
      return {
        success: false,
        message: "Each operating hour must have a valid day of week between 0 and 6.",
      };
    }

    if (seenDays.has(dayOfWeek)) {
      return {
        success: false,
        message: "Duplicate operating hours were found for the same day.",
      };
    }

    seenDays.add(dayOfWeek);

    const isClosed = Boolean(hour.isClosed);
    const openTime = normalizeOptionalTime(hour.openTime);
    const closeTime = normalizeOptionalTime(hour.closeTime);
    const lastReservationTime = normalizeOptionalTime(hour.lastReservationTime);
    const slotMinutes = parseSlotMinutes(hour.slotMinutes);

    if (isClosed) {
      continue;
    }

    if (!openTime) {
      return {
        success: false,
        message: `Opening time is required for day ${dayOfWeek}.`,
      };
    }

    if (!closeTime) {
      return {
        success: false,
        message: `Closing time is required for day ${dayOfWeek}.`,
      };
    }

    if (!isValidTime(openTime)) {
      return {
        success: false,
        message: `Opening time is invalid for day ${dayOfWeek}.`,
      };
    }

    if (!isValidTime(closeTime)) {
      return {
        success: false,
        message: `Closing time is invalid for day ${dayOfWeek}.`,
      };
    }

    if (lastReservationTime && !isValidTime(lastReservationTime)) {
      return {
        success: false,
        message: `Last reservation time is invalid for day ${dayOfWeek}.`,
      };
    }

    if (slotMinutes === null) {
      return {
        success: false,
        message: `Slot duration must be between 15 and 240 minutes for day ${dayOfWeek}.`,
      };
    }

    const openMinutes = parseTimeToMinutes(openTime);
    const closeMinutes = parseTimeToMinutes(closeTime);
    const lastReservationMinutes = parseTimeToMinutes(lastReservationTime);

    if (openMinutes === null || closeMinutes === null) {
      return {
        success: false,
        message: `Opening and closing time are invalid for day ${dayOfWeek}.`,
      };
    }

    if (closeMinutes <= openMinutes) {
      return {
        success: false,
        message: `Closing time must be after opening time for day ${dayOfWeek}.`,
      };
    }

    if (openMinutes + slotMinutes > closeMinutes) {
      return {
        success: false,
        message: `At least one reservation slot must fit within operating hours for day ${dayOfWeek}.`,
      };
    }

    if (lastReservationTime && lastReservationMinutes !== null) {
      if (
        lastReservationMinutes < openMinutes ||
        lastReservationMinutes > closeMinutes
      ) {
        return {
          success: false,
          message: `Last reservation time must be between opening and closing time for day ${dayOfWeek}.`,
        };
      }
    }
  }

  return {
    success: true,
    message: "Operating hours are valid.",
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          operatingHours: [],
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can access restaurant operating hours.",
          operatingHours: [],
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
          operatingHours: [],
        },
        { status: 400 }
      );
    }

    const restaurant = await getVendorRestaurant(user.id, restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
          operatingHours: [],
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
      message: "Restaurant operating hours loaded successfully.",
      operatingHours: operatingHours.map(formatOperatingHour),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_OPERATING_HOURS_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load restaurant operating hours.",
        operatingHours: [],
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
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update restaurant operating hours.",
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
        },
        { status: 400 }
      );
    }

    const restaurant = await getVendorRestaurant(user.id, restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
        },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | OperatingHoursRequestBody
      | null;

    if (!body || !Array.isArray(body.hours)) {
      return NextResponse.json(
        {
          success: false,
          message: "Operating hours are required.",
        },
        { status: 400 }
      );
    }

    if (body.hours.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one operating hour record is required.",
        },
        { status: 400 }
      );
    }

    const validation = validateOperatingHours(body.hours);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    const preparedHours = body.hours.map((hour) => {
      const dayOfWeek = parseDayOfWeek(hour.dayOfWeek) as number;
      const isClosed = Boolean(hour.isClosed);
      const openTime = isClosed ? null : normalizeOptionalTime(hour.openTime);
      const closeTime = isClosed ? null : normalizeOptionalTime(hour.closeTime);
      const slotMinutes = isClosed ? null : parseSlotMinutes(hour.slotMinutes);
      const lastReservationTime = isClosed
        ? null
        : normalizeOptionalTime(hour.lastReservationTime);

      return {
        restaurantId,
        dayOfWeek,
        isClosed,
        openTime,
        closeTime,
        slotMinutes,
        lastReservationTime,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.restaurantOperatingHour.deleteMany({
        where: {
          restaurantId,
        },
      });

      await tx.restaurantOperatingHour.createMany({
        data: preparedHours,
      });
    });

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
      message: "Restaurant operating hours saved successfully.",
      operatingHours: operatingHours.map(formatOperatingHour),
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_OPERATING_HOURS_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save restaurant operating hours.",
      },
      { status: 500 }
    );
  }
}