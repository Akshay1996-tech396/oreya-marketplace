"use client";

import { useRouter } from "next/navigation";
import type { ContentLimits } from "@/lib/content-limits";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type VendorSummary = {
  id: string;
  businessName: string;
  status: string;
};

type VendorRestaurantCreateFormProps = {
  vendor: VendorSummary;
  maxImageUploadSizeMb: number;
  contentLimits: ContentLimits;
};

type RestaurantSpecificationRow = {
  id: string;
  label: string;
  value: string;
};

type RestaurantFormState = {
  name: string;
  shortDescription: string;
  description: string;
  exchangePolicy: string;
  refundPolicy: string;
  cuisineTypes: string;
  priceForTwo: string;
  currency: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  area: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  coverImage: string;
  logo: string;
  images: string;
  isTableReservationAvailable: boolean;
  reservationSlotMinutes: string;
  reservationBufferMinutes: string;
  reservationAdvanceDays: string;
  reservationNoticeMinutes: string;
  reservationMinGuests: string;
  reservationMaxGuests: string;
  reservationAutoConfirm: boolean;
  allowSameDayReservation: boolean;
  allowGuestReservation: boolean;
  reservationTerms: string;
  reservationCancellationNote: string;
};

type ImagePreview = {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  uploadedUrl: string;
};

const initialFormState: RestaurantFormState = {
  name: "",
  shortDescription: "",
  description: "",
  exchangePolicy: "",
  refundPolicy: "",
  cuisineTypes: "",
  priceForTwo: "",
  currency: "INR",
  phone: "",
  email: "",
  website: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  area: "",
  city: "",
  state: "",
  country: "India",
  zipCode: "",
  latitude: "",
  longitude: "",
  coverImage: "",
  logo: "",
  images: "",
  isTableReservationAvailable: true,
  reservationSlotMinutes: "60",
  reservationBufferMinutes: "15",
  reservationAdvanceDays: "30",
  reservationNoticeMinutes: "120",
  reservationMinGuests: "1",
  reservationMaxGuests: "20",
  reservationAutoConfirm: false,
  allowSameDayReservation: true,
  allowGuestReservation: true,
  reservationTerms: "",
  reservationCancellationNote: "",
};


const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

const textareaClassName =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function createSpecificationRow(): RestaurantSpecificationRow {
  return {
    id: `specification-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    label: "",
    value: "",
  };
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

function UploadIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 15.5V4.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.75 9L12 4.75L16.25 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15.25V17.5C5 18.4665 5.7835 19.25 6.75 19.25H17.25C18.2165 19.25 19 18.4665 19 17.5V15.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21C12 21 18 15.5 18 9.75C18 6.43629 15.3137 3.75 12 3.75C8.68629 3.75 6 6.43629 6 9.75C6 15.5 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.25C13.3807 12.25 14.5 11.1307 14.5 9.75C14.5 8.36929 13.3807 7.25 12 7.25C10.6193 7.25 9.5 8.36929 9.5 9.75C9.5 11.1307 10.6193 12.25 12 12.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getGoogleMapPreviewUrl(latitude: string, longitude: string) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const query = encodeURIComponent(`${lat},${lng}`);

  return `https://www.google.com/maps?q=${query}&z=16&output=embed`;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function TextInput({
  id,
  label,
  value,
  placeholder,
  type = "text",
  required = false,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required ? <span className="text-error-500"> *</span> : null}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />

      {maxLength ? (
        <p className="mt-1 text-right text-xs text-gray-400">
          {value.length}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}

function SelectInput({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaInput({
  id,
  label,
  value,
  placeholder,
  rows = 4,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={textareaClassName}
      />

      {maxLength ? (
        <p className="mt-1 text-right text-xs text-gray-400">
          {value.length}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}

function ToggleInput({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}

export default function VendorRestaurantCreateForm({
  vendor,
  maxImageUploadSizeMb,
  contentLimits,
}: VendorRestaurantCreateFormProps) {
  const router = useRouter();

  const maximumImageUploadSizeMb =
    Number.isFinite(maxImageUploadSizeMb) &&
    maxImageUploadSizeMb >= 1 &&
    maxImageUploadSizeMb <= 50
      ? maxImageUploadSizeMb
      : 5;

  const maximumImageUploadSizeBytes =
    maximumImageUploadSizeMb * 1024 * 1024;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const [formState, setFormState] =
    useState<RestaurantFormState>(initialFormState);
  const [specifications, setSpecifications] = useState<
    RestaurantSpecificationRow[]
  >(() => [createSpecificationRow()]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const cuisineTypes = useMemo(() => {
    return formState.cuisineTypes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [formState.cuisineTypes]);

  const galleryImages = useMemo(() => {
    return formState.images
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [formState.images]);

  const googleMapPreviewUrl = useMemo(() => {
    return getGoogleMapPreviewUrl(formState.latitude, formState.longitude);
  }, [formState.latitude, formState.longitude]);

  function updateField<K extends keyof RestaurantFormState>(
    field: K,
    value: RestaurantFormState[K]
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
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

  function createLocalPreviewUrl(file: File) {
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);

    return previewUrl;
  }

  function createImagePreview(file: File, uploadedUrl: string): ImagePreview {
    return {
      id: `${file.name}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2)}`,
      name: file.name,
      size: file.size,
      previewUrl: createLocalPreviewUrl(file),
      uploadedUrl,
    };
  }

  function getValidImageFiles(files: File[]) {
    const validFiles: File[] = [];

    for (const file of files) {
      if (!allowedImageTypes.includes(file.type)) {
        setMessage({
          type: "error",
          text: "Only JPG, PNG, WEBP, GIF and AVIF images are allowed.",
        });

        continue;
      }

      if (file.size > maximumImageUploadSizeBytes) {
        setMessage({
          type: "error",
          text: `Each image must be ${maximumImageUploadSizeMb} MB or smaller.`,
        });

        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  async function uploadRestaurantImages(files: File[]) {
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

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Unable to upload restaurant image.");
    }

    return result.urls as string[];
  }

  async function uploadSelectedImages(files: File[]) {
    const validFiles = getValidImageFiles(files);

    if (validFiles.length === 0) {
      return;
    }

    setIsUploadingImages(true);
    setMessage(null);

    try {
      const uploadedUrls = await uploadRestaurantImages(validFiles);

      if (
        !Array.isArray(uploadedUrls) ||
        uploadedUrls.length !== validFiles.length
      ) {
        throw new Error(
          "Some restaurant images were not uploaded successfully."
        );
      }

      const newPreviews = validFiles.map((file, index) =>
        createImagePreview(file, uploadedUrls[index])
      );

      setImagePreviews((currentPreviews) => [
        ...currentPreviews,
        ...newPreviews,
      ]);

      setFormState((currentState) => {
        const existingGalleryImages = currentState.images
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        return {
          ...currentState,
          coverImage:
            currentState.coverImage || uploadedUrls[0] || "",
          images: Array.from(
            new Set([
              ...existingGalleryImages,
              ...uploadedUrls,
            ])
          ).join(", "),
        };
      });

      setMessage({
        type: "success",
        text: `${uploadedUrls.length} image${
          uploadedUrls.length === 1 ? "" : "s"
        } uploaded successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to upload restaurant images.",
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleImageInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    await uploadSelectedImages(files);
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

    await uploadSelectedImages(
      Array.from(event.dataTransfer.files || [])
    );
  }

  function setImageAsLogo(uploadedUrl: string) {
    updateField("logo", uploadedUrl);
  }

  function setImageAsCover(uploadedUrl: string) {
    updateField("coverImage", uploadedUrl);
  }

  function toggleGalleryImage(uploadedUrl: string) {
    setFormState((currentState) => {
      const currentImages = currentState.images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const isIncluded = currentImages.includes(uploadedUrl);

      const nextImages = isIncluded
        ? currentImages.filter(
            (image) => image !== uploadedUrl
          )
        : [...currentImages, uploadedUrl];

      return {
        ...currentState,
        images: Array.from(new Set(nextImages)).join(", "),
      };
    });
  }

  function removeRestaurantImage(imageId: string) {
    setImagePreviews((currentPreviews) => {
      const imageToRemove = currentPreviews.find(
        (image) => image.id === imageId
      );

      if (!imageToRemove) {
        return currentPreviews;
      }

      URL.revokeObjectURL(imageToRemove.previewUrl);

      setFormState((currentState) => {
        const nextGalleryImages = currentState.images
          .split(",")
          .map((item) => item.trim())
          .filter(
            (image) =>
              image &&
              image !== imageToRemove.uploadedUrl
          );

        return {
          ...currentState,
          logo:
            currentState.logo === imageToRemove.uploadedUrl
              ? ""
              : currentState.logo,
          coverImage:
            currentState.coverImage ===
            imageToRemove.uploadedUrl
              ? ""
              : currentState.coverImage,
          images: Array.from(
            new Set(nextGalleryImages)
          ).join(", "),
        };
      });

      return currentPreviews.filter(
        (image) => image.id !== imageId
      );
    });
  }

  function handleUseCurrentLocation() {
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage({
        type: "error",
        text: "Your browser does not support location access.",
      });

      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(7);
        const longitude = position.coords.longitude.toFixed(7);

        setFormState((currentState) => ({
          ...currentState,
          latitude,
          longitude,
        }));

        setMessage({
          type: "success",
          text: "Current location detected successfully. Latitude and longitude have been added.",
        });

        setIsDetectingLocation(false);
      },
      (error) => {
        let errorMessage =
          "Unable to access your current location. Please allow location permission and try again.";

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage =
            "Location permission was denied. Please allow location access from the browser and try again.";
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage =
            "Your current location is unavailable. Please enter latitude and longitude manually.";
        }

        if (error.code === error.TIMEOUT) {
          errorMessage =
            "Location detection timed out. Please try again or enter coordinates manually.";
        }

        setMessage({
          type: "error",
          text: errorMessage,
        });

        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      formState.shortDescription.trim().length >
      contentLimits.shortDescription
    ) {
      setMessage({
        type: "error",
        text: `Restaurant short description cannot exceed ${contentLimits.shortDescription} characters.`,
      });

      return;
    }

    if (
      formState.description.trim().length >
      contentLimits.description
    ) {
      setMessage({
        type: "error",
        text: `Restaurant description cannot exceed ${contentLimits.description} characters.`,
      });

      return;
    }

    if (
      formState.exchangePolicy.trim().length >
      contentLimits.exchangePolicy
    ) {
      setMessage({
        type: "error",
        text: `Restaurant exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`,
      });

      return;
    }

    if (
      formState.refundPolicy.trim().length >
      contentLimits.refundPolicy
    ) {
      setMessage({
        type: "error",
        text: `Restaurant refund policy cannot exceed ${contentLimits.refundPolicy} characters.`,
      });

      return;
    }

    if (isUploadingImages) {
      setMessage({
        type: "error",
        text: "Please wait until image upload is complete.",
      });

      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/vendor/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          specifications: getCleanSpecifications(specifications),
          status: "PENDING_APPROVAL",
          cuisineTypes,
          images: galleryImages,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to submit restaurant for approval."
        );
      }

      router.push("/vendor/restaurants");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to submit restaurant for approval.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Add Restaurant
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter the restaurant profile, images, location details, and table
          reservation settings. After submission, the restaurant will be reviewed
          by the admin team.
        </p>
      </div>

      {message ? (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-8 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Vendor
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {vendor.businessName}
          </h3>

          <span className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {vendor.status}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Basic Details
        </h3>

        <div className="grid grid-cols-1 gap-5">
          <TextInput
            id="restaurantName"
            label="Restaurant Name"
            value={formState.name}
            required
            placeholder="Enter restaurant name"
            onChange={(value) => updateField("name", value)}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextInput
              id="phone"
              label="Phone Number"
              value={formState.phone}
              required
              placeholder="Restaurant phone number"
              onChange={(value) => updateField("phone", value)}
            />

            <TextInput
              id="email"
              label="Email Address"
              type="email"
              value={formState.email}
              placeholder="restaurant@example.com"
              onChange={(value) => updateField("email", value)}
            />
          </div>

          <TextInput
            id="website"
            label="Website"
            type="url"
            value={formState.website}
            placeholder="https://example.com"
            onChange={(value) => updateField("website", value)}
          />

          <TextInput
            id="shortDescription"
            label="Short Description"
            value={formState.shortDescription}
            maxLength={contentLimits.shortDescription}
            placeholder="Brief introduction for restaurant cards"
            onChange={(value) => updateField("shortDescription", value)}
          />

          <TextareaInput
            id="description"
            label="Full Description"
            value={formState.description}
            maxLength={contentLimits.description}
            placeholder="Write a detailed description of this restaurant."
            rows={5}
            onChange={(value) => updateField("description", value)}
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Customer-facing Information
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add restaurant specifications and the exchange and refund policies
            shown on the public restaurant detail page.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Specifications
              </label>

              <button
                type="button"
                onClick={addSpecificationRow}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Add Specification
              </button>
            </div>

            <div className="space-y-3">
              {specifications.map((specification, index) => (
                <div
                  key={specification.id}
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end dark:border-gray-800 dark:bg-gray-900"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
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
                      className={inputClassName}
                      placeholder="Example: Cuisine"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
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
                      className={inputClassName}
                      placeholder="Example: Indian, Continental"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeSpecificationRow(specification.id)
                    }
                    className="h-11 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-gray-800 dark:text-red-400"
                    aria-label={`Remove specification ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Rows with a missing label or value are ignored when the restaurant
              is submitted.
            </p>
          </div>

          <TextareaInput
            id="exchangePolicy"
            label="Exchange Policy"
            value={formState.exchangePolicy}
            maxLength={contentLimits.exchangePolicy}
            placeholder="Add the restaurant exchange or modification policy."
            rows={5}
            onChange={(value) => updateField("exchangePolicy", value)}
          />

          <TextareaInput
            id="refundPolicy"
            label="Refund Policy"
            value={formState.refundPolicy}
            maxLength={contentLimits.refundPolicy}
            placeholder="Add the restaurant refund policy."
            rows={5}
            onChange={(value) => updateField("refundPolicy", value)}
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Restaurant Images
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload restaurant images, then assign the appropriate logo,
              cover and gallery roles. Image storage paths remain internal.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {imagePreviews.length} image
            {imagePreviews.length === 1 ? "" : "s"}
          </span>
        </div>

        <div
          onDragOver={handleImageDragOver}
          onDragLeave={handleImageDragLeave}
          onDrop={(event) => {
            void handleImageDrop(event);
          }}
          className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDraggingImages
              ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
              : "border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            onChange={(event) => {
              void handleImageInputChange(event);
            }}
            disabled={isUploadingImages}
            className="sr-only"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <UploadIcon />
          </div>

          <p className="mt-4 font-semibold text-gray-900 dark:text-white">
            Drag and drop images here
          </p>

          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            JPG, PNG, WEBP, GIF or AVIF. Maximum{" "}
            {maximumImageUploadSizeMb} MB per image.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImages}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {isUploadingImages
              ? "Uploading Images..."
              : "Choose Images"}
          </button>
        </div>

        {imagePreviews.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {imagePreviews.map((image) => {
              const isLogo =
                formState.logo === image.uploadedUrl;
              const isCover =
                formState.coverImage === image.uploadedUrl;
              const isGalleryImage = galleryImages.includes(
                image.uploadedUrl
              );

              return (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={image.previewUrl}
                      alt={image.name}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {isCover ? (
                        <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Cover
                        </span>
                      ) : null}

                      {isLogo ? (
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
                    <div>
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {image.name}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(image.size)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setImageAsCover(image.uploadedUrl)
                        }
                        className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                          isCover
                            ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        }`}
                      >
                        {isCover ? "Cover Image" : "Make Cover"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setImageAsLogo(image.uploadedUrl)
                        }
                        className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                          isLogo
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        }`}
                      >
                        {isLogo ? "Restaurant Logo" : "Make Logo"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleGalleryImage(image.uploadedUrl)
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        isGalleryImage
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {isGalleryImage
                        ? "Remove from Gallery"
                        : "Add to Gallery"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeRestaurantImage(image.id)
                      }
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                    >
                      Remove Image
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            No restaurant images have been uploaded.
          </div>
        )}

        <div className="mt-7">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Cuisine and Pricing
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <TextInput
              id="cuisineTypes"
              label="Cuisine Types"
              value={formState.cuisineTypes}
              placeholder="Indian, Italian, Chinese"
              onChange={(value) =>
                updateField("cuisineTypes", value)
              }
            />

            <TextInput
              id="priceForTwo"
              label="Price for Two"
              type="number"
              value={formState.priceForTwo}
              placeholder="1000"
              onChange={(value) =>
                updateField("priceForTwo", value)
              }
            />

            <SelectInput
              id="currency"
              label="Currency"
              value={formState.currency}
              options={[
                { label: "INR", value: "INR" },
                { label: "AED", value: "AED" },
                { label: "USD", value: "USD" },
                { label: "EUR", value: "EUR" },
                { label: "GBP", value: "GBP" },
              ]}
              onChange={(value) =>
                updateField("currency", value)
              }
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Location
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the address manually. The current location button fills
              latitude and longitude automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isDetectingLocation}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            <LocationIcon />
            {isDetectingLocation ? "Detecting..." : "Use My Current Location"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <TextInput
              id="fullAddress"
              label="Full Address"
              value={formState.address}
              placeholder="Complete restaurant address"
              onChange={(value) => updateField("address", value)}
            />
          </div>

          <TextInput
            id="addressLine1"
            label="Address Line 1"
            value={formState.addressLine1}
            placeholder="Building, street, or landmark"
            onChange={(value) => updateField("addressLine1", value)}
          />

          <TextInput
            id="addressLine2"
            label="Address Line 2"
            value={formState.addressLine2}
            placeholder="Optional address line"
            onChange={(value) => updateField("addressLine2", value)}
          />

          <TextInput
            id="country"
            label="Country"
            value={formState.country}
            placeholder="India"
            onChange={(value) => updateField("country", value)}
          />

          <TextInput
            id="state"
            label="State"
            value={formState.state}
            placeholder="State"
            onChange={(value) => updateField("state", value)}
          />

          <TextInput
            id="city"
            label="City"
            value={formState.city}
            required
            placeholder="City"
            onChange={(value) => updateField("city", value)}
          />

          <TextInput
            id="area"
            label="Area"
            value={formState.area}
            placeholder="Area or neighborhood"
            onChange={(value) => updateField("area", value)}
          />

          <TextInput
            id="zipCode"
            label="ZIP Code"
            value={formState.zipCode}
            placeholder="ZIP or PIN code"
            onChange={(value) => updateField("zipCode", value)}
          />

          <TextInput
            id="latitude"
            label="Latitude"
            value={formState.latitude}
            placeholder="Latitude"
            onChange={(value) => updateField("latitude", value)}
          />

          <TextInput
            id="longitude"
            label="Longitude"
            value={formState.longitude}
            placeholder="Longitude"
            onChange={(value) => updateField("longitude", value)}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          {googleMapPreviewUrl ? (
            <iframe
              title="Restaurant Google Map Location Preview"
              src={googleMapPreviewUrl}
              className="h-[320px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add latitude and longitude to preview the location on Google
                Map.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Click “Use My Current Location” and allow browser location
                permission to show the Google Map preview automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Table Reservation Settings
        </h3>

        <div className="mb-5 flex flex-wrap gap-3">
          <ToggleInput
            id="isTableReservationAvailable"
            label="Enable Table Reservation"
            checked={formState.isTableReservationAvailable}
            onChange={(value) =>
              updateField("isTableReservationAvailable", value)
            }
          />

          <ToggleInput
            id="reservationAutoConfirm"
            label="Auto-confirm Reservations"
            checked={formState.reservationAutoConfirm}
            onChange={(value) => updateField("reservationAutoConfirm", value)}
          />

          <ToggleInput
            id="allowSameDayReservation"
            label="Allow Same-day Reservations"
            checked={formState.allowSameDayReservation}
            onChange={(value) => updateField("allowSameDayReservation", value)}
          />

          <ToggleInput
            id="allowGuestReservation"
            label="Allow Guest Reservations"
            checked={formState.allowGuestReservation}
            onChange={(value) => updateField("allowGuestReservation", value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <TextInput
            id="reservationSlotMinutes"
            label="Slot Duration"
            type="number"
            value={formState.reservationSlotMinutes}
            placeholder="60"
            onChange={(value) => updateField("reservationSlotMinutes", value)}
          />

          <TextInput
            id="reservationBufferMinutes"
            label="Buffer Time"
            type="number"
            value={formState.reservationBufferMinutes}
            placeholder="15"
            onChange={(value) => updateField("reservationBufferMinutes", value)}
          />

          <TextInput
            id="reservationAdvanceDays"
            label="Advance Booking Window"
            type="number"
            value={formState.reservationAdvanceDays}
            placeholder="30"
            onChange={(value) => updateField("reservationAdvanceDays", value)}
          />

          <TextInput
            id="reservationNoticeMinutes"
            label="Minimum Notice"
            type="number"
            value={formState.reservationNoticeMinutes}
            placeholder="120"
            onChange={(value) => updateField("reservationNoticeMinutes", value)}
          />

          <TextInput
            id="reservationMinGuests"
            label="Minimum Guests"
            type="number"
            value={formState.reservationMinGuests}
            placeholder="1"
            onChange={(value) => updateField("reservationMinGuests", value)}
          />

          <TextInput
            id="reservationMaxGuests"
            label="Maximum Guests"
            type="number"
            value={formState.reservationMaxGuests}
            placeholder="20"
            onChange={(value) => updateField("reservationMaxGuests", value)}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextareaInput
            id="reservationTerms"
            label="Reservation Terms"
            value={formState.reservationTerms}
            placeholder="Add reservation rules, policies, or guest instructions."
            rows={4}
            onChange={(value) => updateField("reservationTerms", value)}
          />

          <TextareaInput
            id="reservationCancellationNote"
            label="Cancellation Note"
            value={formState.reservationCancellationNote}
            placeholder="Add cancellation instructions or policy notes."
            rows={4}
            onChange={(value) =>
              updateField("reservationCancellationNote", value)
            }
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.push("/vendor/restaurants")}
          disabled={isSubmitting || isUploadingImages}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting || isUploadingImages}
          className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
        >
          {isSubmitting
            ? "Submitting for Approval..."
            : isUploadingImages
              ? "Uploading Images..."
              : "Submit for Approval"}
        </button>
      </div>
    </form>
  );
}
