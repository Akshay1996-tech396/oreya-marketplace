import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(currency: string, amount: unknown) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function getStatusClass(status: string) {
  if (
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "PAID" ||
    status === "ACTIVE" ||
    status === "APPROVED"
  ) {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "INACTIVE" ||
    status === "SUSPENDED"
  ) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default async function VendorAppointmentsPage() {
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
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const bookings = await prisma.booking.findMany({
    where: {
      vendorId: vendor.id,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          price: true,
          currency: true,
        },
      },
      slot: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          capacity: true,
          bookedCount: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING"
  ).length;
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  ).length;
  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED"
  ).length;

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Vendor Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Appointments
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Manage customer appointment bookings received by{" "}
              {vendor.businessName}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/vendor/slots"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Manage Slots
            </Link>

            <Link
              href="/vendor/dashboard"
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Appointments
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {totalBookings}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {pendingBookings}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Confirmed
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {confirmedBookings}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completed
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {completedBookings}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Appointment Bookings
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review customer, service, vendor, date, booking status, and
              payment status.
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No appointment bookings found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Service
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Vendor
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Date &amp; Time
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {booking.customer.email}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {booking.customer.phone || "No phone number"}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.service.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {booking.service.slug}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              booking.service.status
                            )}`}
                          >
                            {booking.service.status}
                          </span>

                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {formatMoney(
                              booking.currency,
                              booking.amount
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {vendor.businessName}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {vendor.user.email}
                        </p>

                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            vendor.status
                          )}`}
                        >
                          Vendor: {vendor.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(booking.bookingDate)}
                        </p>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {booking.startTime} - {booking.endTime}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Created: {formatDateTime(booking.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              booking.paymentStatus
                            )}`}
                          >
                            Payment: {booking.paymentStatus}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/vendor/appointments/${booking.id}`}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                          >
                            View
                          </Link>

                          <Link
                            href={`/vendor/appointments/${booking.id}/edit`}
                            className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-300"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}