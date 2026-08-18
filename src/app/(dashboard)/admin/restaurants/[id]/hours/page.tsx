import Link from "next/link";
import { redirect } from "next/navigation";
import RestaurantOperatingHoursManager from "@/components/vendor/restaurants/RestaurantOperatingHoursManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminRestaurantOperatingHoursPage({
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
      isTableReservationAvailable: true,
      reservationSlotMinutes: true,
      reservationBufferMinutes: true,
      reservationAdvanceDays: true,
      reservationNoticeMinutes: true,
      allowSameDayReservation: true,
      operatingHours: {
        orderBy: {
          dayOfWeek: "asc",
        },
        select: {
          id: true,
          dayOfWeek: true,
          isClosed: true,
          openTime: true,
          closeTime: true,
          slotMinutes: true,
          lastReservationTime: true,
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

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">
            Restaurant Reservation
          </p>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Operating Hours
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Configure opening time, closing time, slot duration, and last
            reservation time for this restaurant.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/admin/restaurants/${restaurant.id}/tables`}
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-600"
          >
            Manage Tables
          </Link>

          <Link
            href="/admin/restaurants"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Back to Restaurants
          </Link>
        </div>
      </div>

      <RestaurantOperatingHoursManager
        apiBasePath="/api/admin/restaurants"
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          location,
          isTableReservationAvailable:
            restaurant.isTableReservationAvailable,
          reservationSlotMinutes: restaurant.reservationSlotMinutes,
          reservationBufferMinutes: restaurant.reservationBufferMinutes,
          reservationAdvanceDays: restaurant.reservationAdvanceDays,
          reservationNoticeMinutes: restaurant.reservationNoticeMinutes,
          allowSameDayReservation: restaurant.allowSameDayReservation,
          tableCount: restaurant._count.tables,
          reservationCount: restaurant._count.reservations,
          operatingHours: restaurant.operatingHours.map((hour) => ({
            id: hour.id,
            dayOfWeek: hour.dayOfWeek,
            isClosed: hour.isClosed,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            slotMinutes: hour.slotMinutes,
            lastReservationTime: hour.lastReservationTime,
          })),
        }}
      />
    </div>
  );
}