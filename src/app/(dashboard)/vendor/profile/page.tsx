import Link from "next/link";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import VendorProfileLicenseExpiryDateInput from "@/components/vendor/VendorProfileLicenseExpiryDateInput";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVendorProfileCompletion } from "@/lib/vendor-profile-completion";
import { uploadFileToSupabaseStorage } from "@/lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LICENSE_FILE_SIZE = 5 * 1024 * 1024;

type PageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
    onboarding?: string;
  }>;
};

function getCleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueVendorSlug(baseValue: string, currentVendorId: string) {
  const baseSlug = slugify(baseValue) || "vendor";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingVendor = await prisma.vendorProfile.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existingVendor || existingVendor.id === currentVendorId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

function getStatusClass(status: string) {
  if (status === "APPROVED") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "PENDING") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(`${trimmed}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function getProfileErrorPath(error: string, onboarding: boolean) {
  const searchParams = new URLSearchParams({
    error,
  });

  if (onboarding) {
    searchParams.set("onboarding", "1");
  }

  return `/vendor/profile?${searchParams.toString()}`;
}

async function saveLicenseFile(file: File, vendorId: string) {
  const fileName = `vendor-license-${vendorId}-${randomUUID()}.pdf`;

  return uploadFileToSupabaseStorage({
    path: `vendors/licenses/${fileName}`,
    file,
    contentType: "application/pdf",
  });
}

async function updateVendorProfile(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const completeOnboarding = formData.get("completeOnboarding") === "1";

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      licenseFile: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const businessName = getCleanString(formData.get("businessName"));
  const ownerName = getCleanString(formData.get("ownerName"));
  const phone = getCleanString(formData.get("phone"));
  const brandName = getCleanString(formData.get("brandName"));
  const companyName = getCleanString(formData.get("companyName"));
  const branchName = getCleanString(formData.get("branchName"));
  const website = getCleanString(formData.get("website"));
  const address = getCleanString(formData.get("address"));
  const addressLine1 = getCleanString(formData.get("addressLine1"));
  const addressLine2 = getCleanString(formData.get("addressLine2"));
  const city = getCleanString(formData.get("city"));
  const state = getCleanString(formData.get("state"));
  const country = getCleanString(formData.get("country"));
  const zipCode = getCleanString(formData.get("zipCode"));
  const description = getCleanString(formData.get("description"));
  const licenseExpiry = parseDateInput(formData.get("licenseExpiry"));
  const removeLicenseFile = formData.get("removeLicenseFile") === "on";

  /*
   * businessName is required by the Prisma schema.
   * This explicit guard narrows its TypeScript type from
   * string | null to string before the database update.
   */
  if (!businessName) {
    redirect(
      getProfileErrorPath("business-name-required", completeOnboarding)
    );
  }

  const licenseFileInput = formData.get("licenseFile");
  const licenseFile =
    licenseFileInput instanceof File && licenseFileInput.size > 0
      ? licenseFileInput
      : null;

  if (licenseFile) {
    if (licenseFile.type !== "application/pdf") {
      redirect(
        getProfileErrorPath("invalid-license-file", completeOnboarding)
      );
    }

    if (licenseFile.size > MAX_LICENSE_FILE_SIZE) {
      redirect(
        getProfileErrorPath("license-file-too-large", completeOnboarding)
      );
    }
  }

  const effectiveLicenseFile = licenseFile
    ? "new-license-upload"
    : removeLicenseFile
      ? null
      : vendor.licenseFile;

  const profileCompletion = getVendorProfileCompletion({
    businessName,
    ownerName,
    businessPhone: phone,
    brandName,
    companyName,
    branchName,
    city,
    state,
    country,
    zipCode,
    addressLine1,
    address,
    description,
    businessLicense: effectiveLicenseFile,
    licenseExpiryDate: licenseExpiry,
  });

  if (!profileCompletion.isComplete) {
    redirect(
      getProfileErrorPath("profile-incomplete", completeOnboarding)
    );
  }

  let licenseFilePath: string | null = null;

  if (licenseFile) {
    licenseFilePath = await saveLicenseFile(licenseFile, vendor.id);
  }

  const slug = await getUniqueVendorSlug(businessName, vendor.id);

  await prisma.$transaction(async (tx) => {
    await tx.vendorProfile.update({
      where: {
        id: vendor.id,
      },
      data: {
        businessName,
        slug,
        phone,
        brandName,
        companyName,
        branchName,
        website,
        address,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        zipCode,
        description,
        licenseExpiry,
        ...(licenseFilePath
          ? {
              licenseFile: licenseFilePath,
            }
          : removeLicenseFile
            ? {
                licenseFile: null,
              }
            : {}),
      },
    });

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: ownerName!,
      },
    });
  });

  revalidatePath("/vendor", "layout");
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor/dashboard");

  if (completeOnboarding) {
    redirect("/vendor/dashboard?profileCompleted=1");
  }

  redirect("/vendor/profile?updated=1");
}

export default async function VendorProfilePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isUpdated = resolvedSearchParams.updated === "1";
  const hasBusinessNameError =
    resolvedSearchParams.error === "business-name-required";
  const hasInvalidLicenseFileError =
    resolvedSearchParams.error === "invalid-license-file";
  const hasLargeLicenseFileError =
    resolvedSearchParams.error === "license-file-too-large";
  const hasIncompleteProfileError =
    resolvedSearchParams.error === "profile-incomplete";

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const profileCompletion = getVendorProfileCompletion({
    businessName: vendor.businessName,
    ownerName: vendor.user.name,
    businessPhone: vendor.phone,
    brandName: vendor.brandName,
    companyName: vendor.companyName,
    branchName: vendor.branchName,
    city: vendor.city,
    state: vendor.state,
    country: vendor.country,
    zipCode: vendor.zipCode,
    addressLine1: vendor.addressLine1,
    address: vendor.address,
    description: vendor.description,
    businessLicense: vendor.licenseFile,
    licenseExpiryDate: vendor.licenseExpiry,
  });

  const isOnboarding =
    resolvedSearchParams.onboarding === "1" ||
    !profileCompletion.isComplete;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Vendor Profile
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your vendor store profile, business details, and public store
            information.
          </p>
        </div>

        {profileCompletion.isComplete ? (
          <Link
            href="/vendor/dashboard"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Back
          </Link>
        ) : null}
      </div>

      {!profileCompletion.isComplete ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-lg">
                Complete Your Vendor Profile
              </h2>

              <p className="mt-1 text-sm leading-6">
                Your vendor account setup is incomplete. Complete every
                mandatory field below before accessing the vendor dashboard
                and other vendor features.
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-center dark:border-amber-900/50 dark:bg-black/20">
              <p className="text-xs font-semibold uppercase tracking-wide">
                Profile Completion
              </p>
              <p className="mt-1 text-2xl font-bold">
                {profileCompletion.completionPercentage}%
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${profileCompletion.completionPercentage}%`,
              }}
            />
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold">
              Mandatory information still required:
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {profileCompletion.missingFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-medium dark:border-amber-900/50 dark:bg-black/20"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isUpdated ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Vendor profile updated successfully.
        </div>
      ) : null}

      {hasBusinessNameError ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Store name is required.
        </div>
      ) : null}

      {hasIncompleteProfileError ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Complete every mandatory profile field before continuing.
        </div>
      ) : null}

      {hasInvalidLicenseFileError ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Please upload a valid PDF license document.
        </div>
      ) : null}

      {hasLargeLicenseFileError ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          License document must be 5 MB or smaller.
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current Store Status
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                  String(vendor.status)
                )}`}
              >
                {formatStatus(String(vendor.status))}
              </span>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                Store status is controlled by the administrator.
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">Store Slug</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {vendor.slug}
            </p>
          </div>
        </div>
      </div>

      <form
        action={updateVendorProfile}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <input
          type="hidden"
          name="completeOnboarding"
          value={isOnboarding ? "1" : "0"}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label
              htmlFor="businessName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Store Name *
            </label>

            <input
              id="businessName"
              name="businessName"
              defaultValue={vendor.businessName}
              placeholder="Example: Beautdeluxe Salon"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="ownerName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Owner Name *
            </label>

            <input
              id="ownerName"
              name="ownerName"
              defaultValue={vendor.user.name || ""}
              placeholder="Enter owner name"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Login Email
            </label>

            <input
              id="email"
              value={vendor.user.email}
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            />

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Login email cannot be changed.
            </p>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Business Phone *
            </label>

            <input
              id="phone"
              name="phone"
              defaultValue={vendor.phone || ""}
              placeholder="+91 9876543210"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="brandName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Brand Name *
            </label>

            <input
              id="brandName"
              name="brandName"
              defaultValue={vendor.brandName || ""}
              placeholder="Enter brand name"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Company Name *
            </label>

            <input
              id="companyName"
              name="companyName"
              defaultValue={vendor.companyName || ""}
              placeholder="Enter company name"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="branchName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Branch Name *
            </label>

            <input
              id="branchName"
              name="branchName"
              defaultValue={vendor.branchName || ""}
              placeholder="Enter branch name"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Website (Optional)
            </label>

            <input
              id="website"
              name="website"
              defaultValue={vendor.website || ""}
              placeholder="https://example.com"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              City *
            </label>

            <input
              id="city"
              name="city"
              defaultValue={vendor.city || ""}
              placeholder="Enter city"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              State *
            </label>

            <input
              id="state"
              name="state"
              defaultValue={vendor.state || ""}
              placeholder="Enter state"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Country *
            </label>

            <input
              id="country"
              name="country"
              defaultValue={vendor.country || ""}
              placeholder="Enter country"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="zipCode"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              ZIP / Postal Code *
            </label>

            <input
              id="zipCode"
              name="zipCode"
              defaultValue={vendor.zipCode || ""}
              placeholder="Enter ZIP or postal code"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="addressLine1"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Address Line 1 *
            </label>

            <input
              id="addressLine1"
              name="addressLine1"
              defaultValue={vendor.addressLine1 || ""}
              placeholder="Enter address line 1"
              required
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="addressLine2"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Address Line 2 (Optional)
            </label>

            <input
              id="addressLine2"
              name="addressLine2"
              defaultValue={vendor.addressLine2 || ""}
              placeholder="Enter address line 2"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Complete Business Address *
            </label>

            <textarea
              id="address"
              name="address"
              defaultValue={vendor.address || ""}
              placeholder="Enter complete business address"
              rows={4}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Store Description *
            </label>

            <textarea
              id="description"
              name="description"
              defaultValue={vendor.description || ""}
              placeholder="Write a short professional description about your store"
              rows={4}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-5">
                <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                  Business License Document *
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Upload or replace your business license PDF. The file must be
                  a PDF and must not exceed 5 MB.
                </p>
              </div>

              {vendor.licenseFile ? (
                <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Current License Document
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={vendor.licenseFile}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
                    >
                      View Uploaded PDF
                    </a>

                    <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
                      <input
                        type="checkbox"
                        name="removeLicenseFile"
                        className="h-4 w-4"
                      />
                      Remove Current PDF
                    </label>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700">
                  No license PDF is currently uploaded.
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="licenseFile"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Upload New License PDF
                  </label>

                  <input
                    id="licenseFile"
                    name="licenseFile"
                    type="file"
                    accept="application/pdf,.pdf"
                    required={!vendor.licenseFile}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Uploading a new PDF will replace the current license
                    document.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="licenseExpiry"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    License Expiry Date *
                  </label>

                  <VendorProfileLicenseExpiryDateInput
                    defaultValue={getDateInputValue(vendor.licenseExpiry)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            {isOnboarding ? "Complete Profile" : "Update Profile"}
          </button>

          {profileCompletion.isComplete ? (
            <Link
              href="/vendor/dashboard"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              Cancel
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}