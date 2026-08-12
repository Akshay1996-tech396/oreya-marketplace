
import HomeSection from "@/components/home/HomeSection";
import { getHomeData } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import type { MarketplaceItem } from "@/types/marketplace";

export const dynamic = "force-dynamic";

async function getHomepageRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      status: "ACTIVE",
      isTableReservationAvailable: true,
      vendor: {
        status: "APPROVED",
      },
    },
    include: {
      vendor: true,
      category: true,
      tables: {
        where: {
          status: "ACTIVE",
          isReservable: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      operatingHours: {
        orderBy: {
          dayOfWeek: "asc",
        },
      },
    },
    orderBy: [
      {
        isPopular: "desc",
      },
      {
        isFeatured: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 12,
  });

  return restaurants.map((restaurant) => {
    const images = [
      restaurant.coverImage,
      restaurant.logo,
      ...restaurant.images,
    ].filter((image): image is string => Boolean(image));

    const price = restaurant.priceForTwo ? Number(restaurant.priceForTwo) : 0;
    const activeTableCount = restaurant.tables.length;

    return {
      id: restaurant.id,
      title: restaurant.name,
      slug: restaurant.slug,
      vendor: restaurant.vendor.businessName,
      category: restaurant.category?.name || "Restaurants",
      currency: restaurant.currency || "AED",
      price,
      images,
      type: "RESTAURANT" as MarketplaceItem["type"],
      href: `/restaurants/${restaurant.slug}`,
      canAddToCart: false,
      actionLabel: activeTableCount > 0 ? "Reserve Table" : "View Restaurant",
    };
  }) as MarketplaceItem[];
}

export default async function Home() {
  const homeData = await getHomeData();

  const restaurants = await getHomepageRestaurants();

  const { services, products, experiences } = homeData;

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 lg:px-20">
        <HomeSection
          title="All Restaurants"
          subtitle="Discover restaurants and reserve your table with date, time, and guest-based availability."
          items={restaurants}
          collectionSlug="restaurants"
        />

        <HomeSection
          title="All Services"
          subtitle="Explore expertly curated services that blend skill, precision, and care — experience excellence you can rely on and results you can see."
          items={services}
          collectionSlug="services"
        />

        <HomeSection
          title="All Experiences"
          subtitle="A curated range of experiences designed to elevate your evenings with energy, style, and unforgettable moments."
          items={experiences}
          collectionSlug="experiences"
        />

        <HomeSection
          title="All Products"
          subtitle="Discover thoughtfully curated products that blend quality, design, and purpose — discover quality you can feel and style you can trust."
          items={products}
          collectionSlug="products"
        />
      </section>
    </main>
  );
}
