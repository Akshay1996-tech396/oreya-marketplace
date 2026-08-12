import {
  Prisma,
  RestaurantStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const adminRestaurantSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  phone: true,
  email: true,
  website: true,
  logo: true,
  coverImage: true,
  images: true,
  cuisineTypes: true,
  priceForTwo: true,
  currency: true,
  address: true,
  addressLine1: true,
  addressLine2: true,
  country: true,
  state: true,
  city: true,
  area: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  status: true,
  isTableReservationAvailable: true,
  reservationSlotMinutes: true,
  reservationBufferMinutes: true,
  reservationAdvanceDays: true,
  reservationNoticeMinutes: true,
  reservationMinGuests: true,
  reservationMaxGuests: true,
  reservationAutoConfirm: true,
  allowSameDayReservation: true,
  allowGuestReservation: true,
  reservationTerms: true,
  reservationCancellationNote: true,
  rejectedReason: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  _count: {
    select: {
      tables: true,
      reservations: true,
      reviews: true,
    },
  },
} satisfies Prisma.RestaurantSelect;

type AdminRestaurantRecord =
  Prisma.RestaurantGetPayload<{
    select: typeof adminRestaurantSelect;
  }>;

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      message,
      restaurants: [],
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function isValidRestaurantStatus(
  status: string
): status is RestaurantStatus {
  return Object.values(RestaurantStatus).includes(
    status as RestaurantStatus
  );
}

function normalizeStatusParameter(
  value: string | null
) {
  return value?.trim().toUpperCase() || "";
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0
  );
}

function prepareRestaurant(
  restaurant: AdminRestaurantRecord
) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    shortDescription:
      restaurant.shortDescription,
    phone: restaurant.phone,
    email: restaurant.email,
    website: restaurant.website,
    logo: restaurant.logo,
    coverImage: restaurant.coverImage,
    images: normalizeStringArray(
      restaurant.images
    ),
    cuisineTypes: normalizeStringArray(
      restaurant.cuisineTypes
    ),
    priceForTwo:
      restaurant.priceForTwo !== null
        ? restaurant.priceForTwo.toString()
        : null,
    currency: restaurant.currency,
    address: restaurant.address,
    addressLine1: restaurant.addressLine1,
    addressLine2: restaurant.addressLine2,
    country: restaurant.country,
    state: restaurant.state,
    city: restaurant.city,
    area: restaurant.area,
    zipCode: restaurant.zipCode,
    latitude:
      restaurant.latitude !== null
        ? restaurant.latitude.toString()
        : null,
    longitude:
      restaurant.longitude !== null
        ? restaurant.longitude.toString()
        : null,
    status: restaurant.status,
    isTableReservationAvailable:
      restaurant.isTableReservationAvailable,
    reservationSlotMinutes:
      restaurant.reservationSlotMinutes,
    reservationBufferMinutes:
      restaurant.reservationBufferMinutes,
    reservationAdvanceDays:
      restaurant.reservationAdvanceDays,
    reservationNoticeMinutes:
      restaurant.reservationNoticeMinutes,
    reservationMinGuests:
      restaurant.reservationMinGuests,
    reservationMaxGuests:
      restaurant.reservationMaxGuests,
    reservationAutoConfirm:
      restaurant.reservationAutoConfirm,
    allowSameDayReservation:
      restaurant.allowSameDayReservation,
    allowGuestReservation:
      restaurant.allowGuestReservation,
    reservationTerms:
      restaurant.reservationTerms,
    reservationCancellationNote:
      restaurant.reservationCancellationNote,
    rejectedReason:
      restaurant.rejectedReason,
    createdAt:
      restaurant.createdAt.toISOString(),
    updatedAt:
      restaurant.updatedAt.toISOString(),
    approvedAt: restaurant.approvedAt
      ? restaurant.approvedAt.toISOString()
      : null,
    vendor: {
      id: restaurant.vendor.id,
      businessName:
        restaurant.vendor.businessName,
      slug: restaurant.vendor.slug,
      status: restaurant.vendor.status,
      user: {
        id: restaurant.vendor.user.id,
        name: restaurant.vendor.user.name,
        email:
          restaurant.vendor.user.email,
        phone:
          restaurant.vendor.user.phone,
      },
    },
    category: restaurant.category
      ? {
          id: restaurant.category.id,
          name: restaurant.category.name,
          slug: restaurant.category.slug,
        }
      : null,
    _count: {
      tables: restaurant._count.tables,
      reservations:
        restaurant._count.reservations,
      reviews: restaurant._count.reviews,
    },
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Authentication is required.",
        401
      );
    }

    if (user.role !== "ADMIN") {
      return errorResponse(
        "Only an administrator can access restaurants.",
        403
      );
    }

    const requestUrl = new URL(request.url);
    const requestedStatus =
      normalizeStatusParameter(
        requestUrl.searchParams.get("status")
      );

    let statusFilter:
      | RestaurantStatus
      | undefined;

    if (requestedStatus) {
      if (
        !isValidRestaurantStatus(
          requestedStatus
        )
      ) {
        return errorResponse(
          "The selected restaurant status is invalid.",
          400
        );
      }

      statusFilter = requestedStatus;
    }

    const restaurants:
      AdminRestaurantRecord[] =
      await prisma.restaurant.findMany({
        where: statusFilter
          ? {
              status: statusFilter,
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
        select: adminRestaurantSelect,
      });

    return NextResponse.json(
      {
        success: true,
        restaurants: restaurants.map(
          prepareRestaurant
        ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN_RESTAURANTS_GET_ERROR",
      error
    );

    return errorResponse(
      "Unable to load restaurants at this time.",
      500
    );
  }
}