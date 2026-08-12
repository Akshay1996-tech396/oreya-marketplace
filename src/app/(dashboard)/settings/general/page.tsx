import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  CONTENT_LIMIT_SETTING_KEYS,
  DEFAULT_CONTENT_LIMITS,
  MAX_CONTENT_CHARACTER_LIMIT,
  MIN_CONTENT_CHARACTER_LIMIT,
} from "@/lib/content-limits";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type GeneralSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

const generalSettingKeys = [
  "marketplaceName",
  "supportEmail",
  "supportPhone",
  "defaultCurrency",
  "defaultLanguage",
  "marketplaceStatus",
  "businessAddress",
  "defaultProductDeliveryPreparationHours",
  "maxImageUploadSizeMb",
  CONTENT_LIMIT_SETTING_KEYS.description,
  CONTENT_LIMIT_SETTING_KEYS.shortDescription,
  CONTENT_LIMIT_SETTING_KEYS.exchangePolicy,
  CONTENT_LIMIT_SETTING_KEYS.refundPolicy,
];

const defaultSettings = {
  marketplaceName: "OREYA Marketplace",
  supportEmail: "",
  supportPhone: "",
  defaultCurrency: "AED",
  defaultLanguage: "en",
  marketplaceStatus: "active",
  businessAddress: "",
  defaultProductDeliveryPreparationHours: "24",
  maxImageUploadSizeMb: "5",
  maxDescriptionLength: String(
    DEFAULT_CONTENT_LIMITS.description
  ),
  maxShortDescriptionLength: String(
    DEFAULT_CONTENT_LIMITS.shortDescription
  ),
  maxExchangePolicyLength: String(
    DEFAULT_CONTENT_LIMITS.exchangePolicy
  ),
  maxRefundPolicyLength: String(
    DEFAULT_CONTENT_LIMITS.refundPolicy
  ),
};

const contentLimitFields = [
  {
    name: CONTENT_LIMIT_SETTING_KEYS.description,
    label: "Description Character Limit",
    description:
      "Maximum number of characters allowed in marketplace descriptions.",
  },
  {
    name: CONTENT_LIMIT_SETTING_KEYS.shortDescription,
    label: "Short Description Character Limit",
    description:
      "Maximum number of characters allowed in restaurant short descriptions.",
  },
  {
    name: CONTENT_LIMIT_SETTING_KEYS.exchangePolicy,
    label: "Exchange Policy Character Limit",
    description:
      "Maximum number of characters allowed in customer-facing exchange policies.",
  },
  {
    name: CONTENT_LIMIT_SETTING_KEYS.refundPolicy,
    label: "Refund Policy Character Limit",
    description:
      "Maximum number of characters allowed in customer-facing refund policies.",
  },
] as const;

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
    return defaultSettings.defaultProductDeliveryPreparationHours;
  }

  if (parsedValue > 720) {
    return "720";
  }

  return String(Math.floor(parsedValue));
}

function getMaximumImageUploadSizeValue(
  value: FormDataEntryValue | null
) {
  const parsedValue = Number(getCleanString(value));

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return defaultSettings.maxImageUploadSizeMb;
  }

  if (parsedValue > 50) {
    return "50";
  }

  return String(Math.floor(parsedValue));
}

function getContentCharacterLimitValue(
  value: FormDataEntryValue | null,
  fallback: number
) {
  const parsedValue = Number(getCleanString(value));

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < MIN_CONTENT_CHARACTER_LIMIT
  ) {
    return String(fallback);
  }

  if (parsedValue > MAX_CONTENT_CHARACTER_LIMIT) {
    return String(MAX_CONTENT_CHARACTER_LIMIT);
  }

  return String(Math.floor(parsedValue));
}

async function saveGeneralSettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const settingsToSave = {
    marketplaceName:
      getCleanString(formData.get("marketplaceName")) ||
      defaultSettings.marketplaceName,
    supportEmail: getCleanString(formData.get("supportEmail")),
    supportPhone: getCleanString(formData.get("supportPhone")),
    defaultCurrency:
      getCleanString(formData.get("defaultCurrency")) ||
      defaultSettings.defaultCurrency,
    defaultLanguage:
      getCleanString(formData.get("defaultLanguage")) ||
      defaultSettings.defaultLanguage,
    marketplaceStatus:
      getCleanString(formData.get("marketplaceStatus")) ||
      defaultSettings.marketplaceStatus,
    businessAddress: getCleanString(formData.get("businessAddress")),
    defaultProductDeliveryPreparationHours: getDeliveryPreparationHoursValue(
      formData.get("defaultProductDeliveryPreparationHours")
    ),
    maxImageUploadSizeMb: getMaximumImageUploadSizeValue(
      formData.get("maxImageUploadSizeMb")
    ),
    maxDescriptionLength: getContentCharacterLimitValue(
      formData.get(CONTENT_LIMIT_SETTING_KEYS.description),
      DEFAULT_CONTENT_LIMITS.description
    ),
    maxShortDescriptionLength: getContentCharacterLimitValue(
      formData.get(CONTENT_LIMIT_SETTING_KEYS.shortDescription),
      DEFAULT_CONTENT_LIMITS.shortDescription
    ),
    maxExchangePolicyLength: getContentCharacterLimitValue(
      formData.get(CONTENT_LIMIT_SETTING_KEYS.exchangePolicy),
      DEFAULT_CONTENT_LIMITS.exchangePolicy
    ),
    maxRefundPolicyLength: getContentCharacterLimitValue(
      formData.get(CONTENT_LIMIT_SETTING_KEYS.refundPolicy),
      DEFAULT_CONTENT_LIMITS.refundPolicy
    ),
  };

  await prisma.$transaction(
    Object.entries(settingsToSave).map(([key, value]) =>
      prisma.setting.upsert({
        where: {
          key,
        },
        update: {
          value,
        },
        create: {
          key,
          value,
        },
      })
    )
  );

  revalidatePath("/settings/general");
  revalidatePath("/checkout");

  redirect("/settings/general?saved=1");
}

function getFieldValue(
  settings: Record<string, string>,
  key: keyof typeof defaultSettings
) {
  return settings[key] || defaultSettings[key];
}

export default async function GeneralSettingsPage({
  searchParams,
}: GeneralSettingsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isSaved = resolvedSearchParams.saved === "1";

  const savedSettings = await prisma.setting.findMany({
    where: {
      key: {
        in: generalSettingKeys,
      },
    },
  });

  const settings = savedSettings.reduce<Record<string, string>>(
    (currentSettings, setting) => {
      currentSettings[setting.key] = setting.value;
      return currentSettings;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Marketplace Settings
          </p>

          <h1 className="mt-2 font-heading text-2xl text-gray-900 dark:text-white">
            General Settings
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Manage marketplace information, delivery defaults, global content
            character limits, and media upload restrictions for administrators
            and vendors.
          </p>
        </div>

        <a
          href="/admin/dashboard"
          className="inline-flex rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Back to Dashboard
        </a>
      </div>

      {isSaved ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          Settings saved successfully.
        </div>
      ) : null}

      <form
        action={saveGeneralSettings}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="mb-6">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Basic Marketplace Information
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            These values are used across marketplace screens and customer
            communication areas.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="marketplaceName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Marketplace Name
            </label>

            <input
              id="marketplaceName"
              name="marketplaceName"
              type="text"
              defaultValue={getFieldValue(settings, "marketplaceName")}
              placeholder="Enter marketplace name"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            />
          </div>

          <div>
            <label
              htmlFor="supportEmail"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Support Email
            </label>

            <input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={getFieldValue(settings, "supportEmail")}
              placeholder="support@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            />
          </div>

          <div>
            <label
              htmlFor="supportPhone"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Support Phone
            </label>

            <input
              id="supportPhone"
              name="supportPhone"
              type="text"
              defaultValue={getFieldValue(settings, "supportPhone")}
              placeholder="+971 500000000"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            />
          </div>

          <div>
            <label
              htmlFor="defaultCurrency"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Default Currency
            </label>

            <select
              id="defaultCurrency"
              name="defaultCurrency"
              defaultValue={getFieldValue(settings, "defaultCurrency")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="AED">AED - UAE Dirham</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="defaultLanguage"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Default Language
            </label>

            <select
              id="defaultLanguage"
              name="defaultLanguage"
              defaultValue={getFieldValue(settings, "defaultLanguage")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="marketplaceStatus"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Marketplace Status
            </label>

            <select
              id="marketplaceStatus"
              name="marketplaceStatus"
              defaultValue={getFieldValue(settings, "marketplaceStatus")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance Mode</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="businessAddress"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Business Address
            </label>

            <textarea
              id="businessAddress"
              name="businessAddress"
              defaultValue={getFieldValue(settings, "businessAddress")}
              placeholder="Enter marketplace business address"
              className="min-h-[110px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
            />
          </div>
        </div>

        <div className="my-8 border-t border-gray-200 dark:border-gray-800" />

        <div className="mb-6">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Product Delivery Preparation
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This default preparation time is used for admin-owned products and
            as a fallback when a vendor does not have a separate delivery
            preparation time.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="defaultProductDeliveryPreparationHours"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Default Product Delivery Preparation Time
            </label>

            <div className="flex rounded-xl border border-gray-200 bg-white focus-within:border-brand-500 dark:border-gray-800 dark:bg-gray-950">
              <input
                id="defaultProductDeliveryPreparationHours"
                name="defaultProductDeliveryPreparationHours"
                type="number"
                min={1}
                max={720}
                step={1}
                defaultValue={getFieldValue(
                  settings,
                  "defaultProductDeliveryPreparationHours"
                )}
                className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-sm text-gray-700 outline-none dark:text-gray-300"
              />

              <span className="flex items-center rounded-r-xl border-l border-gray-200 px-4 text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                Hours
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Example: use 24 for one day, 48 for two days, or 72 for three
              days. Checkout will use this value when admin-owned products are
              in the cart.
            </p>
          </div>
        </div>

        <div className="my-8 border-t border-gray-200 dark:border-gray-800" />

        <div className="mb-6">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Content Character Limits
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Control the maximum content length accepted by marketplace create
            and edit forms. These limits are also enforced by the server APIs.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {contentLimitFields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {field.label}
              </label>

              <div className="flex rounded-xl border border-gray-200 bg-white focus-within:border-brand-500 dark:border-gray-800 dark:bg-gray-950">
                <input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={MIN_CONTENT_CHARACTER_LIMIT}
                  max={MAX_CONTENT_CHARACTER_LIMIT}
                  step={1}
                  required
                  defaultValue={getFieldValue(settings, field.name)}
                  className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-sm text-gray-700 outline-none dark:text-gray-300"
                />

                <span className="flex items-center rounded-r-xl border-l border-gray-200 px-4 text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Characters
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {field.description} Enter a value between{" "}
                {MIN_CONTENT_CHARACTER_LIMIT} and{" "}
                {MAX_CONTENT_CHARACTER_LIMIT}.
              </p>
            </div>
          ))}
        </div>

        <div className="my-8 border-t border-gray-200 dark:border-gray-800" />

        <div className="mb-6">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Media Upload Settings
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Control the maximum file size permitted for each marketplace image
            uploaded by administrators and vendors.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="maxImageUploadSizeMb"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Maximum Image Upload Size
            </label>

            <div className="flex rounded-xl border border-gray-200 bg-white focus-within:border-brand-500 dark:border-gray-800 dark:bg-gray-950">
              <input
                id="maxImageUploadSizeMb"
                name="maxImageUploadSizeMb"
                type="number"
                min={1}
                max={50}
                step={1}
                required
                defaultValue={getFieldValue(settings, "maxImageUploadSizeMb")}
                className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-sm text-gray-700 outline-none dark:text-gray-300"
              />

              <span className="flex items-center rounded-r-xl border-l border-gray-200 px-4 text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                MB per image
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Enter a value between 1 MB and 50 MB. This limit applies globally
              to product, service, restaurant, category, menu package, and
              service provider images. Vendor licence documents continue to use
              their separate 5 MB PDF limit.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}