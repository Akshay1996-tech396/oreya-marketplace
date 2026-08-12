import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(name: string, currentCategoryId: string) {
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

    if (!existingCategory || existingCategory.id === currentCategoryId) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

async function requireAdminUser() {
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
        message: "Only administrators can manage categories.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authResponse = await requireAdminUser();

    if (authResponse) {
      return authResponse;
    }

    const { id } = await context.params;

    const category = await prisma.category.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
            restaurants: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("ADMIN_CATEGORY_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load category.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authResponse = await requireAdminUser();

    if (authResponse) {
      return authResponse;
    }

    const { id } = await context.params;
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

    const existingCategory = await prisma.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    const slug = await createUniqueSlug(name, id);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to create a valid category slug.",
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      category,
    });
  } catch (error) {
    console.error("ADMIN_CATEGORY_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update category.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const authResponse = await requireAdminUser();

    if (authResponse) {
      return authResponse;
    }

    const { id } = await context.params;

    const category = await prisma.category.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
            restaurants: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found.",
        },
        { status: 404 }
      );
    }

    const isCategoryUsed =
      category._count.products > 0 ||
      category._count.services > 0 ||
      category._count.restaurants > 0;

    if (isCategoryUsed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This category is already used by products, services, or restaurants. Remove those links before deleting it.",
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("ADMIN_CATEGORY_DELETE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete category.",
      },
      { status: 500 }
    );
  }
}