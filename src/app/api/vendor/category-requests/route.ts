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

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

async function requireVendorProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      vendor: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Please sign in to continue.",
          redirectTo: "/vendor/login",
        },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "VENDOR") {
    return {
      vendor: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only vendors can request categories.",
          redirectTo: getDashboardPath(user.role),
        },
        { status: 403 }
      ),
    };
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
  });

  if (!vendor) {
    return {
      vendor: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Vendor profile not found.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    vendor,
    response: null,
  };
}

export async function GET() {
  try {
    const { vendor, response } = await requireVendorProfile();

    if (response || !vendor) {
      return response;
    }

    const requests = await prisma.vendorCategoryRequest.findMany({
      where: {
        vendorId: vendor.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("VENDOR_CATEGORY_REQUESTS_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load category requests.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { vendor, response } = await requireVendorProfile();

    if (response || !vendor) {
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

    const slug = createSlug(name);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid category name.",
        },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This category already exists. Please select it while adding a product or service.",
        },
        { status: 409 }
      );
    }

    const existingPendingRequest =
      await prisma.vendorCategoryRequest.findFirst({
        where: {
          vendorId: vendor.id,
          slug,
          status: "PENDING",
        },
        select: {
          id: true,
        },
      });

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You already have a pending request for this category.",
        },
        { status: 409 }
      );
    }

    const categoryRequest = await prisma.vendorCategoryRequest.create({
      data: {
        vendorId: vendor.id,
        name,
        slug,
        description: description || null,
        image: image || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category request submitted successfully.",
      request: categoryRequest,
    });
  } catch (error) {
    console.error("VENDOR_CATEGORY_REQUEST_CREATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit category request.",
      },
      { status: 500 }
    );
  }
}