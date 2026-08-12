import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faBoxOpen,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const vendorOrdersInclude = {
  payment: true,
  customer: {
    select: {
      name: true,
      email: true,
    },
  },
  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          images: true,
          vendorId: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          vendorId: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type VendorOrder = Prisma.OrderGetPayload<{
  include: typeof vendorOrdersInclude;
}>;

type VendorOrderItem = VendorOrder["items"][number];

type VendorOrderItemWithVariation = VendorOrderItem & {
  variantTitle?: string | null;
  variantImage?: string | null;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatAmount(currency: string, amount: unknown) {
  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${numericAmount.toFixed(2)}`;
}

function getPaymentStatusClass(status: string) {
  if (status === "PAID") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400";
}

function getItemTitle(item: VendorOrderItem) {
  return (
    item.title ||
    item.product?.title ||
    item.service?.title ||
    "Order Item"
  );
}

function getItemImage(item: VendorOrderItemWithVariation) {
  if (item.variantImage) {
    return item.variantImage;
  }

  if (item.product?.images?.[0]) {
    return item.product.images[0];
  }

  return null;
}

function getVendorItems(
  order: VendorOrder,
  vendorId: string
) {
  return order.items.filter((item) => {
    return (
      item.product?.vendorId === vendorId ||
      item.service?.vendorId === vendorId
    );
  });
}

export default async function VendorOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          OR: [
            {
              product: {
                is: {
                  vendorId: vendor.id,
                },
              },
            },
            {
              service: {
                is: {
                  vendorId: vendor.id,
                },
              },
            },
          ],
        },
      },
    },
    include: vendorOrdersInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  const vendorOrders = orders
    .map((order) => {
      const vendorItems = getVendorItems(
        order,
        vendor.id
      );

      const quantity = vendorItems.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      );

      const amount = vendorItems.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 0),
        0
      );

      return {
        order,
        vendorItems,
        quantity,
        amount,
      };
    })
    .filter(
      ({ vendorItems }) =>
        vendorItems.length > 0
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Vendor Orders
        </p>

        <h1 className="mt-2 font-heading text-2xl text-gray-900 dark:text-white">
          Orders
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Review orders containing products or
          services assigned to{" "}
          {vendor.businessName}.
        </p>
      </div>

      {vendorOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
          <FontAwesomeIcon
            icon={faBoxOpen}
            className="mx-auto h-12 w-12 text-gray-400"
          />

          <h2 className="mt-5 font-heading text-xl text-gray-900 dark:text-white">
            No Assigned Orders
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500 dark:text-gray-400">
            Customer orders containing your
            products or services will appear
            here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Order ID
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Item
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Customer Name and Email
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Quantity
                  </th>

                  <th className="px-5 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Payment Status
                  </th>

                  <th className="px-5 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vendorOrders.map(
                  ({
                    order,
                    vendorItems,
                    quantity,
                    amount,
                  }) => {
                    const firstItem =
                      vendorItems[0] as VendorOrderItemWithVariation;

                    const firstItemTitle =
                      getItemTitle(firstItem);

                    const firstItemImage =
                      getItemImage(firstItem);

                    const remainingItems =
                      vendorItems.length - 1;

                    const paymentStatus = String(
                      order.paymentStatus
                    );

                    return (
                      <tr
                        key={order.id}
                        className="align-middle transition hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-5">
                          <p className="max-w-[210px] break-all text-sm font-semibold text-gray-900 dark:text-white">
                            #{order.id}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex min-w-[260px] items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                              {firstItemImage ? (
                                <img
                                  src={
                                    firstItemImage
                                  }
                                  alt={
                                    firstItemTitle
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <FontAwesomeIcon
                                    icon={
                                      faBagShopping
                                    }
                                    className="h-4 w-4"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                                {firstItemTitle}
                              </p>

                              {firstItem.variantTitle ? (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Variation:{" "}
                                  {
                                    firstItem.variantTitle
                                  }
                                </p>
                              ) : null}

                              {remainingItems > 0 ? (
                                <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                  +{remainingItems} more
                                  item
                                  {remainingItems === 1
                                    ? ""
                                    : "s"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="min-w-[220px]">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {order.customer
                                .name ||
                                "Customer"}
                            </p>

                            <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
                              {
                                order.customer
                                  .email
                              }
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5 text-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {quantity}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatAmount(
                              order.currency,
                              amount
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getPaymentStatusClass(
                              paymentStatus
                            )}`}
                          >
                            {formatStatus(
                              paymentStatus
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right">
                          <Link
                            href={`/vendor/orders/${order.id}`}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                          >
                            View Order Detail
                            <FontAwesomeIcon
                              icon={
                                faChevronRight
                              }
                              className="h-3 w-3"
                            />
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}