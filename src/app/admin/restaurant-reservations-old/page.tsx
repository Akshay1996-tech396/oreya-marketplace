import { redirect } from "next/navigation";
import AdminRestaurantReservationsClient from "@/components/admin/restaurants/AdminRestaurantReservationsClient";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRestaurantReservationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const reservations = await prisma.restaurantReservation.findMany({
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
          vendor: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
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

  const preparedReservations = reservations.map((reservation) => ({
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
    restaurant: {
      id: reservation.restaurant.id,
      name: reservation.restaurant.name,
      slug: reservation.restaurant.slug,
      coverImage: reservation.restaurant.coverImage,
      logo: reservation.restaurant.logo,
      city: reservation.restaurant.city,
      area: reservation.restaurant.area,
      phone: reservation.restaurant.phone,
      email: reservation.restaurant.email,
      vendor: {
        id: reservation.restaurant.vendor.id,
        businessName: reservation.restaurant.vendor.businessName,
        status: reservation.restaurant.vendor.status,
      },
    },
    table: reservation.table
      ? {
          id: reservation.table.id,
          tableNumber: reservation.table.tableNumber,
          capacity: reservation.table.capacity,
          seatingArea: reservation.table.seatingArea,
        }
      : null,
  }));

  const restaurants = await prisma.restaurant.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      vendor: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  const preparedRestaurants = restaurants.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    vendor: {
      id: restaurant.vendor.id,
      businessName: restaurant.vendor.businessName,
    },
  }));

  return (
    <main className="dashboard-content">
      <div className="container-fluid px-3 px-lg-4 py-4">
        <div className="page-heading">
          <div className="page-heading-copy">
            <span className="page-icon">
              <i className="fa-regular fa-calendar-check" aria-hidden="true" />
            </span>

            <div>
              <p className="eyebrow mb-1">Restaurant Reservation</p>
              <h1 className="h3 mb-1">All Restaurant Reservations</h1>
              <p className="text-muted mb-0">
                Monitor restaurant table reservations across all vendors,
                restaurants, customers, tables, and statuses.
              </p>
            </div>
          </div>
        </div>

        <AdminRestaurantReservationsClient
          restaurants={preparedRestaurants}
          initialReservations={preparedReservations}
        />
      </div>
    </main>
  );
}
