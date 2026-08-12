"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CustomDatePicker from "@/components/ui/CustomDatePicker";

type RestaurantMenuTypeValue =
  | "REGULAR"
  | "COMBO";

type RestaurantSummary = {
  id: string;
  name: string;
  currency: string;
};

type RestaurantMenuItemSummary = {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description: string | null;
  menuType: RestaurantMenuTypeValue;
  validFrom: string | Date | null;
  validUntil: string | Date | null;
  price: string | number;
  currency: string;
  image: string | null;
  images?: string[] | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type RestaurantMenuItemsManagerProps = {
  restaurant: RestaurantSummary;
  initialMenuItems: RestaurantMenuItemSummary[];
  maxImageUploadSizeMb?: number;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

type UploadResponse = {
  success?: boolean;
  message?: string;
  urls?: string[];
  maxImageUploadSizeMb?: number;
};

type MenuItemsResponse = {
  success?: boolean;
  maxImageUploadSizeMb?: number;
};

type SaveMenuItemResponse = {
  success?: boolean;
  message?: string;
  menuItem?: RestaurantMenuItemSummary;
};

type MenuFormState = {
  name: string;
  description: string;
  menuType: RestaurantMenuTypeValue;
  validFrom: string;
  validUntil: string;
  price: string;
  currency: string;
  images: string[];
  isActive: boolean;
  sortOrder: string;
};

type ComboValidityStatus = {
  label: string;
  className: string;
};

const MAX_DESCRIPTION_LENGTH = 1000;
const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ACCEPTED_IMAGE_EXTENSIONS =
  ".jpg,.jpeg,.png,.webp,.gif,.avif";

const initialFormState: MenuFormState = {
  name: "",
  description: "",
  menuType: "REGULAR",
  validFrom: "",
  validUntil: "",
  price: "",
  currency: "AED",
  images: [],
  isActive: true,
  sortOrder: "0",
};

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

const textareaClassName =
  "min-h-32 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

function normalizeMaximumImageSize(
  value: unknown
) {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_MAX_IMAGE_UPLOAD_SIZE_MB ||
    parsedValue > MAX_MAX_IMAGE_UPLOAD_SIZE_MB
  ) {
    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }

  return parsedValue;
}

function formatMegabytes(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

function normalizeMenuType(
  value: unknown
): RestaurantMenuTypeValue {
  return String(value || "")
    .trim()
    .toUpperCase() === "COMBO"
    ? "COMBO"
    : "REGULAR";
}

function normalizeMenuImages(
  menuItem: RestaurantMenuItemSummary
) {
  const imageList = Array.isArray(
    menuItem.images
  )
    ? menuItem.images
    : [];

  return Array.from(
    new Set(
      [menuItem.image || "", ...imageList]
        .map((image) => image.trim())
        .filter(Boolean)
    )
  );
}

function mergeMenuImages(
  currentImages: string[],
  newImages: string[]
) {
  return Array.from(
    new Set(
      [...currentImages, ...newImages]
        .map((image) => image.trim())
        .filter(Boolean)
    )
  );
}

function formatCurrency(
  currency: string,
  amount: string | number
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${value.toFixed(2)}`;
}

function formatDateInputValue(
  value: string | Date | null | undefined
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getDateLabel(
  value: string | Date | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getTodayDateValue() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(
    currentDate.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    currentDate.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getComboValidityStatus(
  menuItem: RestaurantMenuItemSummary
): ComboValidityStatus | null {
  if (
    normalizeMenuType(menuItem.menuType) !==
    "COMBO"
  ) {
    return null;
  }

  const validFrom = formatDateInputValue(
    menuItem.validFrom
  );
  const validUntil = formatDateInputValue(
    menuItem.validUntil
  );

  if (!validFrom || !validUntil) {
    return {
      label: "Validity Missing",
      className:
        "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    };
  }

  const today = getTodayDateValue();

  if (validUntil < today) {
    return {
      label: "Expired",
      className:
        "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    };
  }

  if (validFrom > today) {
    return {
      label: "Scheduled",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    };
  }

  return {
    label: "Currently Valid",
    className:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  };
}

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 16V4M12 4L7.5 8.5M12 4L16.5 8.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15.5V17.25C5 18.77 6.23 20 7.75 20H16.25C17.77 20 19 18.77 19 17.25V15.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RestaurantMenuItemsManager({
  restaurant,
  initialMenuItems,
  maxImageUploadSizeMb,
}: RestaurantMenuItemsManagerProps) {
  const [menuItems, setMenuItems] = useState<
    RestaurantMenuItemSummary[]
  >(
    initialMenuItems.map((menuItem) => ({
      ...menuItem,
      menuType: normalizeMenuType(
        menuItem.menuType
      ),
    }))
  );

  const [activeTab, setActiveTab] =
    useState<RestaurantMenuTypeValue>(
      "REGULAR"
    );

  const [formState, setFormState] =
    useState<MenuFormState>({
      ...initialFormState,
      currency: restaurant.currency || "AED",
    });

  const [
    editingMenuItemId,
    setEditingMenuItemId,
  ] = useState<string | null>(null);

  const [maximumImageSizeMb, setMaximumImageSizeMb] =
    useState(() =>
      normalizeMaximumImageSize(
        maxImageUploadSizeMb
      )
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [uploadingImages, setUploadingImages] =
    useState(false);
  const [isDraggingImages, setIsDraggingImages] =
    useState(false);
  const [isDeletingId, setIsDeletingId] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState<MessageState>(null);

  const imageInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImageUploadSetting() {
      try {
        const response = await fetch(
          `/api/vendor/restaurants/${restaurant.id}/menu-items`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const result: MenuItemsResponse =
          await response
            .json()
            .catch(() => ({}));

        if (
          cancelled ||
          !response.ok ||
          !result.success
        ) {
          return;
        }

        setMaximumImageSizeMb(
          normalizeMaximumImageSize(
            result.maxImageUploadSizeMb
          )
        );
      } catch {
        // The secure server-side upload limit remains authoritative.
      }
    }

    void loadImageUploadSetting();

    return () => {
      cancelled = true;
    };
  }, [restaurant.id]);

  const activeMenuItemsCount = useMemo(
    () =>
      menuItems.filter(
        (menuItem) => menuItem.isActive
      ).length,
    [menuItems]
  );

  const regularMenuItemsCount = useMemo(
    () =>
      menuItems.filter(
        (menuItem) =>
          normalizeMenuType(
            menuItem.menuType
          ) === "REGULAR"
      ).length,
    [menuItems]
  );

  const comboMenuItemsCount = useMemo(
    () =>
      menuItems.filter(
        (menuItem) =>
          normalizeMenuType(
            menuItem.menuType
          ) === "COMBO"
      ).length,
    [menuItems]
  );

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter(
        (menuItem) =>
          normalizeMenuType(
            menuItem.menuType
          ) === activeTab
      ),
    [menuItems, activeTab]
  );

  function updateField<
    K extends keyof MenuFormState,
  >(field: K, value: MenuFormState[K]) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  function handleMenuTypeChange(
    menuType: RestaurantMenuTypeValue
  ) {
    setFormState((currentState) => ({
      ...currentState,
      menuType,
      validFrom:
        menuType === "COMBO"
          ? currentState.validFrom
          : "",
      validUntil:
        menuType === "COMBO"
          ? currentState.validUntil
          : "",
    }));

    setActiveTab(menuType);
    setMessage(null);
  }

  function resetForm() {
    setFormState({
      ...initialFormState,
      currency: restaurant.currency || "AED",
      menuType: activeTab,
    });
    setEditingMenuItemId(null);
    setMessage(null);
  }

  function handleEdit(
    menuItem: RestaurantMenuItemSummary
  ) {
    const menuType = normalizeMenuType(
      menuItem.menuType
    );

    setEditingMenuItemId(menuItem.id);
    setActiveTab(menuType);
    setFormState({
      name: menuItem.name || "",
      description:
        menuItem.description || "",
      menuType,
      validFrom: formatDateInputValue(
        menuItem.validFrom
      ),
      validUntil: formatDateInputValue(
        menuItem.validUntil
      ),
      price: String(menuItem.price ?? ""),
      currency:
        menuItem.currency ||
        restaurant.currency ||
        "AED",
      images: normalizeMenuImages(menuItem),
      isActive: menuItem.isActive,
      sortOrder: String(
        menuItem.sortOrder ?? 0
      ),
    });
    setMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadSelectedImages(
    files: File[]
  ) {
    if (!files.length) {
      return;
    }

    const maximumBytes =
      maximumImageSizeMb * 1024 * 1024;

    const unsupportedFile = files.find(
      (file) =>
        !ACCEPTED_IMAGE_TYPES.has(file.type)
    );

    if (unsupportedFile) {
      setMessage({
        type: "error",
        text:
          "Only JPG, PNG, WEBP, GIF and AVIF images are supported.",
      });
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > maximumBytes
    );

    if (oversizedFile) {
      setMessage({
        type: "error",
        text: `Each image must be ${maximumImageSizeMb} MB or smaller.`,
      });
      return;
    }

    try {
      setUploadingImages(true);
      setMessage(null);

      const formData = new FormData();
      formData.append(
        "folder",
        "restaurant-menu-items"
      );

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        "/api/upload",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const result: UploadResponse =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Unable to upload the selected images."
        );
      }

      const uploadedUrls = Array.isArray(
        result.urls
      )
        ? result.urls.filter(
            (url): url is string =>
              typeof url === "string" &&
              url.trim().length > 0
          )
        : [];

      if (!uploadedUrls.length) {
        throw new Error(
          "The upload completed without returning an image."
        );
      }

      setMaximumImageSizeMb(
        normalizeMaximumImageSize(
          result.maxImageUploadSizeMb ??
            maximumImageSizeMb
        )
      );

      setFormState((currentState) => ({
        ...currentState,
        images: mergeMenuImages(
          currentState.images,
          uploadedUrls
        ),
      }));

      setMessage({
        type: "success",
        text:
          uploadedUrls.length === 1
            ? "Image uploaded successfully."
            : `${uploadedUrls.length} images uploaded successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to upload the selected images.",
      });
    } finally {
      setUploadingImages(false);
      setIsDraggingImages(false);
    }
  }

  function handleImageInputChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";
    void uploadSelectedImages(files);
  }

  function handleImageDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDraggingImages(false);

    if (
      uploadingImages ||
      isSubmitting
    ) {
      return;
    }

    void uploadSelectedImages(
      Array.from(event.dataTransfer.files)
    );
  }

  function makePrimaryImage(
    imageUrl: string
  ) {
    setFormState((currentState) => ({
      ...currentState,
      images: [
        imageUrl,
        ...currentState.images.filter(
          (image) => image !== imageUrl
        ),
      ],
    }));
  }

  function removeMenuImage(
    imageUrl: string
  ) {
    setFormState((currentState) => ({
      ...currentState,
      images:
        currentState.images.filter(
          (image) => image !== imageUrl
        ),
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = formState.name.trim();
    const description =
      formState.description.trim();
    const priceValue = Number(
      formState.price
    );
    const sortOrderValue = Number(
      formState.sortOrder
    );

    if (!name) {
      setMessage({
        type: "error",
        text: "Menu or package name is required.",
      });
      return;
    }

    if (
      description.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      setMessage({
        type: "error",
        text:
          "Description cannot exceed 1,000 characters.",
      });
      return;
    }

    if (
      !Number.isFinite(priceValue) ||
      priceValue < 0
    ) {
      setMessage({
        type: "error",
        text: "A valid price is required.",
      });
      return;
    }

    if (
      !Number.isInteger(sortOrderValue)
    ) {
      setMessage({
        type: "error",
        text:
          "Sort order must be a whole number.",
      });
      return;
    }

    if (formState.menuType === "COMBO") {
      if (!formState.validFrom) {
        setMessage({
          type: "error",
          text:
            "A start date is required for a Combo package.",
        });
        return;
      }

      if (!formState.validUntil) {
        setMessage({
          type: "error",
          text:
            "An expiry date is required for a Combo package.",
        });
        return;
      }

      if (
        formState.validUntil <
        formState.validFrom
      ) {
        setMessage({
          type: "error",
          text:
            "The Combo expiry date cannot be earlier than its start date.",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const endpoint = editingMenuItemId
        ? `/api/vendor/restaurants/${restaurant.id}/menu-items/${editingMenuItemId}`
        : `/api/vendor/restaurants/${restaurant.id}/menu-items`;

      const response = await fetch(
        endpoint,
        {
          method: editingMenuItemId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            description,
            menuType: formState.menuType,
            validFrom:
              formState.menuType === "COMBO"
                ? formState.validFrom
                : null,
            validUntil:
              formState.menuType === "COMBO"
                ? formState.validUntil
                : null,
            price: formState.price,
            currency:
              formState.currency,
            image:
              formState.images[0] || null,
            images: formState.images,
            isActive:
              formState.isActive,
            sortOrder:
              formState.sortOrder,
          }),
        }
      );

      const result: SaveMenuItemResponse =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success ||
        !result.menuItem
      ) {
        throw new Error(
          result.message ||
            "Unable to save the menu package."
        );
      }

      const savedMenuItem: RestaurantMenuItemSummary =
        {
          ...result.menuItem,
          menuType: normalizeMenuType(
            result.menuItem.menuType
          ),
        };

      setMenuItems((currentItems) => {
        const nextItems = editingMenuItemId
          ? currentItems.map((item) =>
              item.id === savedMenuItem.id
                ? savedMenuItem
                : item
            )
          : [savedMenuItem, ...currentItems];

        return nextItems.sort(
          (firstItem, secondItem) =>
            firstItem.sortOrder -
            secondItem.sortOrder
        );
      });

      setActiveTab(
        savedMenuItem.menuType
      );
      setMessage({
        type: "success",
        text: editingMenuItemId
          ? "Menu package updated successfully."
          : "Menu package created successfully.",
      });
      setFormState({
        ...initialFormState,
        menuType:
          savedMenuItem.menuType,
        currency:
          restaurant.currency || "AED",
      });
      setEditingMenuItemId(null);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save the menu package.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(
    menuItemId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this menu package?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingId(menuItemId);
      setMessage(null);

      const response = await fetch(
        `/api/vendor/restaurants/${restaurant.id}/menu-items/${menuItemId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Unable to delete the menu package."
        );
      }

      setMenuItems((currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !== menuItemId
        )
      );

      if (
        editingMenuItemId === menuItemId
      ) {
        resetForm();
      }

      setMessage({
        type: "success",
        text:
          "Menu package deleted successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to delete the menu package.",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Restaurant Reservation Packages
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create regular or time-limited Combo packages for table reservations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              Total: {menuItems.length}
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Active: {activeMenuItemsCount}
            </span>
          </div>
        </div>

        {message ? (
          <div
            role="status"
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="menuType"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Package Type{" "}
                <span className="text-error-500">*</span>
              </label>
              <select
                id="menuType"
                value={formState.menuType}
                onChange={(event) =>
                  handleMenuTypeChange(
                    event.target
                      .value as RestaurantMenuTypeValue
                  )
                }
                className={inputClassName}
              >
                <option value="REGULAR">
                  Regular Package
                </option>
                <option value="COMBO">
                  Combo Package
                </option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Combo packages require a start date and an expiry date.
              </p>
            </div>

            <div>
              <label
                htmlFor="menuName"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Package Name{" "}
                <span className="text-error-500">*</span>
              </label>
              <input
                id="menuName"
                type="text"
                value={formState.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
                placeholder={
                  formState.menuType === "COMBO"
                    ? "Example: Weekend Family Combo"
                    : "Example: Premium Dinner Package"
                }
                className={inputClassName}
                required
              />
            </div>

            {formState.menuType ===
            "COMBO" ? (
              <>
                <div>
                  <label
                    htmlFor="menuValidFrom"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Valid From{" "}
                    <span className="text-error-500">*</span>
                  </label>
                  <CustomDatePicker
                    id="menuValidFrom"
                    name="menuValidFrom"
                    value={formState.validFrom}
                    minDate="1900-01-01"
                    placeholder="Select start date"
                    className="w-full"
                    onChange={(value) =>
                      updateField(
                        "validFrom",
                        value
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="menuValidUntil"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Valid Until{" "}
                    <span className="text-error-500">*</span>
                  </label>
                  <CustomDatePicker
                    id="menuValidUntil"
                    name="menuValidUntil"
                    value={formState.validUntil}
                    minDate={
                      formState.validFrom ||
                      "1900-01-01"
                    }
                    placeholder="Select expiry date"
                    className="w-full"
                    onChange={(value) =>
                      updateField(
                        "validUntil",
                        value
                      )
                    }
                    required
                  />
                </div>
              </>
            ) : null}

            <div>
              <label
                htmlFor="menuPrice"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Price{" "}
                <span className="text-error-500">*</span>
              </label>
              <input
                id="menuPrice"
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={(event) =>
                  updateField(
                    "price",
                    event.target.value
                  )
                }
                placeholder="100"
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label
                htmlFor="menuCurrency"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Currency
              </label>
              <select
                id="menuCurrency"
                value={formState.currency}
                onChange={(event) =>
                  updateField(
                    "currency",
                    event.target.value
                  )
                }
                className={inputClassName}
              >
                <option value="AED">AED</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="menuSortOrder"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Sort Order
              </label>
              <input
                id="menuSortOrder"
                type="number"
                step="1"
                value={formState.sortOrder}
                onChange={(event) =>
                  updateField(
                    "sortOrder",
                    event.target.value
                  )
                }
                placeholder="0"
                className={inputClassName}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="menuDescription"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>

              <textarea
                id="menuDescription"
                value={formState.description}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Describe what is included in this reservation package."
                aria-describedby="menuDescriptionHelp"
                className={textareaClassName}
              />

              <div
                id="menuDescriptionHelp"
                className="mt-1.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-gray-500 dark:text-gray-400">
                  Maximum 1,000 characters.
                </span>

                <span
                  className={`font-medium ${
                    formState.description.length >=
                    MAX_DESCRIPTION_LENGTH
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {formState.description.length}/
                  {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Package Images
                    </h3>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Upload high-quality package images. Image paths remain
                      internal and are not displayed in the form.
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {formState.images.length} image
                    {formState.images.length === 1
                      ? ""
                      : "s"}
                  </span>
                </div>

                <div
                  onDragEnter={(event) => {
                    event.preventDefault();

                    if (
                      !uploadingImages &&
                      !isSubmitting
                    ) {
                      setIsDraggingImages(true);
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();

                    if (
                      !uploadingImages &&
                      !isSubmitting
                    ) {
                      setIsDraggingImages(true);
                    }
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingImages(false);
                  }}
                  onDrop={handleImageDrop}
                  className={`flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                    isDraggingImages
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
                  } ${
                    uploadingImages ||
                    isSubmitting
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <input
                    ref={imageInputRef}
                    id="restaurant-menu-images-upload"
                    type="file"
                    accept={
                      ACCEPTED_IMAGE_EXTENSIONS
                    }
                    multiple
                    onChange={
                      handleImageInputChange
                    }
                    disabled={
                      uploadingImages ||
                      isSubmitting
                    }
                    className="sr-only"
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                    <UploadIcon />
                  </div>

                  <p className="mt-4 font-semibold text-gray-900 dark:text-white">
                    {isDraggingImages
                      ? "Drop images here"
                      : "Drag and drop images here"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    JPG, PNG, WEBP, GIF or AVIF.
                    Maximum{" "}
                    {formatMegabytes(
                      maximumImageSizeMb
                    )}{" "}
                    MB per image.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                    disabled={
                      uploadingImages ||
                      isSubmitting
                    }
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
                  >
                    {uploadingImages
                      ? "Uploading Images..."
                      : "Choose Images"}
                  </button>
                </div>

                {formState.images.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {formState.images.map(
                      (imageUrl, index) => {
                        const isPrimary =
                          index === 0;

                        return (
                          <article
                            key={imageUrl}
                            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img
                                src={imageUrl}
                                alt={`Package image ${
                                  index + 1
                                }`}
                                className="h-full w-full object-cover"
                              />

                              {isPrimary ? (
                                <span className="absolute left-3 top-3 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                                  Primary
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-2 p-3">
                              {!isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    makePrimaryImage(
                                      imageUrl
                                    )
                                  }
                                  disabled={
                                    isSubmitting ||
                                    uploadingImages
                                  }
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  Make Primary
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() =>
                                  removeMenuImage(
                                    imageUrl
                                  )
                                }
                                disabled={
                                  isSubmitting ||
                                  uploadingImages
                                }
                                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
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
                    No package images have been uploaded.
                  </div>
                )}
              </section>
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="menuIsActive"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <input
                  id="menuIsActive"
                  type="checkbox"
                  checked={
                    formState.isActive
                  }
                  onChange={(event) =>
                    updateField(
                      "isActive",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Active Package
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                uploadingImages
              }
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
            >
              {isSubmitting
                ? editingMenuItemId
                  ? "Saving Changes..."
                  : "Creating Package..."
                : editingMenuItemId
                  ? "Save Changes"
                  : "Create Package"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Reservation Packages
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Regular and Combo packages are displayed separately for easier management.
          </p>
        </div>

        <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
          <div
            className="flex gap-6"
            role="tablist"
            aria-label="Reservation package type"
          >
            {(
              [
                ["REGULAR", "Regular Packages", regularMenuItemsCount],
                ["COMBO", "Combo Packages", comboMenuItemsCount],
              ] as const
            ).map(
              ([tabValue, tabLabel, count]) => (
                <button
                  key={tabValue}
                  type="button"
                  role="tab"
                  aria-selected={
                    activeTab === tabValue
                  }
                  onClick={() =>
                    setActiveTab(tabValue)
                  }
                  className={`relative pb-3 text-sm font-medium transition ${
                    activeTab === tabValue
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tabLabel}
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                    {count}
                  </span>
                  {activeTab === tabValue ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />
                  ) : null}
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Validity
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sort
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleMenuItems.length >
              0 ? (
                visibleMenuItems.map(
                  (menuItem) => {
                    const menuImages =
                      normalizeMenuImages(
                        menuItem
                      );
                    const primaryImage =
                      menuImages[0] || "";
                    const menuType =
                      normalizeMenuType(
                        menuItem.menuType
                      );
                    const validityStatus =
                      getComboValidityStatus(
                        menuItem
                      );

                    return (
                      <tr
                        key={menuItem.id}
                        className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                              {primaryImage ? (
                                <img
                                  src={
                                    primaryImage
                                  }
                                  alt={
                                    menuItem.name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                                  {menuItem.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {menuItem.name}
                              </p>
                              <p
                                className="mt-1 max-w-[320px] truncate text-xs text-gray-500 dark:text-gray-400"
                                title={
                                  menuItem.description ||
                                  "No description added."
                                }
                              >
                                {menuItem.description ||
                                  "No description added."}
                              </p>
                              {menuImages.length >
                              0 ? (
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                  {menuImages.length}{" "}
                                  {menuImages.length === 1
                                    ? "image"
                                    : "images"}{" "}
                                  uploaded
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              menuType === "COMBO"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                            }`}
                          >
                            {menuType === "COMBO"
                              ? "Combo"
                              : "Regular"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {menuType ===
                          "COMBO" ? (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {getDateLabel(
                                  menuItem.validFrom
                                )}{" "}
                                –{" "}
                                {getDateLabel(
                                  menuItem.validUntil
                                )}
                              </p>
                              {validityStatus ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${validityStatus.className}`}
                                >
                                  {validityStatus.label}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              No expiry
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            menuItem.currency,
                            menuItem.price
                          )}
                        </td>

                        <td className="px-4 py-4 text-center text-sm text-gray-700 dark:text-gray-300">
                          {menuItem.sortOrder}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              menuItem.isActive
                                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {menuItem.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {getDateLabel(
                            menuItem.createdAt
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  menuItem
                                )
                              }
                              disabled={
                                isDeletingId ===
                                menuItem.id
                              }
                              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  menuItem.id
                                )
                              }
                              disabled={
                                isDeletingId ===
                                menuItem.id
                              }
                              className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeletingId ===
                              menuItem.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No{" "}
                    {activeTab === "COMBO"
                      ? "Combo"
                      : "Regular"}{" "}
                    packages were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
