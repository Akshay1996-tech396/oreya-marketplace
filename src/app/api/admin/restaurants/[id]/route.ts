import {
  NotificationType,
  Prisma,
  RestaurantStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_ACTION_REASON_LENGTH = 1000;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AdminRestaurantAction =
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "INACTIVE"
  | "ACTIVE";

type AdminRestaurantRequestBody = Record<string, unknown>;

type AdminAuthorizationResult = {
  response: NextResponse | null;
};

const validActions = new Set<AdminRestaurantAction>([
  "APPROVE",
  "REJECT",
  "SUSPEND",
  "INACTIVE",
  "ACTIVE",
]);

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      restaurant: null,
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
): value is AdminRestaurantRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidAction(
  action: string
): action is AdminRestaurantAction {
  return validActions.has(action as AdminRestaurantAction);
}

async function authorizeAdministrator(): Promise<AdminAuthorizationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: errorResponse(
        "Authentication is required.",
        401
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      response: errorResponse(
        "Only an administrator can access this restaurant.",
        403
      ),
    };
  }

  return {
    response: null,
  };
}

function getStatusByAction(
  action: AdminRestaurantAction
): RestaurantStatus {
  if (action === "APPROVE" || action === "ACTIVE") {
    return RestaurantStatus.ACTIVE;
  }

  if (action === "REJECT") {
    return RestaurantStatus.REJECTED;
  }

  if (action === "SUSPEND") {
    return RestaurantStatus.SUSPENDED;
  }

  return RestaurantStatus.INACTIVE;
}

function getNotificationType(
  action: AdminRestaurantAction
): NotificationType {
  if (action === "APPROVE" || action === "ACTIVE") {
    return NotificationType.RESTAURANT_APPROVED;
  }

  if (action === "REJECT") {
    return NotificationType.RESTAURANT_REJECTED;
  }

  return NotificationType.SYSTEM;
}

function getNotificationTitle(
  action: AdminRestaurantAction
) {
  if (action === "APPROVE") {
    return "Restaurant approved";
  }

  if (action === "ACTIVE") {
    return "Restaurant activated";
  }

  if (action === "REJECT") {
    return "Restaurant rejected";
  }

  if (action === "SUSPEND") {
    return "Restaurant suspended";
  }

  return "Restaurant set as inactive";
}

function getNotificationMessage(
  action: AdminRestaurantAction,
  restaurantName: string,
  reason: string
) {
  if (action === "APPROVE") {
    return `Your restaurant "${restaurantName}" has been approved and activated.`;
  }

  if (action === "ACTIVE") {
    return `Your restaurant "${restaurantName}" has been activated.`;
  }

  if (action === "REJECT") {
    return `Your restaurant "${restaurantName}" has been rejected. Reason: ${reason}`;
  }

  if (action === "SUSPEND") {
    return `Your restaurant "${restaurantName}" has been suspended. Reason: ${reason}`;
  }

  return `Your restaurant "${restaurantName}" has been set as inactive.`;
}

function getSuccessMessage(
  action: AdminRestaurantAction
) {
  if (action === "APPROVE") {
    return "Restaurant approved successfully.";
  }

  if (action === "ACTIVE") {
    return "Restaurant activated successfully.";
  }

  if (action === "REJECT") {
    return "Restaurant rejected successfully.";
  }

  if (action === "SUSPEND") {
    return "Restaurant suspended successfully.";
  }

  return "Restaurant set as inactive successfully.";
}

function getApprovedAt(
  action: AdminRestaurantAction,
  currentApprovedAt: Date | null
) {
  if (action === "APPROVE" || action === "ACTIVE") {
    return currentApprovedAt ?? new Date();
  }

  if (action === "REJECT") {
    return null;
  }

  return currentApprovedAt;
}

function getRejectedReason(
  action: AdminRestaurantAction,
  reason: string
) {
  if (action === "REJECT" || action === "SUSPEND") {
    return reason;
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const authorization = await authorizeAdministrator();

    if (authorization.response) {
      return authorization.response;
    }

    const { id } = await params;
    const restaurantId = id.trim();

    if (!restaurantId) {
      return errorResponse(
        "Restaurant identifier is required.",
        400
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      include: {
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
        operatingHours: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
        specialHours: {
          orderBy: {
            date: "asc",
          },
        },
        tables: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        },
        blockedSlots: {
          orderBy: {
            startTime: "desc",
          },
        },
        _count: {
          select: {
            tables: true,
            reservations: true,
            reviews: true,
          },
        },
      },
    });

    if (!restaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    return NextResponse.json(
      {
        success: true,
        restaurant: {
          ...restaurant,
          priceForTwo: restaurant.priceForTwo
            ? restaurant.priceForTwo.toString()
            : null,
          latitude: restaurant.latitude
            ? restaurant.latitude.toString()
            : null,
          longitude: restaurant.longitude
            ? restaurant.longitude.toString()
            : null,
          createdAt: restaurant.createdAt.toISOString(),
          updatedAt: restaurant.updatedAt.toISOString(),
          approvedAt: restaurant.approvedAt
            ? restaurant.approvedAt.toISOString()
            : null,
          _count: {
            tables: restaurant._count.tables,
            reservations: restaurant._count.reservations,
            reviews: restaurant._count.reviews,
          },
        },
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
      "ADMIN_RESTAURANT_GET_ERROR",
      error
    );

    return errorResponse(
      "Unable to load the restaurant at this time.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const authorization = await authorizeAdministrator();

    if (authorization.response) {
      return authorization.response;
    }

    const { id } = await params;
    const restaurantId = id.trim();

    if (!restaurantId) {
      return errorResponse(
        "Restaurant identifier is required.",
        400
      );
    }

    const parsedBody = await request
      .json()
      .catch(() => null);

    if (!isRequestBody(parsedBody)) {
      return errorResponse(
        "A valid restaurant action is required.",
        400
      );
    }

    const action = normalizeText(
      parsedBody.action
    ).toUpperCase();

    const reason = normalizeText(
      parsedBody.reason
    );

    if (!isValidAction(action)) {
      return errorResponse(
        "A valid restaurant action is required.",
        400
      );
    }

    const requiresReason =
      action === "REJECT" ||
      action === "SUSPEND";

    if (requiresReason && !reason) {
      return errorResponse(
        "A reason is required for this action.",
        400
      );
    }

    if (reason.length > MAX_ACTION_REASON_LENGTH) {
      return errorResponse(
        "The action reason cannot exceed 1,000 characters.",
        400
      );
    }

    const existingRestaurant =
      await prisma.restaurant.findUnique({
        where: {
          id: restaurantId,
        },
        select: {
          id: true,
          name: true,
          approvedAt: true,
          vendor: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!existingRestaurant) {
      return errorResponse(
        "Restaurant was not found.",
        404
      );
    }

    const nextStatus = getStatusByAction(action);

    const approvedAt = getApprovedAt(
      action,
      existingRestaurant.approvedAt
    );

    const rejectedReason = getRejectedReason(
      action,
      reason
    );

    const restaurant = await prisma.$transaction(
      async (transaction) => {
        const updatedRestaurant =
          await transaction.restaurant.update({
            where: {
              id: existingRestaurant.id,
            },
            data: {
              status: nextStatus,
              approvedAt,
              rejectedReason,
            },
            include: {
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
            },
          });

        await transaction.notification.create({
          data: {
            userId: existingRestaurant.vendor.userId,
            title: getNotificationTitle(action),
            message: getNotificationMessage(
              action,
              existingRestaurant.name,
              reason
            ),
            type: getNotificationType(action),
            link: `/vendor/restaurants/${existingRestaurant.id}/edit`,
            metadata: {
              restaurantId: existingRestaurant.id,
              action,
              status: nextStatus,
              reason: reason || null,
            },
          },
        });

        return updatedRestaurant;
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: getSuccessMessage(action),
        restaurant: {
          ...restaurant,
          priceForTwo: restaurant.priceForTwo
            ? restaurant.priceForTwo.toString()
            : null,
          latitude: restaurant.latitude
            ? restaurant.latitude.toString()
            : null,
          longitude: restaurant.longitude
            ? restaurant.longitude.toString()
            : null,
          createdAt: restaurant.createdAt.toISOString(),
          updatedAt: restaurant.updatedAt.toISOString(),
          approvedAt: restaurant.approvedAt
            ? restaurant.approvedAt.toISOString()
            : null,
          _count: {
            tables: restaurant._count.tables,
            reservations: restaurant._count.reservations,
            reviews: restaurant._count.reviews,
          },
        },
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
      "ADMIN_RESTAURANT_PATCH_ERROR",
      error
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return errorResponse(
          "Restaurant was not found.",
          404
        );
      }

      if (error.code === "P2003") {
        return errorResponse(
          "The restaurant status could not be updated because a related record is invalid.",
          400
        );
      }
    }

    return errorResponse(
      "Unable to update the restaurant status at this time.",
      500
    );
  }
}