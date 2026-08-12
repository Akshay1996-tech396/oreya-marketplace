import {
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RestaurantMenuType,
  RestaurantReservationSource,
  RestaurantReservationStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createCheckoutKey } from "@/lib/payments/checkout-data";
import { createOnlinePaymentSession } from "@/lib/payments/payment-service";
import { buildRestaurantReservationCheckoutData } from "@/lib/payments/restaurant-reservation-payment";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";
import { validateRestaurantTableSlotAvailability } from "@/lib/restaurant-slots";

export const dynamic = "force-dynamic";

const MARKETPLACE_TIME_ZONE =
  process.env.MARKETPLACE_TIME_ZONE || "Asia/Dubai";

/**
 * Returns the current calendar date for the configured marketplace
 * timezone as a UTC-midnight Date.
 *
 * Combo validity fields are stored as database DATE values. Converting
 * the marketplace date to UTC midnight prevents server timezone
 * differences from changing the effective validity date.
 */
function getCurrentMarketplaceDate() {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKETPLACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = dateParts.find(
    (part) => part.type === "year"
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month"
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    const currentDate = new Date();

    return new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      )
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReservationMenuItemRequest = {
  id?: string;
  menuItemId?: string;
  name?: string;
  price?: number | string;
  currency?: string;
  quantity?: number | string;
  totalPrice?: number | string;
  image?: string;
};

type ReservationMenuItemResponse = {
  id: string;
  name: string;
  price: string;
  currency: string;
  quantity: number;
  totalPrice: string;
  image: string | null;
};

type ReservationRequestBody = {
  checkoutType?: string;
  paymentMethod?: string;

  tableId?: string;
  date?: string;
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  slotLabel?: string;

  guestCount?: number | string;
  guests?: number | string;

  amount?: number | string;
  currency?: string;
  image?: string;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNote?: string;
  specialRequest?: string;

  menuItems?: ReservationMenuItemRequest[] | string;
  menuItemId?: string;
  menuItemName?: string;
  menuItemPrice?: number | string;
  menuItemCurrency?: string;
  menuItemQuantity?: number | string;
  menuItemTotalPrice?: number | string;
  menuItemIds?: string;
  menuItemNames?: string;
};

type NormalizedRequestedMenuItem = {
  id: string;
  quantity: number;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDatabaseDate(value: string) {
  if (!isValidDateString(value)) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const databaseDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    databaseDate.getUTCFullYear() !== year ||
    databaseDate.getUTCMonth() !== month - 1 ||
    databaseDate.getUTCDate() !== day
  ) {
    return null;
  }

  return databaseDate;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > 0
    ? normalizedValue
    : null;
}

function parseGuestCount(value: unknown) {
  const guestCount = Number(value);

  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1
  ) {
    return null;
  }

  return guestCount;
}

function parsePositiveQuantity(value: unknown) {
  const quantity = Number(value);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return 1;
  }

  return quantity;
}

function parseMoneyNumber(value: unknown) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0;
  }

  return amount;
}

function formatMoney(value: number) {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "0.00";
  }

  return value.toFixed(2);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function generateReservationCode() {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `RR-${timestamp}-${randomPart}`;
}

function parseMenuItemsPayload(
  value: unknown
): ReservationMenuItemRequest[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue;
      }
    } catch (error) {
      console.error(
        "RESTAURANT_RESERVATION_MENU_ITEMS_PARSE_ERROR",
        error
      );
    }
  }

  return [];
}

function normalizeRequestedMenuItems(
  body: ReservationRequestBody
): NormalizedRequestedMenuItem[] {
  const payloadItems = parseMenuItemsPayload(
    body.menuItems
  );

  const normalizedItems = payloadItems
    .map((item) => {
      const id = normalizeText(
        item.id || item.menuItemId
      );

      const quantity = parsePositiveQuantity(
        item.quantity
      );

      if (!id) {
        return null;
      }

      return {
        id,
        quantity,
      };
    })
    .filter(
      (
        item
      ): item is NormalizedRequestedMenuItem =>
        Boolean(item)
    );

  if (
    normalizedItems.length === 0 &&
    body.menuItemId
  ) {
    const fallbackMenuItemId = normalizeText(
      body.menuItemId
    );

    if (fallbackMenuItemId) {
      normalizedItems.push({
        id: fallbackMenuItemId,
        quantity: parsePositiveQuantity(
          body.menuItemQuantity
        ),
      });
    }
  }

  const groupedItems = new Map<
    string,
    number
  >();

  normalizedItems.forEach((item) => {
    groupedItems.set(
      item.id,
      (groupedItems.get(item.id) || 0) +
        item.quantity
    );
  });

  return Array.from(
    groupedItems.entries()
  ).map(([id, quantity]) => ({
    id,
    quantity,
  }));
}

function buildMenuNote(
  menuItems: ReservationMenuItemResponse[]
) {
  if (menuItems.length === 0) {
    return "";
  }

  const lines = menuItems.map((item) => {
    return `- ${item.name} × ${item.quantity} (${item.currency} ${item.price} each) = ${item.currency} ${item.totalPrice}`;
  });

  return `Selected menu items:\n${lines.join(
    "\n"
  )}`;
}

function buildCustomerNoteWithMenuItems(
  customerNote: string | null,
  menuItems: ReservationMenuItemResponse[]
) {
  const menuNote = buildMenuNote(menuItems);

  return (
    [customerNote, menuNote]
      .filter(Boolean)
      .join("\n\n") || null
  );
}

function buildReservationResponse(
  reservation: {
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
    paymentStatus: PaymentStatus;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerNote: string | null;
    createdAt: Date;

    restaurant: {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      area: string | null;
    };

    table: {
      id: string;
      tableNumber: string;
      capacity: number;
      seatingArea: string | null;
    } | null;
  },
  menuItems: ReservationMenuItemResponse[]
) {
  return {
    id: reservation.id,
    reservationCode:
      reservation.reservationCode,
    restaurantId: reservation.restaurantId,
    tableId: reservation.tableId,

    reservationDate:
      reservation.reservationDate
        .toISOString()
        .slice(0, 10),

    startTime: reservation.startTime,
    endTime: reservation.endTime,
    slotMinutes: reservation.slotMinutes,
    guests: reservation.guests,
    amount: reservation.amount.toString(),
    currency: reservation.currency,
    status: reservation.status,
    paymentStatus:
      reservation.paymentStatus,
    customerName: reservation.customerName,
    customerEmail:
      reservation.customerEmail,
    customerPhone:
      reservation.customerPhone,
    customerNote: reservation.customerNote,
    menuItems,
    createdAt:
      reservation.createdAt.toISOString(),
    restaurant: reservation.restaurant,
    table: reservation.table,
  };
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: restaurantId } =
      await params;

    const user = await getCurrentUser();

    const body = (await request
      .json()
      .catch(() => null)) as
      | ReservationRequestBody
      | null;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restaurant ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reservation details are required.",
        },
        {
          status: 400,
        }
      );
    }

    const tableId = normalizeText(
      body.tableId
    );

    const reservationDate = normalizeText(
      body.reservationDate || body.date
    );

    const startTime = normalizeText(
      body.startTime
    );

    const guestCount = parseGuestCount(
      body.guestCount ?? body.guests
    );

    const customerName =
      normalizeOptionalText(
        body.customerName
      );

    const customerEmail =
      normalizeOptionalText(
        body.customerEmail
      );

    const customerPhone =
      normalizeOptionalText(
        body.customerPhone
      );

    const customerNote =
      normalizeOptionalText(
        body.customerNote ||
          body.specialRequest
      );

    if (!tableId) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a table.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !reservationDate ||
      !isValidDateString(reservationDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid reservation date.",
        },
        {
          status: 400,
        }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a reservation time.",
        },
        {
          status: 400,
        }
      );
    }

    if (!guestCount) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Guest count must be at least 1.",
        },
        {
          status: 400,
        }
      );
    }

    const databaseDate = toDatabaseDate(
      reservationDate
    );

    if (!databaseDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid reservation date.",
        },
        {
          status: 400,
        }
      );
    }

    const restaurant =
      await prisma.restaurant.findUnique({
        where: {
          id: restaurantId,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          priceForTwo: true,
          reservationAutoConfirm: true,
          allowGuestReservation: true,
          isTableReservationAvailable: true,

          vendor: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restaurant was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !restaurant.isTableReservationAvailable
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Table reservation is currently disabled for this restaurant.",
        },
        {
          status: 400,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to create a restaurant reservation.",
        },
        {
          status: 401,
        }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only customers can create restaurant reservations from this endpoint.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      customerEmail &&
      !isValidEmail(customerEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid customer email address.",
        },
        {
          status: 400,
        }
      );
    }

    const requestedMenuItems =
      normalizeRequestedMenuItems(body);

    let selectedMenuItems: ReservationMenuItemResponse[] =
      [];

    if (requestedMenuItems.length > 0) {
      const requestedMenuItemIds =
        requestedMenuItems.map(
          (item) => item.id
        );

      /*
       * Menu records are retrieved without filtering their status
       * or validity first. This allows the API to return a precise
       * error when an inactive, future, expired, or incomplete
       * Combo menu is submitted manually.
       */
      const databaseMenuItems =
        await prisma.restaurantMenuItem.findMany({
          where: {
            id: {
              in: requestedMenuItemIds,
            },
            restaurantId,
          },

          select: {
            id: true,
            name: true,
            price: true,
            currency: true,
            image: true,
            isActive: true,
            menuType: true,
            validFrom: true,
            validUntil: true,
          },
        });

      /*
       * A missing result means that an item does not exist or does
       * not belong to the selected restaurant.
       */
      if (
        databaseMenuItems.length !==
        requestedMenuItems.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected menu items are unavailable. Please refresh the restaurant page and try again.",
          },
          {
            status: 400,
          }
        );
      }

      const currentMarketplaceDate =
        getCurrentMarketplaceDate();

      for (const menuItem of databaseMenuItems) {
        if (!menuItem.isActive) {
          return NextResponse.json(
            {
              success: false,
              message: `${menuItem.name} is currently unavailable. Please refresh the restaurant page and select another menu item.`,
            },
            {
              status: 400,
            }
          );
        }

        /*
         * Regular menus do not require a validity period.
         * Combo menus must be within their configured date range.
         */
        if (
          menuItem.menuType ===
          RestaurantMenuType.COMBO
        ) {
          if (
            !menuItem.validFrom ||
            !menuItem.validUntil
          ) {
            return NextResponse.json(
              {
                success: false,
                message: `${menuItem.name} does not have a valid Combo availability period. Please select another menu item.`,
              },
              {
                status: 400,
              }
            );
          }

          if (
            currentMarketplaceDate.getTime() <
            menuItem.validFrom.getTime()
          ) {
            return NextResponse.json(
              {
                success: false,
                message: `${menuItem.name} is not available yet. Please select another menu item.`,
              },
              {
                status: 400,
              }
            );
          }

          if (
            currentMarketplaceDate.getTime() >
            menuItem.validUntil.getTime()
          ) {
            return NextResponse.json(
              {
                success: false,
                message: `${menuItem.name} has expired and can no longer be reserved. Please select another menu item.`,
              },
              {
                status: 400,
              }
            );
          }
        }
      }

      const databaseMenuItemMap = new Map(
        databaseMenuItems.map(
          (menuItem) => [
            menuItem.id,
            menuItem,
          ]
        )
      );

      selectedMenuItems =
        requestedMenuItems.map(
          (requestedMenuItem) => {
            const databaseMenuItem =
              databaseMenuItemMap.get(
                requestedMenuItem.id
              )!;

            /*
             * The price and currency are always taken from the
             * database. Values submitted by the browser are never
             * trusted for reservation pricing.
             */
            const price = parseMoneyNumber(
              databaseMenuItem.price.toString()
            );

            const totalPrice =
              price *
              requestedMenuItem.quantity;

            return {
              id: databaseMenuItem.id,
              name: databaseMenuItem.name,
              price: formatMoney(price),

              currency:
                databaseMenuItem.currency ||
                restaurant.currency,

              quantity:
                requestedMenuItem.quantity,

              totalPrice:
                formatMoney(totalPrice),

              image:
                databaseMenuItem.image,
            };
          }
        );

      const selectedCurrencies =
        Array.from(
          new Set(
            selectedMenuItems.map(
              (item) => item.currency
            )
          )
        );

      if (
        selectedCurrencies.length > 1
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected menu items must use the same currency. Please update the menu configuration.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (requestedMenuItems.length === 0) {
      const currentMarketplaceDate =
        getCurrentMarketplaceDate();

      const availableMenuItemCount =
        await prisma.restaurantMenuItem.count({
          where: {
            restaurantId,
            isActive: true,
            OR: [
              {
                menuType: RestaurantMenuType.REGULAR,
              },
              {
                menuType: RestaurantMenuType.COMBO,
                validFrom: {
                  lte: currentMarketplaceDate,
                },
                validUntil: {
                  gte: currentMarketplaceDate,
                },
              },
            ],
          },
        });

      if (availableMenuItemCount > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select at least one available reservation menu item before continuing.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const reservationAmount =
      selectedMenuItems.length > 0
        ? selectedMenuItems.reduce(
            (total, item) => {
              return (
                total +
                parseMoneyNumber(
                  item.totalPrice
                )
              );
            },
            0
          )
        : restaurant.priceForTwo
          ? parseMoneyNumber(
              restaurant.priceForTwo.toString()
            )
          : 0;

    const reservationCurrency =
      selectedMenuItems[0]?.currency ||
      restaurant.currency;

    if (reservationAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This restaurant does not have a valid online reservation payment amount.",
        },
        {
          status: 400,
        }
      );
    }

    const availability =
      await validateRestaurantTableSlotAvailability(
        {
          restaurantId,
          tableId,
          date: reservationDate,
          startTime,
          guestCount,
        }
      );

    if (
      !availability.success ||
      !availability.slot ||
      !availability.table
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            availability.message ||
            "The selected reservation slot is no longer available.",
        },
        {
          status: 409,
        }
      );
    }

    const resolvedCustomerName =
      customerName || user.name || null;

    const resolvedCustomerEmail =
      customerEmail || user.email || null;

    const checkoutData =
      buildRestaurantReservationCheckoutData({
        restaurantId,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        tableId: availability.table.id,
        tableNumber: availability.table.tableNumber,
        tableCapacity: availability.table.capacity,
        reservationDate,
        startTime: availability.slot.startTime,
        endTime: availability.slot.endTime,
        slotLabel: availability.slot.label,
        slotMinutes: availability.slotMinutes,
        bufferMinutes: availability.bufferMinutes,
        guests: guestCount,
        amount: new Prisma.Decimal(
          formatMoney(reservationAmount)
        ),
        currency: reservationCurrency,
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        customerPhone,
        customerNote,
        image: normalizeOptionalText(body.image),
        menuItems: selectedMenuItems,
      });

    const checkoutKey = createCheckoutKey(
      "RESTAURANT_RESERVATION",
      user.id,
      checkoutData
    );

    const checkoutDigest =
      checkoutKey.split(":")[1];

    const idempotencyKey =
      `restaurant-${checkoutDigest}`;

    const origin = new URL(request.url).origin;

    const successUrl =
      `${origin}/checkout/success?type=restaurant-payment&session_id={CHECKOUT_SESSION_ID}`;

    const failureUrl = new URL(
      "/checkout",
      origin
    );

    failureUrl.searchParams.set(
      "checkoutType",
      "restaurant-reservation"
    );
    failureUrl.searchParams.set(
      "restaurantId",
      restaurantId
    );
    failureUrl.searchParams.set(
      "restaurantSlug",
      restaurant.slug
    );
    failureUrl.searchParams.set(
      "restaurantName",
      restaurant.name
    );
    failureUrl.searchParams.set(
      "reservationDate",
      reservationDate
    );
    failureUrl.searchParams.set(
      "startTime",
      availability.slot.startTime
    );
    failureUrl.searchParams.set(
      "endTime",
      availability.slot.endTime
    );
    failureUrl.searchParams.set(
      "slotLabel",
      availability.slot.label
    );
    failureUrl.searchParams.set(
      "tableId",
      availability.table.id
    );
    failureUrl.searchParams.set(
      "tableNumber",
      availability.table.tableNumber
    );
    failureUrl.searchParams.set(
      "tableCapacity",
      String(availability.table.capacity)
    );
    failureUrl.searchParams.set(
      "guests",
      String(guestCount)
    );
    failureUrl.searchParams.set(
      "slotMinutes",
      String(availability.slotMinutes)
    );
    failureUrl.searchParams.set(
      "bufferMinutes",
      String(availability.bufferMinutes)
    );
    failureUrl.searchParams.set(
      "amount",
      formatMoney(reservationAmount)
    );
    failureUrl.searchParams.set(
      "currency",
      reservationCurrency
    );
    failureUrl.searchParams.set(
      "menuItems",
      JSON.stringify(selectedMenuItems)
    );
    failureUrl.searchParams.set(
      "menuItemIds",
      selectedMenuItems.map((item) => item.id).join(",")
    );
    failureUrl.searchParams.set(
      "menuItemNames",
      selectedMenuItems.map((item) => item.name).join(", ")
    );
    failureUrl.searchParams.set(
      "menuItemQuantity",
      String(
        selectedMenuItems.reduce(
          (total, item) => total + item.quantity,
          0
        )
      )
    );
    failureUrl.searchParams.set(
      "menuItemTotalPrice",
      selectedMenuItems.length > 0
        ? formatMoney(reservationAmount)
        : ""
    );
    failureUrl.searchParams.set(
      "payment",
      "cancelled"
    );

    const paymentSession =
      await createOnlinePaymentSession(
        stripePaymentProvider,
        {
          customer: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          purpose:
            PaymentPurpose.RESTAURANT_RESERVATION,
          amount: new Prisma.Decimal(
            formatMoney(reservationAmount)
          ),
          currency: reservationCurrency,
          idempotencyKey,
          checkoutKey,
          checkoutData,
          reference:
            `OREYA-RESTAURANT-${checkoutDigest.slice(0, 24)}`,
          description:
            `OREYA Restaurant Reservation - ${restaurant.name}`,
          successUrl,
          failureUrl: failureUrl.toString(),
          metadata: {
            restaurant_id: restaurantId,
            table_id: availability.table.id,
          },
        }
      );

    if (!paymentSession.redirectUrl) {
      throw new Error(
        "Stripe did not return a secure checkout URL."
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: paymentSession.reused
          ? "Existing secure restaurant payment session loaded successfully."
          : "Secure restaurant payment session created successfully.",
        requiresOnlinePayment: true,
        paymentId: paymentSession.paymentId,
        providerSessionId:
          paymentSession.providerSessionId,
        redirectUrl: paymentSession.redirectUrl,
        reused: paymentSession.reused,
      },
      {
        status: paymentSession.reused
          ? 200
          : 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE_RESTAURANT_PAYMENT_SESSION_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start secure payment for this restaurant reservation.",
      },
      {
        status: 500,
      }
    );
  }
}