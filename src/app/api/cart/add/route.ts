import { NextResponse } from "next/server";
import { ProductStatus, ServiceStatus, VendorStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getValidQuantity(value: unknown) {
  const quantity = Number(value || 1);

  if (Number.isNaN(quantity) || quantity < 1) {
    return 1;
  }

  return Math.floor(quantity);
}

function getOptionalId(value: unknown) {
  const id = String(value || "").trim();

  return id.length > 0 ? id : null;
}

function getVendorApprovalErrorMessage(type: "product" | "service") {
  if (type === "product") {
    return "This product is currently unavailable because the vendor account is not approved.";
  }

  return "This service is currently unavailable because the vendor account is not approved.";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication is required.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Only customers can add items to the cart.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const productId = getOptionalId(body.productId);
    const serviceId = getOptionalId(body.serviceId);
    const variantId = getOptionalId(body.variantId);
    const menuItemId = getOptionalId(body.menuItemId);
    const restaurantId = getOptionalId(body.restaurantId);
    const quantity = getValidQuantity(body.quantity);

    if (menuItemId || restaurantId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Restaurant items are not supported in the cart. Restaurants are available for table reservations only.",
        },
        { status: 400 }
      );
    }

    const selectedIds = [productId, serviceId].filter(Boolean);

    if (selectedIds.length !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select either one product or one service.",
        },
        { status: 400 }
      );
    }

    if (variantId && !productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product variation can only be selected with a product.",
        },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.upsert({
      where: {
        customerId: user.id,
      },
      update: {},
      create: {
        customerId: user.id,
      },
    });

    if (productId) {
      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
        },
      });

      if (!product || product.status !== ProductStatus.ACTIVE) {
        return NextResponse.json(
          {
            success: false,
            message: "Product was not found or is currently inactive.",
          },
          { status: 404 }
        );
      }

      if (product.vendorId && product.vendor?.status !== VendorStatus.APPROVED) {
        return NextResponse.json(
          {
            success: false,
            message: getVendorApprovalErrorMessage("product"),
          },
          { status: 400 }
        );
      }

      const activeVariantCount = await prisma.productVariant.count({
        where: {
          productId: product.id,
          isActive: true,
        },
      });

      if (activeVariantCount > 0 && !variantId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a product variation before adding this item to the cart.",
          },
          { status: 400 }
        );
      }

      const selectedVariant = variantId
        ? await prisma.productVariant.findFirst({
            where: {
              id: variantId,
              productId: product.id,
              isActive: true,
            },
          })
        : null;

      if (variantId && !selectedVariant) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected product variation is not available.",
          },
          { status: 404 }
        );
      }

      const selectedPrice = selectedVariant?.price ?? product.price;
      const selectedCurrency = selectedVariant?.currency || product.currency;
      const availableStock = selectedVariant?.stock ?? product.stock ?? 0;

      if (availableStock < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "This item is currently out of stock.",
          },
          { status: 400 }
        );
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          serviceId: null,
          variantId: selectedVariant ? selectedVariant.id : null,
        },
      });

      const nextQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

      if (nextQuantity > availableStock) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${availableStock} item(s) are available for this selection.`,
          },
          { status: 400 }
        );
      }

      if (existingItem) {
        await prisma.cartItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: nextQuantity,
            price: selectedPrice,
            currency: selectedCurrency,
            variantId: selectedVariant ? selectedVariant.id : null,
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            serviceId: null,
            variantId: selectedVariant ? selectedVariant.id : null,
            quantity,
            price: selectedPrice,
            currency: selectedCurrency,
          },
        });
      }
    }

    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
        },
      });

      if (!service || service.status !== ServiceStatus.ACTIVE) {
        return NextResponse.json(
          {
            success: false,
            message: "Service was not found or is currently inactive.",
          },
          { status: 404 }
        );
      }

      if (service.vendorId && service.vendor?.status !== VendorStatus.APPROVED) {
        return NextResponse.json(
          {
            success: false,
            message: getVendorApprovalErrorMessage("service"),
          },
          { status: 400 }
        );
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: null,
          serviceId: service.id,
        },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: existingItem.quantity + quantity,
            price: service.price,
            currency: service.currency,
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: null,
            serviceId: service.id,
            variantId: null,
            quantity,
            price: service.price,
            currency: service.currency,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Item added to cart successfully.",
    });
  } catch (error) {
    console.error("CART_ADD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to add the item to the cart. Please try again.",
      },
      { status: 500 }
    );
  }
}