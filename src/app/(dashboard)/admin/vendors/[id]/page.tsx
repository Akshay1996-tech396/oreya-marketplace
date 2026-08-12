import Link from "next/link";
import { redirect } from "next/navigation";
import VendorStatusActions from "@/components/admin/VendorStatusActions";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

function formatDate(date: Date | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

function getBooleanValue(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
}

function getStatusClass(status: string) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-700";
  }

  if (status === "PENDING") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

type DetailTableProps = {
  title: string;
  rows: {
    label: string;
    value: React.ReactNode;
  }[];
};

function DetailTable({ title, rows }: DetailTableProps) {
  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-6">
      <h2 className="mb-5 font-heading text-2xl uppercase tracking-wide">
        {title}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-200 last:border-b-0">
                <th className="w-[280px] bg-gray-50 px-5 py-4 font-semibold text-black">
                  {row.label}
                </th>

                <td className="px-5 py-4 text-gray-600">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminVendorDetailPage({ params }: PageProps) {
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

  const { id } = await params;

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
          createdAt: true,
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
      restaurants: {
        select: {
          id: true,
        },
      },
      bookings: {
        select: {
          id: true,
        },
      },
      slots: {
        select: {
          id: true,
        },
      },
      reviews: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!vendor) {
    redirect("/admin/vendors");
  }

  const status = String(vendor.status) as VendorStatus;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black lg:px-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Admin Panel
            </p>

            <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
              Vendor Profile
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              Review complete vendor registration details, documents, and
              approval status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/vendors"
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-black hover:bg-gray-50"
            >
              Back to Vendors
            </Link>

            <Link
              href="/admin/dashboard"
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-[26px] border border-gray-200 bg-gray-50 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold">
                  {vendor.businessName}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                {vendor.description || "No vendor description is available."}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-3">
                <p>
                  <strong className="text-black">Products:</strong>{" "}
                  {vendor.products.length}
                </p>

                <p>
                  <strong className="text-black">Services:</strong>{" "}
                  {vendor.services.length}
                </p>

                <p>
                  <strong className="text-black">Restaurants:</strong>{" "}
                  {vendor.restaurants.length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Account Actions
              </p>

              <p className="mt-2 text-sm text-gray-600">
                Update the vendor account status after reviewing the business
                details and license document.
              </p>

              <div className="mt-5">
                <VendorStatusActions
                  vendorId={vendor.id}
                  currentStatus={status}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <DetailTable
            title="Business Details"
            rows={[
              {
                label: "Store Name",
                value: getValue(vendor.businessName),
              },
              {
                label: "Store Slug",
                value: getValue(vendor.slug),
              },
              {
                label: "Brand Name",
                value: getValue(vendor.brandName),
              },
              {
                label: "Company Name",
                value: getValue(vendor.companyName),
              },
              {
                label: "Branch Name",
                value: getValue(vendor.branchName),
              },
              {
                label: "Website",
                value: vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-black underline"
                  >
                    {vendor.website}
                  </a>
                ) : (
                  "Not available"
                ),
              },
              {
                label: "Description",
                value: getValue(vendor.description),
              },
              {
                label: "Commission Rate",
                value: `${vendor.commissionRate.toString()}%`,
              },
              {
                label: "Terms Accepted",
                value: getBooleanValue(vendor.termsAccepted),
              },
            ]}
          />

          <DetailTable
            title="Owner and Login Details"
            rows={[
              {
                label: "Owner Name",
                value: getValue(vendor.user.name),
              },
              {
                label: "Login Email",
                value: getValue(vendor.user.email),
              },
              {
                label: "User Role",
                value: getValue(vendor.user.role),
              },
              {
                label: "User Created Date",
                value: formatDate(vendor.user.createdAt),
              },
            ]}
          />

          <DetailTable
            title="Contact Details"
            rows={[
              {
                label: "Business Phone",
                value: getValue(vendor.phone),
              },
              {
                label: "Mobile Country Code",
                value: getValue(vendor.mobileCountryCode),
              },
              {
                label: "Residential Phone",
                value: getValue(vendor.residentialPhone),
              },
              {
                label: "Residential Country Code",
                value: getValue(vendor.residentialCountryCode),
              },
            ]}
          />

          <DetailTable
            title="Address Details"
            rows={[
              {
                label: "Country",
                value: getValue(vendor.country),
              },
              {
                label: "State",
                value: getValue(vendor.state),
              },
              {
                label: "City",
                value: getValue(vendor.city),
              },
              {
                label: "ZIP / Postal Code",
                value: getValue(vendor.zipCode),
              },
              {
                label: "Address Line 1",
                value: getValue(vendor.addressLine1),
              },
              {
                label: "Address Line 2",
                value: getValue(vendor.addressLine2),
              },
              {
                label: "Complete Address",
                value: getValue(vendor.address),
              },
            ]}
          />

          <DetailTable
            title="License Details"
            rows={[
              {
                label: "License Document",
                value: vendor.licenseFile ? (
                  <a
                    href={vendor.licenseFile}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                  >
                    View Uploaded PDF
                  </a>
                ) : (
                  "Not available"
                ),
              },
              {
                label: "License Expiry Date",
                value: formatDate(vendor.licenseExpiry),
              },
            ]}
          />

          <DetailTable
            title="Marketplace Activity"
            rows={[
              {
                label: "Products",
                value: vendor.products.length,
              },
              {
                label: "Services",
                value: vendor.services.length,
              },
              {
                label: "Restaurants",
                value: vendor.restaurants.length,
              },
              {
                label: "Appointment Slots",
                value: vendor.slots.length,
              },
              {
                label: "Bookings",
                value: vendor.bookings.length,
              },
              {
                label: "Reviews",
                value: vendor.reviews.length,
              },
              {
                label: "Vendor Created Date",
                value: formatDate(vendor.createdAt),
              },
              {
                label: "Last Updated Date",
                value: formatDate(vendor.updatedAt),
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}