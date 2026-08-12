import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppointmentSlotForm from "@/components/admin/AdminAppointmentSlotForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminAddSlotPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
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
      createdAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Admin Dashboard
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide text-gray-900 dark:text-white">
              Add Appointment Slot
            </h1>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Create appointment slots for admin-owned services and approved
              vendor-owned services.
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
              href="/admin/dashboard"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <AdminAppointmentSlotForm services={services} />
      </div>
    </main>
  );
}