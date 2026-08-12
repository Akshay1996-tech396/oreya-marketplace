"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderStatus = "ACTIVE" | "INACTIVE";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function isValidWebsiteUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLogoPath(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return true;
  }

  if (normalizedValue.startsWith("/")) {
    return true;
  }

  return isValidWebsiteUrl(normalizedValue);
}

export default function AdminAddServiceProviderPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<ProviderStatus>("ACTIVE");
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedLogo = logo.trim();
    const normalizedWebsite = website.trim();

    if (!normalizedName) {
      setMessage({
        type: "error",
        text: "Service provider name is required.",
      });
      return;
    }

    if (normalizedName.length > 120) {
      setMessage({
        type: "error",
        text: "Service provider name must not exceed 120 characters.",
      });
      return;
    }

    if (normalizedDescription.length > 1000) {
      setMessage({
        type: "error",
        text: "Description must not exceed 1,000 characters.",
      });
      return;
    }

    if (!isValidLogoPath(normalizedLogo)) {
      setMessage({
        type: "error",
        text: "Enter a valid logo URL or a relative upload path.",
      });
      return;
    }

    if (!isValidWebsiteUrl(normalizedWebsite)) {
      setMessage({
        type: "error",
        text: "Enter a valid website URL beginning with http:// or https://.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const response = await fetch("/api/admin/service-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: normalizedName,
          description: normalizedDescription || null,
          logo: normalizedLogo || null,
          website: normalizedWebsite || null,
          status,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to create the service provider."
        );
      }

      setMessage({
        type: "success",
        text: "Service provider created successfully.",
      });

      router.push("/admin/service-providers");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to create the service provider.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">
            Service Provider
          </p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Add Service Provider
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Add a provider that administrators and vendors can select while
            creating or editing a marketplace service.
          </p>
        </div>

        <Link
          href="/admin/service-providers"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to Service Providers
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Provider Details
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter the provider name, branding information, website and current
            availability status.
          </p>
        </div>

        {message ? (
          <div
            role="alert"
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label
              htmlFor="providerName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Service Provider Name{" "}
              <span className="text-error-500">*</span>
            </label>

            <input
              id="providerName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Urban Company"
              maxLength={120}
              autoComplete="organization"
              required
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />

            <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {name.length}/120
            </p>
          </div>

          <div>
            <label
              htmlFor="providerLogo"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Provider Logo URL
            </label>

            <input
              id="providerLogo"
              type="text"
              value={logo}
              onChange={(event) => {
                setLogo(event.target.value);
                setLogoPreviewFailed(false);
              }}
              placeholder="/uploads/service-providers/urban-company.png"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />

            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Enter an absolute URL or a relative path beginning with /.
            </p>
          </div>

          <div>
            <label
              htmlFor="providerWebsite"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Provider Website
            </label>

            <input
              id="providerWebsite"
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://www.example.com"
              autoComplete="url"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="providerStatus"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status <span className="text-error-500">*</span>
            </label>

            <select
              id="providerStatus"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProviderStatus)
              }
              required
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Only active providers should appear in service-selection
              dropdowns.
            </p>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="providerDescription"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>

            <textarea
              id="providerDescription"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write a concise description of this service provider."
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />

            <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {description.length}/1000
            </p>
          </div>

          {logo.trim() ? (
            <div className="lg:col-span-2">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Logo Preview
              </p>

              <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                {!logoPreviewFailed ? (
                  <img
                    key={logo}
                    src={logo}
                    alt="Service provider logo preview"
                    className="max-h-36 max-w-full object-contain"
                    onError={() => setLogoPreviewFailed(true)}
                  />
                ) : (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">
                    The logo preview could not be loaded. Verify the entered
                    path or URL.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/service-providers"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isSubmitting
              ? "Creating Service Provider..."
              : "Create Service Provider"}
          </button>
        </div>
      </form>
    </div>
  );
}