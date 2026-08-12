import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminAppointmentStatusManager from "@/components/admin/AdminAppointmentStatusManager";

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

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusClass(status: string) {
  if (
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "PAID" ||
    status === "ACTIVE" ||
    status === "APPROVED"
  ) {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-300";
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "INACTIVE" ||
    status === "SUSPENDED"
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300";
  }

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300";
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

export default async function AdminAppointmentDetailPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: {
      id,
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
      vendor: {
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
      slot: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          capacity: true,
          bookedCount: true,
          isActive: true,
          note: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          transactionId: true,
          provider: true,
          createdAt: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const ownerName = booking.vendor?.businessName || "Admin Service";
  const ownerEmail = booking.vendor?.user.email || "Owned by administrator";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/appointments"
            className="mb-3 inline-flex text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Back to Appointments
          </Link>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Appointment Details
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and manage the complete booking information for{" "}
            {booking.service.title}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
              booking.status
            )}`}
          >
            {formatStatus(booking.status)}
          </span>

          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
              booking.paymentStatus
            )}`}
          >
            Payment: {formatStatus(booking.paymentStatus)}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <AdminAppointmentStatusManager
          bookingId={booking.id}
          currentStatus={booking.status}
          currentPaymentStatus={booking.paymentStatus}
          currentNote={booking.vendorNote}
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Booking Summary
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Core appointment and payment information.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Booking ID" value={booking.id} />
            <DetailItem
              label="Service"
              value={
                <div>
                  <p>{booking.service.title}</p>
                  <p className="mt-1 text-xs font-normal text-gray-500">
                    {booking.service.slug}
                  </p>
                </div>
              }
            />
            <DetailItem
              label="Appointment Date"
              value={formatDate(booking.bookingDate)}
            />
            <DetailItem
              label="Appointment Time"
              value={`${booking.startTime} - ${booking.endTime}`}
            />
            <DetailItem
              label="Duration"
              value={
                booking.durationMinutes
                  ? `${booking.durationMinutes} minutes`
                  : "Not specified"
              }
            />
            <DetailItem
              label="Amount"
              value={formatMoney(booking.currency, booking.amount)}
            />
            <DetailItem
              label="Booking Status"
              value={formatStatus(booking.status)}
            />
            <DetailItem
              label="Payment Status"
              value={formatStatus(booking.paymentStatus)}
            />
            <DetailItem
              label="Created"
              value={formatDateTime(booking.createdAt)}
            />
            <DetailItem
              label="Last Updated"
              value={formatDateTime(booking.updatedAt)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Customer Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Contact information for the customer who created this booking.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Customer Name" value={booking.customer.name} />
            <DetailItem
              label="Email Address"
              value={
                <a
                  href={`mailto:${booking.customer.email}`}
                  className="text-brand-500 hover:underline"
                >
                  {booking.customer.email}
                </a>
              }
            />
            <DetailItem
              label="Phone Number"
              value={
                booking.customer.phone ? (
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="text-brand-500 hover:underline"
                  >
                    {booking.customer.phone}
                  </a>
                ) : (
                  "Not provided"
                )
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Appointment Slot
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Availability and capacity information for the selected slot.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Slot ID" value={booking.slot.id} />
            <DetailItem
              label="Slot Date"
              value={formatDate(booking.slot.date)}
            />
            <DetailItem
              label="Slot Time"
              value={`${booking.slot.startTime} - ${booking.slot.endTime}`}
            />
            <DetailItem
              label="Slot Duration"
              value={
                booking.slot.durationMinutes
                  ? `${booking.slot.durationMinutes} minutes`
                  : "Not specified"
              }
            />
            <DetailItem
              label="Capacity"
              value={`${booking.slot.bookedCount} of ${booking.slot.capacity} booked`}
            />
            <DetailItem
              label="Slot Status"
              value={booking.slot.isActive ? "Active" : "Inactive"}
            />
          </div>

          {booking.slot.note ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Slot Note
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                {booking.slot.note}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Vendor Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Information about the vendor responsible for this appointment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Vendor Name" value={ownerName} />
            <DetailItem label="Vendor Email" value={ownerEmail} />
            <DetailItem
              label="Vendor Status"
              value={
                booking.vendor
                  ? formatStatus(booking.vendor.status)
                  : "Administrator owned"
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Notes
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Customer instructions, internal notes, and cancellation details.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailItem label="Customer Note" value={booking.customerNote} />
            <DetailItem label="Internal Note" value={booking.vendorNote} />
            <DetailItem
              label="Cancellation Reason"
              value={booking.cancelReason}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Payment Information
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Payment record associated with this appointment.
            </p>
          </div>

          {booking.payment ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailItem label="Payment ID" value={booking.payment.id} />
              <DetailItem
                label="Amount"
                value={formatMoney(
                  booking.payment.currency,
                  booking.payment.amount
                )}
              />
              <DetailItem label="Method" value={booking.payment.method} />
              <DetailItem
                label="Status"
                value={formatStatus(booking.payment.status)}
              />
              <DetailItem
                label="Provider"
                value={booking.payment.provider}
              />
              <DetailItem
                label="Transaction ID"
                value={booking.payment.transactionId}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              No payment record has been created for this appointment yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}