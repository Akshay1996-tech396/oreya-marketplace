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
const IMAGE_UPLOAD_SIZE_SETTING_KEY =
  "maxImageUploadSizeMb";
const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

type RouteContext = {
  params: Promise<{
    id: string;
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

function normalizeMaximumImageSize(
  value: string | null | undefined
) {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB ||
    parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB
  ) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }

  return parsedValue;
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
  name: string
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

    if (!existingMenuItem) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function getVendorRestaurant(
  restaurantId: string
) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      restaurant: null,
      response: errorResponse(
        "Authentication is required.",
        401
      ),
    };
  }

  if (user.role !== "VENDOR") {
    return {
      restaurant: null,
      response: errorResponse(
        "Only Vendors can manage restaurant reservation packages.",
        403
      ),
    };
  }

  const vendor =
    await prisma.vendorProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!vendor) {
    return {
      restaurant: null,
      response: errorResponse(
        "Vendor profile was not found.",
        404
      ),
    };
  }

  if (
    String(vendor.status) !== "APPROVED"
  ) {
    return {
      restaurant: null,
      response: errorResponse(
        "Only approved Vendors can manage restaurant reservation packages.",
        403
      ),
    };
  }

  const restaurant =
    await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        vendorId: vendor.id,
      },
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
      response: errorResponse(
        "Restaurant was not found or you do not have permission to manage it.",
        404
      ),
    };
  }

  return {
    restaurant,
    response: null,
  };
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
    const { id } = await context.params;
    const restaurantId = id.trim();

    if (!restaurantId) {
      return errorResponse(
        "Restaurant identifier is required.",
        400
      );
    }

    const { restaurant, response } =
      await getVendorRestaurant(
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

    const [menuItems, imageSizeSetting] =
      await Promise.all([
        prisma.restaurantMenuItem.findMany({
          where: {
            restaurantId: restaurant.id,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        }),
        prisma.setting.findUnique({
          where: {
            key: IMAGE_UPLOAD_SIZE_SETTING_KEY,
          },
          select: {
            value: true,
          },
        }),
      ]);

    return NextResponse.json(
      {
        success: true,
        restaurant,
        menuItems: menuItems.map(
          prepareMenuItem
        ),
        maxImageUploadSizeMb:
          normalizeMaximumImageSize(
            imageSizeSetting?.value
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
      "VENDOR_RESTAURANT_MENU_ITEMS_GET_ERROR",
      error
    );

    return errorResponse(
      "Unable to load restaurant reservation packages at this time.",
      500
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const restaurantId = id.trim();

    if (!restaurantId) {
      return errorResponse(
        "Restaurant identifier is required.",
        400
      );
    }

    const { restaurant, response } =
      await getVendorRestaurant(
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

    const parsedBody = await request
      .json()
      .catch(() => null);

    if (!isRequestBody(parsedBody)) {
      return errorResponse(
        "A valid request body is required.",
        400
      );
    }

    const name = normalizeText(
      parsedBody.name
    );
    const description =
      normalizeDescription(
        parsedBody.description
      );
    const menuType = parseMenuType(
      parsedBody.menuType
    );
    const validFromResult = parseDateOnly(
      parsedBody.validFrom,
      "Combo start date"
    );
    const validUntilResult = parseDateOnly(
      parsedBody.validUntil,
      "Combo expiry date"
    );
    const currency = normalizeText(
      parsedBody.currency ||
        restaurant.currency ||
        "AED"
    ).toUpperCase();

    const submittedImages =
      normalizeImageUrls(
        parsedBody.images
      );
    const fallbackImage =
      normalizeText(parsedBody.image);
    const imageUrls =
      submittedImages.length > 0
        ? submittedImages
        : fallbackImage
          ? [fallbackImage]
          : [];

    const priceValue = Number(
      parsedBody.price
    );
    const sortOrderValue = Number(
      parsedBody.sortOrder ?? 0
    );
    const isActive =
      typeof parsedBody.isActive ===
      "boolean"
        ? parsedBody.isActive
        : true;

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
        name
      );

    if (!slug) {
      return errorResponse(
        "Unable to create a valid package slug.",
        400
      );
    }

    const menuItem =
      await prisma.restaurantMenuItem.create({
        data: {
          restaurantId: restaurant.id,
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
          "Restaurant reservation package created successfully.",
        menuItem:
          prepareMenuItem(menuItem),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "VENDOR_RESTAURANT_MENU_ITEM_CREATE_ERROR",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return errorResponse(
          "A reservation package with this name already exists.",
          409
        );
      }

      if (error.code === "P2003") {
        return errorResponse(
          "The reservation package could not be created because a related record is invalid.",
          400
        );
      }
    }

    return errorResponse(
      "Unable to create the restaurant reservation package at this time.",
      500
    );
  }
}