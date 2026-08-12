import Link from "next/link";
import { redirect } from "next/navigation";
import VendorRestaurantReservationsClient from "@/components/vendor/restaurants/VendorRestaurantReservationsClient";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VendorRestaurantReservationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect("/");
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const reservations = await prisma.restaurantReservation.findMany({
    where: {
      restaurant: {
        vendorId: vendor.id,
      },
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
    noShowAt: reservation.noShowAt ? reservation.noShowAt.toISOString() : null,
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
    where: {
      vendorId: vendor.id,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const preparedRestaurants = restaurants.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
  }));

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">
            Restaurant Reservation
          </p>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Restaurant Reservations
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Review, filter, and manage table reservations received for your
            restaurants.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendor/restaurants/create"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            Add Restaurant
          </Link>

          <Link
            href="/vendor/restaurants"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Manage Restaurants
          </Link>
        </div>
      </div>

      <VendorRestaurantReservationsClient
        vendor={{
          id: vendor.id,
          businessName: vendor.businessName,
          status: vendor.status,
        }}
        restaurants={preparedRestaurants}
        initialReservations={preparedReservations}
      />
    </div>
  );
}