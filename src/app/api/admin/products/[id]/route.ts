import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getContentLimits } from "@/lib/content-limits-server";

type ProductStatusInput = "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";


type SpecificationItem = {
  label: string;
  value: string;
};

type ParsedProductOption = {
  name: string;
  values: string[];
  sortOrder: number;
};

type ParsedProductVariant = {
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidProductStatus(status: string): status is ProductStatusInput {
  return (
    status === "DRAFT" ||
    status === "ACTIVE" ||
    status === "INACTIVE" ||
    status === "OUT_OF_STOCK"
  );
}

function parseImages(images: unknown) {
  if (Array.isArray(images)) {
    return images
      .map((image) => String(image).trim())
      .filter((image) => image.length > 0);
  }

  if (typeof images === "string") {
    return images
      .split("\n")
      .map((image) => image.trim())
      .filter((image) => image.length > 0);
  }

  return [];
}

function parseSpecifications(specifications: unknown): SpecificationItem[] {
  if (!Array.isArray(specifications)) {
    return [];
  }

  return specifications
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;

      const label = String(row.label || "").trim();
      const value = String(row.value || "").trim();

      if (!label || !value) {
        return null;
      }

      return {
        label,
        value,
      };
    })
    .filter((item): item is SpecificationItem => Boolean(item));
}

function parseOptionalText(value: unknown) {
  const text = String(value || "").trim();

  return text.length > 0 ? text : null;
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true" || normalizedValue === "1") {
      return true;
    }

    if (normalizedValue === "false" || normalizedValue === "0") {
      return false;
    }
  }

  return fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueProductSlug(title: string, currentProductId: string) {
  const baseSlug = slugify(title) || "product";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct || existingProduct.id === currentProductId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function parseProductOptions(options: unknown): ParsedProductOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  const usedNames = new Set<string>();

  return options
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const name = String(row.name || "").trim();

      if (!name) {
        return null;
      }

      const normalizedName = name.toLowerCase();

      if (usedNames.has(normalizedName)) {
        return null;
      }

      const rawValues = Array.isArray(row.values)
        ? row.values
        : String(row.values || "").split(",");

      const usedValues = new Set<string>();

      const values = rawValues
        .map((value) => String(value || "").trim())
        .filter((value) => {
          if (!value) {
            return false;
          }

          const normalizedValue = value.toLowerCase();

          if (usedValues.has(normalizedValue)) {
            return false;
          }

          usedValues.add(normalizedValue);
          return true;
        });

      if (values.length === 0) {
        return null;
      }

      usedNames.add(normalizedName);

      return {
        name,
        values,
        sortOrder: Number.isFinite(Number(row.sortOrder))
          ? Math.max(0, Math.floor(Number(row.sortOrder)))
          : index,
      };
    })
    .filter((item): item is ParsedProductOption => Boolean(item));
}

function parseVariantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const parsedOptions: Record<string, string> = {};

  Object.entries(record).forEach(([key, optionValue]) => {
    const optionName = String(key || "").trim();
    const selectedValue = String(optionValue || "").trim();

    if (optionName && selectedValue) {
      parsedOptions[optionName] = selectedValue;
    }
  });

  return parsedOptions;
}

function parseProductVariants(
  variants: unknown,
  fallbackCurrency: string
): ParsedProductVariant[] {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;

      const title = String(row.title || "").trim();
      const price = Number(row.price);
      const parsedStock = Number(row.stock ?? 0);
      const stock = Number.isFinite(parsedStock)
        ? Math.max(0, Math.floor(parsedStock))
        : 0;
      const options = parseVariantOptions(row.options);

      if (!title || !Number.isFinite(price) || price <= 0) {
        return null;
      }

      return {
        title,
        sku: parseOptionalText(row.sku),
        options,
        price,
        currency:
          String(row.currency || fallbackCurrency || "AED")
            .trim()
            .toUpperCase() || "AED",
        stock,
        image: parseOptionalText(row.image),
        isActive: parseBoolean(row.isActive, true),
        isDefault: parseBoolean(row.isDefault, false),
      };
    })
    .filter((item): item is ParsedProductVariant => Boolean(item));
}

function validateOptionsAndVariants(
  options: ParsedProductOption[],
  variants: ParsedProductVariant[]
) {
  if (options.length > 0 && variants.length === 0) {
    return "Please generate at least one variant for the selected product options.";
  }

  if (variants.length > 0 && options.length === 0) {
    return "Product options are required before adding product variants.";
  }

  if (options.length > 5) {
    return "A product can have a maximum of five option groups.";
  }

  for (const option of options) {
    if (option.values.length > 30) {
      return `${option.name} can have a maximum of thirty values.`;
    }
  }

  if (variants.length > 500) {
    return "A product can have a maximum of five hundred variants.";
  }

  if (variants.length === 0) {
    return null;
  }

  const optionValueMap = new Map<string, Set<string>>();

  options.forEach((option) => {
    optionValueMap.set(
      option.name,
      new Set(option.values.map((value) => value.toLowerCase()))
    );
  });

  const usedVariantSignatures = new Set<string>();

  for (const variant of variants) {
    const variantOptionNames = Object.keys(variant.options);

    if (variantOptionNames.length !== options.length) {
      return `Variant "${variant.title}" must include all product options.`;
    }

    for (const option of options) {
      const selectedValue = variant.options[option.name];

      if (!selectedValue) {
        return `Variant "${variant.title}" is missing ${option.name}.`;
      }

      const allowedValues = optionValueMap.get(option.name);

      if (!allowedValues?.has(selectedValue.toLowerCase())) {
        return `Variant "${variant.title}" has an invalid value for ${option.name}.`;
      }
    }

    const signature = options
      .map((option) => `${option.name}:${variant.options[option.name]}`)
      .join("|")
      .toLowerCase();

    if (usedVariantSignatures.has(signature)) {
      return `Duplicate variant found: ${variant.title}.`;
    }

    usedVariantSignatures.add(signature);
  }

  return null;
}

function normalizeDefaultVariant(variants: ParsedProductVariant[]) {
  if (variants.length === 0) {
    return variants;
  }

  const hasSelectedDefault = variants.some((variant) => variant.isDefault);
  let defaultVariantFound = false;

  return variants.map((variant, index) => {
    const shouldBeDefault = hasSelectedDefault
      ? variant.isDefault && !defaultVariantFound
      : index === 0;

    if (shouldBeDefault) {
      defaultVariantFound = true;
    }

    return {
      ...variant,
      isDefault: shouldBeDefault,
    };
  });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Only admins can update products." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingProduct = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    const contentLimits = await getContentLimits();
    const body = await request.json();

    const vendorId = String(body.vendorId || "").trim() || null;
    const title = String(body.title || "").trim();
    const categoryId = String(body.categoryId || "").trim();
    const description = parseOptionalText(body.description);
    const price = Number(body.price);
    const currency =
      String(body.currency || "AED")
        .trim()
        .toUpperCase() || "AED";
    const parsedStock = Number(body.stock ?? 0);
    const stock = Number.isFinite(parsedStock)
      ? Math.max(0, Math.floor(parsedStock))
      : 0;
    const status = String(body.status || "DRAFT").toUpperCase();
    const images = parseImages(body.images);

    const specifications = parseSpecifications(
      body.specifications
    ) as Prisma.InputJsonValue;

    const specificationImage = parseOptionalText(body.specificationImage);
    const exchangePolicy = parseOptionalText(body.exchangePolicy);
    const refundPolicy = parseOptionalText(body.refundPolicy);
    const aboutBrand = parseOptionalText(body.aboutBrand);
    const brandImage = parseOptionalText(body.brandImage);

    const options = parseProductOptions(body.options);
    const parsedVariants = parseProductVariants(body.variants, currency);
    const variants = normalizeDefaultVariant(parsedVariants);

    if (!title || !categoryId || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Title, category and a valid price are required.",
        },
        { status: 400 }
      );
    }

    if (
      description &&
      description.length > contentLimits.description
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Product description cannot exceed ${contentLimits.description} characters.`,
        },
        { status: 400 }
      );
    }

    if (
      exchangePolicy &&
      exchangePolicy.length > contentLimits.exchangePolicy
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Product exchange policy cannot exceed ${contentLimits.exchangePolicy} characters.`,
        },
        { status: 400 }
      );
    }

    if (
      refundPolicy &&
      refundPolicy.length > contentLimits.refundPolicy
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Product refund policy cannot exceed ${contentLimits.refundPolicy} characters.`,
        },
        { status: 400 }
      );
    }

    if (!isValidProductStatus(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid product status." },
        { status: 400 }
      );
    }

    const variationValidationMessage = validateOptionsAndVariants(
      options,
      variants
    );

    if (variationValidationMessage) {
      return NextResponse.json(
        { success: false, message: variationValidationMessage },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    if (vendorId) {
      const vendor = await prisma.vendorProfile.findUnique({
        where: {
          id: vendorId,
        },
        select: {
          id: true,
        },
      });

      if (!vendor) {
        return NextResponse.json(
          { success: false, message: "Selected vendor was not found." },
          { status: 404 }
        );
      }
    }

    const finalStock =
      variants.length > 0
        ? variants
            .filter((variant) => variant.isActive)
            .reduce((total, variant) => total + variant.stock, 0)
        : stock;

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        vendorId,
        categoryId,
        title,
        slug: await getUniqueProductSlug(title, id),
        description,
        specifications,
        specificationImage,
        exchangePolicy,
        refundPolicy,
        aboutBrand,
        brandImage,
        price,
        currency,
        stock: finalStock,
        images,
        status,
        options: {
          deleteMany: {},
          create: options.map((option) => ({
            name: option.name,
            values: option.values as Prisma.InputJsonValue,
            sortOrder: option.sortOrder,
          })),
        },
        variants: {
          deleteMany: {},
          create: variants.map((variant) => ({
            title: variant.title,
            sku: variant.sku,
            options: variant.options as Prisma.InputJsonValue,
            price: variant.price,
            currency: variant.currency,
            stock: variant.stock,
            image: variant.image,
            isActive: variant.isActive,
            isDefault: variant.isDefault,
          })),
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      productId: updatedProduct.id,
      slug: updatedProduct.slug,
    });
  } catch (error) {
    console.error("ADMIN_PRODUCT_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update the product at this time.",
      },
      { status: 500 }
    );
  }
}