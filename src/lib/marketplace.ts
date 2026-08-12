import { prisma } from "@/lib/prisma";
import type {
  MarketplaceDetailItem,
  MarketplaceItem,
} from "@/types/marketplace";

type CollectionData = {
  title: string;
  slug: string;
  items: MarketplaceItem[];
};

type ProductOptionOutput = {
  id: string;
  name: string;
  values: string[];
  sortOrder: number;
};

type ProductVariantOutput = {
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

const publicOwnerVisibilityWhere = {
  OR: [
    {
      vendorId: null,
    },
    {
      vendor: {
        is: {
          status: "APPROVED" as const,
        },
      },
    },
  ],
};

function formatProduct(product: any): MarketplaceItem {
  const item = {
    id: product.id,
    title: product.title,
    vendor: product.vendor?.businessName || "Oreya Marketplace",
    category: product.category.name,
    price: Number(product.price),
    currency: product.currency,
    slug: product.slug,
    type: "PRODUCT",
    images: product.images || [],
    stock: product.stock,
    createdAt:
      product.createdAt instanceof Date
        ? product.createdAt.toISOString()
        : String(product.createdAt || ""),
  };

  return item as MarketplaceItem;
}

function formatService(service: any): MarketplaceItem {
  const item = {
    id: service.id,
    title: service.title,
    vendor: service.vendor?.businessName || "Oreya Marketplace",
    category: service.category.name,
    price: Number(service.price),
    currency: service.currency,
    slug: service.slug,
    type: "SERVICE",
    images: service.images || [],
    stock: 1,
    createdAt:
      service.createdAt instanceof Date
        ? service.createdAt.toISOString()
        : String(service.createdAt || ""),
  };

  return item as MarketplaceItem;
}

function getDetailFields(item: any) {
  return {
    specifications: item.specifications || [],
    specificationImage: item.specificationImage || null,
    exchangePolicy: item.exchangePolicy || null,
    refundPolicy: item.refundPolicy || null,
    aboutBrand: item.aboutBrand || null,
    brandImage: item.brandImage || null,
  };
}

function parseOptionValues(values: unknown): string[] {
  if (Array.isArray(values)) {
    return values
      .map((value) => String(value || "").trim())
      .filter((value) => value.length > 0);
  }

  if (typeof values === "string") {
    return values
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [];
}

function parseVariantOptions(options: unknown): Record<string, string> {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return {};
  }

  const parsedOptions: Record<string, string> = {};
  const optionRecord = options as Record<string, unknown>;

  Object.entries(optionRecord).forEach(([key, value]) => {
    const optionName = String(key || "").trim();
    const optionValue = String(value || "").trim();

    if (!optionName || !optionValue) {
      return;
    }

    parsedOptions[optionName] = optionValue;
  });

  return parsedOptions;
}

function formatProductOptions(product: any): ProductOptionOutput[] {
  if (!Array.isArray(product.options)) {
    return [];
  }

  return product.options
    .map((option: any) => {
      const name = String(option.name || "").trim();
      const values = parseOptionValues(option.values);

      if (!option.id || !name || values.length === 0) {
        return null;
      }

      return {
        id: option.id,
        name,
        values,
        sortOrder: Number(option.sortOrder || 0),
      };
    })
    .filter((option: ProductOptionOutput | null): option is ProductOptionOutput =>
      Boolean(option)
    );
}

function formatProductVariants(product: any): ProductVariantOutput[] {
  if (!Array.isArray(product.variants)) {
    return [];
  }

  return product.variants
    .map((variant: any) => {
      const title = String(variant.title || "").trim();

      if (!variant.id || !title) {
        return null;
      }

      return {
        id: variant.id,
        title,
        sku: variant.sku || null,
        options: parseVariantOptions(variant.options),
        price: Number(variant.price || 0),
        currency: variant.currency || product.currency || "AED",
        stock: Number(variant.stock || 0),
        image: variant.image || null,
        isActive: Boolean(variant.isActive),
        isDefault: Boolean(variant.isDefault),
      };
    })
    .filter(
      (variant: ProductVariantOutput | null): variant is ProductVariantOutput =>
        Boolean(variant)
    );
}

function getProductVariationFields(product: any) {
  return {
    options: formatProductOptions(product),
    variants: formatProductVariants(product),
  };
}

export async function getHomeData() {
  const restaurants = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      category: {
        slug: "restaurants",
      },
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      category: {
        slug: {
          notIn: ["restaurants", "experiences"],
        },
      },
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  const experiences = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      category: {
        slug: "experiences",
      },
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    restaurants: restaurants.map(formatService),
    services: services.map(formatService),
    experiences: experiences.map(formatService),
    products: products.map(formatProduct),
  };
}

export async function getCollectionData(
  slug: string
): Promise<CollectionData | null> {
  if (slug === "products") {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...publicOwnerVisibilityWhere,
      },
      include: {
        vendor: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      title: "Products",
      slug: "products",
      items: products.map(formatProduct),
    };
  }

  if (slug === "services") {
    const services = await prisma.service.findMany({
      where: {
        status: "ACTIVE",
        category: {
          slug: {
            notIn: ["restaurants", "experiences"],
          },
        },
        ...publicOwnerVisibilityWhere,
      },
      include: {
        vendor: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      title: "Services",
      slug: "services",
      items: services.map(formatService),
    };
  }

  const category = await prisma.category.findUnique({
    where: {
      slug,
    },
  });

  if (!category) {
    return null;
  }

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      categoryId: category.id,
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    title: category.name,
    slug: category.slug,
    items: services.map(formatService),
  };
}

export async function getAllMarketplaceItems(): Promise<MarketplaceItem[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return [...services.map(formatService), ...products.map(formatProduct)];
}

export async function getMarketplaceItemBySlug(
  slug: string
): Promise<MarketplaceDetailItem | null> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
      options: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      variants: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
    },
  });

  if (product) {
    return {
      ...formatProduct(product),
      description: product.description,
      images: product.images || [],
      stock: product.stock,
      vendorSlug: product.vendor?.slug || "",
      vendorDescription: product.vendor?.description || null,
      ...getDetailFields(product),
      ...getProductVariationFields(product),
    } as MarketplaceDetailItem;
  }

  const service = await prisma.service.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      ...publicOwnerVisibilityWhere,
    },
    include: {
      vendor: true,
      category: true,
    },
  });

  if (service) {
    return {
      ...formatService(service),
      description: service.description,
      images: service.images || [],
      duration: service.duration,
      vendorSlug: service.vendor?.slug || "",
      vendorDescription: service.vendor?.description || null,
      ...getDetailFields(service),
      options: [],
      variants: [],
    } as MarketplaceDetailItem;
  }

  return null;
}

export async function searchMarketplaceItems(
  query: string
): Promise<MarketplaceItem[]> {
  const searchText = query.trim();

  if (!searchText) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      AND: [
        publicOwnerVisibilityWhere,
        {
          OR: [
            {
              title: {
                contains: searchText,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: searchText,
                mode: "insensitive",
              },
            },
            {
              vendor: {
                is: {
                  businessName: {
                    contains: searchText,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              category: {
                name: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      vendor: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      AND: [
        publicOwnerVisibilityWhere,
        {
          OR: [
            {
              title: {
                contains: searchText,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: searchText,
                mode: "insensitive",
              },
            },
            {
              vendor: {
                is: {
                  businessName: {
                    contains: searchText,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              category: {
                name: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      vendor: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return [...services.map(formatService), ...products.map(formatProduct)];
}