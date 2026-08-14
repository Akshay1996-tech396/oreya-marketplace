import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { getCustomerOrders } from "../../../../lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const orders = await getCustomerOrders(user.id);

    const bookings = await prisma.booking.findMany({
      where: {
        customerId: user.id,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
          },
        },
        slot: {
          select: {
            id: true,
            note: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      orders,
      bookings,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}