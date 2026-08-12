import {
  Prisma,
  ServiceStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


type SpecificationItem = {
  label: string;
  value: string;
};

type CreateAdminServiceBody = {
  vendorId?: unknown;
  title?: unknown;
  categoryId?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  duration?: unknown;
  status?: unknown;
  images?: unknown;
  specifications?: unknown;
  specificationImage?: unknown;
  exchangePolicy?: unknown;
  refundPolicy?: unknown;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalText(value: unknown) {
  const text = cleanString(value);

  return text || null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueServiceSlug(title: string) {
  const baseSlug = slugify(title) || "service";

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingService = await prisma.service.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingService) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function parseServiceStatus(value: unknown) {
  const normalizedValue =
    cleanString(value).toUpperCase() || ServiceStatus.DRAFT;

  if (
    normalizedValue === ServiceStatus.DRAFT ||
    normalizedValue === ServiceStatus.ACTIVE ||
    normalizedValue === ServiceStatus.INACTIVE
  ) {
    return normalizedValue as ServiceStatus;
  }

  return null;
}

function parseImages(value: unknown) {
  let images: string[] = [];

  if (Array.isArray(value)) {
    images = value
      .map((image) => cleanString(image))
      .filter(Boolean);
  } else if (typeof value === "string") {
    images = value
      .split(/\r?\n/)
      .map((image) => image.trim())
      .filter(Boolean);
  }

  return Array.from(new Set(images));
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
      const label = cleanString(row.label);
      const specificationValue = cleanString(row.value);

      if (!label || !specificationValue) {
        return null;
      }

      return {
        label,
        value: specificationValue,
      };
    })
    .filter(
      (item): item is SpecificationItem => item !== null
    );
}

function parsePrice(value: unknown) {
  const price =
    typeof value === "number"
      ? value
      : Number(cleanString(value));

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
}

function parseDuration(value: unknown) {
  const normalizedValue =
    typeof value === "number"
      ? String(value)
      : cleanString(value);

  if (!normalizedValue) {
    return null;
  }

  const duration = Number(normalizedValue);

  if (!Number.isInteger(duration) || duration <= 0) {
    return undefined;
  }

  return duration;
}

function parseCurrency(value: unknown) {
  const currency =
    cleanString(value).toUpperCase() || "AED";

  if (!/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  return currency;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
        },
        {
          status: 401,
        }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only administrators can create marketplace services.",
        },
        {
          status: 403,
        }
      );
    }

    let body: CreateAdminServiceBody;

    try {
      const submittedBody: unknown =
        await request.json();

      if (
        !submittedBody ||
        typeof submittedBody !== "object" ||
        Array.isArray(submittedBody)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The submitted request body must be a valid object.",
          },
          {
            status: 400,
          }
        );
      }

      body = submittedBody as CreateAdminServiceBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "The submitted request is not valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const vendorId =
      cleanString(body.vendorId) || null;
    const contentLimits = await getContentLimits();

    const title = cleanString(body.title);
    const categoryId = cleanString(body.categoryId);
    const description = parseOptionalText(
      body.description
    );
    const price = parsePrice(body.price);
    const currency = parseCurrency(body.currency);
    const duration = parseDuration(body.duration);
    const status = parseServiceStatus(body.status);
    const images = parseImages(body.images);

    const parsedSpecifications = parseSpecifications(
      body.specifications
    );

    const specifications =
      parsedSpecifications as Prisma.InputJsonValue;

    const specificationImage = parseOptionalText(
      body.specificationImage
    );
    const exchangePolicy = parseOptionalText(
      body.exchangePolicy
    );
    const refundPolicy = parseOptionalText(
      body.refundPolicy
    );

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Service title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Service category is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      description &&
      description.length > contentLimits.description
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Service description cannot exceed ${contentLimits.description} characters.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      exchangePolicy &&
      exchangePolicy.length > contentLimits.exchangePolicy
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Service exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      refundPolicy &&
      refundPolicy.length > contentLimits.refundPolicy
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Service refund policy cannot exceed ${contentLimits.refundPolicy} characters.`,
        },
        {
          status: 400,
        }
      );
    }

    if (price === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid service price greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency must be a valid three-letter code.",
        },
        {
          status: 400,
        }
      );
    }

    if (duration === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duration must be a positive whole number of minutes.",
        },
        {
          status: 400,
        }
      );
    }

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid service status.",
        },
        {
          status: 400,
        }
      );
    }

    const [category, vendor] =
      await Promise.all([
        prisma.category.findUnique({
          where: {
            id: categoryId,
          },
          select: {
            id: true,
          },
        }),

        vendorId
          ? prisma.vendorProfile.findUnique({
              where: {
                id: vendorId,
              },
              select: {
                id: true,
                businessName: true,
                status: true,
              },
            })
          : Promise.resolve(null),
      ]);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Service category not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (vendorId && !vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected vendor not found.",
        },
        {
          status: 404,
        }
      );
    }

    const service = await prisma.service.create({
      data: {
        ...(vendor
          ? {
              vendor: {
                connect: {
                  id: vendor.id,
                },
              },
            }
          : {}),
        category: {
          connect: {
            id: category.id,
          },
        },
        title,
        slug: await getUniqueServiceSlug(title),
        description,
        specifications,
        specificationImage,
        exchangePolicy,
        refundPolicy,
        price,
        currency,
        duration,
        images,
        status,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service created successfully.",
        service,
        serviceId: service.id,
        slug: service.slug,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_CREATE_ERROR",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message:
              "A service with the same unique information already exists.",
          },
          {
            status: 409,
          }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected category or vendor is no longer available.",
          },
          {
            status: 400,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create the service at this time.",
      },
      {
        status: 500,
      }
    );
  }
}