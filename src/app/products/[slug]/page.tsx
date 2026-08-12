
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getMarketplaceItemBySlug } from "@/lib/marketplace";

import ProductDetailAccordions from "@/components/product/ProductDetailAccordions";
import ServiceDetailAccordions from "@/components/product/ServiceDetailAccordions";
import DetailBreadcrumbs from "@/components/detail/DetailBreadcrumbs";
import DetailImageGallery from "@/components/detail/DetailImageGallery";
import DetailInfoTabs from "@/components/detail/DetailInfoTabs";
import DetailPageLayout from "@/components/detail/DetailPageLayout";
import DetailPriceSection from "@/components/detail/DetailPriceSection";
import DetailTrustCards from "@/components/detail/DetailTrustCards";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type SpecificationItem = {
  label: string;
  value: string;
};

function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function getCollectionSlug(category: string) {
  const normalizedCategory = category
    .toLowerCase()
    .trim();

  if (
    normalizedCategory.includes(
      "restaurant"
    )
  ) {
    return "restaurants";
  }

  if (
    normalizedCategory.includes(
      "experience"
    )
  ) {
    return "experiences";
  }

  if (
    normalizedCategory.includes(
      "service"
    )
  ) {
    return "services";
  }

  return "products";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

function parseSpecifications(
  value: unknown,
  fallbackSpecifications: SpecificationItem[]
): SpecificationItem[] {
  if (!Array.isArray(value)) {
    return fallbackSpecifications;
  }

  const parsedSpecifications = value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const row =
        item as Record<
          string,
          unknown
        >;

      const label = String(
        row.label || ""
      ).trim();

      const itemValue = String(
        row.value || ""
      ).trim();

      if (!label || !itemValue) {
        return null;
      }

      return {
        label,
        value: itemValue,
      };
    })
    .filter(
      (
        item
      ): item is SpecificationItem =>
        Boolean(item)
    );

  return parsedSpecifications.length > 0
    ? parsedSpecifications
    : fallbackSpecifications;
}

function getExchangeRefundText(item: {
  exchangePolicy?: string | null;
  refundPolicy?: string | null;
  type: string;
}) {
  const exchangePolicy =
    item.exchangePolicy?.trim();

  const refundPolicy =
    item.refundPolicy?.trim();

  if (
    exchangePolicy ||
    refundPolicy
  ) {
    return [
      exchangePolicy
        ? `Exchange Policy\n${exchangePolicy}`
        : "",
      refundPolicy
        ? `Refund Policy\n${refundPolicy}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (item.type === "PRODUCT") {
    return "Exchange Policy\nAll eligible products can be exchanged according to vendor policy. Please ensure the product is unused, undamaged and returned with original packaging.\n\nRefund Policy\nRefund requests are reviewed after return approval. Once approved, refunds are processed to the original payment method as per standard processing timelines.";
  }

  return "Exchange Policy\nService bookings can be rescheduled based on vendor availability. Please contact support or the vendor before the booking time.\n\nRefund Policy\nRefund eligibility depends on cancellation timing and vendor policy. Approved refunds are processed as per standard processing timelines.";
}

function getMinimumVariantPrice(
  variants: {
    price: number;
    currency: string;
  }[],
  fallbackPrice: number,
  fallbackCurrency: string
) {
  if (variants.length === 0) {
    return {
      amount: fallbackPrice,
      currency: fallbackCurrency,
      hasVariants: false,
    };
  }

  const lowestVariant =
    variants.reduce(
      (lowest, variant) => {
        return variant.price <
          lowest.price
          ? variant
          : lowest;
      },
      variants[0]
    );

  return {
    amount: lowestVariant.price,
    currency:
      lowestVariant.currency ||
      fallbackCurrency,
    hasVariants: true,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  const item =
    await getMarketplaceItemBySlug(
      slug
    );

  if (!item) {
    notFound();
  }

  const collectionSlug =
    getCollectionSlug(item.category);

  const fallbackSpecifications: SpecificationItem[] =
    item.type === "PRODUCT"
      ? [
          {
            label: "Category",
            value: item.category,
          },
          {
            label: "Vendor",
            value: item.vendor,
          },
          {
            label: "Stock",
            value:
              typeof item.stock ===
              "number"
                ? `${item.stock} available`
                : "Available",
          },
          {
            label: "Currency",
            value: item.currency,
          },
        ]
      : [
          {
            label: "Category",
            value: item.category,
          },
          {
            label: "Vendor",
            value: item.vendor,
          },
          {
            label: "Duration",
            value:
              typeof item.duration ===
                "number" &&
              item.duration > 0
                ? `${item.duration} minutes`
                : "Duration depends on selected slot",
          },
          {
            label: "Currency",
            value: item.currency,
          },
        ];

  const specifications =
    parseSpecifications(
      item.specifications,
      fallbackSpecifications
    );

  const specificationImage =
    item.specificationImage || null;

  const aboutBrandImage =
    item.brandImage ||
    item.images?.[1] ||
    item.images?.[0] ||
    null;

  const exchangeRefundText =
    getExchangeRefundText(item);

  const productOptions =
    item.options || [];

  const productVariants =
    item.variants || [];

  const productDisplayPrice =
    getMinimumVariantPrice(
      productVariants,
      Number(item.price),
      item.currency
    );

  const reviews =
    await prisma.review.findMany({
      where:
        item.type === "PRODUCT"
          ? {
              productId: item.id,
            }
          : {
              serviceId: item.id,
            },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    });

  const formattedReviews =
    reviews.map((review) => ({
      id: review.id,
      customerName:
        review.customer.name,
      rating: review.rating,
      comment: review.comment,
      createdAt: formatDate(
        review.createdAt
      ),
    }));

  const serviceSlots =
    item.type === "SERVICE"
      ? await prisma.appointmentSlot.findMany(
          {
            where: {
              serviceId: item.id,
              isActive: true,
              date: {
                gte: getTodayDateOnly(),
              },
            },
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              durationMinutes: true,
              capacity: true,
              bookedCount: true,
              note: true,
            },
            orderBy: [
              {
                date: "asc",
              },
              {
                startTime: "asc",
              },
            ],
            take: 30,
          }
        )
      : [];

  const availableSlots =
    serviceSlots
      .filter(
        (slot) =>
          slot.bookedCount <
          slot.capacity
      )
      .map((slot) => ({
        id: slot.id,
        date: slot.date.toISOString(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes:
          slot.durationMinutes,
        capacity: slot.capacity,
        bookedCount:
          slot.bookedCount,
        note: slot.note,
      }));

  return (
    <DetailPageLayout
      stickyRight
      breadcrumbs={
        <DetailBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            {
              label: item.category,
              href: `/collections/${collectionSlug}`,
            },
            { label: item.title },
          ]}
        />
      }
      left={
        <>
          <DetailImageGallery
            images={item.images}
            title={item.title}
          />

          <DetailTrustCards
            paymentSecurity={{
              methods: [
                "AMEX",
                "Apple Pay",
                "Diners",
                "Discover",
                "G Pay",
                "JCB",
                "Mastercard",
                "PayPal",
                "VISA",
              ],
              description:
                "Your payment information is processed securely. We do not store credit card details nor have access to your credit card information.",
            }}
            cards={[
              {
                title: "Secure Checkout",
                description: "Orders and bookings are processed safely.",
              },
              {
                title: "Vendor Managed",
                description: "Fulfilled by approved marketplace vendor.",
              },
            ]}
          />
        </>
      }
      right={
        <>
          <h1 className="font-heading text-4xl leading-tight text-gray-950 md:text-5xl">
            {item.title}
          </h1>


          <DetailPriceSection
            prefix={productDisplayPrice.hasVariants ? "Starting from" : undefined}
            currency={productDisplayPrice.currency}
            amount={productDisplayPrice.amount}
          >
            {item.type === "PRODUCT" ? (
              <p className="mt-2 text-sm text-gray-500">
                {item.stock && item.stock > 0
                  ? `${item.stock} item(s) available`
                  : "Stock availability depends on vendor confirmation"}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                {typeof item.duration === "number" && item.duration > 0
                  ? `${item.duration} minutes duration`
                  : "Select an available slot to continue booking"}
              </p>
            )}
          </DetailPriceSection>

          {item.type === "PRODUCT" ? (
            <ProductDetailAccordions
              productId={item.id}
              description={item.description}
              vendorName={item.vendor}
              vendorSlug={item.vendorSlug}
              vendorDescription={item.vendorDescription}
              stock={item.stock ?? 0}
              basePrice={Number(item.price)}
              baseCurrency={item.currency}
              options={productOptions}
              variants={productVariants}
            />
          ) : (
            <ServiceDetailAccordions
              serviceId={item.id}
              serviceTitle={item.title}
              description={item.description}
              vendorName={item.vendor}
              vendorSlug={item.vendorSlug}
              vendorDescription={item.vendorDescription}
              price={Number(item.price)}
              currency={item.currency}
              slots={availableSlots}
            />
          )}
        </>
      }
      bottom={
        <DetailInfoTabs
          specifications={specifications}
          specificationImage={specificationImage}
          exchangeRefundTitle="Our Returns"
          exchangeRefundText={exchangeRefundText}
          reviews={formattedReviews}
          aboutBrandImage={aboutBrandImage}
        />
      }
    />
  );
}