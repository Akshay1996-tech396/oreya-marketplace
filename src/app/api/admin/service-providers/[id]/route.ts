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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateServiceProviderBody = {
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

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
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

  if (
    normalizedValue === ServiceProviderStatus.ACTIVE ||
    normalizedValue === ServiceProviderStatus.INACTIVE
  ) {
    return normalizedValue as ServiceProviderStatus;
  }

  return null;
}

async function createUniqueSlug(
  name: string,
  currentProviderId: string
) {
  const baseSlug = createSlug(name);

  if (!baseSlug) {
    return "";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingProvider =
      await prisma.serviceProvider.findFirst({
        where: {
          slug,
          id: {
            not: currentProviderId,
          },
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

async function getProviderId(context: RouteContext) {
  const params = await context.params;

  return cleanString(params.id);
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    const providerId = await getProviderId(context);

    if (!providerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const serviceProvider =
      await prisma.serviceProvider.findUnique({
        where: {
          id: providerId,
        },
        include: {
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

    if (!serviceProvider) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      serviceProvider,
    });
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_PROVIDER_GET_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load the service provider.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    const providerId = await getProviderId(context);

    if (!providerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existingProvider =
      await prisma.serviceProvider.findUnique({
        where: {
          id: providerId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

    if (!existingProvider) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider not found.",
        },
        {
          status: 404,
        }
      );
    }

    let body: UpdateServiceProviderBody;

    try {
      body =
        (await request.json()) as UpdateServiceProviderBody;
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

    const duplicateProvider =
      await prisma.serviceProvider.findFirst({
        where: {
          id: {
            not: providerId,
          },
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicateProvider) {
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

    const hasNameChanged =
      existingProvider.name.localeCompare(
        name,
        undefined,
        {
          sensitivity: "accent",
        }
      ) !== 0;

    const slug = hasNameChanged
      ? await createUniqueSlug(name, providerId)
      : existingProvider.slug;

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
      await prisma.serviceProvider.update({
        where: {
          id: providerId,
        },
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

    return NextResponse.json({
      success: true,
      message: "Service provider updated successfully.",
      serviceProvider,
    });
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_PROVIDER_UPDATE_ERROR",
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
              "A service provider with the same name or slug already exists.",
          },
          {
            status: 409,
          }
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message: "Service provider not found.",
          },
          {
            status: 404,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update the service provider.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    const providerId = await getProviderId(context);

    if (!providerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const serviceProvider =
      await prisma.serviceProvider.findUnique({
        where: {
          id: providerId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

    if (!serviceProvider) {
      return NextResponse.json(
        {
          success: false,
          message: "Service provider not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (serviceProvider._count.services > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This service provider cannot be deleted because it is assigned to one or more services. Unlink those services or mark the provider as inactive instead.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.serviceProvider.delete({
      where: {
        id: providerId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service provider deleted successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN_SERVICE_PROVIDER_DELETE_ERROR",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message: "Service provider not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "This service provider cannot be deleted because it is still referenced by marketplace data.",
          },
          {
            status: 409,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete the service provider.",
      },
      {
        status: 500,
      }
    );
  }
}