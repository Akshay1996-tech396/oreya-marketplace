import {
  Prisma,
  RestaurantMenuType,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_DESCRIPTION_LENGTH = 1000;

type RouteContext = {
  params: Promise<{
    id: string;
    menuItemId: string;
  }>;
};

type DateOnlyResult = {
  value: Date | null;
  error: string | null;
};

type RequestBody = Record<string, unknown>;

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      message,
      menuItem: null,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function isRequestBody(
  value: unknown
): value is RequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwn(
  value: RequestBody,
  key: string
) {
  return Object.prototype.hasOwnProperty.call(
    value,
    key
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeDescription(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n?/g, "\n")
    .trim();
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeStoredImages(
  image: string | null,
  images: unknown
) {
  return Array.from(
    new Set(
      [
        image || "",
        ...normalizeImageUrls(images),
      ].filter(Boolean)
    )
  );
}

function parseMenuType(
  value: unknown
): RestaurantMenuType | null {
  const normalizedValue = normalizeText(
    value
  ).toUpperCase();

  if (
    normalizedValue ===
    RestaurantMenuType.REGULAR
  ) {
    return RestaurantMenuType.REGULAR;
  }

  if (
    normalizedValue ===
    RestaurantMenuType.COMBO
  ) {
    return RestaurantMenuType.COMBO;
  }

  return null;
}

function parseDateOnly(
  value: unknown,
  fieldLabel: string
): DateOnlyResult {
  const dateValue = normalizeText(value);

  if (!dateValue) {
    return {
      value: null,
      error: null,
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateValue
    )
  ) {
    return {
      value: null,
      error: `${fieldLabel} must use the YYYY-MM-DD format.`,
    };
  }

  const parsedDate = new Date(
    `${dateValue}T00:00:00.000Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate
      .toISOString()
      .slice(0, 10) !== dateValue
  ) {
    return {
      value: null,
      error: `${fieldLabel} must be a valid calendar date.`,
    };
  }

  return {
    value: parsedDate,
    error: null,
  };
}

function formatDateOnly(
  value: Date | null
) {
  return value
    ? value.toISOString().slice(0, 10)
    : "";
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueMenuSlug(
  restaurantId: string,
  name: string,
  currentMenuItemId: string
) {
  const baseSlug = createSlug(name);

  if (!baseSlug) {
    return "";
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existingMenuItem =
      await prisma.restaurantMenuItem.findUnique({
        where: {
          restaurantId_slug: {
            restaurantId,
            slug,
          },
        },
        select: {
          id: true,
        },
      });

    if (
      !existingMenuItem ||
      existingMenuItem.id ===
        currentMenuItemId
    ) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function getAdminRestaurant(restaurantId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      restaurant: null,
      response: errorResponse("Authentication is required.", 401),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      restaurant: null,
      response: errorResponse("Only administrators can manage restaurant reservation packages.", 403),
    };
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      vendorId: true,
      currency: true,
    },
  });

  if (!restaurant) {
    return {
      restaurant: null,
      response: errorResponse("Restaurant was not found.", 404),
    };
  }

  return { restaurant, response: null };
}

async function getVendorMenuItem(
  restaurantId: string,
  menuItemId: string
) {
  return prisma.restaurantMenuItem.findFirst({
    where: {
      id: menuItemId,
      restaurantId,
    },
  });
}

function prepareMenuItem<
  T extends {
    price: Prisma.Decimal;
    image: string | null;
    images: unknown;
    validFrom: Date | null;
    validUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
>(menuItem: T) {
  const images = normalizeStoredImages(
    menuItem.image,
    menuItem.images
  );

  return {
    ...menuItem,
    price: menuItem.price.toString(),
    image: images[0] || null,
    images,
    validFrom: menuItem.validFrom
      ? menuItem.validFrom.toISOString()
      : null,
    validUntil: menuItem.validUntil
      ? menuItem.validUntil.toISOString()
      : null,
    createdAt:
      menuItem.createdAt.toISOString(),
    updatedAt:
      menuItem.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id, menuItemId } =
      await context.params;
    const restaurantId = id.trim();
    const packageId = menuItemId.trim();

    if (!restaurantId || !packageId) {
      return errorResponse(
        "Restaurant and package identifiers are required.",
        400
      );
    }

    const { restaurant, response } =
      await getAdminRestaurant(
        restaurantId
      );

    if (response) {
      return response;
    }

    if (!restaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    const menuItem =
      await getVendorMenuItem(
        restaurant.id,
        packageId
      );

    if (!menuItem) {
      return errorResponse(
        "Reservation package was not found.",
        404
      );
    }

    return NextResponse.json(
      {
        success: true,
        menuItem:
          prepareMenuItem(menuItem),
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
      "ADMIN_RESTAURANT_MENU_ITEM_GET_ERROR",
      error
    );

    return errorResponse(
      "Unable to load the restaurant reservation package at this time.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id, menuItemId } =
      await context.params;
    const restaurantId = id.trim();
    const packageId = menuItemId.trim();

    if (!restaurantId || !packageId) {
      return errorResponse(
        "Restaurant and package identifiers are required.",
        400
      );
    }

    const { restaurant, response } =
      await getAdminRestaurant(
        restaurantId
      );

    if (response) {
      return response;
    }

    if (!restaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    const existingMenuItem =
      await getVendorMenuItem(
        restaurant.id,
        packageId
      );

    if (!existingMenuItem) {
      return errorResponse(
        "Reservation package was not found.",
        404
      );
    }

    const parsedBody = await request
      .json()
      .catch(() => null);

    if (!isRequestBody(parsedBody)) {
      return errorResponse(
        "A valid request body is required.",
        400
      );
    }

    const name = hasOwn(
      parsedBody,
      "name"
    )
      ? normalizeText(parsedBody.name)
      : existingMenuItem.name;

    const description = hasOwn(
      parsedBody,
      "description"
    )
      ? normalizeDescription(
          parsedBody.description
        )
      : existingMenuItem.description || "";

    const menuType = parseMenuType(
      hasOwn(parsedBody, "menuType")
        ? parsedBody.menuType
        : existingMenuItem.menuType
    );

    const validFromInput = hasOwn(
      parsedBody,
      "validFrom"
    )
      ? parsedBody.validFrom
      : formatDateOnly(
          existingMenuItem.validFrom
        );

    const validUntilInput = hasOwn(
      parsedBody,
      "validUntil"
    )
      ? parsedBody.validUntil
      : formatDateOnly(
          existingMenuItem.validUntil
        );

    const validFromResult = parseDateOnly(
      validFromInput,
      "Combo start date"
    );
    const validUntilResult = parseDateOnly(
      validUntilInput,
      "Combo expiry date"
    );

    const currency = normalizeText(
      hasOwn(parsedBody, "currency")
        ? parsedBody.currency
        : existingMenuItem.currency ||
            restaurant.currency ||
            "AED"
    ).toUpperCase();

    let imageUrls = normalizeStoredImages(
      existingMenuItem.image,
      existingMenuItem.images
    );

    if (hasOwn(parsedBody, "images")) {
      imageUrls = normalizeImageUrls(
        parsedBody.images
      );
    } else if (
      hasOwn(parsedBody, "image")
    ) {
      const fallbackImage =
        normalizeText(parsedBody.image);
      imageUrls = fallbackImage
        ? [fallbackImage]
        : [];
    }

    const priceValue = Number(
      hasOwn(parsedBody, "price")
        ? parsedBody.price
        : existingMenuItem.price
    );

    const sortOrderValue = Number(
      hasOwn(parsedBody, "sortOrder")
        ? parsedBody.sortOrder
        : existingMenuItem.sortOrder
    );

    const isActive =
      typeof parsedBody.isActive ===
      "boolean"
        ? parsedBody.isActive
        : existingMenuItem.isActive;

    if (!name) {
      return errorResponse(
        "Menu or package name is required.",
        400
      );
    }

    if (
      description.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      return errorResponse(
        "Description cannot exceed 1,000 characters.",
        400
      );
    }

    if (!menuType) {
      return errorResponse(
        "Package type must be either Regular or Combo.",
        400
      );
    }

    if (validFromResult.error) {
      return errorResponse(
        validFromResult.error,
        400
      );
    }

    if (validUntilResult.error) {
      return errorResponse(
        validUntilResult.error,
        400
      );
    }

    if (
      !Number.isFinite(priceValue) ||
      priceValue < 0
    ) {
      return errorResponse(
        "A valid price is required.",
        400
      );
    }

    if (
      !Number.isInteger(sortOrderValue)
    ) {
      return errorResponse(
        "Sort order must be a whole number.",
        400
      );
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return errorResponse(
        "Currency must be a valid three-letter code.",
        400
      );
    }

    let validFrom: Date | null = null;
    let validUntil: Date | null = null;

    if (
      menuType ===
      RestaurantMenuType.COMBO
    ) {
      validFrom = validFromResult.value;
      validUntil = validUntilResult.value;

      if (!validFrom) {
        return errorResponse(
          "A start date is required for a Combo package.",
          400
        );
      }

      if (!validUntil) {
        return errorResponse(
          "An expiry date is required for a Combo package.",
          400
        );
      }

      if (
        validUntil.getTime() <
        validFrom.getTime()
      ) {
        return errorResponse(
          "The Combo expiry date cannot be earlier than its start date.",
          400
        );
      }
    }

    const slug =
      await createUniqueMenuSlug(
        restaurant.id,
        name,
        existingMenuItem.id
      );

    if (!slug) {
      return errorResponse(
        "Unable to create a valid package slug.",
        400
      );
    }

    const menuItem =
      await prisma.restaurantMenuItem.update({
        where: {
          id: existingMenuItem.id,
        },
        data: {
          name,
          slug,
          description:
            description || null,
          menuType,
          validFrom,
          validUntil,
          price: priceValue.toFixed(2),
          currency,
          image:
            imageUrls[0] || null,
          images: imageUrls,
          isActive,
          sortOrder: sortOrderValue,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Restaurant reservation package updated successfully.",
        menuItem:
          prepareMenuItem(menuItem),
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
      "ADMIN_RESTAURANT_MENU_ITEM_UPDATE_ERROR",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return errorResponse(
          "Reservation package was not found.",
          404
        );
      }

      if (error.code === "P2002") {
        return errorResponse(
          "A reservation package with this name already exists.",
          409
        );
      }

      if (error.code === "P2003") {
        return errorResponse(
          "The reservation package could not be updated because a related record is invalid.",
          400
        );
      }
    }

    return errorResponse(
      "Unable to update the restaurant reservation package at this time.",
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id, menuItemId } =
      await context.params;
    const restaurantId = id.trim();
    const packageId = menuItemId.trim();

    if (!restaurantId || !packageId) {
      return errorResponse(
        "Restaurant and package identifiers are required.",
        400
      );
    }

    const { restaurant, response } =
      await getAdminRestaurant(
        restaurantId
      );

    if (response) {
      return response;
    }

    if (!restaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    const existingMenuItem =
      await getVendorMenuItem(
        restaurant.id,
        packageId
      );

    if (!existingMenuItem) {
      return errorResponse(
        "Reservation package was not found.",
        404
      );
    }

    await prisma.restaurantMenuItem.delete({
      where: {
        id: existingMenuItem.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Restaurant reservation package deleted successfully.",
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
      "ADMIN_RESTAURANT_MENU_ITEM_DELETE_ERROR",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse(
        "Reservation package was not found.",
        404
      );
    }

    return errorResponse(
      "Unable to delete the restaurant reservation package at this time.",
      500
    );
  }
}