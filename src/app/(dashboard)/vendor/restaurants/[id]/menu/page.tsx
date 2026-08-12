import Link from "next/link";
import { redirect } from "next/navigation";

import RestaurantMenuItemsManager from "@/components/vendor/restaurants/RestaurantMenuItemsManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type VendorRestaurantMenuPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorRestaurantMenuPage({
  params,
}: VendorRestaurantMenuPageProps) {
  const { id } = await params;

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
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id,
      vendorId: vendor.id,
    },
    select: {
      id: true,
      name: true,
      currency: true,
      status: true,

      menuItems: {
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      },
    },
  });

  if (!restaurant) {
    redirect("/vendor/restaurants");
  }

  const menuItems = restaurant.menuItems.map((menuItem) => ({
    id: menuItem.id,
    restaurantId: menuItem.restaurantId,
    name: menuItem.name,
    slug: menuItem.slug,
    description: menuItem.description,

    /*
     * These fields must be passed to the client component.
     * Otherwise, Combo menus are incorrectly treated as Regular
     * menus after a page reload or server-component rerender.
     */
    menuType: menuItem.menuType,
    validFrom: menuItem.validFrom
      ? menuItem.validFrom.toISOString()
      : null,
    validUntil: menuItem.validUntil
      ? menuItem.validUntil.toISOString()
      : null,

    price: menuItem.price.toString(),
    currency: menuItem.currency,
    image: menuItem.image,
    images: menuItem.images,
    isActive: menuItem.isActive,
    sortOrder: menuItem.sortOrder,
    createdAt: menuItem.createdAt.toISOString(),
    updatedAt: menuItem.updatedAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">
            Restaurant Menu
          </p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            {restaurant.name}
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create Regular menus or time-limited Combo packages that
            customers can select before checkout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/vendor/restaurants/${restaurant.id}/hours`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Operating Hours
          </Link>

          <Link
            href={`/vendor/restaurants/${restaurant.id}/tables`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Tables
          </Link>

          <Link
            href="/vendor/restaurants"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Back to Restaurants
          </Link>
        </div>
      </div>

      <RestaurantMenuItemsManager
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          currency: restaurant.currency,
        }}
        initialMenuItems={menuItems}
      />
    </div>
  );
}