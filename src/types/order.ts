export type CustomerOrderItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  currency: string;
  total: number;

  status: string;

  type: "Product" | "Service";
  vendorName: string;

  image: string;

  variantTitle: string | null;
  variantSku: string | null;
  variantOptions: Record<string, string>;

  productSlug: string | null;
  serviceSlug: string | null;
};

export type CustomerOrder = {
  id: string;

  status: string;
  paymentStatus: string;

  total: number;
  subtotal: number;
  shipping: number;
  tax: number;

  currency: string;
  createdAt: string;

  paymentMethod: string | null;

  deliveryAddress: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryArea: string | null;
  deliveryCity: string | null;
  deliveryCountry: string | null;
  deliveryFullName: string | null;
  deliveryPhone: string | null;
  deliveryEmail: string | null;
  deliveryState: string | null;
  deliveryZipCode: string | null;
  deliveryNote: string | null;

  requestedDeliveryDate: string | null;
  requestedDeliveryTimePeriod: string | null;

  items: CustomerOrderItem[];
};

export type AdminOrder = CustomerOrder & {
  customerName: string;
  customerEmail: string;
};