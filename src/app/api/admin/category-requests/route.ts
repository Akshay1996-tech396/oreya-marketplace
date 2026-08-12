import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const authResponse = await requireAdminUser();

    if (authResponse) {
      return authResponse;
    }

    const requests = await prisma.vendorCategoryRequest.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
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
    console.error("ADMIN_CATEGORY_REQUESTS_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load category requests.",
      },
      { status: 500 }
    );
  }
}