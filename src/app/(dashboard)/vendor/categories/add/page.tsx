"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type CategoryRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type VendorCategoryRequest = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  status: CategoryRequestStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusClassName(status: CategoryRequestStatus) {
  if (status === "APPROVED") {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
}

export default function VendorRequestCategoryPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  const [requests, setRequests] = useState<VendorCategoryRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function loadRequests() {
    try {
      setIsLoadingRequests(true);

      const response = await fetch("/api/vendor/category-requests", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to load category requests.");
      }

      setRequests(result.requests || []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load category requests.",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage({
        type: "error",
        text: "Category name is required.",
      });

      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const response = await fetch("/api/vendor/category-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          image,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to submit category request.");
      }

      setName("");
      setDescription("");
      setImage("");

      setMessage({
        type: "success",
        text: "Category request submitted successfully. The admin team will review it.",
      });

      await loadRequests();

      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to submit category request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Vendor Panel</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Request Category
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Request a new marketplace category. Once approved by admin, it can
            be used for products and services.
          </p>
        </div>

        <Link
          href="/vendor/categories"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          Back to Categories
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Category Request Details
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the category details you want to request from admin.
            </p>
          </div>

          {message ? (
            <div
              className={`mb-6 rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label
                htmlFor="categoryName"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Category Name <span className="text-error-500">*</span>
              </label>

              <input
                id="categoryName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Handmade Jewellery"
                required
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label
                htmlFor="categoryImage"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Category Image URL
              </label>

              <input
                id="categoryImage"
                type="text"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="/uploads/categories/handmade-jewellery.jpg"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label
                htmlFor="categoryDescription"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>

              <textarea
                id="categoryDescription"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explain why this category is required."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            {image.trim() ? (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Image Preview
                </p>

                <div className="h-48 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <img
                    src={image}
                    alt="Category request preview"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/vendor/categories"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
            >
              {isSubmitting ? "Submitting Request..." : "Submit Request"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
          <div className="mb-5">
            <h2 className="font-heading text-xl text-gray-900 dark:text-white">
              My Category Requests
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track the review status of your submitted category requests.
            </p>
          </div>

          {isLoadingRequests ? (
            <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              Loading category requests...
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Slug: {request.slug}
                      </p>

                      {request.description ? (
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {request.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-gray-400">
                          No description added.
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {request.adminNote ? (
                    <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                      <span className="font-medium">Admin Note:</span>{" "}
                      {request.adminNote}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Submitted: {formatDate(request.createdAt)}</span>

                    {request.reviewedAt ? (
                      <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              No category requests submitted yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}