import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
        message: "Only administrators can manage category requests.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authResponse = await requireAdminUser();

    if (authResponse) {
      return authResponse;
    }

    const { id } = await context.params;
    const body = await request.json();

    const action = String(body.action || "").trim().toUpperCase();
    const adminNote = String(body.adminNote || "").trim();

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid action. Please use APPROVE or REJECT.",
        },
        { status: 400 }
      );
    }

    const categoryRequest = await prisma.vendorCategoryRequest.findUnique({
      where: {
        id,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!categoryRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Category request not found.",
        },
        { status: 404 }
      );
    }

    if (categoryRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "This category request has already been reviewed.",
        },
        { status: 400 }
      );
    }

    if (action === "REJECT") {
      const rejectedRequest = await prisma.vendorCategoryRequest.update({
        where: {
          id,
        },
        data: {
          status: "REJECTED",
          adminNote: adminNote || "Category request rejected by admin.",
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Category request rejected successfully.",
        request: rejectedRequest,
      });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const existingCategory = await transaction.category.findUnique({
        where: {
          slug: categoryRequest.slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      let category = existingCategory;

      if (!category) {
        category = await transaction.category.create({
          data: {
            name: categoryRequest.name,
            slug: categoryRequest.slug,
            description: categoryRequest.description,
            image: categoryRequest.image,
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
      }

      const approvedRequest = await transaction.vendorCategoryRequest.update({
        where: {
          id,
        },
        data: {
          status: "APPROVED",
          adminNote:
            adminNote ||
            "Category request approved by admin and added to marketplace categories.",
          reviewedAt: new Date(),
        },
      });

      return {
        category,
        request: approvedRequest,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Category request approved successfully.",
      category: result.category,
      request: result.request,
    });
  } catch (error) {
    console.error("ADMIN_CATEGORY_REQUEST_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to review category request.",
      },
      { status: 500 }
    );
  }
}