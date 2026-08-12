import Link from "next/link";
import { redirect } from "next/navigation";
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
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

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
    status === "PAID"
  ) {
    return [
      "border-green-200",
      "bg-green-50",
      "text-green-700",
      "dark:border-green-900/50",
      "dark:bg-green-950/30",
      "dark:text-green-300",
    ].join(" ");
  }

  if (status === "PENDING") {
    return [
      "border-yellow-200",
      "bg-yellow-50",
      "text-yellow-700",
      "dark:border-yellow-900/50",
      "dark:bg-yellow-950/30",
      "dark:text-yellow-300",
    ].join(" ");
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  ) {
    return [
      "border-red-200",
      "bg-red-50",
      "text-red-700",
      "dark:border-red-900/50",
      "dark:bg-red-950/30",
      "dark:text-red-300",
    ].join(" ");
  }

  return [
    "border-gray-200",
    "bg-gray-50",
    "text-gray-700",
    "dark:border-gray-800",
    "dark:bg-gray-900",
    "dark:text-gray-300",
  ].join(" ");
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

export default async function VendorAppointmentDetailPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;

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

  const appointment = await prisma.booking.findFirst({
    where: {
      id,
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
    },
  });

  if (!appointment) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
          Appointment Not Found
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          This appointment does not exist or does not belong to your vendor
          account.
        </p>

        <Link
          href="/vendor/appointments"
          className="mt-5 inline-flex rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Back to Appointments
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/vendor/appointments"
            className="mb-3 inline-flex text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Back to Appointments
          </Link>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Appointment Details
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review the complete booking information for {appointment.service.title}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
              appointment.status
            )}`}
          >
            {formatStatus(appointment.status)}
          </span>

          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
              appointment.paymentStatus
            )}`}
          >
            Payment: {formatStatus(appointment.paymentStatus)}
          </span>

          <Link
            href={`/vendor/appointments/${appointment.id}/edit`}
            className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Manage Appointment
          </Link>
        </div>
      </div>

      <div className="space-y-6">
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
            <DetailItem label="Booking ID" value={appointment.id} />

            <DetailItem
              label="Service"
              value={
                <div>
                  <p>{appointment.service.title}</p>
                  <p className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                    {appointment.service.slug}
                  </p>
                </div>
              }
            />

            <DetailItem
              label="Appointment Date"
              value={formatDate(appointment.bookingDate)}
            />

            <DetailItem
              label="Appointment Time"
              value={`${appointment.startTime} - ${appointment.endTime}`}
            />

            <DetailItem
              label="Duration"
              value={
                appointment.durationMinutes
                  ? `${appointment.durationMinutes} minutes`
                  : "Not specified"
              }
            />

            <DetailItem
              label="Amount"
              value={formatMoney(appointment.currency, appointment.amount)}
            />

            <DetailItem
              label="Booking Status"
              value={formatStatus(appointment.status)}
            />

            <DetailItem
              label="Payment Status"
              value={formatStatus(appointment.paymentStatus)}
            />

            <DetailItem
              label="Created"
              value={formatDateTime(appointment.createdAt)}
            />

            <DetailItem
              label="Last Updated"
              value={formatDateTime(appointment.updatedAt)}
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
            <DetailItem label="Customer Name" value={appointment.customer.name} />

            <DetailItem
              label="Email Address"
              value={
                <a
                  href={`mailto:${appointment.customer.email}`}
                  className="text-brand-500 hover:underline"
                >
                  {appointment.customer.email}
                </a>
              }
            />

            <DetailItem
              label="Phone Number"
              value={
                appointment.customer.phone ? (
                  <a
                    href={`tel:${appointment.customer.phone}`}
                    className="text-brand-500 hover:underline"
                  >
                    {appointment.customer.phone}
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
            <DetailItem label="Slot ID" value={appointment.slot.id} />

            <DetailItem
              label="Slot Date"
              value={formatDate(appointment.slot.date)}
            />

            <DetailItem
              label="Slot Time"
              value={`${appointment.slot.startTime} - ${appointment.slot.endTime}`}
            />

            <DetailItem
              label="Slot Duration"
              value={
                appointment.slot.durationMinutes
                  ? `${appointment.slot.durationMinutes} minutes`
                  : "Not specified"
              }
            />

            <DetailItem
              label="Capacity"
              value={`${appointment.slot.bookedCount} of ${appointment.slot.capacity} booked`}
            />

            <DetailItem
              label="Slot Status"
              value={appointment.slot.isActive ? "Active" : "Inactive"}
            />
          </div>

          {appointment.slot.note ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Slot Note
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                {appointment.slot.note}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Notes
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Customer instructions, vendor notes, and cancellation details.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailItem label="Customer Note" value={appointment.customerNote} />
            <DetailItem label="Vendor Note" value={appointment.vendorNote} />
            <DetailItem
              label="Cancellation Reason"
              value={appointment.cancelReason}
            />
          </div>
        </section>
      </div>
    </div>
  );
}