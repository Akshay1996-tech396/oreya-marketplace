import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import RestaurantForm from "@/components/vendor/restaurants/RestaurantForm";
import { getCurrentUser } from "@/lib/auth";
import { getContentLimits } from "@/lib/content-limits-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const IMAGE_UPLOAD_SIZE_SETTING_KEY = "maxImageUploadSizeMb";
const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

type Props = { params: Promise<{ id: string }> };

function getMaximumImageUploadSize(settingValue: string | undefined) {
  const parsedValue = Number(settingValue);
  if (!Number.isFinite(parsedValue) || parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB || parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }
  return parsedValue;
}

export default async function EditAdminRestaurantPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const restaurantId = id.trim();
  if (!restaurantId) notFound();

  const [restaurant, imageUploadSizeSetting, contentLimits] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true, vendorId: true, name: true, description: true, shortDescription: true, specifications: true,
        exchangePolicy: true, refundPolicy: true, phone: true, email: true, website: true, logo: true, coverImage: true, images: true,
        cuisineTypes: true, priceForTwo: true, currency: true, address: true, addressLine1: true, addressLine2: true, country: true,
        state: true, city: true, area: true, zipCode: true, latitude: true, longitude: true, isTableReservationAvailable: true,
        reservationSlotMinutes: true, reservationBufferMinutes: true, reservationAdvanceDays: true, reservationNoticeMinutes: true,
        reservationMinGuests: true, reservationMaxGuests: true, reservationAutoConfirm: true, allowSameDayReservation: true,
        allowGuestReservation: true, reservationTerms: true, reservationCancellationNote: true, status: true,
      },
    }),
    prisma.setting.findUnique({ where: { key: IMAGE_UPLOAD_SIZE_SETTING_KEY }, select: { value: true } }),
    getContentLimits(),
  ]);

  if (!restaurant) notFound();

  return (
    <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <Link href="/admin/restaurants" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950 dark:text-gray-400 dark:hover:text-white">
            ← Back to Restaurants
          </Link>
          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Edit Restaurant</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update the restaurant profile, images, location details and table reservation settings.</p>
        </div>

        <RestaurantForm
          mode="edit"
          initialData={{
            id: restaurant.id, vendorId: restaurant.vendorId, name: restaurant.name, description: restaurant.description, shortDescription: restaurant.shortDescription,
            specifications: restaurant.specifications, exchangePolicy: restaurant.exchangePolicy, refundPolicy: restaurant.refundPolicy, phone: restaurant.phone,
            email: restaurant.email, website: restaurant.website, logo: restaurant.logo, coverImage: restaurant.coverImage, images: restaurant.images,
            cuisineTypes: restaurant.cuisineTypes, priceForTwo: restaurant.priceForTwo?.toString() ?? null, currency: restaurant.currency, address: restaurant.address,
            addressLine1: restaurant.addressLine1, addressLine2: restaurant.addressLine2, country: restaurant.country, state: restaurant.state, city: restaurant.city,
            area: restaurant.area, zipCode: restaurant.zipCode, latitude: restaurant.latitude?.toString() ?? null, longitude: restaurant.longitude?.toString() ?? null,
            isTableReservationAvailable: restaurant.isTableReservationAvailable, reservationSlotMinutes: restaurant.reservationSlotMinutes,
            reservationBufferMinutes: restaurant.reservationBufferMinutes, reservationAdvanceDays: restaurant.reservationAdvanceDays, reservationNoticeMinutes: restaurant.reservationNoticeMinutes,
            reservationMinGuests: restaurant.reservationMinGuests, reservationMaxGuests: restaurant.reservationMaxGuests, reservationAutoConfirm: restaurant.reservationAutoConfirm,
            allowSameDayReservation: restaurant.allowSameDayReservation, allowGuestReservation: restaurant.allowGuestReservation, reservationTerms: restaurant.reservationTerms,
            reservationCancellationNote: restaurant.reservationCancellationNote, status: restaurant.status,
          }}
          maxImageUploadSizeMb={getMaximumImageUploadSize(imageUploadSizeSetting?.value)}
          contentLimits={contentLimits}
          saveEndpoint={`/api/admin/restaurants/manage/${restaurant.id}`}
          redirectPath="/admin/restaurants"
          allowDelete={false}
        />
      </div>
    </main>
  );
}
