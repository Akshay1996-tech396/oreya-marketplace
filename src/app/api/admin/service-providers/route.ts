import {
  Prisma,
  ServiceProviderStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

type CreateServiceProviderBody = {
  name?: unknown;
  description?: unknown;
  logo?: unknown;
  website?: unknown;
  status?: unknown;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidWebsiteUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLogoPath(value: string) {
  if (!value) {
    return true;
  }

  if (value.startsWith("/")) {
    return true;
  }

  return isValidWebsiteUrl(value);
}

function parseProviderStatus(value: unknown) {
  const normalizedValue = cleanString(value).toUpperCase();

  if (!normalizedValue) {
    return ServiceProviderStatus.ACTIVE;
  }

  if (
    normalizedValue === ServiceProviderStatus.ACTIVE ||
    normalizedValue === ServiceProviderStatus.INACTIVE
  ) {
    return normalizedValue as ServiceProviderStatus;
  }

  return null;
}

async function createUniqueSlug(name: string) {
  const baseSlug = createSlug(name);

  if (!baseSlug) {
    return "";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingProvider =
      await prisma.serviceProvider.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (!existingProvider) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Only administrators can manage service providers.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export async function GET() {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    const serviceProviders =
      await prisma.serviceProvider.findMany({
        include: {
          _count: {
            select: {
              services: true,
            },
          },
        },
        orderBy: [
          {
            name: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json({
      success: true,
      serviceProviders,
    });
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_PROVIDERS_GET_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load service providers.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    let body: CreateServiceProviderBody;

    try {
      body =
        (await request.json()) as CreateServiceProviderBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "The submitted request is not valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const name = cleanString(body.name);
    const description = cleanString(body.description);
    const logo = cleanString(body.logo);
    const website = cleanString(body.website);
    const status = parseProviderStatus(body.status);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service provider name must not exceed 120 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Description must not exceed 1,000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidLogoPath(logo)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid logo URL or a relative upload path.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidWebsiteUrl(website)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid website URL beginning with http:// or https://.",
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
          message:
            "Service provider status must be ACTIVE or INACTIVE.",
        },
        {
          status: 400,
        }
      );
    }

    const existingProviderByName =
      await prisma.serviceProvider.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (existingProviderByName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A service provider with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const slug = await createUniqueSlug(name);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to generate a valid service provider slug.",
        },
        {
          status: 400,
        }
      );
    }

    const serviceProvider =
      await prisma.serviceProvider.create({
        data: {
          name,
          slug,
          description: description || null,
          logo: logo || null,
          website: website || null,
          status,
        },
        include: {
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Service provider created successfully.",
        serviceProvider,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_PROVIDER_CREATE_ERROR",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A service provider with the same name or slug already exists.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create the service provider.",
      },
      {
        status: 500,
      }
    );
  }
}