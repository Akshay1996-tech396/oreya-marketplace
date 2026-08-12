export type CustomerOrderItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  currency: string;
  total: number;
};

export type CustomerOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  items: CustomerOrderItem[];
};

export type AdminOrder = CustomerOrder & {
  customerName: string;
  customerEmail: string;
};