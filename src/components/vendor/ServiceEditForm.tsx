"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";

import type { ContentLimits } from "@/lib/content-limits";

type CategoryOption = {
  id: string;
  name: string;
};


type SpecificationRow = {
  id: string;
  label: string;
  value: string;
};

type ServiceForEdit = {
  id: string;
  title: string;
  categoryId: string;
  description?: string | null;
  price: number | string;
  currency: string;
  duration?: number | null;
  images: string[];
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  specifications?: unknown;
  specificationImage?: string | null;
  exchangePolicy?: string | null;
  refundPolicy?: string | null;
};

type ServiceEditFormProps = {
  service: ServiceForEdit;
  categories: CategoryOption[];
  maxImageUploadSizeMb: number;
  contentLimits: ContentLimits;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  urls?: string[];
};

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function getStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function getInitialSpecificationRows(
  value: unknown
): SpecificationRow[] {
  if (!Array.isArray(value)) {
    return [
      {
        id: "initial-0",
        label: "",
        value: "",
      },
    ];
  }

  const rows = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const label = getStringValue(row.label).trim();
      const itemValue = getStringValue(row.value).trim();

      if (!label && !itemValue) {
        return null;
      }

      return {
        id: `initial-${index}`,
        label,
        value: itemValue,
      };
    })
    .filter(
      (item): item is SpecificationRow => item !== null
    );

  return rows.length > 0
    ? rows
    : [
        {
          id: "initial-0",
          label: "",
          value: "",
        },
      ];
}

function getCleanSpecifications(
  rows: SpecificationRow[]
) {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.label && row.value);
}

export default function ServiceEditForm({
  service,
  categories,
  maxImageUploadSizeMb,
  contentLimits,
}: ServiceEditFormProps) {
  const router = useRouter();

  const maximumImageUploadSizeMb =
    Number.isFinite(maxImageUploadSizeMb) &&
    maxImageUploadSizeMb > 0
      ? maxImageUploadSizeMb
      : 5;

  const maximumImageUploadSizeBytes =
    maximumImageUploadSizeMb * 1024 * 1024;
  const fileInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const initialSpecificationRows =
    getInitialSpecificationRows(
      service.specifications
    );

  const specificationCounterRef = useRef(
    initialSpecificationRows.length
  );

  const initialImages = Array.isArray(service.images)
    ? Array.from(
        new Set(
          service.images
            .map((image) => image.trim())
            .filter(Boolean)
        )
      )
    : [];

  const [title, setTitle] = useState(
    service.title || ""
  );

  const [categoryId, setCategoryId] = useState(
    service.categoryId || categories[0]?.id || ""
  );

  const [description, setDescription] = useState(
    service.description || ""
  );

  const [price, setPrice] = useState(
    getStringValue(service.price)
  );

  const [currency, setCurrency] = useState(
    service.currency || "AED"
  );

  const [duration, setDuration] = useState(
    getStringValue(service.duration)
  );

  const [status, setStatus] = useState<
    ServiceForEdit["status"]
  >(service.status || "DRAFT");

  const [imageUrls, setImageUrls] =
    useState<string[]>(initialImages);

  const [specificationImage, setSpecificationImage] =
    useState(service.specificationImage || "");

  const [specifications, setSpecifications] = useState<
    SpecificationRow[]
  >(initialSpecificationRows);

  const [exchangePolicy, setExchangePolicy] = useState(
    service.exchangePolicy || ""
  );

  const [refundPolicy, setRefundPolicy] = useState(
    service.refundPolicy || ""
  );

  const [isDragging, setIsDragging] = useState(false);

  const [uploadingImages, setUploadingImages] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  function createSpecificationRow(): SpecificationRow {
    specificationCounterRef.current += 1;

    return {
      id: `new-${specificationCounterRef.current}`,
      label: "",
      value: "",
    };
  }

  function updateSpecification(
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

  function addSpecificationRow() {
    setSpecifications((currentRows) => [
      ...currentRows,
      createSpecificationRow(),
    ]);
  }

  function removeSpecificationRow(id: string) {
    setSpecifications((currentRows) => {
      if (currentRows.length === 1) {
        return [
          {
            ...currentRows[0],
            label: "",
            value: "",
          },
        ];
      }

      return currentRows.filter(
        (row) => row.id !== id
      );
    });
  }

  function makePrimaryImage(image: string) {
    setImageUrls((currentImages) => [
      image,
      ...currentImages.filter(
        (currentImage) => currentImage !== image
      ),
    ]);
  }

  function removeImage(imageToRemove: string) {
    setImageUrls((currentImages) =>
      currentImages.filter(
        (image) => image !== imageToRemove
      )
    );

    if (specificationImage === imageToRemove) {
      setSpecificationImage("");
    }
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    const unsupportedFile = files.find(
      (file) =>
        !ACCEPTED_IMAGE_TYPES.has(file.type)
    );

    if (unsupportedFile) {
      setMessage("");
      setErrorMessage(
        "Only JPG, PNG, WEBP, GIF and AVIF image files are supported."
      );
      return;
    }

    const oversizedFile = files.find(
      (file) =>
        file.size > maximumImageUploadSizeBytes
    );

    if (oversizedFile) {
      setMessage("");
      setErrorMessage(
        `Each image must be ${maximumImageUploadSizeMb} MB or smaller.`
      );
      return;
    }

    try {
      setUploadingImages(true);
      setMessage("");
      setErrorMessage("");

      const formData = new FormData();

      formData.append("folder", "services");

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data: UploadResponse = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data.message ||
            "Unable to upload the selected images."
        );
        return;
      }

      const uploadedImages = Array.isArray(
        data.urls
      )
        ? data.urls.filter(
            (url): url is string =>
              typeof url === "string" &&
              Boolean(url.trim())
          )
        : [];

      setImageUrls((currentImages) =>
        Array.from(
          new Set([
            ...currentImages,
            ...uploadedImages,
          ])
        )
      );

      setMessage(
        data.message ||
          `${uploadedImages.length} image${
            uploadedImages.length === 1
              ? ""
              : "s"
          } uploaded successfully.`
      );
    } catch (error) {
      console.error(
        "SERVICE_IMAGE_UPLOAD_ERROR",
        error
      );

      setErrorMessage(
        "Something went wrong while uploading the selected images."
      );
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    await uploadFiles(files);
    event.target.value = "";
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);

    await uploadFiles(
      Array.from(event.dataTransfer.files || [])
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("");
      setErrorMessage(
        "Service title is required."
      );
      return;
    }

    if (!categoryId) {
      setMessage("");
      setErrorMessage(
        "Please select a service category."
      );
      return;
    }

    if (description.trim().length > contentLimits.description) {
      setMessage("");
      setErrorMessage(
        `Service description cannot exceed ${contentLimits.description} characters.`
      );
      return;
    }

    if (exchangePolicy.trim().length > contentLimits.exchangePolicy) {
      setMessage("");
      setErrorMessage(
        `Service exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`
      );
      return;
    }

    if (refundPolicy.trim().length > contentLimits.refundPolicy) {
      setMessage("");
      setErrorMessage(
        `Service refund policy cannot exceed ${contentLimits.refundPolicy} characters.`
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const response = await fetch(
        `/api/vendor/services/${service.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title,
            categoryId,
              description,
            price,
            currency,
            duration,
            status,
            images: imageUrls.join("\n"),
            specifications:
              getCleanSpecifications(
                specifications
              ),
            specificationImage,
            exchangePolicy,
            refundPolicy,
              }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data.message ||
            "Unable to update the service."
        );
        return;
      }

      setMessage(
        data.message ||
          "Service updated successfully."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "UPDATE_SERVICE_ERROR",
        error
      );

      setErrorMessage(
        "Something went wrong while updating the service."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

  const textareaClassName =
    "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

  const labelClassName =
    "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7"
    >
      <div className="mb-6">
        <h2 className="font-heading text-xl text-gray-900 dark:text-white">
          Service Details
        </h2>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update the service information, assigned
          provider, supporting images and customer-facing
          content.
        </p>
      </div>

      {message ? (
        <div
          role="status"
          className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400"
        >
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {errorMessage}
        </div>
      ) : null}

      <section>
        <div className="mb-5 flex flex-col gap-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Basic Information
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update the service, pricing and availability.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label
              htmlFor="serviceTitle"
              className={labelClassName}
            >
              Service Title{" "}
              <span className="text-error-500">
                *
              </span>
            </label>

            <input
              id="serviceTitle"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Example: Full Body Scrub for Women"
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label
              htmlFor="serviceCategory"
              className={labelClassName}
            >
              Category{" "}
              <span className="text-error-500">
                *
              </span>
            </label>

            <select
              id="serviceCategory"
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              className={inputClassName}
              required
            >
              {categories.length === 0 ? (
                <option value="">
                  No categories available
                </option>
              ) : (
                categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <label
                htmlFor="serviceDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>

              <span className="text-xs text-gray-400">
                {description.length}/
                {contentLimits.description}
              </span>
            </div>

            <textarea
              id="serviceDescription"
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={contentLimits.description}
              placeholder="Describe the service, customer benefits and important booking information."
              className={textareaClassName}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="servicePrice"
                className={labelClassName}
              >
                Price{" "}
                <span className="text-error-500">
                  *
                </span>
              </label>

              <input
                id="servicePrice"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) =>
                  setPrice(event.target.value)
                }
                placeholder="149"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label
                htmlFor="serviceCurrency"
                className={labelClassName}
              >
                Currency
              </label>

              <select
                id="serviceCurrency"
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value
                  )
                }
                className={inputClassName}
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="serviceDuration"
                className={labelClassName}
              >
                Duration in Minutes
              </label>

              <input
                id="serviceDuration"
                type="number"
                min="0"
                value={duration}
                onChange={(event) =>
                  setDuration(
                    event.target.value
                  )
                }
                placeholder="60"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="serviceStatus"
                className={labelClassName}
              >
                Status
              </label>

              <select
                id="serviceStatus"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as ServiceForEdit["status"]
                  )
                }
                className={inputClassName}
              >
                <option value="DRAFT">
                  Draft
                </option>
                <option value="ACTIVE">
                  Active
                </option>
                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-gray-200 pt-7 dark:border-gray-800">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Service Images
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload or manage high-quality service
              images. Image paths remain internal and are
              not displayed in the form.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {imageUrls.length} image
            {imageUrls.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => {
            void handleDrop(event);
          }}
          className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging
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
              void handleImageUpload(event);
            }}
            disabled={uploadingImages}
            className="sr-only"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3.75A1.75 1.75 0 0 0 6.75 20h10.5A1.75 1.75 0 0 0 19 18.25V14.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="mt-4 font-semibold text-gray-900 dark:text-white">
            Drag and drop images here
          </p>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            JPG, PNG, WEBP, GIF or AVIF. Maximum{" "}
            {maximumImageUploadSizeMb} MB per image.
          </p>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploadingImages}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {uploadingImages
              ? "Uploading Images..."
              : "Choose Images"}
          </button>
        </div>

        {imageUrls.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {imageUrls.map(
              (image, index) => {
                const isPrimary = index === 0;

                const isSpecificationImage =
                  specificationImage === image;

                return (
                  <article
                    key={image}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={image}
                        alt={`Service image ${
                          index + 1
                        }`}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        {isPrimary ? (
                          <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Primary
                          </span>
                        ) : null}

                        {isSpecificationImage ? (
                          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Specifications
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 p-3">
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() =>
                            makePrimaryImage(
                              image
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Make Primary
                        </button>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSpecificationImage(
                              image
                            )
                          }
                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                            isSpecificationImage
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Specifications
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(image)
                        }
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            No service images have been uploaded.
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-gray-200 pt-7 dark:border-gray-800">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Specifications
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add structured details that help customers
              compare the service.
            </p>
          </div>

          <button
            type="button"
            onClick={addSpecificationRow}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Add Specification
          </button>
        </div>

        <div className="space-y-3">
          {specifications.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900 md:grid-cols-[44px_1fr_1fr_auto] md:items-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-gray-500 shadow-sm dark:bg-gray-800">
                {index + 1}
              </div>

              <input
                type="text"
                value={row.label}
                onChange={(event) =>
                  updateSpecification(
                    row.id,
                    "label",
                    event.target.value
                  )
                }
                placeholder="Specification name"
                className={inputClassName}
              />

              <input
                type="text"
                value={row.value}
                onChange={(event) =>
                  updateSpecification(
                    row.id,
                    "value",
                    event.target.value
                  )
                }
                placeholder="Specification value"
                className={inputClassName}
              />

              <button
                type="button"
                onClick={() =>
                  removeSpecificationRow(
                    row.id
                  )
                }
                className="h-11 rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Specifications Image
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select an uploaded image using the
              Specifications button.
            </p>

            {specificationImage ? (
              <div className="mt-4 flex items-center gap-4">
                <img
                  src={specificationImage}
                  alt="Selected specifications"
                  className="h-20 w-20 rounded-xl border border-gray-200 bg-white object-cover dark:border-gray-700"
                />

                <button
                  type="button"
                  onClick={() =>
                    setSpecificationImage("")
                  }
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                No image selected.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-gray-200 pt-7 dark:border-gray-800">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Policies
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update customer-facing exchange, cancellation and refund policies.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label
              htmlFor="exchangePolicy"
              className={labelClassName}
            >
              Exchange, Rescheduling or Cancellation
              Policy
            </label>

            <textarea
              id="exchangePolicy"
              rows={6}
              value={exchangePolicy}
              onChange={(event) =>
                setExchangePolicy(
                  event.target.value
                )
              }
              maxLength={contentLimits.exchangePolicy}
              placeholder="Explain when customers can reschedule, exchange or cancel this service."
              className={textareaClassName}
            />

            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-400">
              <span>Maximum {contentLimits.exchangePolicy} characters.</span>
              <span>{exchangePolicy.length}/{contentLimits.exchangePolicy}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="refundPolicy"
              className={labelClassName}
            >
              Refund Policy
            </label>

            <textarea
              id="refundPolicy"
              rows={6}
              value={refundPolicy}
              onChange={(event) =>
                setRefundPolicy(
                  event.target.value
                )
              }
              maxLength={contentLimits.refundPolicy}
              placeholder="Explain refund eligibility, timeframes and exclusions."
              className={textareaClassName}
            />

            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-400">
              <span>Maximum {contentLimits.refundPolicy} characters.</span>
              <span>{refundPolicy.length}/{contentLimits.refundPolicy}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/vendor/services"
          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading || uploadingImages || categories.length === 0}
          className="inline-flex min-w-[170px] items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
        >
          {loading
            ? "Saving Changes..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}