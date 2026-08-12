import Link from "next/link";
import { redirect } from "next/navigation";

import VendorAppointmentStatusManager from "@/components/vendor/VendorAppointmentStatusManager";
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

export default async function EditVendorAppointmentPage({
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

  const appointment = await prisma.booking.findFirst({
    where: {
      id,
      vendorId: vendor.id,
    },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          title: true,
          slug: true,
          status: true,
          vendorId: true,
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
  });

  if (!appointment) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-screen-2xl">
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
              className="mt-5 inline-flex rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Back to Appointments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const bookingForEdit = {
    id: appointment.id,

    customerName: appointment.customer.name,
    customerEmail: appointment.customer.email,
    customerPhone: appointment.customer.phone,

    vendorId: vendor.id,
    ownerName: vendor.businessName,
    ownerEmail: vendor.user.email,
    ownerStatus: vendor.status,
    ownerType: "VENDOR",

    serviceTitle: appointment.service.title,
    serviceSlug: appointment.service.slug,
    serviceStatus: appointment.service.status,
    serviceVendorId: appointment.service.vendorId,

    slotId: appointment.slot.id,
    slotDate: appointment.slot.date.toISOString(),
    slotStartTime: appointment.slot.startTime,
    slotEndTime: appointment.slot.endTime,
    slotCapacity: appointment.slot.capacity,
    slotBookedCount: appointment.slot.bookedCount,
    slotIsActive: appointment.slot.isActive,

    bookingDate: appointment.bookingDate.toISOString(),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    amount: Number(appointment.amount),
    currency: appointment.currency,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    customerNote: appointment.customerNote,
    vendorNote: appointment.vendorNote,
    cancelReason: appointment.cancelReason,
    createdAt: appointment.createdAt.toISOString(),
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-brand-500">
              Vendor Dashboard
            </p>

            <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
              Edit Appointment
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Update booking status, payment status, internal note, and
              cancellation reason for this appointment.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vendor/appointments/${appointment.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View Appointment
            </Link>

            <Link
              href="/vendor/appointments"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Back to Appointments
            </Link>
          </div>
        </div>

        <VendorAppointmentStatusManager booking={bookingForEdit} />
      </div>
    </main>
  );
}