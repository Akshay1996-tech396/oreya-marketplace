import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    const cart = await prisma.cart.findUnique({
      where: {
        customerId: user.id,
      },
      include: {
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const count =
      cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("CART_COUNT_ERROR", error);

    return NextResponse.json({
      success: true,
      count: 0,
    });
  }
}