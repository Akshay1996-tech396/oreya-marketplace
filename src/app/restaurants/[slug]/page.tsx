import {
  Prisma,
  RestaurantMenuType,
} from "@prisma/client";
import { notFound } from "next/navigation";

import RestaurantDetailClient from "@/components/restaurants/RestaurantDetailClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * The marketplace currently uses AED as its primary currency,
 * so Asia/Dubai is used as the default business timezone.
 *
 * The timezone can be changed without modifying this file by
 * defining MARKETPLACE_TIME_ZONE in the environment variables.
 */
const MARKETPLACE_TIME_ZONE =
  process.env.MARKETPLACE_TIME_ZONE ||
  "Asia/Dubai";

/**
 * Returns the current calendar date at UTC midnight for the
 * configured marketplace timezone.
 *
 * Combo validity fields are stored as database DATE values.
 * This method prevents server timezone differences from causing
 * a Combo menu to appear or expire on the wrong calendar date.
 */
function getCurrentMarketplaceDate() {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKETPLACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = dateParts.find(
    (part) => part.type === "year"
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month"
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    const currentDate = new Date();

    return new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      )
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`
  );
}

export default async function RestaurantDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const currentMarketplaceDate =
    getCurrentMarketplaceDate();

  /**
   * Public menu visibility rules:
   *
   * 1. The menu item must be active.
   * 2. Regular menus remain visible without validity dates.
   * 3. Combo menus are visible only when the current date is
   *    between validFrom and validUntil, including both dates.
   * 4. Future, expired, or incomplete Combo menus are hidden.
   */
  const publicMenuItemWhere: Prisma.RestaurantMenuItemWhereInput =
    {
      isActive: true,

      OR: [
        {
          menuType:
            RestaurantMenuType.REGULAR,
        },
        {
          menuType:
            RestaurantMenuType.COMBO,
          validFrom: {
            lte: currentMarketplaceDate,
          },
          validUntil: {
            gte: currentMarketplaceDate,
          },
        },
      ],
    };

  const restaurant =
    await prisma.restaurant.findFirst({
      where: {
        slug,
        status: "ACTIVE",
      },

      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            description: true,
            status: true,
          },
        },

        operatingHours: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },

        specialHours: {
          orderBy: {
            date: "asc",
          },
        },

        tables: {
          where: {
            isReservable: true,
          },

          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              tableNumber: "asc",
            },
          ],
        },

        menuItems: {
          where: publicMenuItemWhere,

          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        },

        _count: {
          select: {
            tables: true,

            /*
             * Only publicly available menu items are counted.
             * Expired and future Combo menus are excluded.
             */
            menuItems: {
              where: publicMenuItemWhere,
            },

            reservations: true,
            reviews: true,
          },
        },
      },
    });

  if (!restaurant) {
    notFound();
  }

  return (
    <RestaurantDetailClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        shortDescription:
          restaurant.shortDescription,
        specifications:
          restaurant.specifications,
        exchangePolicy:
          restaurant.exchangePolicy,
        refundPolicy:
          restaurant.refundPolicy,
        logo: restaurant.logo,
        coverImage: restaurant.coverImage,
        images: restaurant.images,
        cuisineTypes: restaurant.cuisineTypes,

        priceForTwo: restaurant.priceForTwo
          ? restaurant.priceForTwo.toString()
          : null,

        currency: restaurant.currency,

        address: restaurant.address,
        addressLine1: restaurant.addressLine1,
        addressLine2: restaurant.addressLine2,
        city: restaurant.city,
        area: restaurant.area,
        state: restaurant.state,
        country: restaurant.country,
        zipCode: restaurant.zipCode,

        latitude: restaurant.latitude
          ? restaurant.latitude.toString()
          : null,

        longitude: restaurant.longitude
          ? restaurant.longitude.toString()
          : null,

        phone: restaurant.phone,
        email: restaurant.email,
        website: restaurant.website,

        isTableReservationAvailable:
          restaurant.isTableReservationAvailable,

        reservationSlotMinutes:
          restaurant.reservationSlotMinutes,

        reservationBufferMinutes:
          restaurant.reservationBufferMinutes,

        reservationAdvanceDays:
          restaurant.reservationAdvanceDays,

        reservationNoticeMinutes:
          restaurant.reservationNoticeMinutes,

        reservationMinGuests:
          restaurant.reservationMinGuests,

        reservationMaxGuests:
          restaurant.reservationMaxGuests,

        reservationAutoConfirm:
          restaurant.reservationAutoConfirm,

        allowSameDayReservation:
          restaurant.allowSameDayReservation,

        allowGuestReservation:
          restaurant.allowGuestReservation,

        reservationTerms:
          restaurant.reservationTerms,

        reservationCancellationNote:
          restaurant.reservationCancellationNote,

        vendor: restaurant.vendor
          ? {
              id: restaurant.vendor.id,
              businessName:
                restaurant.vendor.businessName,
              slug: restaurant.vendor.slug,
              description: restaurant.vendor.description,
              status: restaurant.vendor.status,
            }
          : null,

        operatingHours:
          restaurant.operatingHours.map(
            (hour) => ({
              id: hour.id,
              dayOfWeek: hour.dayOfWeek,
              isClosed: hour.isClosed,
              openTime: hour.openTime,
              closeTime: hour.closeTime,

              /*
               * These values are required so the
               * frontend generates the same slots
               * as the availability API.
               */
              slotMinutes: hour.slotMinutes,
              lastReservationTime:
                hour.lastReservationTime,
            })
          ),

        specialHours:
          restaurant.specialHours.map(
            (hour) => ({
              id: hour.id,
              date: hour.date.toISOString(),
              isClosed: hour.isClosed,
              openTime: hour.openTime,
              closeTime: hour.closeTime,
              note: hour.reason,
            })
          ),

        tables: restaurant.tables.map(
          (table) => ({
            id: table.id,
            tableNumber: table.tableNumber,
            name: null,
            capacity: table.capacity,
            minGuests: 1,
            maxGuests: table.capacity,
            location: table.seatingArea,

            isActive:
              String(table.status) ===
              "ACTIVE",

            isReservable:
              table.isReservable,

            sortOrder: table.sortOrder,
          })
        ),

        menuItems: restaurant.menuItems.map(
          (menuItem) => ({
            id: menuItem.id,
            restaurantId:
              menuItem.restaurantId,
            name: menuItem.name,
            slug: menuItem.slug,
            description:
              menuItem.description,
            price:
              menuItem.price.toString(),
            currency:
              menuItem.currency,
            image: menuItem.image,
            images: menuItem.images,
            isActive: menuItem.isActive,
            sortOrder:
              menuItem.sortOrder,

            menuType: menuItem.menuType,

            validFrom: menuItem.validFrom
              ? menuItem.validFrom.toISOString()
              : null,

            validUntil: menuItem.validUntil
              ? menuItem.validUntil.toISOString()
              : null,
          })
        ),

        _count: {
          tables:
            restaurant._count.tables,

          /*
           * This represents only menu items that are
           * currently available on the public storefront.
           */
          menuItems:
            restaurant._count.menuItems,

          reservations:
            restaurant._count.reservations,

          reviews:
            restaurant._count.reviews,
        },
      }}
    />
  );
}