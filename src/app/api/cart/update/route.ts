import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function getValidQuantity(value: unknown) {
  const quantity = Number(value);

  if (Number.isNaN(quantity)) {
    return 1;
  }

  return Math.floor(quantity);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Only customer can update cart." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const cartItemId = String(body.cartItemId || "").trim();
    const quantity = getValidQuantity(body.quantity);

    if (!cartItemId) {
      return NextResponse.json(
        { success: false, message: "Cart item id is required." },
        { status: 400 }
      );
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: {
          customerId: user.id,
        },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Cart item not found." },
        { status: 404 }
      );
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: {
          id: cartItem.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Item removed from cart.",
      });
    }

    await prisma.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cart updated successfully.",
    });
  } catch (error) {
    console.error("CART_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Cart update nahi ho paya.",
      },
      { status: 500 }
    );
  }
}