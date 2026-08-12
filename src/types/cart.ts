export type CartItemType = "PRODUCT" | "SERVICE" | "MENU_ITEM";

export type CartVariantOptions = Record<string, string>;

export type CartDisplayItem = {
  id: string;
  title: string;
  slug: string;
  vendor: string;
  category: string;
  currency: string;
  price: number;
  quantity: number;
  total: number;
  type: CartItemType;
  isAvailable: boolean;
  availabilityMessage: string | null;

  productId?: string | null;
  serviceId?: string | null;

  variantId?: string | null;
  variantTitle?: string | null;
  variantSku?: string | null;
  variantOptions?: CartVariantOptions;
  variantOptionSummary?: string;

  image?: string | null;
  stock?: number;
  maxQuantity?: number;
};

export type CartDisplayData = {
  items: CartDisplayItem[];
  subtotal: number;
  currency: string;
  hasUnavailableItems: boolean;
};