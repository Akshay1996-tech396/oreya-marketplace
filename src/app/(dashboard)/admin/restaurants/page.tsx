import { redirect } from "next/navigation";

import AdminRestaurantApprovalManager from "@/components/admin/restaurants/AdminRestaurantApprovalManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/vendor/dashboard";
  if (role === "CUSTOMER") return "/customer";
  return "/";
}

export default async function AdminRestaurantsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(getDashboardPath(user.role));

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      logo: true,
      coverImage: true,
      images: true,
      cuisineTypes: true,
      status: true,
      city: true,
      area: true,
      state: true,
      isTableReservationAvailable: true,
      reservationSlotMinutes: true,
      vendor: {
        select: {
          id: true,
          businessName: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
      },
      _count: {
        select: {
          operatingHours: true,
          menuItems: true,
          tables: true,
          reservations: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6">
        <p className="mb-1 text-sm font-medium text-brand-500">Restaurant</p>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Restaurant Management
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Manage restaurant profiles, menu packages, operating hours, tables,
          reservations and administrator approval controls from one place.
        </p>
      </div>

      <AdminRestaurantApprovalManager
        initialRestaurants={restaurants.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          shortDescription: restaurant.shortDescription,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          images: restaurant.images,
          cuisineTypes: restaurant.cuisineTypes,
          status: restaurant.status,
          city: restaurant.city,
          area: restaurant.area,
          state: restaurant.state,
          isTableReservationAvailable: restaurant.isTableReservationAvailable,
          reservationSlotMinutes: restaurant.reservationSlotMinutes,
          vendor: {
            id: restaurant.vendor.id,
            businessName: restaurant.vendor.businessName,
            status: restaurant.vendor.status,
            user: {
              name: restaurant.vendor.user.name,
              email: restaurant.vendor.user.email,
            },
          },
          _count: restaurant._count,
        }))}
      />
    </main>
  );
}
