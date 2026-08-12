import RestaurantListingClient from "@/components/restaurants/RestaurantListingClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      coverImage: true,
      logo: true,
      images: true,
      cuisineTypes: true,
      priceForTwo: true,
      currency: true,
      city: true,
      area: true,
      state: true,
      country: true,
      isTableReservationAvailable: true,
      vendor: {
        select: {
          businessName: true,
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

  return (
    <RestaurantListingClient
      restaurants={restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        shortDescription: restaurant.shortDescription,
        description: restaurant.description,
        coverImage: restaurant.coverImage,
        logo: restaurant.logo,
        images: restaurant.images,
        cuisineTypes: restaurant.cuisineTypes,
        priceForTwo: restaurant.priceForTwo
          ? restaurant.priceForTwo.toString()
          : null,
        currency: restaurant.currency,
        city: restaurant.city,
        area: restaurant.area,
        state: restaurant.state,
        country: restaurant.country,
        isTableReservationAvailable: restaurant.isTableReservationAvailable,
        vendorName: restaurant.vendor?.businessName || "OREYA Partner",
        tablesCount: restaurant._count.tables,
        reservationsCount: restaurant._count.reservations,
      }))}
    />
  );
}