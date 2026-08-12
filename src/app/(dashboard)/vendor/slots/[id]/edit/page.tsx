import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditAppointmentSlotForm from "@/components/vendor/EditAppointmentSlotForm";

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

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStatusClass(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function EditVendorSlotPage({ params }: PageProps) {
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
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const [slot, services] = await Promise.all([
    prisma.appointmentSlot.findFirst({
      where: {
        id,
        vendorId: vendor.id,
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            duration: true,
            status: true,
          },
        },
      },
    }),
    prisma.service.findMany({
      where: {
        vendorId: vendor.id,
        status: {
          not: "INACTIVE",
        },
      },
      select: {
        id: true,
        title: true,
        duration: true,
        status: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  if (!slot) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="font-heading text-2xl text-black">
          Appointment Slot Not Found
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          This appointment slot does not exist or does not belong to your
          vendor account.
        </p>

        <Link
          href="/vendor/slots"
          className="mt-5 inline-flex rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Slots
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-black">
            Edit Appointment Slot
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update the service, appointment date, time, capacity, note, and
            availability.
          </p>
        </div>

        <Link
          href="/vendor/slots"
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Slots
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Vendor</p>
            <p className="mt-1 font-medium text-black">
              {vendor.businessName}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
              vendor.status
            )}`}
          >
            {vendor.status}
          </span>
        </div>
      </div>

      <EditAppointmentSlotForm
        slot={{
          id: slot.id,
          serviceId: slot.serviceId,
          date: formatDateValue(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
          bookedCount: slot.bookedCount,
          note: slot.note,
          isActive: slot.isActive,
        }}
        services={services}
      />
    </div>
  );
}