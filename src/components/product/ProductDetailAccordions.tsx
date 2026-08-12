"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DetailActionTabs, {
  type DetailActionTab,
} from "@/components/detail/DetailActionTabs";
import DetailVendorContent from "@/components/detail/DetailVendorContent";

import type {
  MarketplaceProductOption,
  MarketplaceProductVariant,
} from "@/types/marketplace";

type ProductAccordionSection =
  | "DESCRIPTION"
  | "VIEW_VENDOR"
  | "VARIANTS"
  | "PURCHASE";

type ProductDetailAccordionsProps = {
  productId: string;
  description?: string | null;
  vendorName: string;
  vendorSlug?: string | null;
  vendorDescription?: string | null;
  stock?: number | null;
  basePrice: number;
  baseCurrency: string;
  options?: MarketplaceProductOption[];
  variants?: MarketplaceProductVariant[];
};

type PendingAction = "cart" | "buy" | null;

type ActionMessage = {
  type: "success" | "error";
  text: string;
} | null;

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function formatAmount(currency: string, amount: number) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function getInitialSelections(
  options: MarketplaceProductOption[],
  variants: MarketplaceProductVariant[]
) {
  const defaultVariant =
    variants.find((variant) => variant.isDefault) ||
    variants[0] ||
    null;

  return options.reduce<Record<string, string>>(
    (selectedOptions, option) => {
      const defaultValue =
        defaultVariant?.options?.[option.name];

      const matchedValue = option.values.find(
        (value) =>
          defaultValue &&
          normalizeValue(value) ===
            normalizeValue(defaultValue)
      );

      selectedOptions[option.name] =
        matchedValue || option.values[0] || "";

      return selectedOptions;
    },
    {}
  );
}

function getMatchingVariant(
  selectedOptions: Record<string, string>,
  options: MarketplaceProductOption[],
  variants: MarketplaceProductVariant[]
) {
  if (variants.length === 0) {
    return null;
  }

  if (options.length === 0) {
    return (
      variants.find((variant) => variant.isDefault) ||
      variants[0] ||
      null
    );
  }

  return (
    variants.find((variant) =>
      options.every((option) => {
        const selectedValue =
          selectedOptions[option.name];

        const variantValue =
          variant.options[option.name];

        if (!selectedValue || !variantValue) {
          return false;
        }

        return (
          normalizeValue(selectedValue) ===
          normalizeValue(variantValue)
        );
      })
    ) || null
  );
}

function getCurrentRedirectPath() {
  if (typeof window === "undefined") {
    return "/products";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export default function ProductDetailAccordions({
  productId,
  description,
  vendorName,
  vendorSlug,
  vendorDescription,
  stock,
  basePrice,
  baseCurrency,
  options = [],
  variants = [],
}: ProductDetailAccordionsProps) {
  const router = useRouter();

  const [activeSection, setActiveSection] =
    useState<ProductAccordionSection>("DESCRIPTION");

  const activeOptions = useMemo(
    () =>
      options
        .filter(
          (option) =>
            option.name &&
            option.values.length > 0
        )
        .sort(
          (firstOption, secondOption) =>
            firstOption.sortOrder -
            secondOption.sortOrder
        ),
    [options]
  );

  const activeVariants = useMemo(
    () =>
      variants.filter(
        (variant) => variant.isActive
      ),
    [variants]
  );

  const hasVariations =
    activeOptions.length > 0 ||
    activeVariants.length > 0;

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>(() =>
      getInitialSelections(
        activeOptions,
        activeVariants
      )
    );

  const [quantity, setQuantity] = useState(1);
  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);

  const [message, setMessage] =
    useState<ActionMessage>(null);

  const isLoading = pendingAction !== null;

  const selectedVariant = useMemo(
    () =>
      getMatchingVariant(
        selectedOptions,
        activeOptions,
        activeVariants
      ),
    [
      selectedOptions,
      activeOptions,
      activeVariants,
    ]
  );

  const selectedPrice =
    selectedVariant?.price ?? basePrice;

  const selectedCurrency =
    selectedVariant?.currency || baseCurrency;

  const selectedStock =
    selectedVariant?.stock ?? stock ?? 0;

  const maxQuantity = Math.max(
    0,
    Number(selectedStock || 0)
  );

  const canAddToCart = hasVariations
    ? Boolean(selectedVariant) &&
      maxQuantity > 0
    : maxQuantity > 0;

  useEffect(() => {
    setQuantity((currentQuantity) => {
      if (
        currentQuantity > maxQuantity &&
        maxQuantity > 0
      ) {
        return maxQuantity;
      }

      if (currentQuantity < 1) {
        return 1;
      }

      return currentQuantity;
    });
  }, [maxQuantity]);

  function refreshCartState() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new Event("cart-updated")
      );
    }

    router.refresh();
  }

  function updateSelectedOption(
    optionName: string,
    value: string
  ) {
    setSelectedOptions(
      (currentOptions) => ({
        ...currentOptions,
        [optionName]: value,
      })
    );

    setQuantity(1);
    setMessage(null);
  }

  function decreaseQuantity() {
    setQuantity((currentQuantity) =>
      Math.max(1, currentQuantity - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => {
      if (
        currentQuantity >= maxQuantity
      ) {
        return currentQuantity;
      }

      return currentQuantity + 1;
    });
  }

  async function addToCart(
    redirectToCart = false
  ) {
    if (!productId) {
      setMessage({
        type: "error",
        text: "Product information is missing. Please refresh the page and try again.",
      });

      return;
    }

    if (
      hasVariations &&
      !selectedVariant
    ) {
      setMessage({
        type: "error",
        text: "Please select an available product variation.",
      });

      return;
    }

    if (!canAddToCart) {
      setMessage({
        type: "error",
        text: "This selection is currently out of stock.",
      });

      return;
    }

    try {
      setPendingAction(
        redirectToCart ? "buy" : "cart"
      );

      setMessage(null);

      const response = await fetch(
        "/api/cart/add",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            productId,
            variantId:
              selectedVariant?.id || null,
            quantity,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (response.status === 401) {
        const redirectPath =
          getCurrentRedirectPath();

        router.push(
          `/login?redirect=${encodeURIComponent(
            redirectPath
          )}`
        );

        return;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        setMessage({
          type: "error",
          text:
            data?.message ||
            "Unable to add product to cart.",
        });

        return;
      }

      refreshCartState();

      if (redirectToCart) {
        router.push("/cart");
        return;
      }

      setMessage({
        type: "success",
        text:
          data?.message ||
          "Product added to cart successfully.",
      });
    } catch (error) {
      console.error(
        "ADD_TO_CART_ERROR",
        error
      );

      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  const tabs: DetailActionTab<ProductAccordionSection>[] = [
    {
      key: "DESCRIPTION",
      label: "Description",
      content: (
        <p className="text-[15px] leading-7 text-[#666666]">
          {description?.trim() ||
            "Detailed product information will be available soon."}
        </p>
      ),
    },
    {
      key: "VIEW_VENDOR",
      label: "View Vendor",
      content: (
        <DetailVendorContent
          name={vendorName}
          description={vendorDescription}
          profileHref={vendorSlug ? `/vendors/${vendorSlug}` : null}
        />
      ),
    },
    {
      key: "VARIANTS",
      label: "Variants",
      content: (
        <>
          {activeOptions.length > 0 ? (
            <div className="space-y-6">
              {activeOptions.map((option) => (
                <div key={option.id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111111]">
                      {option.name}
                    </p>

                    {selectedOptions[option.name] ? (
                      <p className="text-xs text-[#777777]">
                        Selected:{" "}
                        <span className="font-semibold text-[#111111]">
                          {selectedOptions[option.name]}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const isSelected =
                        normalizeValue(selectedOptions[option.name] || "") ===
                        normalizeValue(value);

                      return (
                        <button
                          key={`${option.id}-${value}`}
                          type="button"
                          onClick={() => updateSelectedOption(option.name, value)}
                          disabled={isLoading}
                          className={
                            isSelected
                              ? "rounded-full border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                              : "rounded-full border border-[#ded8cf] bg-white px-5 py-2.5 text-sm font-medium text-[#555555] transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                          }
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[#d8d1c7] bg-white px-5 py-6 text-sm leading-6 text-[#666666]">
              This product does not require a variant selection.
            </div>
          )}

          {hasVariations ? (
            <div className="mt-6 rounded-[18px] border border-[#e5e0d8] bg-white p-4">
              {selectedVariant ? (
                <div className="flex flex-col gap-4 sm:flex-row">
                  {selectedVariant.image ? (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border border-[#e5e0d8] bg-[#f8f6f2]">
                      <img
                        src={selectedVariant.image}
                        alt={selectedVariant.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111111]">
                      {selectedVariant.title}
                    </p>

                    {selectedVariant.sku ? (
                      <p className="mt-1 text-xs text-[#777777]">
                        SKU: {selectedVariant.sku}
                      </p>
                    ) : null}

                    <p className="mt-3 font-heading text-2xl text-[#111111]">
                      {formatAmount(selectedCurrency, selectedPrice)}
                    </p>

                    <p className="mt-1 text-xs text-[#777777]">
                      {maxQuantity > 0
                        ? `${maxQuantity} item(s) available for this selection`
                        : "This selection is currently out of stock"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">
                  This combination is not available. Please select another variation.
                </p>
              )}
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: "PURCHASE",
      label: "Current Selection and Quantity",
      content: (
        <>
          <div className="rounded-[18px] border border-[#e5e0d8] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8176]">
                  Current Selection
                </p>

                <p className="mt-2 font-semibold text-[#111111]">
                  {selectedVariant?.title || "Standard Product"}
                </p>

                <p className="mt-1 text-sm text-[#777777]">
                  {maxQuantity > 0
                    ? `${maxQuantity} item(s) available`
                    : "Currently out of stock"}
                </p>
              </div>

              <p className="font-heading text-2xl text-[#111111]">
                {formatAmount(selectedCurrency, selectedPrice)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-[#111111]">Quantity</p>

            <div className="flex w-fit items-center overflow-hidden rounded-full border border-[#ded8cf] bg-white">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={isLoading || quantity <= 1}
                className="flex h-11 w-12 items-center justify-center text-lg font-semibold text-[#111111] transition hover:bg-[#f8f6f2] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span className="min-w-12 px-3 text-center text-sm font-semibold text-[#111111]">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={isLoading || quantity >= maxQuantity || maxQuantity < 1}
                className="flex h-11 w-12 items-center justify-center text-lg font-semibold text-[#111111] transition hover:bg-[#f8f6f2] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <p className="mt-2 text-xs text-[#777777]">
              Maximum quantity allowed: {maxQuantity}
            </p>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="mt-8 min-w-0 space-y-4">
      <DetailActionTabs
        id="product-primary-detail-tabs"
        tabs={tabs}
        activeKey={activeSection}
        onChange={setActiveSection}
        ariaLabel="Product details"
      />

      <div className="border-t border-[#e5e0d8] pt-4">
        {message ? (
          <div
            className={`mb-4 rounded-[14px] border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => addToCart(false)}
            disabled={isLoading || !canAddToCart}
            className="h-12 rounded-full bg-[#ececec] px-6 text-sm font-semibold text-[#111111] transition hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "cart" ? "Adding..." : "Add to Cart"}
          </button>

          <button
            type="button"
            onClick={() => addToCart(true)}
            disabled={isLoading || !canAddToCart}
            className="h-12 rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "buy" ? "Please Wait..." : "Buy Now"}
          </button>
        </div>

        {!canAddToCart ? (
          <p className="mt-4 text-sm text-red-600">
            {hasVariations && !selectedVariant
              ? "Select an available product variant to continue."
              : "This product selection is currently out of stock."}
          </p>
        ) : null}
      </div>
    </div>
  );
}