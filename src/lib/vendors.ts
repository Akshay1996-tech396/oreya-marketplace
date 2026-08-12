import { prisma } from "./prisma";
import type {
  VendorCatalogItem,
  VendorDashboardData,
  VendorOrderItem,
} from "../types/vendor";

type VendorProduct = {
  id: string;
  title: string;
  slug: string;
  price: unknown;
  currency: string;
  stock: number;
  status: string;
  images: string[];
  category: {
    name: string;
  };
};

type VendorService = {
  id: string;
  title: string;
  slug: string;
  price: unknown;
  currency: string;
  duration: number | null;
  status: string;
  images: string[];
  category: {
    name: string;
  };
};

type VendorOrderItemWithOrder = {
  id: string;
  orderId: string;
  productId: string | null;
  serviceId: string | null;
  title: string;
  price: unknown;
  quantity: number;
  currency: string;
  status: string;
  vendorNote: string | null;
  order: {
    status: string;
    paymentStatus: string;
    createdAt: Date;
    customer: {
      name: string;
      email: string;
    };
  };
};

function formatProduct(product: VendorProduct): VendorCatalogItem {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    category: product.category.name,
    price: Number(product.price),
    currency: product.currency,
    status: product.status,
    stock: product.stock,
    images: product.images || [],
    type: "PRODUCT",
  };
}

function formatService(service: VendorService): VendorCatalogItem {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    category: service.category.name,
    price: Number(service.price),
    currency: service.currency,
    status: service.status,
    duration: service.duration,
    images: service.images || [],
    type: "SERVICE",
  };
}

export async function getVendorDashboardByUserId(
  userId: string
): Promise<VendorDashboardData | null> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
    include: {
      products: {
        include: {
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      services: {
        include: {
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  const products = vendor.products as VendorProduct[];
  const services = vendor.services as VendorService[];

  const productIds = products.map((product) => product.id);
  const serviceIds = services.map((service) => service.id);

  const orderItems =
    productIds.length > 0 || serviceIds.length > 0
      ? await prisma.orderItem.findMany({
          where: {
            OR: [
              ...(productIds.length > 0
                ? [
                    {
                      productId: {
                        in: productIds,
                      },
                    },
                  ]
                : []),
              ...(serviceIds.length > 0
                ? [
                    {
                      serviceId: {
                        in: serviceIds,
                      },
                    },
                  ]
                : []),
            ],
          },
          include: {
            order: {
              include: {
                customer: true,
              },
            },
          },
        })
      : [];

  const typedOrderItems = orderItems as VendorOrderItemWithOrder[];

  const orders: VendorOrderItem[] = typedOrderItems
    .map((item) => {
      const price = Number(item.price);

      return {
        id: item.id,
        orderId: item.orderId,
        customerName: item.order.customer.name,
        customerEmail: item.order.customer.email,
        title: item.title,
        quantity: item.quantity,
        price,
        total: price * item.quantity,
        currency: item.currency,
        orderStatus: item.order.status,
        orderItemStatus: item.status,
        vendorNote: item.vendorNote,
        paymentStatus: item.order.paymentStatus,
        createdAt: item.order.createdAt.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  return {
    vendorName: vendor.businessName,
    vendorSlug: vendor.slug,
    vendorStatus: vendor.status,
    totalProducts: products.length,
    totalServices: services.length,
    totalOrders: orders.length,
    totalRevenue,
    currency: orders[0]?.currency || "AED",
    products: products.map(formatProduct),
    services: services.map(formatService),
    orders,
  };
}

export async function getDemoVendorDashboard(): Promise<VendorDashboardData | null> {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      user: {
        email: "vendor@example.com",
      },
    },
  });

  if (!vendor) {
    return null;
  }

  return getVendorDashboardByUserId(vendor.userId);
}