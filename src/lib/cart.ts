import { prisma } from "./prisma";
import type { CartDisplayData, CartDisplayItem } from "../types/cart";

type CartVendor = {
  businessName: string;
  status: string;
};

type CartProductVariant = {
  id: string;
  productId: string;
  title: string;
  sku: string | null;
  options: unknown;
  price: unknown;
  currency: string;
  stock: number;
  image: string | null;
  isActive: boolean;
};

type CartItemWithRelations = {
  id: string;
  quantity: number;
  price: unknown;
  currency: string | null;
  variantId: string | null;

  product: {
    id: string;
    title: string;
    slug: string;
    price: unknown;
    currency: string;
    stock: number;
    images: string[];
    status: string;
    vendor: CartVendor | null;
    category: { name: string } | null;
    variants: { id: string }[];
  } | null;

  service: {
    id: string;
    title: string;
    slug: string;
    price: unknown;
    currency: string;
    status: string;
    vendor: CartVendor | null;
    category: { name: string } | null;
  } | null;

  variant: CartProductVariant | null;
};

function getNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function getVendorName(vendor: CartVendor | null) {
  return vendor?.businessName || "Oreya Marketplace";
}

function parseVariantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const optionRecord = value as Record<string, unknown>;
  const parsedOptions: Record<string, string> = {};

  Object.entries(optionRecord).forEach(([key, optionValue]) => {
    const optionName = String(key || "").trim();
    const selectedValue = String(optionValue || "").trim();

    if (!optionName || !selectedValue) {
      return;
    }

    parsedOptions[optionName] = selectedValue;
  });

  return parsedOptions;
}

function formatVariantOptionSummary(options: Record<string, string>) {
  return Object.entries(options)
    .map(([name, value]) => `${name}: ${value}`)
    .join(" / ");
}

function getProductAvailabilityMessage(item: CartItemWithRelations) {
  const product = item.product;

  if (!product) {
    return "Product not found.";
  }

  if (product.vendor && product.vendor.status !== "APPROVED") {
    return "This vendor is not approved.";
  }

  if (product.status !== "ACTIVE") {
    return "This product is not active.";
  }

  const productHasVariants = product.variants.length > 0;

  if (productHasVariants && !item.variant) {
    return "Please select a valid product variation for this item.";
  }

  if (item.variant && item.variant.productId !== product.id) {
    return "The selected product variation does not belong to this product.";
  }

  if (item.variant && !item.variant.isActive) {
    return "The selected product variation is not active.";
  }

  const availableStock = item.variant ? item.variant.stock : product.stock;

  if (availableStock <= 0) {
    return "This item is out of stock.";
  }

  if (item.quantity > availableStock) {
    return `Only ${availableStock} item(s) are available for this selection.`;
  }

  return null;
}

function getServiceAvailabilityMessage(item: CartItemWithRelations) {
  const service = item.service;

  if (!service) {
    return "Service not found.";
  }

  if (service.vendor && service.vendor.status !== "APPROVED") {
    return "This vendor is not approved.";
  }

  if (service.status !== "ACTIVE") {
    return "This service is not active.";
  }

  return null;
}

export async function getCustomerCart(
  customerId: string
): Promise<CartDisplayData> {
  const cart = await prisma.cart.findUnique({
    where: {
      customerId,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: true,
              category: true,
              variants: {
                where: {
                  isActive: true,
                },
                select: {
                  id: true,
                },
              },
            },
          },
          service: {
            include: {
              vendor: true,
              category: true,
            },
          },
          variant: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!cart) {
    return {
      items: [],
      subtotal: 0,
      currency: "AED",
      hasUnavailableItems: false,
    };
  }

  const cartItems = cart.items as CartItemWithRelations[];

  const items: CartDisplayItem[] = cartItems
    .map((cartItem): CartDisplayItem | null => {
      if (cartItem.product) {
        const variantOptions = parseVariantOptions(cartItem.variant?.options);
        const variantOptionSummary = formatVariantOptionSummary(variantOptions);

        const price = cartItem.variant
          ? getNumber(cartItem.variant.price)
          : getNumber(cartItem.product.price);

        const currency =
          cartItem.variant?.currency ||
          cartItem.currency ||
          cartItem.product.currency;

        const availableStock = cartItem.variant
          ? cartItem.variant.stock
          : cartItem.product.stock;

        const availabilityMessage = getProductAvailabilityMessage(cartItem);

        return {
          id: cartItem.id,
          title: cartItem.product.title,
          slug: cartItem.product.slug,
          vendor: getVendorName(cartItem.product.vendor),
          category: cartItem.product.category?.name || "Product",
          currency,
          price,
          quantity: cartItem.quantity,
          total: price * cartItem.quantity,
          type: "PRODUCT",
          isAvailable: availabilityMessage === null,
          availabilityMessage,

          productId: cartItem.product.id,
          variantId: cartItem.variant?.id || null,
          variantTitle: cartItem.variant?.title || null,
          variantSku: cartItem.variant?.sku || null,
          variantOptions,
          variantOptionSummary,
          image: cartItem.variant?.image || cartItem.product.images?.[0] || null,
          stock: availableStock,
          maxQuantity: availableStock,
        } as CartDisplayItem;
      }

      if (cartItem.service) {
        const price = getNumber(cartItem.service.price);
        const availabilityMessage = getServiceAvailabilityMessage(cartItem);

        return {
          id: cartItem.id,
          title: cartItem.service.title,
          slug: cartItem.service.slug,
          vendor: getVendorName(cartItem.service.vendor),
          category: cartItem.service.category?.name || "Service",
          currency: cartItem.service.currency,
          price,
          quantity: cartItem.quantity,
          total: price * cartItem.quantity,
          type: "SERVICE",
          isAvailable: availabilityMessage === null,
          availabilityMessage,
        };
      }

      return null;
    })
    .filter((item): item is CartDisplayItem => item !== null);

  const availableItems = items.filter((item) => item.isAvailable);

  const subtotal = availableItems.reduce((sum, item) => {
    return sum + item.total;
  }, 0);

  return {
    items,
    subtotal,
    currency: items[0]?.currency || "AED",
    hasUnavailableItems: items.some((item) => !item.isAvailable),
  };
}

export async function getDemoCustomerCart(): Promise<CartDisplayData> {
  const customer = await prisma.user.findUnique({
    where: {
      email: "customer@example.com",
    },
  });

  if (!customer) {
    return {
      items: [],
      subtotal: 0,
      currency: "AED",
      hasUnavailableItems: false,
    };
  }

  return getCustomerCart(customer.id);
}