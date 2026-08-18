import Link from "next/link";
import { redirect } from "next/navigation";
import RestaurantTableManager from "@/components/vendor/restaurants/RestaurantTableManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminRestaurantTablesPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      city: true,
      status: true,
      isTableReservationAvailable: true,
      reservationMinGuests: true,
      reservationMaxGuests: true,
      tables: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            tableNumber: "asc",
          },
        ],
        select: {
          id: true,
          tableNumber: true,
          capacity: true,
          seatingArea: true,
          status: true,
          isReservable: true,
          note: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          tables: true,
          reservations: true,
        },
      },
    },
  });

  if (!restaurant) {
    redirect("/admin/restaurants");
  }

  const location =
    [restaurant.area, restaurant.city].filter(Boolean).join(", ") ||
    "Location not added";

  const preparedTables = restaurant.tables.map((table) => ({
    id: table.id,
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    seatingArea: table.seatingArea,
    status: table.status,
    isReservable: table.isReservable,
    note: table.note,
    sortOrder: table.sortOrder,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">
            Restaurant Reservation
          </p>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Restaurant Tables
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Create and manage restaurant tables that customers can reserve
            through the reservation system.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/admin/restaurants/${restaurant.id}/hours`}
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-600"
          >
            Manage Hours
          </Link>

          <Link
            href="/admin/restaurants"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Back to Restaurants
          </Link>
        </div>
      </div>

      <RestaurantTableManager
        apiBasePath="/api/admin/restaurants"
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          location,
          status: restaurant.status,
          isTableReservationAvailable:
            restaurant.isTableReservationAvailable,
          reservationMinGuests: restaurant.reservationMinGuests,
          reservationMaxGuests: restaurant.reservationMaxGuests,
          tableCount: restaurant._count.tables,
          reservationCount: restaurant._count.reservations,
          tables: preparedTables,
        }}
      />
    </div>
  );
}