export type MarketplaceItemType = "PRODUCT" | "SERVICE";

export type MarketplaceSpecification = {
  label: string;
  value: string;
};

export type MarketplaceProductOption = {
  id: string;
  name: string;
  values: string[];
  sortOrder: number;
};

export type MarketplaceProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  options: Record<string, string>;
  price: number;
  currency: string;
  stock: number;
  image: string | null;
  isActive: boolean;
  isDefault: boolean;
};

export type MarketplaceItem = {
  id: string;
  title: string;
  vendor: string;
  category: string;
  price: number;
  currency: string;
  slug: string;
  type: MarketplaceItemType;
  images: string[];
  stock?: number;
  createdAt?: string;
};

export type MarketplaceDetailItem = MarketplaceItem & {
  description?: string | null;

  duration?: number | null;
  vendorSlug?: string | null;
  vendorDescription?: string | null;

  specifications?: MarketplaceSpecification[] | unknown;
  specificationImage?: string | null;
  exchangePolicy?: string | null;
  refundPolicy?: string | null;
  aboutBrand?: string | null;
  brandImage?: string | null;

  options?: MarketplaceProductOption[];
  variants?: MarketplaceProductVariant[];
};