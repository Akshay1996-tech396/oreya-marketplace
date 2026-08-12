import { NextResponse } from "next/server";
import {
  DeliveryTimePeriod,
  PaymentPurpose,
  Prisma,
} from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { createCheckoutKey } from "@/lib/payments/checkout-data";
import {
  buildProductOrderCheckoutData,
} from "@/lib/payments/product-order-payment";
import { createOnlinePaymentSession } from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { prisma } from "@/lib/prisma";

type ProductVariantSnapshot = {
  variantId: string | null;
  variantTitle: string | null;
  variantSku: string | null;
  variantOptions: Prisma.InputJsonValue | null;
  variantImage: string | null;
};

type OrderItemCreateData =
  ProductVariantSnapshot & {
    cartItemId: string;
    productId: string | null;
    serviceId: string | null;
    title: string;
    price: number;
    quantity: number;
    currency: string;
  };

type ProductStockUpdate = {
  productId: string;
  quantity: number;
  remainingStock: number;
};

type VariantStockUpdate = {
  variantId: string;
  quantity: number;
  remainingStock: number;
};

type PaymentMethodValue =
  | "CARD"
  | "CASH_ON_DELIVERY";

const DEFAULT_PRODUCT_DELIVERY_PREPARATION_HOURS =
  24;

const DEFAULT_PRODUCT_DELIVERY_PREPARATION_SETTING_KEY =
  "defaultProductDeliveryPreparationHours";

const MARKETPLACE_TIME_ZONE =
  process.env.MARKETPLACE_TIME_ZONE ||
  "Asia/Dubai";

type PlaceOrderBody = {
  paymentMethod?: string;

  deliveryFullName?: string;
  deliveryPhone?: string;
  deliveryEmail?: string;

  deliveryAddress?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryCountry?: string;
  deliveryState?: string;
  deliveryCity?: string;
  deliveryArea?: string;
  deliveryZipCode?: string;

  deliveryLatitude?: string;
  deliveryLongitude?: string;

  deliveryNote?: string;

  isRequestedDeliveryDateEnabled?:
    | boolean
    | string;

  requestedDeliveryDate?: string;
  requestedDeliveryTimePeriod?: string;
  deliveryLeadTimeHours?:
    | string
    | number;
};

function getPaymentMethod(
  value: unknown
): PaymentMethodValue | null {
  const method = String(
    value || "CASH_ON_DELIVERY"
  ).toUpperCase();

  if (method === "CARD") {
    return "CARD";
  }

  if (method === "CASH_ON_DELIVERY") {
    return "CASH_ON_DELIVERY";
  }

  return null;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function getNumber(
  value: unknown,
  fallback = 0
) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function parseCoordinate(
  value: unknown,
  type: "latitude" | "longitude"
): Prisma.Decimal | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numberValue = Number(trimmed);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  if (
    type === "latitude" &&
    (numberValue < -90 ||
      numberValue > 90)
  ) {
    return null;
  }

  if (
    type === "longitude" &&
    (numberValue < -180 ||
      numberValue > 180)
  ) {
    return null;
  }

  return new Prisma.Decimal(trimmed);
}

function getValidDeliveryPreparationHours(
  value: unknown,
  fallback =
    DEFAULT_PRODUCT_DELIVERY_PREPARATION_HOURS
) {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return fallback;
  }

  return Math.floor(parsedValue);
}

function getBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  return (
    normalizedValue === "true" ||
    normalizedValue === "1" ||
    normalizedValue === "yes" ||
    normalizedValue === "on"
  );
}

function hasTextInput(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseRequestedDeliveryTimePeriod(
  value: unknown
): DeliveryTimePeriod | null {
  const normalizedValue = String(
    value || ""
  )
    .trim()
    .toUpperCase();

  if (
    normalizedValue ===
    DeliveryTimePeriod.MORNING
  ) {
    return DeliveryTimePeriod.MORNING;
  }

  if (
    normalizedValue ===
    DeliveryTimePeriod.AFTERNOON
  ) {
    return DeliveryTimePeriod.AFTERNOON;
  }

  if (
    normalizedValue ===
    DeliveryTimePeriod.EVENING
  ) {
    return DeliveryTimePeriod.EVENING;
  }

  return null;
}

function getVendorDeliveryPreparationHours(
  vendor:
    | {
        deliveryPreparationHours?:
          | number
          | null;
      }
    | null
    | undefined,
  fallbackLeadTimeHours: number
) {
  return getValidDeliveryPreparationHours(
    vendor?.deliveryPreparationHours,
    fallbackLeadTimeHours
  );
}

async function getAdminDefaultDeliveryPreparationHours() {
  const setting =
    await prisma.setting.findUnique({
      where: {
        key: DEFAULT_PRODUCT_DELIVERY_PREPARATION_SETTING_KEY,
      },

      select: {
        value: true,
      },
    });

  return getValidDeliveryPreparationHours(
    setting?.value
  );
}

function parseRequestedDeliveryDate(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      trimmedValue
    )
  ) {
    return null;
  }

  const [year, month, day] =
    trimmedValue.split("-").map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !==
      month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function getDateOnlyInMarketplaceTimeZone(
  value: Date
) {
  const dateParts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: MARKETPLACE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);

  const year = dateParts.find(
    (part) => part.type === "year"
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month"
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate()
      )
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`
  );
}

function getMinimumRequestedDeliveryDate(
  leadTimeHours: number
) {
  const minimumDeliveryInstant =
    new Date(
      Date.now() +
        leadTimeHours *
          60 *
          60 *
          1000
    );

  return getDateOnlyInMarketplaceTimeZone(
    minimumDeliveryInstant
  );
}

function formatDeliveryDateForMessage(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

function parseVariantOptions(
  value: unknown
): Prisma.InputJsonValue | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const parsedOptions: Record<
    string,
    string
  > = {};

  const optionRecord =
    value as Record<string, unknown>;

  Object.entries(optionRecord).forEach(
    ([key, optionValue]) => {
      const optionName = String(
        key || ""
      ).trim();

      const selectedValue = String(
        optionValue || ""
      ).trim();

      if (
        !optionName ||
        !selectedValue
      ) {
        return;
      }

      parsedOptions[optionName] =
        selectedValue;
    }
  );

  if (
    Object.keys(parsedOptions).length ===
    0
  ) {
    return null;
  }

  return parsedOptions as Prisma.InputJsonValue;
}

function buildOrderItemCreatePayload(
  item: OrderItemCreateData
) {
  return {
    productId: item.productId,
    serviceId: item.serviceId,
    title: item.title,
    price: item.price,
    quantity: item.quantity,
    currency: item.currency,

    variantId: item.variantId,
    variantTitle: item.variantTitle,
    variantSku: item.variantSku,
    variantImage: item.variantImage,

    ...(item.variantOptions
      ? {
          variantOptions:
            item.variantOptions,
        }
      : {}),
  };
}

export async function POST(
  request: Request
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only customers can place orders.",
        },
        {
          status: 403,
        }
      );
    }

    let body: PlaceOrderBody = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const paymentMethod =
      getPaymentMethod(
        body.paymentMethod
      );

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid payment method.",
        },
        {
          status: 400,
        }
      );
    }

    const deliveryFullName =
      cleanString(
        body.deliveryFullName
      );

    const deliveryPhone =
      cleanString(body.deliveryPhone);

    const deliveryEmail =
      cleanString(body.deliveryEmail);

    const deliveryAddress =
      cleanString(
        body.deliveryAddress
      );

    const deliveryAddressLine1 =
      cleanString(
        body.deliveryAddressLine1
      );

    const deliveryAddressLine2 =
      cleanString(
        body.deliveryAddressLine2
      );

    const deliveryCountry =
      cleanString(
        body.deliveryCountry
      );

    const deliveryState =
      cleanString(
        body.deliveryState
      );

    const deliveryCity =
      cleanString(body.deliveryCity);

    const deliveryArea =
      cleanString(body.deliveryArea);

    const deliveryZipCode =
      cleanString(
        body.deliveryZipCode
      );

    const deliveryLatitude =
      parseCoordinate(
        body.deliveryLatitude,
        "latitude"
      );

    const deliveryLongitude =
      parseCoordinate(
        body.deliveryLongitude,
        "longitude"
      );

    const deliveryNote =
      cleanString(body.deliveryNote);

    const hasRequestedDeliveryDate =
      hasTextInput(
        body.requestedDeliveryDate
      );

    const hasRequestedDeliveryTimePeriod =
      hasTextInput(
        body.requestedDeliveryTimePeriod
      );

    /*
     * Date or time input also activates
     * server-side schedule validation.
     * This prevents manually modified
     * requests from bypassing validation
     * by submitting the checkbox as false.
     */
    const isRequestedDeliveryScheduleEnabled =
      getBoolean(
        body.isRequestedDeliveryDateEnabled
      ) ||
      hasRequestedDeliveryDate ||
      hasRequestedDeliveryTimePeriod;

    const requestedDeliveryDate =
      isRequestedDeliveryScheduleEnabled
        ? parseRequestedDeliveryDate(
            body.requestedDeliveryDate
          )
        : null;

    const requestedDeliveryTimePeriod =
      isRequestedDeliveryScheduleEnabled
        ? parseRequestedDeliveryTimePeriod(
            body.requestedDeliveryTimePeriod
          )
        : null;

    if (
      isRequestedDeliveryScheduleEnabled &&
      !requestedDeliveryDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid preferred delivery date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      isRequestedDeliveryScheduleEnabled &&
      !requestedDeliveryTimePeriod
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid preferred delivery time period.",
        },
        {
          status: 400,
        }
      );
    }

    if (!deliveryFullName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!deliveryPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Delivery address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!deliveryCity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Delivery city is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * The preparation time submitted by
     * the browser is not trusted. The
     * route recalculates it from the
     * current vendor and admin settings.
     */
    const defaultDeliveryPreparationHours =
      await getAdminDefaultDeliveryPreparationHours();

    const cart =
      await prisma.cart.findUnique({
        where: {
          customerId: user.id,
        },

        include: {
          items: {
            include: {
              product: {
                include: {
                  vendor: true,

                  variants: {
                    where: {
                      isActive: true,
                    },

                    select: {
                      id: true,
                    },
                  },
                },
              },

              service: {
                include: {
                  vendor: true,
                },
              },

              variant: true,
            },
          },
        },
      });

    if (
      !cart ||
      cart.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your cart is empty.",
        },
        {
          status: 400,
        }
      );
    }

    const invalidItems: string[] = [];

    const orderItems: OrderItemCreateData[] =
      [];

    const productStockUpdates: ProductStockUpdate[] =
      [];

    const variantStockUpdates: VariantStockUpdate[] =
      [];

    const deliveryPreparationHoursCandidates: number[] =
      [];

    let subtotal = 0;
    let currency = "";

    for (const cartItem of cart.items) {
      if (cartItem.productId) {
        const product =
          cartItem.product;

        if (!product) {
          invalidItems.push(
            "Product was not found."
          );

          continue;
        }

        if (
          product.vendor &&
          product.vendor.status !==
            "APPROVED"
        ) {
          invalidItems.push(
            `${product.title} - vendor is not approved.`
          );

          continue;
        }

        deliveryPreparationHoursCandidates.push(
          getVendorDeliveryPreparationHours(
            product.vendor,
            defaultDeliveryPreparationHours
          )
        );

        if (
          product.status !== "ACTIVE"
        ) {
          invalidItems.push(
            `${product.title} - product is not active.`
          );

          continue;
        }

        const productHasVariants =
          product.variants.length > 0;

        if (
          productHasVariants &&
          !cartItem.variant
        ) {
          invalidItems.push(
            `${product.title} - please select a valid product variation.`
          );

          continue;
        }

        if (
          cartItem.variant &&
          cartItem.variant.productId !==
            product.id
        ) {
          invalidItems.push(
            `${product.title} - selected product variation does not belong to this product.`
          );

          continue;
        }

        if (
          cartItem.variant &&
          !cartItem.variant.isActive
        ) {
          invalidItems.push(
            `${product.title} - selected product variation is not active.`
          );

          continue;
        }

        const availableStock =
          cartItem.variant
            ? cartItem.variant.stock
            : product.stock;

        if (availableStock <= 0) {
          invalidItems.push(
            `${product.title} - out of stock.`
          );

          continue;
        }

        if (
          cartItem.quantity >
          availableStock
        ) {
          invalidItems.push(
            `${product.title} - only ${availableStock} item(s) available for this selection.`
          );

          continue;
        }

        const price =
          cartItem.variant
            ? getNumber(
                cartItem.variant.price
              )
            : getNumber(product.price);

        const selectedCurrency = (
          cartItem.variant?.currency ||
          product.currency ||
          "AED"
        ).toUpperCase();

        if (
          currency &&
          currency !== selectedCurrency
        ) {
          invalidItems.push(
            `${product.title} - all products in one order must use the same currency.`
          );

          continue;
        }

        const itemTotal =
          price * cartItem.quantity;

        subtotal += itemTotal;
        currency = selectedCurrency;

        orderItems.push({
          cartItemId: cartItem.id,
          productId: product.id,
          serviceId: null,

          title: cartItem.variant
            ? `${product.title} - ${cartItem.variant.title}`
            : product.title,

          price,
          quantity: cartItem.quantity,
          currency: selectedCurrency,

          variantId:
            cartItem.variant?.id ||
            null,

          variantTitle:
            cartItem.variant?.title ||
            null,

          variantSku:
            cartItem.variant?.sku ||
            null,

          variantOptions:
            parseVariantOptions(
              cartItem.variant?.options
            ),

          variantImage:
            cartItem.variant?.image ||
            null,
        });

        productStockUpdates.push({
          productId: product.id,
          quantity: cartItem.quantity,

          remainingStock:
            product.stock -
            cartItem.quantity,
        });

        if (cartItem.variant) {
          variantStockUpdates.push({
            variantId:
              cartItem.variant.id,

            quantity:
              cartItem.quantity,

            remainingStock:
              cartItem.variant.stock -
              cartItem.quantity,
          });
        }

        continue;
      }

      if (cartItem.serviceId) {
        const serviceTitle =
          cartItem.service?.title ||
          "Service";

        invalidItems.push(
          `${serviceTitle} - services must be booked through the appointment checkout.`
        );

        continue;
      }

      invalidItems.push(
        "Unsupported cart item found."
      );
    }

    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Some cart items are no longer available. Please update your cart and try again.",

          invalidItems,
        },
        {
          status: 400,
        }
      );
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No valid items were found in the cart.",
        },
        {
          status: 400,
        }
      );
    }

    currency = currency || "AED";

    const deliveryLeadTimeHours =
      deliveryPreparationHoursCandidates.length >
      0
        ? Math.max(
            ...deliveryPreparationHoursCandidates
          )
        : defaultDeliveryPreparationHours;

    const minimumRequestedDeliveryDate =
      getMinimumRequestedDeliveryDate(
        deliveryLeadTimeHours
      );

    if (
      requestedDeliveryDate &&
      requestedDeliveryDate <
        minimumRequestedDeliveryDate
    ) {
      return NextResponse.json(
        {
          success: false,

          message: `Requested delivery date must be ${formatDeliveryDateForMessage(
            minimumRequestedDeliveryDate
          )} or later.`,
        },
        {
          status: 400,
        }
      );
    }

    const shipping = 0;
    const tax = 0;

    const total =
      subtotal + shipping + tax;

    if (paymentMethod === "CARD") {
      const productCheckoutItems =
        orderItems.map((item) => {
          if (!item.productId) {
            throw new Error(
              "Only products can be included in a product order payment."
            );
          }

          return {
            cartItemId: item.cartItemId,
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            currency: item.currency,
            variantTitle: item.variantTitle,
            variantSku: item.variantSku,
            variantOptions: item.variantOptions,
            variantImage: item.variantImage,
          };
        });

      const checkoutData =
        buildProductOrderCheckoutData({
          cartId: cart.id,
          items: productCheckoutItems,
          subtotal,
          shipping,
          tax,
          total,
          currency,
          deliveryFullName,
          deliveryPhone,
          deliveryEmail,
          deliveryAddress,
          deliveryAddressLine1,
          deliveryAddressLine2,
          deliveryCountry,
          deliveryState,
          deliveryCity,
          deliveryArea,
          deliveryZipCode,
          deliveryLatitude,
          deliveryLongitude,
          deliveryNote,
          requestedDeliveryDate,
          requestedDeliveryTimePeriod,
          deliveryLeadTimeHours,
        });

      const checkoutKey =
        createCheckoutKey(
          "PRODUCT_ORDER",
          user.id,
          checkoutData
        );

      const checkoutDigest =
        checkoutKey.split(":").pop() ||
        checkoutKey;

      const requestUrl =
        new URL(request.url);

      const paymentSession =
        await createOnlinePaymentSession(
          stripePaymentProvider,
          {
            customer: {
              id: user.id,
              name: user.name,
              email: user.email,
              billingCountry:
                deliveryCountry,
            },
            purpose:
              PaymentPurpose.PRODUCT_ORDER,
            amount: total,
            currency,
            idempotencyKey:
              `product-${checkoutDigest}`,
            checkoutKey,
            checkoutData,
            reference:
              `OREYA-PRODUCT-${checkoutDigest.slice(
                0,
                24
              )}`,
            description:
              "OREYA Marketplace Product Order",
            successUrl:
              `${requestUrl.origin}/checkout/success?type=product-payment&session_id={CHECKOUT_SESSION_ID}`,
            failureUrl:
              `${requestUrl.origin}/checkout?payment=cancelled`,
            metadata: {
              marketplace_checkout_type:
                "product_order",
            },
          }
        );

      if (!paymentSession.redirectUrl) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stripe did not return a checkout URL. Please try again.",
          },
          {
            status: 502,
          }
        );
      }

      return NextResponse.json({
        success: true,
        requiresOnlinePayment: true,
        paymentId:
          paymentSession.paymentId,
        providerSessionId:
          paymentSession.providerSessionId,
        redirectUrl:
          paymentSession.redirectUrl,
        reused:
          paymentSession.reused,
      });
    }

    const order =
      await prisma.$transaction(
        async (tx) => {
          const createdOrder =
            await tx.order.create({
              data: {
                customerId: user.id,
                subtotal,
                shipping,
                tax,
                total,
                currency,

                status: "PENDING",
                paymentStatus: "PENDING",

                deliveryFullName,
                deliveryPhone,
                deliveryEmail,

                deliveryAddress,
                deliveryAddressLine1,
                deliveryAddressLine2,
                deliveryCountry,
                deliveryState,
                deliveryCity,
                deliveryArea,
                deliveryZipCode,

                deliveryLatitude,
                deliveryLongitude,

                deliveryNote,

                requestedDeliveryDate,
                requestedDeliveryTimePeriod,
                deliveryLeadTimeHours,

                items: {
                  create:
                    orderItems.map(
                      (item) =>
                        buildOrderItemCreatePayload(
                          item
                        )
                    ),
                },
              },
            });

          await tx.payment.create({
            data: {
              customerId: user.id,
              purpose:
                PaymentPurpose.PRODUCT_ORDER,
              orderId:
                createdOrder.id,

              amount: total,
              currency,
              method:
                "CASH_ON_DELIVERY",
              status: "PENDING",

              provider:
                "Cash on Delivery",
              transactionId: null,
            },
          });

          for (const stockUpdate of productStockUpdates) {
            const updated =
              await tx.product.updateMany({
                where: {
                  id: stockUpdate.productId,
                  status: "ACTIVE",
                  stock: {
                    gte:
                      stockUpdate.quantity,
                  },
                },

                data: {
                  stock: {
                    decrement:
                      stockUpdate.quantity,
                  },
                },
              });

            if (updated.count !== 1) {
              throw new Error(
                "One or more products are no longer available in the requested quantity. Please review your cart."
              );
            }
          }

          for (const stockUpdate of variantStockUpdates) {
            const updated =
              await tx.productVariant.updateMany(
                {
                  where: {
                    id:
                      stockUpdate.variantId,
                    isActive: true,
                    stock: {
                      gte:
                        stockUpdate.quantity,
                    },
                  },

                  data: {
                    stock: {
                      decrement:
                        stockUpdate.quantity,
                    },
                  },
                }
              );

            if (updated.count !== 1) {
              throw new Error(
                "One or more product variations are no longer available in the requested quantity. Please review your cart."
              );
            }
          }

          const productIds = [
            ...new Set(
              productStockUpdates.map(
                (stockUpdate) =>
                  stockUpdate.productId
              )
            ),
          ];

          for (const productId of productIds) {
            const currentProduct =
              await tx.product.findUnique({
                where: {
                  id: productId,
                },
                select: {
                  stock: true,
                },
              });

            if (
              currentProduct &&
              currentProduct.stock <= 0
            ) {
              await tx.product.update({
                where: {
                  id: productId,
                },
                data: {
                  status:
                    "OUT_OF_STOCK",
                },
              });
            }
          }

          const variantIds = [
            ...new Set(
              variantStockUpdates.map(
                (stockUpdate) =>
                  stockUpdate.variantId
              )
            ),
          ];

          for (const variantId of variantIds) {
            const currentVariant =
              await tx.productVariant.findUnique(
                {
                  where: {
                    id: variantId,
                  },
                  select: {
                    stock: true,
                  },
                }
              );

            if (
              currentVariant &&
              currentVariant.stock <= 0
            ) {
              await tx.productVariant.update(
                {
                  where: {
                    id: variantId,
                  },
                  data: {
                    isActive: false,
                  },
                }
              );
            }
          }

          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id,
            },
          });

          return createdOrder;
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "Order placed successfully.",
      orderId: order.id,
      requiresOnlinePayment: false,
    });
  } catch (error) {
    console.error(
      "PLACE_ORDER_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to place the order. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}