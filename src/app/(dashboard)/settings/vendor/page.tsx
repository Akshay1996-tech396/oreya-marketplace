import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type VendorSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
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

function getCleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getDeliveryPreparationHoursValue(value: FormDataEntryValue | null) {
  const parsedValue = Number(getCleanString(value));

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return 24;
  }

  if (parsedValue > 720) {
    return 720;
  }

  return Math.floor(parsedValue);
}

function formatDeliveryPreparationLabel(hours: number) {
  if (hours === 1) {
    return "1 hour";
  }

  if (hours < 24) {
    return `${hours} hours`;
  }

  const days = hours / 24;

  if (Number.isInteger(days)) {
    return days === 1 ? "24 hours" : `${days} days`;
  }

  return `${hours} hours`;
}

async function saveVendorDeliverySettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const deliveryPreparationHours = getDeliveryPreparationHoursValue(
    formData.get("deliveryPreparationHours")
  );

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  await prisma.vendorProfile.update({
    where: {
      id: vendor.id,
    },
    data: {
      deliveryPreparationHours,
    },
  });

  revalidatePath("/settings/vendor");
  revalidatePath("/checkout");

  redirect("/settings/vendor?saved=1");
}

export default async function VendorDeliverySettingsPage({
  searchParams,
}: VendorSettingsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isSaved = resolvedSearchParams.saved === "1";

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
      deliveryPreparationHours: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const deliveryPreparationHours = vendor.deliveryPreparationHours || 24;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vendor Settings
          </p>

          <h1 className="mt-2 font-heading text-2xl text-gray-900 dark:text-white">
            Delivery Preparation Settings
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Manage the minimum preparation time required before customers can
            request a preferred delivery date for your products and services.
          </p>
        </div>

        <Link
          href="/vendor/dashboard"
          className="inline-flex rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Back to Dashboard
        </Link>
      </div>

      {isSaved ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          Delivery preparation settings saved successfully.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form
          action={saveVendorDeliverySettings}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="mb-6">
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Product Delivery Preparation
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              This value controls the earliest date a customer can choose when
              they enable the optional preferred delivery date at checkout.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="deliveryPreparationHours"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Delivery Preparation Time
              </label>

              <div className="flex rounded-xl border border-gray-200 bg-white focus-within:border-brand-500 dark:border-gray-800 dark:bg-gray-950">
                <input
                  id="deliveryPreparationHours"
                  name="deliveryPreparationHours"
                  type="number"
                  min={1}
                  max={720}
                  step={1}
                  defaultValue={deliveryPreparationHours}
                  className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-sm text-gray-700 outline-none dark:text-gray-300"
                  required
                />

                <span className="flex items-center rounded-r-xl border-l border-gray-200 px-4 text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Hours
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Example: use 24 for one day, 48 for two days, or 72 for three
                days. Maximum allowed value is 720 hours.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Save Delivery Settings
            </button>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Current Configuration
          </p>

          <h2 className="mt-2 font-heading text-xl text-gray-900 dark:text-white">
            {vendor.businessName}
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-gray-500 dark:text-gray-400">
                Vendor Status
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {vendor.status}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-gray-500 dark:text-gray-400">
                Preparation Time
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {formatDeliveryPreparationLabel(deliveryPreparationHours)}
              </p>
            </div>
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-500 dark:text-gray-400">
            If a customer cart contains products from multiple vendors, checkout
            will use the highest preparation time from all cart items.
          </p>
        </aside>
      </div>
    </div>
  );
}