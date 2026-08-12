"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

type VendorStatusActionsProps = {
  vendorId: string;
  currentStatus: VendorStatus;
};

type StatusResponse = {
  success?: boolean;
  message?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function getActionLabel(status: VendorStatus) {
  if (status === "APPROVED") {
    return "Approve";
  }

  if (status === "REJECTED") {
    return "Reject";
  }

  if (status === "SUSPENDED") {
    return "Suspend";
  }

  return "Update";
}

function getLoadingLabel(status: VendorStatus) {
  if (status === "APPROVED") {
    return "Approving...";
  }

  if (status === "REJECTED") {
    return "Rejecting...";
  }

  if (status === "SUSPENDED") {
    return "Suspending...";
  }

  return "Updating...";
}

function getButtonClass(status: VendorStatus) {
  if (status === "APPROVED") {
    return "bg-green-600 text-white hover:bg-green-700";
  }

  if (status === "REJECTED") {
    return "bg-red-600 text-white hover:bg-red-700";
  }

  if (status === "SUSPENDED") {
    return "bg-gray-900 text-white hover:bg-black";
  }

  return "bg-black text-white hover:bg-gray-900";
}

export default function VendorStatusActions({
  vendorId,
  currentStatus,
}: VendorStatusActionsProps) {
  const router = useRouter();

  const [loadingStatus, setLoadingStatus] = useState<VendorStatus | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function updateStatus(status: VendorStatus) {
    const actionLabel = getActionLabel(status);

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel.toLowerCase()} this vendor?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingStatus(status);
      setMessage("");
      setMessageType("");

      const response = await fetch("/api/admin/vendors/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          vendorId,
          status,
        }),
      });

      const data = await readJsonResponse<StatusResponse>(response);

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Unable to update vendor status.");
        setMessageType("error");
        return;
      }

      setMessage(data.message || "Vendor status updated successfully.");
      setMessageType("success");

      router.refresh();
    } catch (error) {
      console.error("VENDOR_STATUS_UPDATE_ERROR", error);

      setMessage("Unable to update vendor status. Please try again.");
      setMessageType("error");
    } finally {
      setLoadingStatus(null);
    }
  }

  const isUpdating = loadingStatus !== null;

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus !== "APPROVED" ? (
          <button
            type="button"
            onClick={() => updateStatus("APPROVED")}
            disabled={isUpdating}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
              "APPROVED"
            )}`}
          >
            {loadingStatus === "APPROVED"
              ? getLoadingLabel("APPROVED")
              : getActionLabel("APPROVED")}
          </button>
        ) : null}

        {currentStatus !== "REJECTED" ? (
          <button
            type="button"
            onClick={() => updateStatus("REJECTED")}
            disabled={isUpdating}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
              "REJECTED"
            )}`}
          >
            {loadingStatus === "REJECTED"
              ? getLoadingLabel("REJECTED")
              : getActionLabel("REJECTED")}
          </button>
        ) : null}

        {currentStatus !== "SUSPENDED" ? (
          <button
            type="button"
            onClick={() => updateStatus("SUSPENDED")}
            disabled={isUpdating}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${getButtonClass(
              "SUSPENDED"
            )}`}
          >
            {loadingStatus === "SUSPENDED"
              ? getLoadingLabel("SUSPENDED")
              : getActionLabel("SUSPENDED")}
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}