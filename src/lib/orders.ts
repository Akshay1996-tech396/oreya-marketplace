import { prisma } from "./prisma";
import type { AdminOrder, CustomerOrder } from "../types/order";

function parseVariantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, val] of Object.entries(value)) {
    if (
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean"
    ) {
      result[key] = String(val);
    }
  }

  return result;
}

function formatOrder(order: any): CustomerOrder {
  return {
    id: order.id,

    status: String(order.status),
    paymentStatus: String(order.paymentStatus),

    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),

    currency: order.currency,
    createdAt: order.createdAt.toISOString(),

    paymentMethod: order.payment?.method
      ? String(order.payment.method)
      : null,

    deliveryAddress: order.deliveryAddress ?? null,
    deliveryAddressLine1: order.deliveryAddressLine1 ?? null,
    deliveryAddressLine2: order.deliveryAddressLine2 ?? null,
    deliveryArea: order.deliveryArea ?? null,
    deliveryCity: order.deliveryCity ?? null,
    deliveryCountry: order.deliveryCountry ?? null,
    deliveryFullName: order.deliveryFullName ?? null,
    deliveryPhone: order.deliveryPhone ?? null,
    deliveryEmail: order.deliveryEmail ?? null,
    deliveryState: order.deliveryState ?? null,
    deliveryZipCode: order.deliveryZipCode ?? null,
    deliveryNote: order.deliveryNote ?? null,

    requestedDeliveryDate: order.requestedDeliveryDate
      ? order.requestedDeliveryDate.toISOString()
      : null,

    requestedDeliveryTimePeriod: order.requestedDeliveryTimePeriod
      ? String(order.requestedDeliveryTimePeriod)
      : null,

    items: order.items.map((item: any) => {
      const price = Number(item.price);

      const isProduct = Boolean(item.product);
      const isService = Boolean(item.service);

      const image =
        item.variantImage ||
        item.variant?.image ||
        item.product?.images?.[0] ||
        item.service?.images?.[0] ||
        "";

      const vendorName =
        item.product?.vendor?.businessName ||
        item.service?.vendor?.businessName ||
        "Oreya Marketplace";

      return {
        id: item.id,
        title: item.title,
        price,
        quantity: item.quantity,
        currency: item.currency,
        total: price * item.quantity,

        status: String(item.status),

        type: isProduct ? "Product" : isService ? "Service" : "Product",

        vendorName,

        image,

        variantTitle:
          item.variantTitle ||
          item.variant?.title ||
          null,

        variantSku:
          item.variantSku ||
          item.variant?.sku ||
          null,

        variantOptions: parseVariantOptions(
          item.variantOptions ?? item.variant?.options
        ),

        productSlug: item.product?.slug ?? null,
        serviceSlug: item.service?.slug ?? null,
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
      payment: true,

      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              images: true,

              vendor: {
                select: {
                  businessName: true,
                },
              },
            },
          },

          service: {
            select: {
              id: true,
              slug: true,
              images: true,

              vendor: {
                select: {
                  businessName: true,
                },
              },
            },
          },

          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              options: true,
              image: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map(formatOrder);
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

      payment: true,

      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              images: true,

              vendor: {
                select: {
                  businessName: true,
                },
              },
            },
          },

          service: {
            select: {
              id: true,
              slug: true,
              images: true,

              vendor: {
                select: {
                  businessName: true,
                },
              },
            },
          },

          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              options: true,
              image: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((order: any) => ({
    ...formatOrder(order),

    customerName: order.customer?.name || "Unknown Customer",
    customerEmail: order.customer?.email || "No email",
  }));
}