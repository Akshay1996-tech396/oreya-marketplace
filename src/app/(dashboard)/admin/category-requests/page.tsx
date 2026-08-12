"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CategoryRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type VendorCategoryRequest = {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  status: CategoryRequestStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    status: string;
  };
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

export default function AdminCategoryRequestsPage() {
  const [requests, setRequests] = useState<VendorCategoryRequest[]>([]);
  const [activeStatus, setActiveStatus] =
    useState<CategoryRequestStatus | "ALL">("PENDING");
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);

  const filteredRequests = useMemo(() => {
    if (activeStatus === "ALL") {
      return requests;
    }

    return requests.filter((request) => request.status === activeStatus);
  }, [requests, activeStatus]);

  const requestCounts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((request) => request.status === "PENDING")
        .length,
      approved: requests.filter((request) => request.status === "APPROVED")
        .length,
      rejected: requests.filter((request) => request.status === "REJECTED")
        .length,
    };
  }, [requests]);

  async function loadRequests() {
    try {
      setIsLoading(true);
      setMessage(null);

      const response = await fetch("/api/admin/category-requests", {
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
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  function updateAdminNote(requestId: string, value: string) {
    setAdminNotes((currentNotes) => ({
      ...currentNotes,
      [requestId]: value,
    }));
  }

  async function reviewRequest(requestId: string, action: "APPROVE" | "REJECT") {
    const confirmed = window.confirm(
      action === "APPROVE"
        ? "Approve this category request and create this category?"
        : "Reject this category request?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setReviewingId(requestId);
      setMessage(null);

      const response = await fetch(`/api/admin/category-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action,
          adminNote: adminNotes[requestId] || "",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to review category request.");
      }

      setMessage({
        type: "success",
        text: result.message || "Category request reviewed successfully.",
      });

      await loadRequests();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to review category request.",
      });
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Admin Panel</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Category Requests
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review category requests submitted by vendors. Approved requests
            become marketplace categories automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Back to Categories
          </Link>

          <Link
            href="/admin/categories/add"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Add Category
          </Link>
        </div>
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveStatus("ALL")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeStatus === "ALL"
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
          }`}
        >
          <p className="text-sm opacity-80">All Requests</p>
          <p className="mt-2 text-2xl font-semibold">{requestCounts.all}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("PENDING")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeStatus === "PENDING"
              ? "border-yellow-500 bg-yellow-500 text-white"
              : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
          }`}
        >
          <p className="text-sm opacity-80">Pending</p>
          <p className="mt-2 text-2xl font-semibold">
            {requestCounts.pending}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("APPROVED")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeStatus === "APPROVED"
              ? "border-green-600 bg-green-600 text-white"
              : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
          }`}
        >
          <p className="text-sm opacity-80">Approved</p>
          <p className="mt-2 text-2xl font-semibold">
            {requestCounts.approved}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("REJECTED")}
          className={`rounded-2xl border p-5 text-left shadow-sm transition ${
            activeStatus === "REJECTED"
              ? "border-red-600 bg-red-600 text-white"
              : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
          }`}
        >
          <p className="text-sm opacity-80">Rejected</p>
          <p className="mt-2 text-2xl font-semibold">
            {requestCounts.rejected}
          </p>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-5">
          <h2 className="font-heading text-xl text-gray-900 dark:text-white">
            Vendor Category Requests
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review pending requests and decide whether they should become
            marketplace categories.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            Loading category requests...
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-5">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 lg:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.name}
                      </h3>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Slug: {request.slug}
                    </p>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Requested by:{" "}
                      <span className="font-medium">
                        {request.vendor.businessName}
                      </span>
                    </p>

                    {request.description ? (
                      <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {request.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-gray-400">
                        No description added.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>Submitted: {formatDate(request.createdAt)}</span>

                      {request.reviewedAt ? (
                        <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                      ) : null}
                    </div>

                    {request.adminNote ? (
                      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        <span className="font-medium">Admin Note:</span>{" "}
                        {request.adminNote}
                      </div>
                    ) : null}
                  </div>

                  {request.image ? (
                    <div className="h-28 w-36 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900">
                      <img
                        src={request.image}
                        alt={request.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                {request.status === "PENDING" ? (
                  <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800">
                    <label
                      htmlFor={`adminNote-${request.id}`}
                      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Admin Note
                    </label>

                    <textarea
                      id={`adminNote-${request.id}`}
                      rows={3}
                      value={adminNotes[request.id] || ""}
                      onChange={(event) =>
                        updateAdminNote(request.id, event.target.value)
                      }
                      placeholder="Optional note for vendor."
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />

                    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => reviewRequest(request.id, "REJECT")}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingId === request.id
                          ? "Processing..."
                          : "Reject Request"}
                      </button>

                      <button
                        type="button"
                        onClick={() => reviewRequest(request.id, "APPROVE")}
                        disabled={reviewingId === request.id}
                        className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
                      >
                        {reviewingId === request.id
                          ? "Processing..."
                          : "Approve and Create Category"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            No category requests found for the selected status.
          </div>
        )}
      </div>
    </div>
  );
}