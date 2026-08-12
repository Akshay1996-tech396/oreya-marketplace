import Link from "next/link";
import { redirect } from "next/navigation";
import VendorStatusActions from "@/components/admin/VendorStatusActions";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

type AdminVendorRow = {
  id: string;
  businessName: string;
  status: VendorStatus;
  phone: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  addressLine1: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  products: {
    id: string;
  }[];
  services: {
    id: string;
  }[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStatusClass(status: VendorStatus) {
  if (status === "APPROVED") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "SUSPENDED") {
    return "border-gray-300 bg-gray-100 text-gray-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-700";
}

function getDisplayValue(value: string | null | undefined) {
  return value && value.trim() ? value : "Not available";
}

function getVendorAddress(vendor: AdminVendorRow) {
  return (
    vendor.addressLine1 ||
    vendor.address ||
    "Not available"
  );
}

export default async function AdminVendorsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    if (user.role === "VENDOR") {
      redirect("/vendor/dashboard");
    }

    redirect("/customer");
  }

  const vendors = (await prisma.vendorProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      products: {
        select: {
          id: true,
        },
      },
      services: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as unknown as AdminVendorRow[];

  const totalVendors = vendors.length;
  const pendingVendors = vendors.filter(
    (vendor) => vendor.status === "PENDING"
  ).length;
  const approvedVendors = vendors.filter(
    (vendor) => vendor.status === "APPROVED"
  ).length;
  const suspendedVendors = vendors.filter(
    (vendor) => vendor.status === "SUSPENDED"
  ).length;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black lg:px-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Admin Panel
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
              Vendor Approvals
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Review vendor registrations and manage vendor account approval
              status.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="w-fit rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Back to Admin
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Vendors</p>
            <p className="mt-2 text-2xl font-semibold">{totalVendors}</p>
          </div>

          <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="mt-2 text-2xl font-semibold">{pendingVendors}</p>
          </div>

          <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Approved Vendors</p>
            <p className="mt-2 text-2xl font-semibold">{approvedVendors}</p>
          </div>

          <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Suspended Vendors</p>
            <p className="mt-2 text-2xl font-semibold">{suspendedVendors}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {vendors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
              <h2 className="text-xl font-semibold">No Vendors Found</h2>

              <p className="mt-2 text-sm text-gray-500">
                There are currently no vendor registrations.
              </p>
            </div>
          ) : (
            vendors.map((vendor) => (
              <article
                key={vendor.id}
                className="rounded-[26px] border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words text-2xl font-semibold">
                        {vendor.businessName}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                          vendor.status
                        )}`}
                      >
                        {vendor.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
                      <p>
                        <strong className="text-black">Owner:</strong>{" "}
                        {getDisplayValue(vendor.user.name)}
                      </p>

                      <p className="break-all">
                        <strong className="text-black">Email:</strong>{" "}
                        {vendor.user.email}
                      </p>

                      <p>
                        <strong className="text-black">Phone:</strong>{" "}
                        {getDisplayValue(vendor.phone)}
                      </p>

                      <p>
                        <strong className="text-black">City:</strong>{" "}
                        {getDisplayValue(vendor.city)}
                      </p>

                      <p>
                        <strong className="text-black">Country:</strong>{" "}
                        {getDisplayValue(vendor.country)}
                      </p>

                      <p>
                        <strong className="text-black">Products:</strong>{" "}
                        {vendor.products.length}
                      </p>

                      <p>
                        <strong className="text-black">Services:</strong>{" "}
                        {vendor.services.length}
                      </p>

                      <p>
                        <strong className="text-black">Created:</strong>{" "}
                        {formatDate(vendor.createdAt)}
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      <strong className="text-black">Address:</strong>{" "}
                      {getVendorAddress(vendor)}
                    </p>
                  </div>

                  <div className="flex flex-col justify-between gap-5 rounded-2xl bg-gray-50 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Available Actions
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        Review the complete vendor profile before changing the
                        account status.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
                        className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                      >
                        View Profile
                      </Link>

                      <VendorStatusActions
                        vendorId={vendor.id}
                        currentStatus={vendor.status}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}