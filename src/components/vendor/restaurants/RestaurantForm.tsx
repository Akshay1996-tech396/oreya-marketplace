"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import type { ContentLimits } from "@/lib/content-limits";
import {
  Loader2,
  MapPin,
  Trash2,
  UploadCloud,
} from "lucide-react";

type RestaurantSpecificationRow = {
  id: string;
  label: string;
  value: string;
};

type RestaurantFormData = {
  id?: string;
  name?: string;
  description?: string | null;
  shortDescription?: string | null;
  specifications?: unknown;
  exchangePolicy?: string | null;
  refundPolicy?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  cuisineTypes?: string[];
  priceForTwo?: number | string | null;
  currency?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isTableReservationAvailable?: boolean;
  reservationSlotMinutes?: number | string | null;
  reservationBufferMinutes?: number | string | null;
  reservationAdvanceDays?: number | string | null;
  reservationNoticeMinutes?: number | string | null;
  reservationMinGuests?: number | string | null;
  reservationMaxGuests?: number | string | null;
  reservationAutoConfirm?: boolean;
  allowSameDayReservation?: boolean;
  allowGuestReservation?: boolean;
  reservationTerms?: string | null;
  reservationCancellationNote?: string | null;
  status?: string;
};

type VendorAddressData = {
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  zipCode?: string | null;
};

type RestaurantLocationFormState = {
  address: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  area: string;
  zipCode: string;
  latitude: string;
  longitude: string;
};

type RestaurantFormProps = {
  mode: "create" | "edit";
  initialData?: RestaurantFormData | null;
  vendorAddress?: VendorAddressData | null;
  maxImageUploadSizeMb?: number;
  contentLimits: ContentLimits;
};

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function createSpecificationId() {
  return `specification-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createSpecificationRow(): RestaurantSpecificationRow {
  return {
    id: createSpecificationId(),
    label: "",
    value: "",
  };
}

function getInitialSpecificationRows(
  value: unknown
): RestaurantSpecificationRow[] {
  if (!Array.isArray(value)) {
    return [createSpecificationRow()];
  }

  const rows = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const label = String(row.label || "").trim();
      const specificationValue = String(row.value || "").trim();

      if (!label && !specificationValue) {
        return null;
      }

      return {
        id: `initial-specification-${index}`,
        label,
        value: specificationValue,
      };
    })
    .filter(
      (item): item is RestaurantSpecificationRow =>
        item !== null
    );

  return rows.length > 0
    ? rows
    : [createSpecificationRow()];
}

function getCleanSpecifications(
  rows: RestaurantSpecificationRow[]
) {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.label && row.value);
}

function getImageList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasValidCoordinates(latitude: string, longitude: string) {
  if (!latitude || !longitude) {
    return false;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function getGoogleMapEmbedUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
}

function getGoogleMapOpenUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function getPositiveNumber(value: string, fallback: number) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue) || numberValue < 0) {
    return fallback;
  }

  return numberValue;
}

function getNullablePositiveNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function normalizeAddressValue(value: string | null | undefined) {
  return String(value || "").trim();
}

function hasVendorAddress(vendorAddress: VendorAddressData | null | undefined) {
  if (!vendorAddress) {
    return false;
  }

  return [
    vendorAddress.address,
    vendorAddress.addressLine1,
    vendorAddress.addressLine2,
    vendorAddress.country,
    vendorAddress.state,
    vendorAddress.city,
    vendorAddress.zipCode,
  ].some((value) => Boolean(normalizeAddressValue(value)));
}

function getVendorFullAddress(vendorAddress: VendorAddressData) {
  const fullAddress = normalizeAddressValue(vendorAddress.address);

  if (fullAddress) {
    return fullAddress;
  }

  return [
    vendorAddress.addressLine1,
    vendorAddress.addressLine2,
    vendorAddress.city,
    vendorAddress.state,
    vendorAddress.country,
    vendorAddress.zipCode,
  ]
    .map((value) => normalizeAddressValue(value))
    .filter(Boolean)
    .join(", ");
}

export default function RestaurantForm({
  mode,
  initialData,
  vendorAddress,
  maxImageUploadSizeMb,
  contentLimits,
}: RestaurantFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const maximumImageUploadSizeMb =
    typeof maxImageUploadSizeMb === "number" &&
    Number.isFinite(maxImageUploadSizeMb) &&
    maxImageUploadSizeMb >= 1 &&
    maxImageUploadSizeMb <= 50
      ? maxImageUploadSizeMb
      : 5;

  const maximumImageUploadSizeBytes =
    maximumImageUploadSizeMb * 1024 * 1024;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [usingVendorAddress, setUsingVendorAddress] = useState(false);
  const previousLocationRef = useRef<RestaurantLocationFormState | null>(null);

  const [specifications, setSpecifications] = useState<
    RestaurantSpecificationRow[]
  >(() => getInitialSpecificationRows(initialData?.specifications));

  const [form, setForm] = useState({
    name: initialData?.name || "",
    shortDescription: initialData?.shortDescription || "",
    description: initialData?.description || "",
    exchangePolicy: initialData?.exchangePolicy || "",
    refundPolicy: initialData?.refundPolicy || "",

    phone: initialData?.phone || "",
    email: initialData?.email || "",
    website: initialData?.website || "",

    logo: initialData?.logo || "",
    coverImage: initialData?.coverImage || "",
    images: initialData?.images?.join(", ") || "",

    cuisineTypes: initialData?.cuisineTypes?.join(", ") || "",

    priceForTwo: initialData?.priceForTwo ? String(initialData.priceForTwo) : "",
    currency: initialData?.currency || "AED",

    address: initialData?.address || "",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    country: initialData?.country || "",
    state: initialData?.state || "",
    city: initialData?.city || "",
    area: initialData?.area || "",
    zipCode: initialData?.zipCode || "",

    latitude: initialData?.latitude ? String(initialData.latitude) : "",
    longitude: initialData?.longitude ? String(initialData.longitude) : "",

    isTableReservationAvailable:
      initialData?.isTableReservationAvailable ?? true,

    reservationSlotMinutes: initialData?.reservationSlotMinutes
      ? String(initialData.reservationSlotMinutes)
      : "60",
    reservationBufferMinutes:
      initialData?.reservationBufferMinutes !== undefined &&
      initialData?.reservationBufferMinutes !== null
        ? String(initialData.reservationBufferMinutes)
        : "0",
    reservationAdvanceDays: initialData?.reservationAdvanceDays
      ? String(initialData.reservationAdvanceDays)
      : "30",
    reservationNoticeMinutes: initialData?.reservationNoticeMinutes
      ? String(initialData.reservationNoticeMinutes)
      : "60",
    reservationMinGuests: initialData?.reservationMinGuests
      ? String(initialData.reservationMinGuests)
      : "1",
    reservationMaxGuests:
      initialData?.reservationMaxGuests !== undefined &&
      initialData?.reservationMaxGuests !== null
        ? String(initialData.reservationMaxGuests)
        : "",
    reservationAutoConfirm: initialData?.reservationAutoConfirm ?? false,
    allowSameDayReservation: initialData?.allowSameDayReservation ?? true,
    allowGuestReservation: initialData?.allowGuestReservation ?? false,
    reservationTerms: initialData?.reservationTerms || "",
    reservationCancellationNote: initialData?.reservationCancellationNote || "",

    status: initialData?.status || "DRAFT",
  });

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  function addSpecificationRow() {
    setSpecifications((currentRows) => [
      ...currentRows,
      createSpecificationRow(),
    ]);
  }

  function updateSpecificationRow(
    id: string,
    field: "label" | "value",
    value: string
  ) {
    setSpecifications((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function removeSpecificationRow(id: string) {
    setSpecifications((currentRows) => {
      const nextRows = currentRows.filter(
        (row) => row.id !== id
      );

      return nextRows.length > 0
        ? nextRows
        : [createSpecificationRow()];
    });
  }

  function handleUseVendorAddress(checked: boolean) {
    setLocationMessage("");

    if (checked) {
      if (!vendorAddress || !hasVendorAddress(vendorAddress)) {
        setLocationMessage(
          "No vendor address is available. Please update the address in your vendor profile first."
        );
        return;
      }

      previousLocationRef.current = {
        address: form.address,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        country: form.country,
        state: form.state,
        city: form.city,
        area: form.area,
        zipCode: form.zipCode,
        latitude: form.latitude,
        longitude: form.longitude,
      };

      setForm((previousForm) => ({
        ...previousForm,
        address: getVendorFullAddress(vendorAddress),
        addressLine1: normalizeAddressValue(vendorAddress.addressLine1),
        addressLine2: normalizeAddressValue(vendorAddress.addressLine2),
        country: normalizeAddressValue(vendorAddress.country),
        state: normalizeAddressValue(vendorAddress.state),
        city: normalizeAddressValue(vendorAddress.city),
        zipCode: normalizeAddressValue(vendorAddress.zipCode),
      }));

      setUsingVendorAddress(true);
      setLocationMessage("The vendor address has been applied successfully.");
      return;
    }

    const previousLocation = previousLocationRef.current;

    if (previousLocation) {
      setForm((previousForm) => ({
        ...previousForm,
        ...previousLocation,
      }));
    }

    previousLocationRef.current = null;
    setUsingVendorAddress(false);
    setLocationMessage("The previous restaurant address has been restored.");
  }

  function handleUseCurrentLocation() {
    setLocationMessage("");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationMessage("Your browser does not support location services.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(7);
        const longitude = position.coords.longitude.toFixed(7);

        setForm((previousForm) => ({
          ...previousForm,
          latitude,
          longitude,
        }));

        setLocationMessage(
          "Location has been set successfully. Please verify it in the map preview."
        );
        setLocating(false);
      },
      (error) => {
        console.error("GEOLOCATION_ERROR", error);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage(
            "Location permission was denied. Please allow location access in your browser settings."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationMessage(
            "Your location is currently unavailable. Please enter the coordinates manually."
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationMessage("The location request timed out. Please try again.");
        } else {
          setLocationMessage("Unable to retrieve your location.");
        }

        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  async function uploadImages(files: File[]) {
    const formData = new FormData();

    formData.append("folder", "restaurants");

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      router.push("/login");
      return [];
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to upload the selected images."
      );
    }

    return Array.isArray(data.urls)
      ? data.urls.filter(
          (url: unknown): url is string =>
            typeof url === "string" && Boolean(url.trim())
        )
      : [];
  }

  function validateImageFiles(files: File[]) {
    const unsupportedFile = files.find(
      (file) => !ACCEPTED_IMAGE_TYPES.has(file.type)
    );

    if (unsupportedFile) {
      setImageMessage("");
      setImageError(
        "Only JPG, PNG, WEBP, GIF and AVIF image files are supported."
      );
      return false;
    }

    const oversizedFile = files.find(
      (file) => file.size > maximumImageUploadSizeBytes
    );

    if (oversizedFile) {
      setImageMessage("");
      setImageError(
        `Each image must be ${maximumImageUploadSizeMb} MB or smaller.`
      );
      return false;
    }

    return true;
  }

  async function processSelectedImages(files: File[]) {
    if (!files.length || uploadingImages) {
      return;
    }

    if (!validateImageFiles(files)) {
      return;
    }

    try {
      setUploadingImages(true);
      setImageMessage("");
      setImageError("");

      const uploadedUrls = await uploadImages(files);

      if (!uploadedUrls.length) {
        setImageError(
          "The upload completed, but no image was returned."
        );
        return;
      }

      setForm((previousForm) => {
        const existingGallery = getImageList(previousForm.images);

        return {
          ...previousForm,
          coverImage:
            previousForm.coverImage || uploadedUrls[0] || "",
          images: Array.from(
            new Set([...existingGallery, ...uploadedUrls])
          ).join(", "),
        };
      });

      setImageMessage(
        `${uploadedUrls.length} image${
          uploadedUrls.length === 1 ? "" : "s"
        } uploaded successfully.`
      );
    } catch (error) {
      console.error(
        "RESTAURANT_IMAGE_UPLOAD_ERROR",
        error
      );

      setImageError(
        error instanceof Error
          ? error.message
          : "Unable to upload the selected images."
      );
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleImageInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    await processSelectedImages(files);
    event.target.value = "";
  }

  function handleImageDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDraggingImages(true);
  }

  function handleImageDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDraggingImages(false);
  }

  async function handleImageDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDraggingImages(false);

    await processSelectedImages(
      Array.from(event.dataTransfer.files || [])
    );
  }

  function makeCoverImage(image: string) {
    updateField("coverImage", image);
  }

  function makeLogoImage(image: string) {
    updateField("logo", image);
  }

  function toggleGalleryImage(image: string) {
    const currentGallery = getImageList(form.images);
    const isGalleryImage = currentGallery.includes(image);

    const nextGallery = isGalleryImage
      ? currentGallery.filter(
          (currentImage) => currentImage !== image
        )
      : [...currentGallery, image];

    updateField(
      "images",
      Array.from(new Set(nextGallery)).join(", ")
    );
  }

  function removeRestaurantImage(image: string) {
    setForm((previousForm) => ({
      ...previousForm,
      logo:
        previousForm.logo === image
          ? ""
          : previousForm.logo,
      coverImage:
        previousForm.coverImage === image
          ? ""
          : previousForm.coverImage,
      images: getImageList(previousForm.images)
        .filter(
          (currentImage) => currentImage !== image
        )
        .join(", "),
    }));
  }

  async function handleSubmit(status: "DRAFT" | "PENDING_APPROVAL") {
    if (!form.name.trim()) {
      alert("Restaurant name is required.");
      return;
    }

    if (
      form.shortDescription.trim().length >
      contentLimits.shortDescription
    ) {
      alert(
        `Restaurant short description cannot exceed ${contentLimits.shortDescription} characters.`
      );
      return;
    }

    if (
      form.description.trim().length >
      contentLimits.description
    ) {
      alert(
        `Restaurant description cannot exceed ${contentLimits.description} characters.`
      );
      return;
    }

    if (
      form.exchangePolicy.trim().length >
      contentLimits.exchangePolicy
    ) {
      alert(
        `Restaurant exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`
      );
      return;
    }

    if (
      form.refundPolicy.trim().length >
      contentLimits.refundPolicy
    ) {
      alert(
        `Restaurant refund policy cannot exceed ${contentLimits.refundPolicy} characters.`
      );
      return;
    }

    if (uploadingImages) {
      alert(
        "Please wait until all image uploads are complete."
      );
      return;
    }

    if (form.isTableReservationAvailable) {
      const slotMinutes = getPositiveNumber(form.reservationSlotMinutes, 60);
      const minGuests = getPositiveNumber(form.reservationMinGuests, 1);
      const maxGuests = getNullablePositiveNumber(form.reservationMaxGuests);

      if (slotMinutes <= 0) {
        alert("Reservation slot duration must be greater than zero.");
        return;
      }

      if (minGuests <= 0) {
        alert("Minimum guest count must be greater than zero.");
        return;
      }

      if (maxGuests !== null && maxGuests < minGuests) {
        alert("Maximum guest count cannot be lower than the minimum guest count.");
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        specifications: getCleanSpecifications(specifications),
        exchangePolicy: form.exchangePolicy.trim(),
        refundPolicy: form.refundPolicy.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),

        logo: form.logo.trim(),
        coverImage: form.coverImage.trim(),
        images: form.images,
        cuisineTypes: form.cuisineTypes,

        priceForTwo: form.priceForTwo,
        currency: form.currency || "AED",

        address: form.address.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        zipCode: form.zipCode.trim(),

        latitude: form.latitude,
        longitude: form.longitude,

        isTableReservationAvailable: form.isTableReservationAvailable,
        reservationSlotMinutes: getPositiveNumber(
          form.reservationSlotMinutes,
          60
        ),
        reservationBufferMinutes: getPositiveNumber(
          form.reservationBufferMinutes,
          0
        ),
        reservationAdvanceDays: getPositiveNumber(
          form.reservationAdvanceDays,
          30
        ),
        reservationNoticeMinutes: getPositiveNumber(
          form.reservationNoticeMinutes,
          60
        ),
        reservationMinGuests: getPositiveNumber(form.reservationMinGuests, 1),
        reservationMaxGuests: getNullablePositiveNumber(
          form.reservationMaxGuests
        ),
        reservationAutoConfirm: form.reservationAutoConfirm,
        allowSameDayReservation: form.allowSameDayReservation,
        allowGuestReservation: form.allowGuestReservation,
        reservationTerms: form.reservationTerms.trim(),
        reservationCancellationNote: form.reservationCancellationNote.trim(),

        status,
      };

      const url =
        mode === "create"
          ? "/api/vendor/restaurants"
          : `/api/vendor/restaurants/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to save the restaurant.");
        return;
      }

      router.push("/vendor/restaurants");
      router.refresh();
    } catch (error) {
      console.error("RESTAURANT_FORM_SAVE_ERROR", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this restaurant? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/vendor/restaurants/${initialData.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete the restaurant.");
        return;
      }

      router.push("/vendor/restaurants");
      router.refresh();
    } catch (error) {
      console.error("RESTAURANT_DELETE_ERROR", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const galleryImages = getImageList(form.images);

  const restaurantImages = Array.from(
    new Set(
      [
        form.coverImage,
        form.logo,
        ...galleryImages,
      ].filter(Boolean)
    )
  );

  const showMapPreview = hasValidCoordinates(
    form.latitude,
    form.longitude
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === "create" ? "Add Restaurant" : "Edit Restaurant"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter the restaurant profile, images, location details, and table
          reservation settings.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
            Basic Details
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Restaurant Name *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Example: OREYA Cafe"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number
              </label>

              <input
                type="text"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="+971..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="restaurant@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Website
              </label>

              <input
                type="text"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="https://example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Short Description
              </label>

              <input
                type="text"
                value={form.shortDescription}
                maxLength={contentLimits.shortDescription}
                onChange={(event) =>
                  updateField("shortDescription", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Brief introduction for restaurant cards"
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {form.shortDescription.length}/
                {contentLimits.shortDescription}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Full Description
              </label>

              <textarea
                value={form.description}
                maxLength={contentLimits.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Write a detailed description of this restaurant."
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {form.description.length}/
                {contentLimits.description}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Customer-facing Information
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add restaurant specifications and the exchange and refund policies
              shown on the public restaurant detail page.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Specifications
                </label>

                <button
                  type="button"
                  onClick={addSpecificationRow}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Add Specification
                </button>
              </div>

              <div className="space-y-3">
                {specifications.map((specification, index) => (
                  <div
                    key={specification.id}
                    className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Label {index + 1}
                      </label>
                      <input
                        type="text"
                        value={specification.label}
                        onChange={(event) =>
                          updateSpecificationRow(
                            specification.id,
                            "label",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-black"
                        placeholder="Example: Cuisine"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Value
                      </label>
                      <input
                        type="text"
                        value={specification.value}
                        onChange={(event) =>
                          updateSpecificationRow(
                            specification.id,
                            "value",
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-black"
                        placeholder="Example: Indian, Continental"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSpecificationRow(specification.id)
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      aria-label={`Remove specification ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Rows with a missing label or value are ignored when the restaurant
                is saved.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Exchange Policy
              </label>
              <textarea
                value={form.exchangePolicy}
                maxLength={contentLimits.exchangePolicy}
                onChange={(event) =>
                  updateField("exchangePolicy", event.target.value)
                }
                className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Add the restaurant exchange or modification policy."
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.exchangePolicy.length}/{contentLimits.exchangePolicy}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Refund Policy
              </label>
              <textarea
                value={form.refundPolicy}
                maxLength={contentLimits.refundPolicy}
                onChange={(event) =>
                  updateField("refundPolicy", event.target.value)
                }
                className="min-h-28 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Add the restaurant refund policy."
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.refundPolicy.length}/{contentLimits.refundPolicy}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                Images and Cuisine
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Upload Restaurant images and assign Cover, Logo and Gallery
                roles. Image paths remain internal and are not displayed.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              {restaurantImages.length} image
              {restaurantImages.length === 1 ? "" : "s"}
            </span>
          </div>

          {imageMessage ? (
            <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {imageMessage}
            </div>
          ) : null}

          {imageError ? (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {imageError}
            </div>
          ) : null}

          <div
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={(event) => {
              void handleImageDrop(event);
            }}
            className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              isDraggingImages
                ? "border-brand-500 bg-brand-50"
                : "border-gray-300 bg-gray-50 hover:border-brand-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              disabled={uploadingImages}
              onChange={(event) => {
                void handleImageInputChange(event);
              }}
              className="sr-only"
            />

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
              <UploadCloud className="h-6 w-6" />
            </div>

            <p className="mt-4 font-semibold text-gray-900">
              Drag and drop Restaurant images here
            </p>

            <p className="mt-1 text-sm text-gray-500">
              JPG, PNG, WEBP, GIF or AVIF. Maximum{" "}
              {maximumImageUploadSizeMb} MB per image.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingImages
                ? "Uploading Images..."
                : "Choose Images"}
            </button>
          </div>

          {restaurantImages.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {restaurantImages.map((image, index) => {
                const isCoverImage =
                  form.coverImage === image;
                const isLogoImage = form.logo === image;
                const isGalleryImage =
                  galleryImages.includes(image);

                return (
                  <article
                    key={image}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={image}
                        alt={`Restaurant image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        {isCoverImage ? (
                          <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Cover
                          </span>
                        ) : null}

                        {isLogoImage ? (
                          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Logo
                          </span>
                        ) : null}

                        {isGalleryImage ? (
                          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Gallery
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            makeCoverImage(image)
                          }
                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                            isCoverImage
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {isCoverImage
                            ? "Cover Image"
                            : "Make Cover"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            makeLogoImage(image)
                          }
                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                            isLogoImage
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {isLogoImage
                            ? "Logo Image"
                            : "Make Logo"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleGalleryImage(image)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          isGalleryImage
                            ? "border-violet-600 bg-violet-50 text-violet-700"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {isGalleryImage
                          ? "Remove from Gallery"
                          : "Add to Gallery"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeRestaurantImage(image)
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                        Remove Image
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
              No Restaurant images have been uploaded.
            </div>
          )}

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cuisine Types
              </label>

              <input
                type="text"
                value={form.cuisineTypes}
                onChange={(event) =>
                  updateField(
                    "cuisineTypes",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Indian, Italian, Chinese"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Price for Two
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.priceForTwo}
                onChange={(event) =>
                  updateField(
                    "priceForTwo",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <select
                value={form.currency}
                onChange={(event) =>
                  updateField(
                    "currency",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
              >
                <option value="AED">AED</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                Location
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Enter the address manually or use browser location access to set
                the coordinates automatically.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {vendorAddress ? (
                <label
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold transition ${
                    hasVendorAddress(vendorAddress)
                      ? "cursor-pointer bg-white text-gray-700 hover:bg-gray-50"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={usingVendorAddress}
                    disabled={!hasVendorAddress(vendorAddress)}
                    onChange={(event) =>
                      handleUseVendorAddress(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  Use Vendor Address
                </label>
              ) : null}

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}

                {locating ? "Finding Location..." : "Use My Current Location"}
              </button>
            </div>
          </div>

          {locationMessage && (
            <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {locationMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Full Address
              </label>

              <input
                type="text"
                value={form.address}
                disabled={usingVendorAddress}
                onChange={(event) => updateField("address", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Enter the full address"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address Line 1
              </label>

              <input
                type="text"
                value={form.addressLine1}
                disabled={usingVendorAddress}
                onChange={(event) =>
                  updateField("addressLine1", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Street address, building name, or shop number"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address Line 2
              </label>

              <input
                type="text"
                value={form.addressLine2}
                disabled={usingVendorAddress}
                onChange={(event) =>
                  updateField("addressLine2", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Landmark, floor, or additional address details"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Country
              </label>

              <input
                type="text"
                value={form.country}
                disabled={usingVendorAddress}
                onChange={(event) => updateField("country", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Country"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>

              <input
                type="text"
                value={form.state}
                disabled={usingVendorAddress}
                onChange={(event) => updateField("state", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="State"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City
              </label>

              <input
                type="text"
                value={form.city}
                disabled={usingVendorAddress}
                onChange={(event) => updateField("city", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Area
              </label>

              <input
                type="text"
                value={form.area}
                onChange={(event) => updateField("area", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Area or neighborhood"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ZIP Code
              </label>

              <input
                type="text"
                value={form.zipCode}
                disabled={usingVendorAddress}
                onChange={(event) => updateField("zipCode", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="ZIP or postal code"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Latitude
              </label>

              <input
                type="number"
                value={form.latitude}
                onChange={(event) =>
                  updateField("latitude", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Latitude"
                step="any"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Longitude
              </label>

              <input
                type="number"
                value={form.longitude}
                onChange={(event) =>
                  updateField("longitude", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Longitude"
                step="any"
              />
            </div>

            <div className="md:col-span-2">
              {showMapPreview ? (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="flex flex-col gap-2 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Map Preview
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Latitude: {form.latitude}, Longitude: {form.longitude}
                      </p>
                    </div>

                    <a
                      href={getGoogleMapOpenUrl(form.latitude, form.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-white"
                    >
                      Open in Google Maps
                    </a>
                  </div>

                  <iframe
                    title="Restaurant location map"
                    src={getGoogleMapEmbedUrl(form.latitude, form.longitude)}
                    className="h-[320px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />

                  <p className="text-sm font-semibold text-gray-700">
                    Add latitude and longitude to preview the location on the
                    map.
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    You can also use the “Use My Current Location” button to
                    fill the coordinates automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
            Table Reservation Settings
          </h3>

          <div className="mb-5 flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isTableReservationAvailable}
                onChange={(event) =>
                  updateField(
                    "isTableReservationAvailable",
                    event.target.checked
                  )
                }
              />
              Enable Table Reservation
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.reservationAutoConfirm}
                onChange={(event) =>
                  updateField("reservationAutoConfirm", event.target.checked)
                }
              />
              Auto-confirm Reservations
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowSameDayReservation}
                onChange={(event) =>
                  updateField("allowSameDayReservation", event.target.checked)
                }
              />
              Allow Same-day Reservations
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowGuestReservation}
                onChange={(event) =>
                  updateField("allowGuestReservation", event.target.checked)
                }
              />
              Allow Guest Reservations
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Slot Duration
              </label>

              <input
                type="number"
                min="1"
                value={form.reservationSlotMinutes}
                onChange={(event) =>
                  updateField("reservationSlotMinutes", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="60"
              />

              <p className="mt-1 text-xs text-gray-500">In minutes.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Buffer Time
              </label>

              <input
                type="number"
                min="0"
                value={form.reservationBufferMinutes}
                onChange={(event) =>
                  updateField("reservationBufferMinutes", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="0"
              />

              <p className="mt-1 text-xs text-gray-500">
                Gap between reservation slots, in minutes.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Advance Booking Window
              </label>

              <input
                type="number"
                min="1"
                value={form.reservationAdvanceDays}
                onChange={(event) =>
                  updateField("reservationAdvanceDays", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="30"
              />

              <p className="mt-1 text-xs text-gray-500">In days.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Notice
              </label>

              <input
                type="number"
                min="0"
                value={form.reservationNoticeMinutes}
                onChange={(event) =>
                  updateField("reservationNoticeMinutes", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="60"
              />

              <p className="mt-1 text-xs text-gray-500">
                Minimum notice before reservation time, in minutes.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Guests
              </label>

              <input
                type="number"
                min="1"
                value={form.reservationMinGuests}
                onChange={(event) =>
                  updateField("reservationMinGuests", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Maximum Guests
              </label>

              <input
                type="number"
                min="1"
                value={form.reservationMaxGuests}
                onChange={(event) =>
                  updateField("reservationMaxGuests", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-black"
                placeholder="Leave empty for no fixed limit"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reservation Terms
              </label>

              <textarea
                value={form.reservationTerms}
                onChange={(event) =>
                  updateField("reservationTerms", event.target.value)
                }
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Add reservation rules, policies, or guest instructions."
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cancellation Note
              </label>

              <textarea
                value={form.reservationCancellationNote}
                onChange={(event) =>
                  updateField("reservationCancellationNote", event.target.value)
                }
                className="min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Add cancellation instructions or policy notes."
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
          <div>
            {mode === "edit" && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving || uploadingImages}
                className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Restaurant"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/vendor/restaurants")}
              className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={saving}
              className="rounded-full border border-black px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("PENDING_APPROVAL")}
              disabled={saving}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
