import { prisma } from "./prisma";
import type { AdminOrder, CustomerOrder } from "../types/order";

type OrderWithItems = {
  id: string;
  status: string;
  paymentStatus: string;
  total: unknown;
  currency: string;
  createdAt: Date;
  customer?: {
    name: string;
    email: string;
  };
  items: {
    id: string;
    title: string;
    price: unknown;
    quantity: number;
    currency: string;
  }[];
};

function formatOrder(order: OrderWithItems): CustomerOrder {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: Number(order.total),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => {
      const price = Number(item.price);

      return {
        id: item.id,
        title: item.title,
        price,
        quantity: item.quantity,
        currency: item.currency,
        total: price * item.quantity,
      };
    }),
  };
}

export async function getCustomerOrders(
  customerId: string
): Promise<CustomerOrder[]> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (orders as OrderWithItems[]).map(formatOrder);
}

export async function getDemoCustomerOrders(): Promise<CustomerOrder[]> {
  const customer = await prisma.user.findUnique({
    where: {
      email: "customer@example.com",
    },
  });

  if (!customer) {
    return [];
  }

  return getCustomerOrders(customer.id);
}

export async function getAllAdminOrders(): Promise<AdminOrder[]> {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (orders as OrderWithItems[]).map((order) => ({
    ...formatOrder(order),
    customerName: order.customer?.name || "Unknown Customer",
    customerEmail: order.customer?.email || "No email",
  }));
}