import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(name: string) {
  const baseSlug = createSlug(name);

  if (!baseSlug) {
    return "";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingCategory = await prisma.category.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingCategory) {
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
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only administrators can manage categories.",
        },
        { status: 403 }
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

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
            services: true,
            restaurants: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("ADMIN_CATEGORIES_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load categories.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { response } = await requireAdminUser();

    if (response) {
      return response;
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const image = String(body.image || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Category name is required.",
        },
        { status: 400 }
      );
    }

    const slug = await createUniqueSlug(name);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to create a valid category slug.",
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    console.error("ADMIN_CATEGORY_CREATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create category.",
      },
      { status: 500 }
    );
  }
}