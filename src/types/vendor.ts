export type VendorCatalogItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  currency: string;
  status: string;
  stock?: number | null;
  duration?: number | null;
  images: string[];
  type: "PRODUCT" | "SERVICE";
};

export type VendorOrderItem = {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  title: string;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  orderStatus: string;
  orderItemStatus: string;
  vendorNote?: string | null;
  paymentStatus: string;
  createdAt: string;
};

export type VendorDashboardData = {
  vendorName: string;
  vendorSlug: string;
  vendorStatus: string;
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalRevenue: number;
  currency: string;
  products: VendorCatalogItem[];
  services: VendorCatalogItem[];
  orders: VendorOrderItem[];
};