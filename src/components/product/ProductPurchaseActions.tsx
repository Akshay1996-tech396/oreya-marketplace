"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MarketplaceProductOption,
  MarketplaceProductVariant,
} from "@/types/marketplace";

type ProductPurchaseActionsProps = {
  productId: string;
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

type AddToCartAction = {
  action: "cart" | "buy";
  redirectPath: "/cart" | "/checkout";
};

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
    variants.find((variant) => variant.isDefault) || variants[0] || null;

  return options.reduce<Record<string, string>>((selectedOptions, option) => {
    const defaultValue = defaultVariant?.options?.[option.name];

    const matchedValue = option.values.find(
      (value) =>
        defaultValue && normalizeValue(value) === normalizeValue(defaultValue)
    );

    selectedOptions[option.name] = matchedValue || option.values[0] || "";

    return selectedOptions;
  }, {});
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
    return variants.find((variant) => variant.isDefault) || variants[0] || null;
  }

  return (
    variants.find((variant) =>
      options.every((option) => {
        const selectedValue = selectedOptions[option.name];
        const variantValue = variant.options[option.name];

        if (!selectedValue || !variantValue) {
          return false;
        }

        return normalizeValue(selectedValue) === normalizeValue(variantValue);
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

export default function ProductPurchaseActions({
  productId,
  stock,
  basePrice,
  baseCurrency,
  options = [],
  variants = [],
}: ProductPurchaseActionsProps) {
  const router = useRouter();

  const activeOptions = useMemo(
    () =>
      options
        .filter((option) => option.name && option.values.length > 0)
        .sort((firstOption, secondOption) => {
          return firstOption.sortOrder - secondOption.sortOrder;
        }),
    [options]
  );

  const activeVariants = useMemo(
    () => variants.filter((variant) => variant.isActive),
    [variants]
  );

  const hasVariations = activeOptions.length > 0 || activeVariants.length > 0;

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(() => getInitialSelections(activeOptions, activeVariants));

  const [quantity, setQuantity] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState<ActionMessage>(null);

  const isLoading = pendingAction !== null;

  const selectedVariant = useMemo(
    () => getMatchingVariant(selectedOptions, activeOptions, activeVariants),
    [selectedOptions, activeOptions, activeVariants]
  );

  const selectedPrice = selectedVariant?.price ?? basePrice;
  const selectedCurrency = selectedVariant?.currency || baseCurrency;
  const selectedStock = selectedVariant?.stock ?? stock ?? 0;

  const maxQuantity = Math.max(0, Number(selectedStock || 0));

  const canAddToCart = hasVariations
    ? Boolean(selectedVariant) && maxQuantity > 0
    : maxQuantity > 0;

  useEffect(() => {
    setQuantity((currentQuantity) => {
      if (currentQuantity > maxQuantity && maxQuantity > 0) {
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
      window.dispatchEvent(new Event("cart-updated"));
    }

    router.refresh();
  }

  function updateSelectedOption(optionName: string, value: string) {
    setSelectedOptions((currentOptions) => ({
      ...currentOptions,
      [optionName]: value,
    }));

    setQuantity(1);
    setMessage(null);
  }

  function decreaseQuantity() {
    setQuantity((currentQuantity) => {
      if (currentQuantity <= 1) {
        return 1;
      }

      return currentQuantity - 1;
    });
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => {
      if (currentQuantity >= maxQuantity) {
        return currentQuantity;
      }

      return currentQuantity + 1;
    });
  }

  async function addToCart({ action, redirectPath }: AddToCartAction) {
    if (!productId) {
      setMessage({
        type: "error",
        text: "Product information is missing. Please refresh the page and try again.",
      });
      return;
    }

    if (hasVariations && !selectedVariant) {
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
      setPendingAction(action);
      setMessage(null);

      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId,
          variantId: selectedVariant?.id || null,
          quantity,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        const currentPath = getCurrentRedirectPath();
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }

      if (!response.ok || !data?.success) {
        setMessage({
          type: "error",
          text: data?.message || "Unable to add product to cart.",
        });
        return;
      }

      refreshCartState();
      router.push(redirectPath);
    } catch (error) {
      console.error("ADD_TO_CART_ERROR", error);

      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  if (!hasVariations && maxQuantity < 1) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        This product is currently out of stock.
      </div>
    );
  }

  return (
    <div>
      {activeOptions.length > 0 ? (
        <div className="space-y-5">
          {activeOptions.map((option) => (
            <div key={option.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-950">
                  {option.name}
                </p>

                {selectedOptions[option.name] ? (
                  <p className="text-xs text-gray-500">
                    Selected: {selectedOptions[option.name]}
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
                          : "rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
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
      ) : null}

      {hasVariations ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {selectedVariant ? (
            <div className="flex gap-4">
              {selectedVariant.image ? (
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img
                    src={selectedVariant.image}
                    alt={selectedVariant.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-950">
                  {selectedVariant.title}
                </p>

                {selectedVariant.sku ? (
                  <p className="mt-1 text-xs text-gray-500">
                    SKU: {selectedVariant.sku}
                  </p>
                ) : null}

                <p className="mt-2 font-heading text-2xl text-gray-950">
                  {formatAmount(selectedCurrency, selectedPrice)}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {maxQuantity > 0
                    ? `${maxQuantity} item(s) available for this selection`
                    : "This selection is currently out of stock"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">
              This combination is not available. Please select another
              variation.
            </p>
          )}
        </div>
      ) : null}

      {message ? (
        <div
          className={
            message.type === "success"
              ? "mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-fit items-center rounded-full bg-gray-100">
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={isLoading || quantity <= 1}
            className="px-4 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            -
          </button>

          <span className="min-w-10 px-4 text-center text-sm font-medium text-gray-900">
            {quantity}
          </span>

          <button
            type="button"
            onClick={increaseQuantity}
            disabled={isLoading || quantity >= maxQuantity || maxQuantity < 1}
            className="px-4 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            addToCart({
              action: "cart",
              redirectPath: "/cart",
            })
          }
          disabled={isLoading || !canAddToCart}
          className="flex-1 rounded-full bg-gray-200 px-8 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "cart" ? "Adding..." : "Add To Cart"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Maximum quantity allowed: {maxQuantity}
      </p>

      <button
        type="button"
        onClick={() =>
          addToCart({
            action: "buy",
            redirectPath: "/checkout",
          })
        }
        disabled={isLoading || !canAddToCart}
        className="mt-4 block w-full rounded-full bg-black py-3 text-center text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingAction === "buy" ? "Please wait..." : "Buy It Now"}
      </button>
    </div>
  );
}