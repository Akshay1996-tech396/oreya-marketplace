import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminAppointmentSlotEditForm from "@/components/admin/AdminAppointmentSlotEditForm";
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

function formatDateInput(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatusClass(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (
    status === "REJECTED" ||
    status === "SUSPENDED" ||
    status === "INACTIVE"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default async function EditAdminSlotPage({ params }: PageProps) {
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
          status: true,
          duration: true,
          vendorId: true,
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

  const services = await prisma.service.findMany({
    where: {
      status: {
        not: "INACTIVE",
      },
      OR: [
        {
          vendorId: null,
        },
        {
          vendor: {
            is: {
              status: "APPROVED",
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      duration: true,
      vendorId: true,
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
    },
    orderBy: {
      title: "asc",
    },
  });

  const slotForEdit = {
    id: slot.id,
    vendorId: slot.vendorId,
    serviceId: slot.serviceId,
    date: formatDateInput(slot.date),
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes: slot.durationMinutes,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    isActive: slot.isActive,
    note: slot.note,
    bookingsCount: slot._count.bookings,
  };

  const ownerName = slot.vendor
    ? slot.vendor.businessName
    : "Administrator Service";

  const ownerStatus = slot.vendor ? slot.vendor.status : "ADMIN-OWNED";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-black dark:text-white">
            Edit Appointment Slot
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update the service, appointment date, time, capacity, note, and
            availability.
          </p>
        </div>

        <Link
          href="/admin/slots"
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
        >
          Back to Slots
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Service Owner
            </p>

            <p className="mt-1 font-medium text-black dark:text-white">
              {ownerName}
            </p>

            {slot.vendor?.user.email ? (
              <p className="mt-1 text-xs text-gray-500">
                {slot.vendor.user.email}
              </p>
            ) : null}
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
              ownerStatus
            )}`}
          >
            {ownerStatus}
          </span>
        </div>
      </div>

      <AdminAppointmentSlotEditForm
        slot={slotForEdit}
        services={services}
      />
    </div>
  );
}