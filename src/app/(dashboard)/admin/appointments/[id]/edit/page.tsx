import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminAppointmentEditForm from "@/components/admin/AdminAppointmentEditForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export default async function EditAdminAppointmentPage({ params }: PageProps) {
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

  if (!booking) {
    notFound();
  }

  const bookingForEdit = {
    id: booking.id,

    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,

    vendorId: booking.vendorId,
    ownerName: booking.vendor ? booking.vendor.businessName : "Admin Service",
    ownerEmail: booking.vendor ? booking.vendor.user.email : "Owned by admin",
    ownerStatus: booking.vendor ? booking.vendor.status : null,
    ownerType: booking.vendor ? "Vendor-Owned" : "Admin-Owned",

    serviceTitle: booking.service.title,
    serviceSlug: booking.service.slug,
    serviceStatus: booking.service.status,
    serviceVendorId: booking.service.vendorId,

    slotId: booking.slot.id,
    slotDate: booking.slot.date.toISOString(),
    slotStartTime: booking.slot.startTime,
    slotEndTime: booking.slot.endTime,
    slotCapacity: booking.slot.capacity,
    slotBookedCount: booking.slot.bookedCount,
    slotIsActive: booking.slot.isActive,

    bookingDate: booking.bookingDate.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    amount: Number(booking.amount),
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    customerNote: booking.customerNote,
    vendorNote: booking.vendorNote,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt.toISOString(),
  };

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Edit Appointment
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Update booking status, payment status, internal note, and
              cancellation reason for admin-owned or vendor-owned appointments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/appointments/${booking.id}`}
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              View Appointment
            </Link>

            <Link
              href="/admin/appointments"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Back to Appointments
            </Link>
          </div>
        </div>

        <AdminAppointmentEditForm booking={bookingForEdit} />
      </div>
    </main>
  );
}