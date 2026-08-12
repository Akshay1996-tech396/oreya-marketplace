import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function formatCreatedDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSlotStatusClass(isActive: boolean, capacity: number, bookedCount: number) {
  if (!isActive) {
    return "bg-red-50 text-red-700";
  }

  if (bookedCount >= capacity) {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-green-50 text-green-700";
}

function getSlotStatusText(isActive: boolean, capacity: number, bookedCount: number) {
  if (!isActive) {
    return "Inactive";
  }

  if (bookedCount >= capacity) {
    return "Full";
  }

  return "Available";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function VendorSlotsPage() {
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

  const slots = await prisma.appointmentSlot.findMany({
    where: {
      vendorId: vendor.id,
    },
    include: {
      service: {
        select: {
          title: true,
          slug: true,
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
    orderBy: [
      {
        date: "desc",
      },
      {
        startTime: "asc",
      },
    ],
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Appointment Slots
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage real appointment slots created by {vendor.businessName}.
          </p>
        </div>

        <Link
          href="/vendor/slots/new"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Add Slot
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Slots List
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total: {slots.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Slot
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Service
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Date
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Time
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Capacity
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Booked
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Booking Records
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
              {slots.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No appointment slots found.
                  </td>
                </tr>
              ) : (
                slots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {slot.id.slice(0, 12)}...
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Slot ID
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {slot.service.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {slot.service.slug}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(slot.date)}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {slot.startTime} - {slot.endTime}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {slot.capacity}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {slot.bookedCount}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {slot._count.bookings}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlotStatusClass(
                          slot.isActive,
                          slot.capacity,
                          slot.bookedCount
                        )}`}
                      >
                        {getSlotStatusText(
                          slot.isActive,
                          slot.capacity,
                          slot.bookedCount
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatCreatedDate(slot.createdAt)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/vendor/slots/${slot.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View
                        </Link>

                        <Link
                          href={`/vendor/slots/${slot.id}/edit`}
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