import {
  Prisma,
  RestaurantStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";


type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RestaurantRequestBody = Record<string, unknown>;

type SpecificationItem = {
  label: string;
  value: string;
};

type DecimalValidationResult = {
  success: boolean;
  message: string;
  decimal: Prisma.Decimal | null;
};

type IntegerValidationResult = {
  success: boolean;
  message: string;
  value: number;
};

type NullableIntegerValidationResult = {
  success: boolean;
  message: string;
  value: number | null;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function isRequestBody(value: unknown): value is RestaurantRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeStringArray(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      values
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
}


function parseSpecifications(
  value: unknown
): SpecificationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const label = normalizeText(row.label);
      const specificationValue = normalizeText(row.value);

      if (!label || !specificationValue) {
        return null;
      }

      return {
        label,
        value: specificationValue,
      };
    })
    .filter(
      (item): item is SpecificationItem =>
        item !== null
    );
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true" || value === "on") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false" || value === "off") {
    return false;
  }

  return fallback;
}

function validateContentText(
  value: unknown,
  fieldLabel: string,
  maxLength: number
) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > maxLength) {
    return {
      success: false,
      message: `${fieldLabel} cannot exceed ${maxLength} characters.`,
      value: null,
    };
  }

  return {
    success: true,
    message: "",
    value:
      normalizedValue.length > 0
        ? normalizedValue
        : null,
  };
}

function validateOptionalNonNegativeDecimal(
  value: unknown,
  fieldName: string
): DecimalValidationResult {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return {
      success: true,
      message: "",
      decimal: null,
    };
  }

  const numericValue = Number(normalizedValue);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return {
      success: false,
      message: `${fieldName} must be a valid non-negative number.`,
      decimal: null,
    };
  }

  return {
    success: true,
    message: "",
    decimal: new Prisma.Decimal(normalizedValue),
  };
}

function validateOptionalCoordinate(
  value: unknown,
  fieldName: "Latitude" | "Longitude",
  minimum: number,
  maximum: number
): DecimalValidationResult {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return {
      success: true,
      message: "",
      decimal: null,
    };
  }

  const numericValue = Number(normalizedValue);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < minimum ||
    numericValue > maximum
  ) {
    return {
      success: false,
      message: `${fieldName} must be a valid number between ${minimum} and ${maximum}.`,
      decimal: null,
    };
  }

  return {
    success: true,
    message: "",
    decimal: new Prisma.Decimal(normalizedValue),
  };
}

function validateInteger(
  value: unknown,
  fallback: number,
  fieldName: string,
  minimum: number
): IntegerValidationResult {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      success: true,
      message: "",
      value: fallback,
    };
  }

  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue < minimum
  ) {
    return {
      success: false,
      message: `${fieldName} must be an integer greater than or equal to ${minimum}.`,
      value: fallback,
    };
  }

  return {
    success: true,
    message: "",
    value: numericValue,
  };
}

function validateNullableInteger(
  value: unknown,
  fieldName: string,
  minimum: number
): NullableIntegerValidationResult {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      success: true,
      message: "",
      value: null,
    };
  }

  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue < minimum
  ) {
    return {
      success: false,
      message: `${fieldName} must be an integer greater than or equal to ${minimum}.`,
      value: null,
    };
  }

  return {
    success: true,
    message: "",
    value: numericValue,
  };
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function createUniqueRestaurantSlug(
  name: string,
  restaurantId: string
) {
  const baseSlug =
    createSlug(name) ||
    `restaurant-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingRestaurant =
      await prisma.restaurant.findFirst({
        where: {
          slug,
          NOT: {
            id: restaurantId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!existingRestaurant) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function getRestaurantStatus(
  requestedStatus: unknown,
  currentStatus: RestaurantStatus
) {
  const normalizedStatus =
    normalizeText(requestedStatus).toUpperCase();

  if (
    normalizedStatus ===
    RestaurantStatus.PENDING_APPROVAL
  ) {
    return RestaurantStatus.PENDING_APPROVAL;
  }

  if (
    normalizedStatus ===
    RestaurantStatus.DRAFT
  ) {
    return RestaurantStatus.DRAFT;
  }

  return currentStatus;
}

function buildRestaurantImages(
  imagesValue: unknown,
  coverImageValue: unknown
) {
  const images =
    normalizeStringArray(imagesValue);

  const coverImage =
    normalizeOptionalText(coverImageValue);

  if (
    coverImage &&
    !images.includes(coverImage)
  ) {
    images.unshift(coverImage);
  }

  return Array.from(new Set(images));
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const restaurantId = id.trim();

    if (!restaurantId) {
      return errorResponse(
        "Restaurant identifier is required.",
        400
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Authentication is required.", 401);
    }

    if (user.role !== "ADMIN") {
      return errorResponse("Only administrators can edit restaurants.", 403);
    }

    const existingRestaurant =
      await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          status: true,
        },
      });

    if (!existingRestaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    const parsedBody = await request
      .json()
      .catch(() => null);

    if (!isRequestBody(parsedBody)) {
      return errorResponse(
        "Valid restaurant details are required.",
        400
      );
    }

    const body = parsedBody;
    const name = normalizeText(body.name);

    if (!name) {
      return errorResponse(
        "Restaurant name is required.",
        400
      );
    }

    const contentLimits = await getContentLimits();

    const shortDescriptionResult =
      validateContentText(
        body.shortDescription,
        "Restaurant short description",
        contentLimits.shortDescription
      );

    if (!shortDescriptionResult.success) {
      return errorResponse(
        shortDescriptionResult.message,
        400
      );
    }

    const descriptionResult =
      validateContentText(
        body.description,
        "Restaurant description",
        contentLimits.description
      );

    if (!descriptionResult.success) {
      return errorResponse(
        descriptionResult.message,
        400
      );
    }

    const exchangePolicyResult =
      validateContentText(
        body.exchangePolicy,
        "Restaurant exchange policy",
        contentLimits.exchangePolicy
      );

    if (!exchangePolicyResult.success) {
      return errorResponse(
        exchangePolicyResult.message,
        400
      );
    }

    const refundPolicyResult =
      validateContentText(
        body.refundPolicy,
        "Restaurant refund policy",
        contentLimits.refundPolicy
      );

    if (!refundPolicyResult.success) {
      return errorResponse(
        refundPolicyResult.message,
        400
      );
    }

    const priceForTwoResult =
      validateOptionalNonNegativeDecimal(
        body.priceForTwo,
        "Price for two"
      );

    if (!priceForTwoResult.success) {
      return errorResponse(
        priceForTwoResult.message,
        400
      );
    }

    const latitudeResult =
      validateOptionalCoordinate(
        body.latitude,
        "Latitude",
        -90,
        90
      );

    if (!latitudeResult.success) {
      return errorResponse(
        latitudeResult.message,
        400
      );
    }

    const longitudeResult =
      validateOptionalCoordinate(
        body.longitude,
        "Longitude",
        -180,
        180
      );

    if (!longitudeResult.success) {
      return errorResponse(
        longitudeResult.message,
        400
      );
    }

    if (
      Boolean(latitudeResult.decimal) !==
      Boolean(longitudeResult.decimal)
    ) {
      return errorResponse(
        "Latitude and longitude must be provided together.",
        400
      );
    }

    const reservationSlotMinutesResult =
      validateInteger(
        body.reservationSlotMinutes,
        60,
        "Reservation slot duration",
        1
      );

    if (!reservationSlotMinutesResult.success) {
      return errorResponse(
        reservationSlotMinutesResult.message,
        400
      );
    }

    const reservationBufferMinutesResult =
      validateInteger(
        body.reservationBufferMinutes,
        0,
        "Reservation buffer time",
        0
      );

    if (!reservationBufferMinutesResult.success) {
      return errorResponse(
        reservationBufferMinutesResult.message,
        400
      );
    }

    const reservationAdvanceDaysResult =
      validateInteger(
        body.reservationAdvanceDays,
        30,
        "Reservation advance booking window",
        1
      );

    if (!reservationAdvanceDaysResult.success) {
      return errorResponse(
        reservationAdvanceDaysResult.message,
        400
      );
    }

    const reservationNoticeMinutesResult =
      validateInteger(
        body.reservationNoticeMinutes,
        60,
        "Reservation minimum notice",
        0
      );

    if (!reservationNoticeMinutesResult.success) {
      return errorResponse(
        reservationNoticeMinutesResult.message,
        400
      );
    }

    const reservationMinGuestsResult =
      validateInteger(
        body.reservationMinGuests,
        1,
        "Minimum guest count",
        1
      );

    if (!reservationMinGuestsResult.success) {
      return errorResponse(
        reservationMinGuestsResult.message,
        400
      );
    }

    const reservationMaxGuestsResult =
      validateNullableInteger(
        body.reservationMaxGuests,
        "Maximum guest count",
        1
      );

    if (!reservationMaxGuestsResult.success) {
      return errorResponse(
        reservationMaxGuestsResult.message,
        400
      );
    }

    if (
      reservationMaxGuestsResult.value !== null &&
      reservationMaxGuestsResult.value <
        reservationMinGuestsResult.value
    ) {
      return errorResponse(
        "Maximum guest count cannot be lower than the minimum guest count.",
        400
      );
    }

    const slug =
      name === existingRestaurant.name
        ? existingRestaurant.slug
        : await createUniqueRestaurantSlug(
            name,
            existingRestaurant.id
          );

    const categoryId =
      Object.prototype.hasOwnProperty.call(
        body,
        "categoryId"
      )
        ? normalizeOptionalText(
            body.categoryId
          )
        : existingRestaurant.categoryId;

    const status = getRestaurantStatus(
      body.status,
      existingRestaurant.status
    );

    const coverImage =
      normalizeOptionalText(body.coverImage);

    const specifications =
      parseSpecifications(body.specifications);

    const restaurant =
      await prisma.restaurant.update({
        where: {
          id: existingRestaurant.id,
        },
        data: {
          categoryId,
          name,
          slug,
          description:
            descriptionResult.value,
          shortDescription:
            shortDescriptionResult.value,
          specifications:
            specifications as Prisma.InputJsonValue,
          exchangePolicy:
            exchangePolicyResult.value,
          refundPolicy:
            refundPolicyResult.value,
          phone:
            normalizeOptionalText(body.phone),
          email:
            normalizeOptionalText(body.email),
          website:
            normalizeOptionalText(body.website),
          logo:
            normalizeOptionalText(body.logo),
          coverImage,
          images:
            buildRestaurantImages(
              body.images,
              coverImage
            ),
          cuisineTypes:
            normalizeStringArray(
              body.cuisineTypes
            ),
          priceForTwo:
            priceForTwoResult.decimal,
          currency:
            normalizeText(body.currency) ||
            "AED",
          address:
            normalizeOptionalText(
              body.address
            ),
          addressLine1:
            normalizeOptionalText(
              body.addressLine1
            ),
          addressLine2:
            normalizeOptionalText(
              body.addressLine2
            ),
          country:
            normalizeOptionalText(
              body.country
            ),
          state:
            normalizeOptionalText(body.state),
          city:
            normalizeOptionalText(body.city),
          area:
            normalizeOptionalText(body.area),
          zipCode:
            normalizeOptionalText(
              body.zipCode
            ),
          latitude:
            latitudeResult.decimal,
          longitude:
            longitudeResult.decimal,
          isTableReservationAvailable:
            normalizeBoolean(
              body.isTableReservationAvailable,
              true
            ),
          reservationSlotMinutes:
            reservationSlotMinutesResult.value,
          reservationBufferMinutes:
            reservationBufferMinutesResult.value,
          reservationAdvanceDays:
            reservationAdvanceDaysResult.value,
          reservationNoticeMinutes:
            reservationNoticeMinutesResult.value,
          reservationMinGuests:
            reservationMinGuestsResult.value,
          reservationMaxGuests:
            reservationMaxGuestsResult.value,
          reservationAutoConfirm:
            normalizeBoolean(
              body.reservationAutoConfirm,
              false
            ),
          allowSameDayReservation:
            normalizeBoolean(
              body.allowSameDayReservation,
              true
            ),
          allowGuestReservation:
            normalizeBoolean(
              body.allowGuestReservation,
              false
            ),
          reservationTerms:
            normalizeOptionalText(
              body.reservationTerms
            ),
          reservationCancellationNote:
            normalizeOptionalText(
              body.reservationCancellationNote
            ),
          status,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Restaurant updated successfully.",
      restaurant,
    });
  } catch (error) {
    console.error(
      "VENDOR_RESTAURANT_UPDATE_ERROR",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return errorResponse(
          "A restaurant with the same unique information already exists.",
          409
        );
      }

      if (error.code === "P2003") {
        return errorResponse(
          "The selected related record is invalid.",
          400
        );
      }

      if (error.code === "P2025") {
        return errorResponse(
          "Restaurant was not found.",
          404
        );
      }
    }

    return errorResponse(
      "Unable to update the restaurant at this time.",
      500
    );
  }
}
