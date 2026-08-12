import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
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
    status === "ACTIVE" ||
    status === "APPROVED" ||
    status === "OPEN" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "PAID"
  ) {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  if (
    status === "INACTIVE" ||
    status === "REJECTED" ||
    status === "SUSPENDED" ||
    status === "FULL" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  ) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <div className="mt-2 break-words text-sm font-medium text-gray-900 dark:text-white">
        {value || "Not provided"}
      </div>
    </div>
  );
}

export default async function AdminSlotDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;

  const slot = await prisma.appointmentSlot.findUnique({
    where: {
      id,
    },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          status: true,
          user: { select: { email: true } },
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          duration: true,
          price: true,
          currency: true,
        },
      },
      bookings: {
        select: {
          id: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          amount: true,
          currency: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!slot) {
    notFound();
  }

  const isFull = slot.bookedCount >= slot.capacity;
  const remainingCapacity = Math.max(slot.capacity - slot.bookedCount, 0);
  const slotStatus = !slot.isActive ? "INACTIVE" : isFull ? "FULL" : "OPEN";

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Appointment Slot Details
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Review the service, schedule, capacity, availability, and booking
              records for this appointment slot.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/slots"
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Back to Slots
            </Link>

            <Link
              href={`/admin/slots/${slot.id}/edit`}
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Edit Slot
            </Link>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Slot Status
            </p>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
                slotStatus
              )}`}
            >
              {slotStatus}
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Capacity
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {slot.capacity}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Booked
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {slot.bookedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remaining
            </p>

            <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {remainingCapacity}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Slot Information
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Date, time, duration, capacity, and availability details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Slot ID" value={slot.id} />
              <DetailItem label="Date" value={formatDate(slot.date)} />
              <DetailItem label="Start Time" value={slot.startTime} />
              <DetailItem label="End Time" value={slot.endTime} />
              <DetailItem
                label="Duration"
                value={
                  slot.durationMinutes
                    ? `${slot.durationMinutes} minutes`
                    : "Not specified"
                }
              />
              <DetailItem
                label="Availability"
                value={slot.isActive ? "Active" : "Inactive"}
              />
              <DetailItem
                label="Capacity"
                value={`${slot.bookedCount} of ${slot.capacity} booked`}
              />
              <DetailItem
                label="Booking Records"
                value={slot._count.bookings}
              />
              <DetailItem
                label="Created"
                value={formatDateTime(slot.createdAt)}
              />
              <DetailItem
                label="Last Updated"
                value={formatDateTime(slot.updatedAt)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Service Information
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Information about the service connected to this slot.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Service Name" value={slot.service.title} />
              <DetailItem label="Service Slug" value={slot.service.slug} />
              <DetailItem
                label="Service Status"
                value={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                      slot.service.status
                    )}`}
                  >
                    {slot.service.status}
                  </span>
                }
              />
              <DetailItem
                label="Service Duration"
                value={
                  slot.service.duration
                    ? `${slot.service.duration} minutes`
                    : "Not specified"
                }
              />
              <DetailItem
                label="Service Price"
                value={formatMoney(
                  slot.service.currency,
                  slot.service.price
                )}
              />
              <DetailItem label="Owner" value={slot.vendor?.businessName || "Admin Service"} />
              <DetailItem label="Owner Email" value={slot.vendor?.user.email || "Owned by administrator"} />
              <DetailItem
                label="Vendor Status"
                value={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                      slot.vendor?.status || "ACTIVE"
                    )}`}
                  >
                    {slot.vendor ? slot.vendor.status : "ADMIN-OWNED"}
                  </span>
                }
              />
            </div>
          </section>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Slot Note
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Additional information saved for this appointment slot.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {slot.note || "No note has been added for this appointment slot."}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Booking Records
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Customer bookings associated with this appointment slot.
            </p>
          </div>

          {slot.bookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No booking records were found for this slot.
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
                      Date &amp; Time
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {slot.bookings.map((booking) => (
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
                          {formatDate(booking.bookingDate)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Created: {formatDateTime(booking.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top text-sm font-medium text-gray-900 dark:text-white">
                        {formatMoney(booking.currency, booking.amount)}
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
                        <Link
                          href={`/admin/appointments/${booking.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View Appointment
                        </Link>
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