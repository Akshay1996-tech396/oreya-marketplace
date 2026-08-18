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

    const restaurantReservations = await prisma.restaurantReservation.findMany({
      where: {
        customerId: user.id,
      },
      orderBy: [
        {
          reservationDate: "desc",
        },
        {
          startTime: "desc",
        },
      ],
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImage: true,
            logo: true,
            city: true,
            area: true,
            phone: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            seatingArea: true,
          },
        },
      },
    });

    const preparedRestaurantReservations = restaurantReservations.map(
      (reservation) => ({
        id: reservation.id,
        reservationCode: reservation.reservationCode,
        restaurantId: reservation.restaurantId,
        tableId: reservation.tableId,
        reservationDate: reservation.reservationDate.toISOString().slice(0, 10),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        slotMinutes: reservation.slotMinutes,
        guests: reservation.guests,
        amount: reservation.amount ? reservation.amount.toString() : "0",
        currency: reservation.currency,
        status: reservation.status,
        source: reservation.source,
        paymentStatus: reservation.paymentStatus,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        customerPhone: reservation.customerPhone,
        customerNote: reservation.customerNote,
        cancellationReason: reservation.cancelReason,
        confirmedAt: reservation.confirmedAt
          ? reservation.confirmedAt.toISOString()
          : null,
        cancelledAt: reservation.cancelledAt
          ? reservation.cancelledAt.toISOString()
          : null,
        arrivedAt: null,
        completedAt: reservation.completedAt
          ? reservation.completedAt.toISOString()
          : null,
        noShowAt: reservation.noShowAt
          ? reservation.noShowAt.toISOString()
          : null,
        createdAt: reservation.createdAt.toISOString(),
        updatedAt: reservation.updatedAt.toISOString(),
        restaurant: reservation.restaurant,
        table: reservation.table,
      })
    );


    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      orders,
      bookings,
      restaurantReservations: preparedRestaurantReservations,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}