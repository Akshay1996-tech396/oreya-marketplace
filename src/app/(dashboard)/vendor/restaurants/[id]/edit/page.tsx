import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import RestaurantForm from "@/components/vendor/restaurants/RestaurantForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const IMAGE_UPLOAD_SIZE_SETTING_KEY =
  "maxImageUploadSizeMb";

const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

type EditRestaurantPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function getMaximumImageUploadSize(
  settingValue: string | undefined
) {
  const parsedValue = Number(settingValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB ||
    parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB
  ) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }

  return parsedValue;
}

export default async function EditRestaurantPage({
  params,
}: EditRestaurantPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const restaurantId = id.trim();

  if (!restaurantId) {
    notFound();
  }

  const [vendor, imageUploadSizeSetting, contentLimits] =
    await Promise.all([
      prisma.vendorProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          status: true,
          address: true,
          addressLine1: true,
          addressLine2: true,
          country: true,
          state: true,
          city: true,
          zipCode: true,
        },
      }),

      prisma.setting.findUnique({
        where: {
          key: IMAGE_UPLOAD_SIZE_SETTING_KEY,
        },
        select: {
          value: true,
        },
      }),
      getContentLimits(),
    ]);

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  if (vendor.status !== "APPROVED") {
    redirect("/vendor/dashboard");
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      vendorId: vendor.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      shortDescription: true,
      specifications: true,
      exchangePolicy: true,
      refundPolicy: true,
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
      addressLine1: true,
      addressLine2: true,
      country: true,
      state: true,
      city: true,
      area: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      isTableReservationAvailable: true,
      reservationSlotMinutes: true,
      reservationBufferMinutes: true,
      reservationAdvanceDays: true,
      reservationNoticeMinutes: true,
      reservationMinGuests: true,
      reservationMaxGuests: true,
      reservationAutoConfirm: true,
      allowSameDayReservation: true,
      allowGuestReservation: true,
      reservationTerms: true,
      reservationCancellationNote: true,
      status: true,
    },
  });

  if (!restaurant) {
    notFound();
  }

  const maxImageUploadSizeMb =
    getMaximumImageUploadSize(
      imageUploadSizeSetting?.value
    );

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <Link
            href="/vendor/restaurants"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
          >
            <ChevronLeft size={17} />
            Back to Restaurants
          </Link>

          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">
            Edit Restaurant
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update the restaurant profile, images, location details and table
            reservation settings.
          </p>
        </div>

        <RestaurantForm
          mode="edit"
          maxImageUploadSizeMb={
            maxImageUploadSizeMb
          }
          contentLimits={contentLimits}
          vendorAddress={{
            address: vendor.address,
            addressLine1: vendor.addressLine1,
            addressLine2: vendor.addressLine2,
            country: vendor.country,
            state: vendor.state,
            city: vendor.city,
            zipCode: vendor.zipCode,
          }}
          initialData={{
            id: restaurant.id,
            name: restaurant.name,
            description: restaurant.description,
            shortDescription:
              restaurant.shortDescription,
            specifications:
              restaurant.specifications,
            exchangePolicy:
              restaurant.exchangePolicy,
            refundPolicy:
              restaurant.refundPolicy,
            phone: restaurant.phone,
            email: restaurant.email,
            website: restaurant.website,
            logo: restaurant.logo,
            coverImage: restaurant.coverImage,
            images: restaurant.images,
            cuisineTypes:
              restaurant.cuisineTypes,
            priceForTwo: restaurant.priceForTwo
              ? restaurant.priceForTwo.toString()
              : "",
            currency: restaurant.currency,
            address: restaurant.address,
            addressLine1:
              restaurant.addressLine1,
            addressLine2:
              restaurant.addressLine2,
            country: restaurant.country,
            state: restaurant.state,
            city: restaurant.city,
            area: restaurant.area,
            zipCode: restaurant.zipCode,
            latitude: restaurant.latitude
              ? restaurant.latitude.toString()
              : "",
            longitude: restaurant.longitude
              ? restaurant.longitude.toString()
              : "",
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
            status: restaurant.status,
          }}
        />
      </div>
    </main>
  );
}
