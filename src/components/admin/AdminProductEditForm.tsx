"use client";

import { useRouter } from "next/navigation";
import type { ContentLimits } from "@/lib/content-limits";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type CategoryOption = {
  id: string;
  name: string;
};

type VendorOption = {
  id: string;
  businessName: string;
  status: string;
  user: {
    email: string;
  };
};

type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";

type SpecificationRow = {
  id: string;
  label: string;
  value: string;
};

type ProductOptionRow = {
  id: string;
  name: string;
  valuesText: string;
};

type ProductVariantRow = {
  id: string;
  title: string;
  sku: string;
  options: Record<string, string>;
  price: string;
  currency: string;
  stock: string;
  image: string;
  isActive: boolean;
  isDefault: boolean;
};

type ProductForEdit = {
  id: string;
  vendorId?: string | null;
  title: string;
  categoryId: string;
  description?: string | null;
  price: number | string;
  currency: string;
  stock: number;
  images: string[];
  status: ProductStatus;

  specifications?: unknown;
  specificationImage?: string | null;
  exchangePolicy?: string | null;
  refundPolicy?: string | null;
  aboutBrand?: string | null;
  brandImage?: string | null;

  options?: {
    id?: string;
    name?: string;
    values?: unknown;
    sortOrder?: number;
  }[];

  variants?: {
    id?: string;
    title?: string;
    sku?: string | null;
    options?: unknown;
    price?: number | string;
    currency?: string;
    stock?: number;
    image?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  }[];
};

type AdminProductEditFormProps = {
  product: ProductForEdit;
  categories: CategoryOption[];
  vendors: VendorOption[];
  maxImageUploadSizeMb: number;
  contentLimits: ContentLimits;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  urls?: string[];
  maximumImageUploadSizeMb?: number;
};

type CleanProductOption = {
  name: string;
  values: string[];
  sortOrder: number;
};


const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function createSpecificationRow(): SpecificationRow {
  return {
    id: createId("specification"),
    label: "",
    value: "",
  };
}

function createProductOptionRow(): ProductOptionRow {
  return {
    id: createId("option"),
    name: "",
    valuesText: "",
  };
}

function mergeUniqueImages(currentImages: string[], newImages: string[]) {
  return Array.from(
    new Set(
      [...currentImages, ...newImages]
        .map((image) => image.trim())
        .filter(Boolean)
    )
  );
}

function formatMegabytes(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

function getInitialSpecificationRows(value: unknown): SpecificationRow[] {
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
      const itemValue = String(row.value || "").trim();

      if (!label && !itemValue) {
        return null;
      }

      return {
        id: `initial-specification-${index}`,
        label,
        value: itemValue,
      };
    })
    .filter((item): item is SpecificationRow => Boolean(item));

  return rows.length > 0 ? rows : [createSpecificationRow()];
}

function getCleanSpecifications(rows: SpecificationRow[]) {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.label && row.value);
}

function getOptionValuesFromUnknown(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getOptionValues(value: string) {
  const values: string[] = [];
  const usedValues = new Set<string>();

  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const normalizedItem = item.toLowerCase();

      if (usedValues.has(normalizedItem)) {
        return;
      }

      usedValues.add(normalizedItem);
      values.push(item);
    });

  return values;
}

function getCleanProductOptions(rows: ProductOptionRow[]): CleanProductOption[] {
  const usedNames = new Set<string>();

  return rows
    .map((row, index) => {
      const name = row.name.trim();
      const values = getOptionValues(row.valuesText);

      if (!name || values.length === 0) {
        return null;
      }

      const normalizedName = name.toLowerCase();

      if (usedNames.has(normalizedName)) {
        return null;
      }

      usedNames.add(normalizedName);

      return {
        name,
        values,
        sortOrder: index,
      };
    })
    .filter((option): option is CleanProductOption => Boolean(option));
}

function getVariantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const options: Record<string, string> = {};

  Object.entries(record).forEach(([key, optionValue]) => {
    const name = String(key || "").trim();
    const selectedValue = String(optionValue || "").trim();

    if (name && selectedValue) {
      options[name] = selectedValue;
    }
  });

  return options;
}

function getVariantTitle(
  selectedOptions: Record<string, string>,
  options: CleanProductOption[]
) {
  return options
    .map((option) => selectedOptions[option.name])
    .filter(Boolean)
    .join(" / ");
}

function getVariantSignature(
  selectedOptions: Record<string, string>,
  options: CleanProductOption[]
) {
  return options
    .map((option) => `${option.name}:${selectedOptions[option.name] || ""}`)
    .join("|")
    .toLowerCase();
}

function getVariantCombinations(options: CleanProductOption[]) {
  const combinations: Record<string, string>[] = [];

  function build(index: number, selectedOptions: Record<string, string>) {
    const currentOption = options[index];

    if (!currentOption) {
      combinations.push(selectedOptions);
      return;
    }

    currentOption.values.forEach((value) => {
      build(index + 1, {
        ...selectedOptions,
        [currentOption.name]: value,
      });
    });
  }

  build(0, {});

  return combinations;
}

function getCleanProductVariants(
  variants: ProductVariantRow[],
  options: CleanProductOption[]
) {
  if (options.length === 0) {
    return [];
  }

  return variants
    .map((variant) => {
      const selectedOptions = options.reduce<Record<string, string>>(
        (result, option) => {
          const value = String(variant.options[option.name] || "").trim();

          if (value) {
            result[option.name] = value;
          }

          return result;
        },
        {}
      );

      return {
        title:
          variant.title.trim() || getVariantTitle(selectedOptions, options),
        sku: variant.sku.trim() || null,
        options: selectedOptions,
        price: variant.price,
        currency: variant.currency || "AED",
        stock: Math.max(0, Number(variant.stock || 0)),
        image: variant.image.trim() || null,
        isActive: variant.isActive,
        isDefault: variant.isDefault,
      };
    })
    .filter((variant) => {
      const price = Number(variant.price);

      return (
        variant.title &&
        Number.isFinite(price) &&
        price > 0 &&
        Object.keys(variant.options).length === options.length
      );
    });
}

function getInitialProductOptions(product: ProductForEdit): ProductOptionRow[] {
  if (!Array.isArray(product.options)) {
    return [];
  }

  return product.options
    .map((option, index) => {
      const name = String(option.name || "").trim();

      if (!name) {
        return null;
      }

      return {
        id: option.id || `initial-option-${index}`,
        name,
        valuesText: getOptionValuesFromUnknown(option.values),
      };
    })
    .filter((option): option is ProductOptionRow => Boolean(option));
}

function getInitialProductVariants(product: ProductForEdit): ProductVariantRow[] {
  if (!Array.isArray(product.variants)) {
    return [];
  }

  return product.variants
    .map((variant, index) => {
      const title = String(variant.title || "").trim();

      if (!title) {
        return null;
      }

      return {
        id: variant.id || `initial-variant-${index}`,
        title,
        sku: variant.sku || "",
        options: getVariantOptions(variant.options),
        price: getStringValue(variant.price || product.price),
        currency: variant.currency || product.currency || "AED",
        stock: getStringValue(variant.stock || 0),
        image: variant.image || "",
        isActive: variant.isActive !== false,
        isDefault: Boolean(variant.isDefault),
      };
    })
    .filter((variant): variant is ProductVariantRow => Boolean(variant));
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export default function AdminProductEditForm({
  product,
  categories,
  vendors,
  maxImageUploadSizeMb,
  contentLimits,
}: AdminProductEditFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeMaximumImageUploadSizeMb =
    Number.isFinite(maxImageUploadSizeMb) &&
    maxImageUploadSizeMb >= 1 &&
    maxImageUploadSizeMb <= 50
      ? maxImageUploadSizeMb
      : 5;

  const maximumImageUploadSizeBytes =
    safeMaximumImageUploadSizeMb * 1024 * 1024;

  const initialImages = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];

  const [vendorId, setVendorId] = useState(product.vendorId || "");
  const [title, setTitle] = useState(product.title || "");
  const [categoryId, setCategoryId] = useState(
    product.categoryId || categories[0]?.id || ""
  );
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(getStringValue(product.price));
  const [currency, setCurrency] = useState(product.currency || "AED");
  const [stock, setStock] = useState(getStringValue(product.stock || 0));
  const [status, setStatus] = useState<ProductStatus>(
    product.status || "DRAFT"
  );

  const [productImageUrl, setProductImageUrl] = useState(
    initialImages[0] || ""
  );
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>(
    initialImages.slice(1)
  );

  const [specifications, setSpecifications] = useState<SpecificationRow[]>(
    getInitialSpecificationRows(product.specifications)
  );
  const [specificationImage, setSpecificationImage] = useState(
    product.specificationImage || ""
  );
  const [exchangePolicy, setExchangePolicy] = useState(
    product.exchangePolicy || ""
  );
  const [refundPolicy, setRefundPolicy] = useState(product.refundPolicy || "");
  const [aboutBrand, setAboutBrand] = useState(product.aboutBrand || "");
  const [brandImage, setBrandImage] = useState(product.brandImage || "");

  const [productOptions, setProductOptions] = useState<ProductOptionRow[]>(
    getInitialProductOptions(product)
  );
  const [productVariants, setProductVariants] = useState<ProductVariantRow[]>(
    getInitialProductVariants(product)
  );

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === vendorId) || null;
  }, [vendorId, vendors]);

  const allProductImages = useMemo(() => {
    return mergeUniqueImages(
      productImageUrl ? [productImageUrl] : [],
      galleryImageUrls
    );
  }, [productImageUrl, galleryImageUrls]);


  const cleanOptions = useMemo(() => {
    return getCleanProductOptions(productOptions);
  }, [productOptions]);

  const totalVariantStock = useMemo(() => {
    return productVariants
      .filter((variant) => variant.isActive)
      .reduce((total, variant) => {
        return total + Math.max(0, Number(variant.stock || 0));
      }, 0);
  }, [productVariants]);

  function setProductImages(images: string[]) {
    const uniqueImages = mergeUniqueImages([], images);

    setProductImageUrl(uniqueImages[0] || "");
    setGalleryImageUrls(uniqueImages.slice(1));
  }

  function makePrimaryImage(image: string) {
    setProductImages([
      image,
      ...allProductImages.filter(
        (currentImage) => currentImage !== image
      ),
    ]);
  }

  function removeImage(imageToRemove: string) {
    setProductImages(
      allProductImages.filter(
        (image) => image !== imageToRemove
      )
    );

    if (specificationImage === imageToRemove) {
      setSpecificationImage("");
    }

    if (brandImage === imageToRemove) {
      setBrandImage("");
    }

    setProductVariants((currentVariants) =>
      currentVariants.map((variant) =>
        variant.image === imageToRemove
          ? { ...variant, image: "" }
          : variant
      )
    );
  }

  function updateSpecification(
    id: string,
    field: "label" | "value",
    value: string
  ) {
    setSpecifications((currentRows) =>
      currentRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
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
        return [createSpecificationRow()];
      }

      return currentRows.filter((row) => row.id !== id);
    });
  }

  function addProductOption() {
    setProductOptions((currentOptions) => [
      ...currentOptions,
      createProductOptionRow(),
    ]);
  }

  function updateProductOption(
    id: string,
    field: "name" | "valuesText",
    value: string
  ) {
    setProductOptions((currentOptions) =>
      currentOptions.map((option) =>
        option.id === id ? { ...option, [field]: value } : option
      )
    );

    setProductVariants([]);
  }

  function removeProductOption(id: string) {
    setProductOptions((currentOptions) =>
      currentOptions.filter((option) => option.id !== id)
    );
    setProductVariants([]);
  }

  function generateVariants() {
    const options = getCleanProductOptions(productOptions);

    if (options.length === 0) {
      setErrorMessage(
        "Add at least one product option with values before generating variants."
      );
      return;
    }

    const combinations = getVariantCombinations(options);
    const existingVariantMap = new Map<string, ProductVariantRow>();

    productVariants.forEach((variant) => {
      existingVariantMap.set(getVariantSignature(variant.options, options), variant);
    });

    const generatedVariants = combinations.map((combination, index) => {
      const signature = getVariantSignature(combination, options);
      const existingVariant = existingVariantMap.get(signature);

      if (existingVariant) {
        return existingVariant;
      }

return {
  id: `variant-${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2)}`,
  title: getVariantTitle(combination, options),
  sku: "",
  options: combination,
  price: "",
  currency,
  stock: "",
  image: productImageUrl,
  isActive: true,
  isDefault: index === 0,
};
    });

    if (
      generatedVariants.length > 0 &&
      generatedVariants.every((variant) => !variant.isDefault)
    ) {
      generatedVariants[0] = {
        ...generatedVariants[0],
        isDefault: true,
      };
    }

    setProductVariants(generatedVariants);
    setMessage("Product variants generated successfully.");
    setErrorMessage("");
  }

  function updateVariant<K extends keyof ProductVariantRow>(
    id: string,
    field: K,
    value: ProductVariantRow[K]
  ) {
    setProductVariants((currentVariants) =>
      currentVariants.map((variant) => {
        if (field === "isDefault" && value === true && variant.id !== id) {
          return {
            ...variant,
            isDefault: false,
          };
        }

        if (variant.id !== id) {
          return variant;
        }

        return {
          ...variant,
          [field]: value,
        };
      })
    );
  }

  function removeVariant(id: string) {
    setProductVariants((currentVariants) => {
      const remainingVariants = currentVariants.filter(
        (variant) => variant.id !== id
      );

      if (
        remainingVariants.length > 0 &&
        remainingVariants.every((variant) => !variant.isDefault)
      ) {
        return [
          {
            ...remainingVariants[0],
            isDefault: true,
          },
          ...remainingVariants.slice(1),
        ];
      }

      return remainingVariants;
    });
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    const unsupportedFile = files.find(
      (file) =>
        file.type &&
        !ALLOWED_IMAGE_MIME_TYPES.has(file.type)
    );

    if (unsupportedFile) {
      setMessage("");
      setErrorMessage(
        `The selected file "${unsupportedFile.name}" is not supported. Upload a JPG, PNG, WEBP, GIF or AVIF image.`
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
        `The selected image "${oversizedFile.name}" exceeds the maximum allowed size of ${formatMegabytes(
          safeMaximumImageUploadSizeMb
        )} MB per image.`
      );
      return;
    }

    try {
      setUploadingImages(true);
      setMessage("");
      setErrorMessage("");

      const formData = new FormData();

      formData.append("folder", "products");

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

      const uploadedImages = Array.isArray(data.urls)
        ? data.urls.filter(
            (url): url is string =>
              typeof url === "string" &&
              Boolean(url.trim())
          )
        : [];

      if (!uploadedImages.length) {
        setErrorMessage(
          "The upload completed without returning an image."
        );
        return;
      }

      setProductImages(
        mergeUniqueImages(
          allProductImages,
          uploadedImages
        )
      );

      setMessage(
        data.message ||
          `${uploadedImages.length} image${
            uploadedImages.length === 1 ? "" : "s"
          } uploaded successfully.`
      );
    } catch (error) {
      console.error(
        "ADMIN_PRODUCT_IMAGE_UPLOAD_ERROR",
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
    const input = event.currentTarget;
    const files = Array.from(input.files || []);

    await uploadFiles(files);
    input.value = "";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      if (description.trim().length > contentLimits.description) {
        setErrorMessage(
          `The product description cannot exceed ${contentLimits.description} characters.`
        );
        return;
      }

      if (exchangePolicy.trim().length > contentLimits.exchangePolicy) {
        setErrorMessage(
          `The exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`
        );
        return;
      }

      if (refundPolicy.trim().length > contentLimits.refundPolicy) {
        setErrorMessage(
          `The refund policy cannot exceed ${contentLimits.refundPolicy} characters.`
        );
        return;
      }

      const options = getCleanProductOptions(productOptions);
      const variants = getCleanProductVariants(productVariants, options);

      if (options.length > 0 && variants.length === 0) {
        setErrorMessage(
          "Please generate and configure at least one product variant before saving this product."
        );
        return;
      }

      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          vendorId: vendorId || null,
          title,
          categoryId,
          description,
          price,
          currency,
          stock,
          status,
          images: allProductImages.join("\n"),
          specifications: getCleanSpecifications(specifications),
          specificationImage,
          exchangePolicy,
          refundPolicy,
          aboutBrand,
          brandImage,
          options,
          variants,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(data.message || "Unable to update the product.");
        return;
      }

      setMessage(data.message || "Product updated successfully.");
      router.refresh();
    } catch (error) {
      console.error("ADMIN_UPDATE_PRODUCT_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {message ? (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Product Ownership
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Owner Assignment
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Keep this product under the administrator account or assign it to
              a selected marketplace vendor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label
                htmlFor="admin-edit-product-owner"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Product Owner
              </label>

              <select
                id="admin-edit-product-owner"
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Administrator Product / No Vendor</option>

                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.businessName} - {vendor.user.email} -{" "}
                    {vendor.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {selectedVendor
                    ? selectedVendor.businessName
                    : "Administrator Product"}
                </p>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedVendor
                    ? `${selectedVendor.user.email} | ${selectedVendor.status}`
                    : "This product is not linked to a vendor account."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Product Details
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Handmade Wooden Bowl"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                required
              />
            </div>

            <div className="lg:col-span-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>

              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                required
              >
                {categories.length === 0 ? (
                  <option value="">No categories found</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="lg:col-span-12">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={contentLimits.description}
                placeholder="Write a detailed product description."
                className="min-h-[140px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />

              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Maximum {contentLimits.description} characters.</span>
                <span>
                  {description.length}/{contentLimits.description}
                </span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Base Price
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="100"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Currency
              </label>

              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Base Stock
              </label>

              <input
                type="number"
                min="0"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                placeholder="10"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />

              {productVariants.length > 0 ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Variant stock total: {totalVariantStock}. Variant stock will
                  be used when variations exist.
                </p>
              ) : null}
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProductStatus)
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Product Images
              </h3>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload high-quality product images. Image paths remain internal
                and are not displayed in the form.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {allProductImages.length} image
              {allProductImages.length === 1 ? "" : "s"}
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
              <UploadIcon />
            </div>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">
              Drag and drop images here
            </p>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              JPG, PNG, WEBP, GIF or AVIF. Maximum{" "}
              {formatMegabytes(safeMaximumImageUploadSizeMb)} MB per image.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
            >
              {uploadingImages
                ? "Uploading Images..."
                : "Choose Images"}
            </button>
          </div>

          {allProductImages.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {allProductImages.map((image, index) => {
                const isPrimary = index === 0;
                const isSpecificationImage =
                  specificationImage === image;
                const isBrandImage =
                  brandImage === image;

                return (
                  <article
                    key={image}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
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

                        {isBrandImage ? (
                          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Brand
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 p-3">
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() =>
                            makePrimaryImage(image)
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
                            setSpecificationImage(image)
                          }
                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                            isSpecificationImage
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          }`}
                        >
                          Specifications
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setBrandImage(image)
                          }
                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                            isBrandImage
                              ? "border-violet-500 bg-violet-50 text-violet-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          }`}
                        >
                          Brand
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeImage(image)}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              No product images have been uploaded.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-500">
                Product Variations
              </p>

              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Options and Variants
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add flexible options such as Size, Color, Material, Storage,
                Warranty, or any custom variation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addProductOption}
                className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-300"
              >
                Add Option
              </button>

              <button
                type="button"
                onClick={generateVariants}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Generate Variants
              </button>

              {(productOptions.length > 0 || productVariants.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setProductOptions([]);
                    setProductVariants([]);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                >
                  Clear Variations
                </button>
              )}
            </div>
          </div>

          {productOptions.length > 0 ? (
            <div className="space-y-4">
              {productOptions.map((option, index) => (
                <div
                  key={option.id}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[220px_1fr_auto]"
                >
                  <input
                    type="text"
                    value={option.name}
                    onChange={(event) =>
                      updateProductOption(
                        option.id,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder={index === 0 ? "Size" : "Color"}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
                  />

                  <input
                    type="text"
                    value={option.valuesText}
                    onChange={(event) =>
                      updateProductOption(
                        option.id,
                        "valuesText",
                        event.target.value
                      )
                    }
                    placeholder={
                      index === 0 ? "S, M, L, XL" : "Red, Blue, White"
                    }
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
                  />

                  <button
                    type="button"
                    onClick={() => removeProductOption(option.id)}
                    className="h-11 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              No product options added yet.
            </div>
          )}

          {productVariants.length > 0 ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Generated Variants
                </h3>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {productVariants.length} variant
                  {productVariants.length === 1 ? "" : "s"}
                </span>
              </div>

              {productVariants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {variant.title || "Product Variant"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {cleanOptions.map((option) => (
                          <span
                            key={`${variant.id}-${option.name}`}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {option.name}: {variant.options[option.name]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVariant(variant.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                    >
                      Remove Variant
                    </button>
                  </div>

<div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
  <div className="lg:col-span-3">
    <input
      type="text"
      value={variant.title}
      onChange={(event) =>
        updateVariant(variant.id, "title", event.target.value)
      }
      placeholder="Variant title"
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  </div>

  <div className="lg:col-span-2">
    <input
      type="text"
      value={variant.sku}
      onChange={(event) =>
        updateVariant(variant.id, "sku", event.target.value)
      }
      placeholder="SKU"
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  </div>

  <div className="lg:col-span-2">
    <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
      Price
    </label>

    <input
      type="number"
      min="0"
      step="0.01"
      value={variant.price}
      onChange={(event) =>
        updateVariant(variant.id, "price", event.target.value)
      }
      placeholder="Price"
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  </div>

  <div className="lg:col-span-2">
    <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
      Stock
    </label>

    <input
      type="number"
      min="0"
      value={variant.stock}
      onChange={(event) =>
        updateVariant(variant.id, "stock", event.target.value)
      }
      placeholder="Stock"
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  </div>

  <div className="lg:col-span-3">
    <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
      Variant Image
    </label>

    {variant.image ? (
      <div className="flex h-11 items-center gap-3 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-700 dark:bg-gray-900">
        <img
          src={variant.image}
          alt={`${variant.title || "Variant"} preview`}
          className="h-8 w-8 rounded-md object-cover"
        />

        <span className="truncate text-xs text-gray-600 dark:text-gray-400">
          Uploaded image selected
        </span>
      </div>
    ) : (
      <div className="flex h-11 items-center rounded-lg border border-dashed border-gray-300 px-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No image selected
      </div>
    )}
  </div>
</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={variant.isActive}
                        onChange={(event) =>
                          updateVariant(
                            variant.id,
                            "isActive",
                            event.target.checked
                          )
                        }
                      />
                      Active
                    </label>

                    <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                      <input
                        type="radio"
                        name="adminEditDefaultVariant"
                        checked={variant.isDefault}
                        onChange={() =>
                          updateVariant(variant.id, "isDefault", true)
                        }
                      />
                      Default Variant
                    </label>

                    {allProductImages.length > 0 ? (
                      <select
                        value={variant.image}
                        onChange={(event) =>
                          updateVariant(
                            variant.id,
                            "image",
                            event.target.value
                          )
                        }
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        <option value="">Select Uploaded Image</option>
                        {allProductImages.map((image, imageIndex) => (
                          <option key={`${variant.id}-${image}`} value={image}>
                            {image === productImageUrl
                              ? "Primary product image"
                              : `Gallery image ${imageIndex}`}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Product Detail Page
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Specifications and Policies
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Specifications
                </label>

                <button
                  type="button"
                  onClick={addSpecificationRow}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Add Specification
                </button>
              </div>

              <div className="space-y-3">
                {specifications.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      type="text"
                      value={row.label}
                      onChange={(event) =>
                        updateSpecification(row.id, "label", event.target.value)
                      }
                      placeholder="Example: Material"
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
                    />

                    <input
                      type="text"
                      value={row.value}
                      onChange={(event) =>
                        updateSpecification(row.id, "value", event.target.value)
                      }
                      placeholder="Example: Cotton"
                      className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white/90"
                    />

                    <button
                      type="button"
                      onClick={() => removeSpecificationRow(row.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Specifications Image
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select an uploaded image using the Specifications button.
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

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Brand Image
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select an uploaded image using the Brand button.
                </p>

                {brandImage ? (
                  <div className="mt-4 flex items-center gap-4">
                    <img
                      src={brandImage}
                      alt="Selected brand"
                      className="h-20 w-20 rounded-xl border border-gray-200 bg-white object-cover dark:border-gray-700"
                    />

                    <button
                      type="button"
                      onClick={() => setBrandImage("")}
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

            <textarea
              value={exchangePolicy}
              onChange={(event) => setExchangePolicy(event.target.value)}
              maxLength={contentLimits.exchangePolicy}
              placeholder="Exchange policy"
              className="min-h-[110px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Maximum {contentLimits.exchangePolicy} characters.</span>
              <span>
                {exchangePolicy.length}/{contentLimits.exchangePolicy}
              </span>
            </div>

            <textarea
              value={refundPolicy}
              onChange={(event) => setRefundPolicy(event.target.value)}
              maxLength={contentLimits.refundPolicy}
              placeholder="Refund policy"
              className="min-h-[110px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Maximum {contentLimits.refundPolicy} characters.</span>
              <span>
                {refundPolicy.length}/{contentLimits.refundPolicy}
              </span>
            </div>

            <textarea
              value={aboutBrand}
              onChange={(event) => setAboutBrand(event.target.value)}
              placeholder="About brand"
              className="min-h-[130px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating Product..." : "Update Product"}
          </button>
        </div>
      </form>
    </div>
  );
}