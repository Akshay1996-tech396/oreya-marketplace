import {
  RestaurantReservationStatus,
  RestaurantTableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AvailableRestaurantTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  seatingArea: string | null;
  note: string | null;
};

export type AvailableRestaurantSlot = {
  time: string;
  label: string;
  startTime: string;
  endTime: string;
  availableTables: AvailableRestaurantTable[];
};

export type CalculateRestaurantSlotsInput = {
  restaurantId: string;
  date: string;
  guestCount: number;
  tableId?: string | null;
};

export type CalculateRestaurantSlotsResult = {
  success: boolean;
  message: string;
  date: string;
  slotMinutes: number;
  bufferMinutes: number;
  slots: AvailableRestaurantSlot[];
};

export type ValidateRestaurantTableSlotAvailabilityResult = {
  success: boolean;
  message: string;
  slotMinutes: number;
  bufferMinutes: number;
  slot: AvailableRestaurantSlot | null;
  table: AvailableRestaurantTable | null;
};

const BLOCKING_RESERVATION_STATUSES: RestaurantReservationStatus[] = [
  RestaurantReservationStatus.PENDING,
  RestaurantReservationStatus.CONFIRMED,
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeOptionalId(value: unknown) {
  const normalizedValue = normalizeText(value);

  if (
    !normalizedValue ||
    normalizedValue === "null" ||
    normalizedValue === "undefined" ||
    normalizedValue === "ALL"
  ) {
    return null;
  }

  return normalizedValue;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateParts(value: string) {
  if (!isValidDateString(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function toDatabaseDate(value: string) {
  const parts = parseDateParts(value);

  if (!parts) {
    return null;
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function toLocalCalendarDate(value: string) {
  const parts = parseDateParts(value);

  if (!parts) {
    return null;
  }

  return new Date(parts.year, parts.month - 1, parts.day);
}

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatDateString(new Date());
}

function getDayDifferenceFromToday(date: string) {
  const selectedDate = toLocalCalendarDate(date);

  if (!selectedDate) {
    return null;
  }

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const selectedOnly = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor(
    (selectedOnly.getTime() - todayOnly.getTime()) / millisecondsPerDay
  );
}

function normalizeTimeValue(value: string | null | undefined) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  const twentyFourHourMatch =
    /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(normalizedValue);

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = twentyFourHourMatch[2];

    if (hours < 0 || hours > 23) {
      return normalizedValue;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  const twelveHourMatch =
    /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i.exec(normalizedValue);

  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = twelveHourMatch[2];
    const period = twelveHourMatch[3].toUpperCase();

    if (hours < 1 || hours > 12) {
      return normalizedValue;
    }

    if (period === "PM" && hours < 12) {
      hours += 12;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  return normalizedValue;
}

function parseTimeToMinutes(value: string | null | undefined) {
  const normalizedTime = normalizeTimeValue(value);

  if (!normalizedTime) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalizedTime);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function formatTimeLabel(value: string) {
  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return value;
  }

  let hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(
    2,
    "0"
  )} ${period}`;
}

function formatSlotLabel(startTime: string, endTime: string) {
  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function isSameDateString(first: string, second: string) {
  return first === second;
}

function getCurrentTimeInMinutes() {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

function getReservationDateDayOfWeek(date: string) {
  const localDate = toLocalCalendarDate(date);

  if (!localDate) {
    return null;
  }

  return localDate.getDay();
}

export async function calculateRestaurantAvailableSlots(
  input: CalculateRestaurantSlotsInput
): Promise<CalculateRestaurantSlotsResult> {
  const restaurantId = normalizeText(input.restaurantId);
  const date = normalizeText(input.date);
  const guestCount = Number(input.guestCount);
  const selectedTableId = normalizeOptionalId(input.tableId);

  const emptyResult: CalculateRestaurantSlotsResult = {
    success: false,
    message: "No available reservation slots were found.",
    date,
    slotMinutes: 0,
    bufferMinutes: 0,
    slots: [],
  };

  if (!restaurantId) {
    return {
      ...emptyResult,
      message: "Restaurant ID is required.",
    };
  }

  if (!date || !isValidDateString(date)) {
    return {
      ...emptyResult,
      message: "A valid reservation date is required.",
    };
  }

  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return {
      ...emptyResult,
      message: "Guest count must be at least 1.",
    };
  }

  const databaseDate = toDatabaseDate(date);
  const dayOfWeek = getReservationDateDayOfWeek(date);

  if (!databaseDate || dayOfWeek === null) {
    return {
      ...emptyResult,
      message: "A valid reservation date is required.",
    };
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: {
      id: restaurantId,
    },
    include: {
      operatingHours: true,
      specialHours: {
        where: {
          date: databaseDate,
        },
      },
      tables: {
        where: {
          status: RestaurantTableStatus.ACTIVE,
          isReservable: true,
          capacity: {
            gte: guestCount,
          },
          ...(selectedTableId
            ? {
                id: selectedTableId,
              }
            : {}),
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            capacity: "asc",
          },
          {
            tableNumber: "asc",
          },
        ],
      },
      reservations: {
        where: {
          reservationDate: databaseDate,
          status: {
            in: BLOCKING_RESERVATION_STATUSES,
          },
        },
      },
      blockedSlots: {
        where: {
          date: databaseDate,
        },
      },
    },
  });

  if (!restaurant) {
    return {
      ...emptyResult,
      message: "Restaurant was not found.",
    };
  }

  if (restaurant.status !== "ACTIVE") {
    return {
      ...emptyResult,
      message: "This restaurant is not accepting reservations right now.",
    };
  }

  if (!restaurant.isTableReservationAvailable) {
    return {
      ...emptyResult,
      message: "Table reservation is currently disabled for this restaurant.",
    };
  }

  if (guestCount < restaurant.reservationMinGuests) {
    return {
      ...emptyResult,
      message: `Minimum guest count is ${restaurant.reservationMinGuests}.`,
    };
  }

  if (
    restaurant.reservationMaxGuests &&
    guestCount > restaurant.reservationMaxGuests
  ) {
    return {
      ...emptyResult,
      message: `Maximum guest count is ${restaurant.reservationMaxGuests}.`,
    };
  }

  const dayDifference = getDayDifferenceFromToday(date);

  if (dayDifference === null) {
    return {
      ...emptyResult,
      message: "A valid reservation date is required.",
    };
  }

  if (dayDifference < 0) {
    return {
      ...emptyResult,
      message: "Reservations cannot be created for a past date.",
    };
  }

  if (dayDifference === 0 && !restaurant.allowSameDayReservation) {
    return {
      ...emptyResult,
      message: "Same-day reservations are not allowed for this restaurant.",
    };
  }

  if (dayDifference > restaurant.reservationAdvanceDays) {
    return {
      ...emptyResult,
      message: `Reservations can only be created up to ${restaurant.reservationAdvanceDays} days in advance.`,
    };
  }

  if (restaurant.tables.length === 0) {
    return {
      ...emptyResult,
      message: selectedTableId
        ? "The selected table is not active, not reservable, or cannot serve this guest count."
        : "No active reservable table is available for this guest count.",
    };
  }

  const specialHour = restaurant.specialHours[0] || null;
  const regularHour =
    restaurant.operatingHours.find((hour) => hour.dayOfWeek === dayOfWeek) ||
    null;

  if (specialHour?.isClosed) {
    return {
      ...emptyResult,
      message: "The restaurant is closed on the selected date.",
    };
  }

  if (!specialHour && (!regularHour || regularHour.isClosed)) {
    return {
      ...emptyResult,
      message: "The restaurant is closed on the selected day.",
    };
  }

  const openTime = specialHour?.openTime || regularHour?.openTime || null;
  const closeTime = specialHour?.closeTime || regularHour?.closeTime || null;

  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return {
      ...emptyResult,
      message: "Restaurant opening and closing time are not configured.",
    };
  }

  const slotMinutes =
    regularHour?.slotMinutes && regularHour.slotMinutes > 0
      ? regularHour.slotMinutes
      : restaurant.reservationSlotMinutes;

  const bufferMinutes =
    restaurant.reservationBufferMinutes > 0
      ? restaurant.reservationBufferMinutes
      : 0;

  if (slotMinutes <= 0) {
    return {
      ...emptyResult,
      message: "Reservation slot duration is not configured correctly.",
    };
  }

  if (closeMinutes <= openMinutes) {
    return {
      ...emptyResult,
      message:
        "Restaurant opening and closing time are not configured correctly.",
    };
  }

  const lastReservationTimeMinutes = parseTimeToMinutes(
    regularHour?.lastReservationTime
  );

  const finalStartLimitByClosingTime = closeMinutes - slotMinutes;
  const finalStartLimit =
    lastReservationTimeMinutes !== null
      ? Math.min(finalStartLimitByClosingTime, lastReservationTimeMinutes)
      : finalStartLimitByClosingTime;

  if (finalStartLimit < openMinutes) {
    return {
      ...emptyResult,
      message: "No reservation slot fits within the configured operating hours.",
    };
  }

  const todayDateString = getTodayDateString();
  const isToday = isSameDateString(date, todayDateString);
  const currentTimeInMinutes = getCurrentTimeInMinutes();
  const noticeLimitMinutes =
    currentTimeInMinutes + restaurant.reservationNoticeMinutes;

  const slots: AvailableRestaurantSlot[] = [];
  const slotStepMinutes = slotMinutes + bufferMinutes;

  for (
    let slotStartMinutes = openMinutes;
    slotStartMinutes <= finalStartLimit;
    slotStartMinutes += slotStepMinutes
  ) {
    const slotEndMinutes = slotStartMinutes + slotMinutes;

    if (isToday && slotStartMinutes < noticeLimitMinutes) {
      continue;
    }

    const availableTables = restaurant.tables
      .filter((table) => {
        const hasBlockingReservation = restaurant.reservations.some(
          (reservation) => {
            if (!reservation.tableId || reservation.tableId !== table.id) {
              return false;
            }

            const reservationStartMinutes = parseTimeToMinutes(
              reservation.startTime
            );
            const reservationEndMinutes = parseTimeToMinutes(
              reservation.endTime
            );

            if (
              reservationStartMinutes === null ||
              reservationEndMinutes === null
            ) {
              return false;
            }

            return rangesOverlap(
              slotStartMinutes,
              slotEndMinutes,
              reservationStartMinutes,
              reservationEndMinutes
            );
          }
        );

        if (hasBlockingReservation) {
          return false;
        }

        const hasBlockingSlot = restaurant.blockedSlots.some((blockedSlot) => {
          if (blockedSlot.tableId && blockedSlot.tableId !== table.id) {
            return false;
          }

          const blockedStartMinutes = parseTimeToMinutes(blockedSlot.startTime);
          const blockedEndMinutes = parseTimeToMinutes(blockedSlot.endTime);

          if (blockedStartMinutes === null || blockedEndMinutes === null) {
            return false;
          }

          return rangesOverlap(
            slotStartMinutes,
            slotEndMinutes,
            blockedStartMinutes,
            blockedEndMinutes
          );
        });

        return !hasBlockingSlot;
      })
      .map((table) => ({
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        seatingArea: table.seatingArea,
        note: table.note,
      }));

    if (availableTables.length === 0) {
      continue;
    }

    const startTime = minutesToTime(slotStartMinutes);
    const endTime = minutesToTime(slotEndMinutes);

    slots.push({
      time: startTime,
      label: formatSlotLabel(startTime, endTime),
      startTime,
      endTime,
      availableTables,
    });
  }

  return {
    success: slots.length > 0,
    message:
      slots.length > 0
        ? "Available reservation slots loaded successfully."
        : "No available reservation slots were found for the selected date and guest count.",
    date,
    slotMinutes,
    bufferMinutes,
    slots,
  };
}

export async function validateRestaurantTableSlotAvailability(input: {
  restaurantId: string;
  tableId: string;
  date: string;
  startTime: string;
  guestCount: number;
}): Promise<ValidateRestaurantTableSlotAvailabilityResult> {
  const normalizedStartTime = normalizeTimeValue(input.startTime);

  const result = await calculateRestaurantAvailableSlots({
    restaurantId: input.restaurantId,
    date: input.date,
    guestCount: input.guestCount,
    tableId: input.tableId,
  });

  if (!result.success) {
    return {
      success: false,
      message: result.message,
      slotMinutes: result.slotMinutes,
      bufferMinutes: result.bufferMinutes,
      slot: null,
      table: null,
    };
  }

  const slot = result.slots.find((item) => {
    return normalizeTimeValue(item.startTime) === normalizedStartTime;
  });

  if (!slot) {
    return {
      success: false,
      message: "The selected time slot is no longer available.",
      slotMinutes: result.slotMinutes,
      bufferMinutes: result.bufferMinutes,
      slot: null,
      table: null,
    };
  }

  const table = slot.availableTables.find((item) => item.id === input.tableId);

  if (!table) {
    return {
      success: false,
      message: "The selected table is no longer available for this slot.",
      slotMinutes: result.slotMinutes,
      bufferMinutes: result.bufferMinutes,
      slot: null,
      table: null,
    };
  }

  return {
    success: true,
    message: "The selected table and slot are available.",
    slotMinutes: result.slotMinutes,
    bufferMinutes: result.bufferMinutes,
    slot,
    table,
  };
}