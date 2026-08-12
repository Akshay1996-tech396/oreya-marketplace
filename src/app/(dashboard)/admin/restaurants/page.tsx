import { redirect } from "next/navigation";

import AdminRestaurantApprovalManager from "@/components/admin/restaurants/AdminRestaurantApprovalManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDashboardPath(role: string) {
  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  if (role === "CUSTOMER") {
    return "/customer";
  }

  return "/";
}

export default async function AdminRestaurantsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      phone: true,
      email: true,
      website: true,
      logo: true,
      coverImage: true,
      images: true,
      cuisineTypes: true,
      priceForTwo: true,
      currency: true,
      address: true,
      country: true,
      state: true,
      city: true,
      area: true,
      status: true,
      isTableReservationAvailable: true,
      reservationSlotMinutes: true,
      reservationAdvanceDays: true,
      rejectedReason: true,
      createdAt: true,
      approvedAt: true,
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          tables: true,
          reservations: true,
          reviews: true,
        },
      },
    },
  });

  const preparedRestaurants = restaurants.map(
    (restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      shortDescription:
        restaurant.shortDescription,
      phone: restaurant.phone,
      email: restaurant.email,
      website: restaurant.website,
      logo: restaurant.logo,
      coverImage: restaurant.coverImage,
      images: restaurant.images,
      cuisineTypes: restaurant.cuisineTypes,
      priceForTwo: restaurant.priceForTwo
        ? restaurant.priceForTwo.toString()
        : null,
      currency: restaurant.currency,
      address: restaurant.address,
      country: restaurant.country,
      state: restaurant.state,
      city: restaurant.city,
      area: restaurant.area,
      status: restaurant.status,
      isTableReservationAvailable:
        restaurant.isTableReservationAvailable,
      reservationSlotMinutes:
        restaurant.reservationSlotMinutes,
      reservationAdvanceDays:
        restaurant.reservationAdvanceDays,
      rejectedReason:
        restaurant.rejectedReason,
      createdAt:
        restaurant.createdAt.toISOString(),
      approvedAt: restaurant.approvedAt
        ? restaurant.approvedAt.toISOString()
        : null,
      vendor: {
        id: restaurant.vendor.id,
        businessName:
          restaurant.vendor.businessName,
        slug: restaurant.vendor.slug,
        status: restaurant.vendor.status,
        user: {
          id: restaurant.vendor.user.id,
          name: restaurant.vendor.user.name,
          email:
            restaurant.vendor.user.email,
          phone:
            restaurant.vendor.user.phone,
        },
      },
      category: restaurant.category
        ? {
            id: restaurant.category.id,
            name: restaurant.category.name,
            slug: restaurant.category.slug,
          }
        : null,
      _count: {
        tables: restaurant._count.tables,
        reservations:
          restaurant._count.reservations,
        reviews: restaurant._count.reviews,
      },
    })
  );

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">
            Restaurant Approval
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review, approve, reject, suspend and manage
            table-reservation restaurants.
          </p>
        </div>

        <AdminRestaurantApprovalManager
          initialRestaurants={
            preparedRestaurants
          }
        />
      </div>
    </main>
  );
}