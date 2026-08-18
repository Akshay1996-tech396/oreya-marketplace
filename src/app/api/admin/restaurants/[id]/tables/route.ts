import { NextResponse } from "next/server";
import { Prisma, RestaurantTableStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TableRequestBody = {
  tableNumber?: string;
  capacity?: number | string;
  seatingArea?: string | null;
  status?: RestaurantTableStatus | string;
  isReservable?: boolean;
  note?: string | null;
  sortOrder?: number | string;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parsePositiveInteger(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return null;
  }

  return numberValue;
}

function parseZeroOrPositiveInteger(value: unknown) {
  const numberValue = Number(value ?? 0);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function parseTableStatus(value: unknown) {
  if (
    value === RestaurantTableStatus.ACTIVE ||
    value === RestaurantTableStatus.INACTIVE ||
    value === RestaurantTableStatus.MAINTENANCE
  ) {
    return value;
  }

  return RestaurantTableStatus.ACTIVE;
}

function formatTable(table: {
  id: string;
  tableNumber: string;
  capacity: number;
  seatingArea: string | null;
  status: RestaurantTableStatus;
  isReservable: boolean;
  note: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: table.id,
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    seatingArea: table.seatingArea,
    status: table.status,
    isReservable: table.isReservable,
    note: table.note,
    sortOrder: table.sortOrder,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}

async function getAdminRestaurant(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, vendorId: true },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          tables: [],
        },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Only administrators can access restaurant tables.",
          tables: [],
        },
        { status: 403 }
      );
    }

    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant ID is required.",
          tables: [],
        },
        { status: 400 }
      );
    }

    const restaurant = await getAdminRestaurant(restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
          tables: [],
        },
        { status: 404 }
      );
    }

    const tables = await prisma.restaurantTable.findMany({
      where: {
        restaurantId,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          tableNumber: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Restaurant tables loaded successfully.",
      tables: tables.map(formatTable),
    });
  } catch (error) {
    console.error("ADMIN_RESTAURANT_TABLES_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load restaurant tables.",
        tables: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Only administrators can create restaurant tables.",
        },
        { status: 403 }
      );
    }

    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant ID is required.",
        },
        { status: 400 }
      );
    }

    const restaurant = await getAdminRestaurant(restaurantId);

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant was not found or you do not have access to it.",
        },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | TableRequestBody
      | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message: "Table details are required.",
        },
        { status: 400 }
      );
    }

    const tableNumber = normalizeText(body.tableNumber);
    const capacity = parsePositiveInteger(body.capacity);
    const seatingArea = normalizeOptionalText(body.seatingArea);
    const status = parseTableStatus(body.status);
    const isReservable =
      typeof body.isReservable === "boolean" ? body.isReservable : true;
    const note = normalizeOptionalText(body.note);
    const sortOrder = parseZeroOrPositiveInteger(body.sortOrder);

    if (!tableNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Table number is required.",
        },
        { status: 400 }
      );
    }

    if (!capacity) {
      return NextResponse.json(
        {
          success: false,
          message: "Table capacity must be at least 1.",
        },
        { status: 400 }
      );
    }

    if (sortOrder === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Sort order must be 0 or greater.",
        },
        { status: 400 }
      );
    }

    const existingTable = await prisma.restaurantTable.findFirst({
      where: {
        restaurantId,
        tableNumber: {
          equals: tableNumber,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTable) {
      return NextResponse.json(
        {
          success: false,
          message: "A table with this table number already exists.",
        },
        { status: 409 }
      );
    }

    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId,
        tableNumber,
        capacity,
        seatingArea,
        status,
        isReservable,
        note,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Restaurant table created successfully.",
        table: formatTable(table),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADMIN_RESTAURANT_TABLE_CREATE_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A table with this table number already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create restaurant table.",
      },
      { status: 500 }
    );
  }
}