import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

function getStatusClass(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "REJECTED" || status === "SUSPENDED" || status === "INACTIVE") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function VendorsReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const vendors = await prisma.vendorProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      products: {
        include: {
          orderItems: {
            include: {
              order: {
                select: {
                  id: true,
                  paymentStatus: true,
                },
              },
            },
          },
        },
      },
      services: {
        include: {
          orderItems: {
            include: {
              order: {
                select: {
                  id: true,
                  paymentStatus: true,
                },
              },
            },
          },
          bookings: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              amount: true,
              currency: true,
            },
          },
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
      _count: {
        select: {
          products: true,
          services: true,
          bookings: true,
          reviews: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const approvedVendors = vendors.filter(
    (vendor) => vendor.status === "APPROVED"
  ).length;

  const pendingVendors = vendors.filter(
    (vendor) => vendor.status === "PENDING"
  ).length;

  const rejectedVendors = vendors.filter(
    (vendor) => vendor.status === "REJECTED"
  ).length;

  const totalProducts = vendors.reduce(
    (sum, vendor) => sum + vendor._count.products,
    0
  );

  const totalServices = vendors.reduce(
    (sum, vendor) => sum + vendor._count.services,
    0
  );

  const vendorRows = vendors.map((vendor) => {
    const productOrderItems = vendor.products.flatMap(
      (product) => product.orderItems
    );

    const serviceOrderItems = vendor.services.flatMap(
      (service) => service.orderItems
    );

    const allOrderItems = [...productOrderItems, ...serviceOrderItems];

    const paidOrderItems = allOrderItems.filter(
      (item) => item.order.paymentStatus === "PAID"
    );

    const uniquePaidOrderIds = Array.from(
      new Set(paidOrderItems.map((item) => item.order.id))
    );

    const productSales = productOrderItems
      .filter((item) => item.order.paymentStatus === "PAID")
      .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    const serviceSales = serviceOrderItems
      .filter((item) => item.order.paymentStatus === "PAID")
      .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    const paidBookingSales = vendor.services
      .flatMap((service) => service.bookings)
      .filter((booking) => booking.paymentStatus === "PAID")
      .reduce((sum, booking) => sum + Number(booking.amount), 0);

    const totalSales = productSales + serviceSales + paidBookingSales;

    const averageRating =
      vendor.reviews.length > 0
        ? vendor.reviews.reduce((sum, review) => sum + review.rating, 0) /
          vendor.reviews.length
        : 0;

    return {
      vendor,
      paidOrders: uniquePaidOrderIds.length,
      totalSales,
      averageRating,
    };
  });

  const totalVendorSales = vendorRows.reduce(
    (sum, row) => sum + row.totalSales,
    0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
          Vendors Report
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real vendor performance report based on products, services, orders,
          bookings and reviews.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {vendors.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Approved</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {approvedVendors}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Pending</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {pendingVendors}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Rejected</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {rejectedVendors}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Listings</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {totalProducts + totalServices}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">Vendor Sales</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            AED {totalVendorSales.toFixed(2)}
          </h2>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Vendors Report
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Products: {totalProducts} | Services: {totalServices}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Vendor
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Products
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Services
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Bookings
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Paid Orders
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Sales
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Reviews
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Avg Rating
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Status
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Joined
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {vendorRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendorRows.map((row) => (
                  <tr
                    key={row.vendor.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.vendor.businessName}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {row.vendor.user.email}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.vendor._count.products}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.vendor._count.services}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.vendor._count.bookings}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.paidOrders}
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatMoney("AED", row.totalSales)}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.vendor._count.reviews}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {row.averageRating.toFixed(1)} / 5
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          row.vendor.status
                        )}`}
                      >
                        {row.vendor.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDate(row.vendor.createdAt)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <Link
                        href="/admin/vendors"
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}