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

function formatMoney(currency: string, amount: unknown) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function getStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-green-50 text-green-700";
  }

  if (status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "INACTIVE") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function VendorServicesPage() {
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
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const services = await prisma.service.findMany({
    where: {
      vendorId: vendor.id,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          bookings: true,
          orderItems: true,
          reviews: true,
          slots: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            My Services
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage real services added by {vendor.businessName}.
          </p>
        </div>

        <Link
          href="/vendor/services/new"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Add Service
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Services List
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total: {services.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Service
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Duration
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Slots
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Bookings
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Orders
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Reviews
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No services found.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {service.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {service.slug}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service.category?.name || "N/A"}
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(service.currency, service.price)}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service.duration ? `${service.duration} min` : "N/A"}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service._count.slots}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service._count.bookings}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service._count.orderItems}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {service._count.reviews}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          service.status
                        )}`}
                      >
                        {service.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDate(service.createdAt)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/vendor/services/${service.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View
                        </Link>

                        <Link
                          href={`/vendor/services/${service.id}/edit`}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          Edit
                        </Link>
                      </div>
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