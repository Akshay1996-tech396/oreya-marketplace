import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackRestaurantImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22900%22%20height%3D%22600%22%20viewBox%3D%220%200%20900%20600%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22900%22%20height%3D%22600%22%20fill%3D%22%23F4F1EC%22/%3E%3Ctext%20x%3D%22450%22%20y%3D%22305%22%20font-family%3D%22Arial%22%20font-size%3D%2238%22%20fill%3D%22%239A8A7A%22%20text-anchor%3D%22middle%22%3ERestaurant%3C/text%3E%3C/svg%3E";

function normalizeRestaurantImage(value: string | null) {
  if (!value) {
    return fallbackRestaurantImage;
  }

  const imageValue = value.trim();

  if (!imageValue) {
    return fallbackRestaurantImage;
  }

  if (
    imageValue.startsWith("http://") ||
    imageValue.startsWith("https://") ||
    imageValue.startsWith("/") ||
    imageValue.startsWith("data:") ||
    imageValue.startsWith("blob:")
  ) {
    return imageValue;
  }

  return `/uploads/restaurants/${imageValue}`;
}

function getRestaurantImage(coverImage: string | null, logo: string | null) {
  if (coverImage) {
    return normalizeRestaurantImage(coverImage);
  }

  if (logo) {
    return normalizeRestaurantImage(logo);
  }

  return fallbackRestaurantImage;
}

function formatLocation(
  area: string | null,
  city: string | null,
  state: string | null
) {
  const location = [area, city, state].filter(Boolean).join(", ");

  return location || "Location not added";
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "INACTIVE") {
    return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
}

export default async function VendorRestaurantsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/vendor/login");
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

  const restaurants = await prisma.restaurant.findMany({
    where: {
      vendorId: vendor.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      coverImage: true,
      logo: true,
      cuisineTypes: true,
      status: true,
      city: true,
      area: true,
      state: true,
      isTableReservationAvailable: true,
      reservationSlotMinutes: true,
      reservationBufferMinutes: true,
      reservationAdvanceDays: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          tables: true,
          menuItems: true,
          reservations: true,
          operatingHours: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-brand-500">
            Restaurant
          </p>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            My Restaurants
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Manage your restaurant profile, menu packages, operating hours,
            tables, and reservations from one place.
          </p>
        </div>

        <Link
          href="/vendor/restaurants/create"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          Add Restaurant
        </Link>
      </div>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vendor Account
            </p>

            <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              {vendor.businessName}
            </h2>
          </div>

          <span className="inline-flex w-fit rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
            Vendor Account: {formatStatusLabel(vendor.status)}
          </span>
        </div>
      </section>

      {restaurants.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-800">
            🍽️
          </div>

          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            No restaurants added yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Add your first restaurant, then configure menu packages, operating
            hours, and tables to start accepting table reservations.
          </p>

          <Link
            href="/vendor/restaurants/create"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            Add Restaurant
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:gap-6">
          {restaurants.map((restaurant) => {
            const imageUrl = getRestaurantImage(
              restaurant.coverImage,
              restaurant.logo
            );

            return (
              <article
                key={restaurant.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="grid grid-cols-1 xl:grid-cols-[160px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="relative h-52 bg-gray-100 dark:bg-gray-800 xl:h-full">
                    <img
                      src={imageUrl}
                      alt={restaurant.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 p-4 xl:p-2.5 2xl:p-5">
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start 2xl:flex 2xl:flex-row 2xl:items-start 2xl:justify-between 2xl:gap-5">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 2xl:mb-3 2xl:gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium xl:px-1.5 xl:py-0.5 xl:text-[10px] 2xl:px-2.5 2xl:py-1 2xl:text-xs ${getStatusBadgeClass(
                              restaurant.status
                            )}`}
                          >
                            {formatStatusLabel(restaurant.status)}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium xl:px-1.5 xl:py-0.5 xl:text-[10px] 2xl:px-2.5 2xl:py-1 2xl:text-xs ${
                              restaurant.isTableReservationAvailable
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                            }`}
                          >
                            {restaurant.isTableReservationAvailable
                              ? "Reservations Enabled"
                              : "Reservations Disabled"}
                          </span>
                        </div>

                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 xl:text-base 2xl:text-xl">
                          {restaurant.name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 xl:mt-0.5 xl:text-xs 2xl:mt-1 2xl:text-sm">
                          {formatLocation(
                            restaurant.area,
                            restaurant.city,
                            restaurant.state
                          )}
                        </p>

                        {restaurant.shortDescription ? (
                          <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-600 dark:text-gray-300 xl:mt-1 xl:overflow-hidden xl:text-ellipsis xl:whitespace-nowrap xl:text-xs xl:leading-4 2xl:mt-3 2xl:overflow-visible 2xl:whitespace-normal 2xl:text-sm 2xl:leading-6">
                            {restaurant.shortDescription}
                          </p>
                        ) : null}

                        {restaurant.cuisineTypes.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 xl:mt-1 2xl:mt-3 2xl:gap-2">
                            {restaurant.cuisineTypes.map((cuisine) => (
                              <span
                                key={cuisine}
                                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 xl:px-2 xl:text-[10px] 2xl:px-3 2xl:py-1 2xl:text-xs"
                              >
                                {cuisine}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid w-full grid-cols-2 gap-1.5 text-center sm:grid-cols-4 xl:grid-cols-2 2xl:w-auto 2xl:min-w-[430px] 2xl:grid-cols-4 2xl:gap-3">
                        <div className="rounded-lg bg-gray-50 p-1 dark:bg-gray-900 2xl:rounded-xl 2xl:p-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 2xl:text-lg">
                            {restaurant._count.operatingHours}
                          </p>
                          <p className="text-[9px] leading-3 text-gray-500 dark:text-gray-400 2xl:mt-1 2xl:text-xs 2xl:leading-normal">
                            Open Days
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-1 dark:bg-gray-900 2xl:rounded-xl 2xl:p-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 2xl:text-lg">
                            {restaurant._count.menuItems}
                          </p>
                          <p className="text-[9px] leading-3 text-gray-500 dark:text-gray-400 2xl:mt-1 2xl:text-xs 2xl:leading-normal">
                            Menus
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-1 dark:bg-gray-900 2xl:rounded-xl 2xl:p-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 2xl:text-lg">
                            {restaurant._count.tables}
                          </p>
                          <p className="text-[9px] leading-3 text-gray-500 dark:text-gray-400 2xl:mt-1 2xl:text-xs 2xl:leading-normal">
                            Tables
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-1 dark:bg-gray-900 2xl:rounded-xl 2xl:p-3">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 2xl:text-lg">
                            {restaurant._count.reservations}
                          </p>
                          <p className="text-[9px] leading-3 text-gray-500 dark:text-gray-400 2xl:mt-1 2xl:text-xs 2xl:leading-normal">
                            Reservations
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1.5 border-t border-gray-200 pt-2 dark:border-gray-800 sm:grid-cols-2 xl:grid-cols-6 2xl:mt-5 2xl:gap-3 2xl:pt-5">
                      <Link
                        href={`/vendor/restaurants/${restaurant.id}/edit`}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        Edit Restaurant
                      </Link>

                      <Link
                        href={`/vendor/restaurants/${restaurant.id}/menu`}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-amber-500 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm hover:bg-amber-600 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        Manage Menu
                      </Link>

                      <Link
                        href={`/vendor/restaurants/${restaurant.id}/hours`}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-gray-100 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-200 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        Operating Hours
                      </Link>

                      <Link
                        href={`/vendor/restaurants/${restaurant.id}/tables`}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-gray-900 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        Tables
                      </Link>

                      <Link
                        href="/vendor/restaurant-reservations"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        Reservations
                      </Link>

                      <Link
                        href={`/restaurants/${restaurant.slug}`}
                        target="_blank"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      >
                        View Public Page
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}