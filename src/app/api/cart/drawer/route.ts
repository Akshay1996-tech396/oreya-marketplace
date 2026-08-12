import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CartDrawerItem = {
  id: string;
  productId: string | null;
  serviceId: string | null;
  restaurantId: null;
  menuItemId: null;
  title: string;
  slug: string;
  vendor: string;
  image: string;
  quantity: number;
  price: number;
  currency: string;
  type: "PRODUCT" | "SERVICE";
  lineTotal: number;
};

const emptyCartResponse = {
  success: true,
  items: [] as CartDrawerItem[],
  count: 0,
  subtotal: 0,
  currency: "AED",
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "CUSTOMER") {
      return NextResponse.json(emptyCartResponse);
    }

    const cart = await prisma.cart.findUnique({
      where: {
        customerId: user.id,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
            service: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json(emptyCartResponse);
    }

    const items = cart.items.flatMap<CartDrawerItem>((item) => {
      const price = Number(item.price);
      const lineTotal = price * item.quantity;

      if (item.product) {
        return [
          {
            id: item.id,
            productId: item.productId,
            serviceId: null,
            restaurantId: null,
            menuItemId: null,
            title: item.product.title,
            slug: item.product.slug,
            vendor: item.product.vendor?.businessName || "Admin Product",
            image: item.product.images?.[0] || "",
            quantity: item.quantity,
            price,
            currency: item.currency,
            type: "PRODUCT",
            lineTotal,
          },
        ];
      }

      if (item.service) {
        return [
          {
            id: item.id,
            productId: null,
            serviceId: item.serviceId,
            restaurantId: null,
            menuItemId: null,
            title: item.service.title,
            slug: item.service.slug,
            vendor: item.service.vendor?.businessName || "Admin Service",
            image: item.service.images?.[0] || "",
            quantity: item.quantity,
            price,
            currency: item.currency,
            type: "SERVICE",
            lineTotal,
          },
        ];
      }

      return [];
    });

    const count = items.reduce((total, item) => total + item.quantity, 0);

    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

    const currency = items[0]?.currency || "AED";

    return NextResponse.json({
      success: true,
      items,
      count,
      subtotal,
      currency,
    });
  } catch (error) {
    console.error("CART_DRAWER_GET_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load the cart. Please try again.",
      },
      { status: 500 }
    );
  }
}