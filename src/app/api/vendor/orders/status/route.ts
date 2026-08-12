import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedVendorStatuses: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const terminalStatuses: OrderStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "REFUNDED",
];

function getCleanString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getParentOrderStatus(itemStatuses: OrderStatus[]): OrderStatus {
  if (itemStatuses.length === 0) {
    return "PENDING";
  }

  const everyPending = itemStatuses.every((status) => status === "PENDING");
  const everyAccepted = itemStatuses.every((status) => status === "ACCEPTED");
  const everyProcessing = itemStatuses.every(
    (status) => status === "PROCESSING"
  );
  const everyShipped = itemStatuses.every((status) => status === "SHIPPED");
  const everyDelivered = itemStatuses.every(
    (status) => status === "DELIVERED"
  );
  const everyCompleted = itemStatuses.every(
    (status) => status === "COMPLETED"
  );
  const everyCancelled = itemStatuses.every(
    (status) => status === "CANCELLED"
  );
  const everyRejected = itemStatuses.every((status) => status === "REJECTED");
  const everyRefunded = itemStatuses.every((status) => status === "REFUNDED");

  if (everyPending) return "PENDING";
  if (everyAccepted) return "ACCEPTED";
  if (everyProcessing) return "PROCESSING";
  if (everyShipped) return "SHIPPED";
  if (everyDelivered) return "DELIVERED";
  if (everyCompleted) return "COMPLETED";
  if (everyCancelled) return "CANCELLED";
  if (everyRejected) return "REJECTED";
  if (everyRefunded) return "REFUNDED";

  const hasActiveItem = itemStatuses.some(
    (status) => !terminalStatuses.includes(status)
  );

  if (!hasActiveItem) {
    if (itemStatuses.some((status) => status === "COMPLETED")) {
      return "COMPLETED";
    }

    if (itemStatuses.some((status) => status === "REFUNDED")) {
      return "REFUNDED";
    }

    if (itemStatuses.some((status) => status === "CANCELLED")) {
      return "CANCELLED";
    }

    if (itemStatuses.some((status) => status === "REJECTED")) {
      return "REJECTED";
    }
  }

  if (itemStatuses.some((status) => status === "DELIVERED")) {
    return "DELIVERED";
  }

  if (itemStatuses.some((status) => status === "SHIPPED")) {
    return "SHIPPED";
  }

  if (itemStatuses.some((status) => status === "PROCESSING")) {
    return "PROCESSING";
  }

  if (itemStatuses.some((status) => status === "ACCEPTED")) {
    return "ACCEPTED";
  }

  return "PROCESSING";
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

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can update vendor order item status.",
        },
        { status: 403 }
      );
    }

    let body: {
      orderItemId?: unknown;
      status?: unknown;
      vendorNote?: unknown;
    } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const orderItemId = getCleanString(body.orderItemId);
    const requestedStatus = getCleanString(body.status) as OrderStatus;
    const vendorNote = getCleanString(body.vendorNote);

    if (!orderItemId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order item ID is required.",
        },
        { status: 400 }
      );
    }

    if (!allowedVendorStatuses.includes(requestedStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid vendor order item status.",
          allowedStatuses: allowedVendorStatuses,
        },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor profile was not found.",
        },
        { status: 404 }
      );
    }

    if (vendor.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Only approved vendors can update order item status.",
        },
        { status: 403 }
      );
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: {
        id: orderItemId,
      },
      include: {
        product: {
          select: {
            vendorId: true,
            title: true,
          },
        },
        service: {
          select: {
            vendorId: true,
            title: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        {
          success: false,
          message: "Order item was not found.",
        },
        { status: 404 }
      );
    }

    const belongsToVendor =
      orderItem.product?.vendorId === vendor.id ||
      orderItem.service?.vendorId === vendor.id;

    if (!belongsToVendor) {
      return NextResponse.json(
        {
          success: false,
          message: "You can update only your own order items.",
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrderItem = await tx.orderItem.update({
        where: {
          id: orderItem.id,
        },
        data: {
          status: requestedStatus,
          vendorNote: vendorNote || null,
        },
        select: {
          id: true,
          orderId: true,
          status: true,
          vendorNote: true,
          title: true,
        },
      });

      const allOrderItems = await tx.orderItem.findMany({
        where: {
          orderId: orderItem.orderId,
        },
        select: {
          status: true,
        },
      });

      const parentOrderStatus = getParentOrderStatus(
        allOrderItems.map((item) => item.status)
      );

      const updatedOrder = await tx.order.update({
        where: {
          id: orderItem.orderId,
        },
        data: {
          status: parentOrderStatus,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
        },
      });

      return {
        updatedOrderItem,
        updatedOrder,
        parentOrderStatus,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Order item status updated successfully.",
      orderItem: result.updatedOrderItem,
      order: result.updatedOrder,
      parentOrderStatus: result.parentOrderStatus,
    });
  } catch (error) {
    console.error("VENDOR_ORDER_STATUS_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update the order item status. Please try again.",
      },
      { status: 500 }
    );
  }
}