"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorOrderStatusButtonProps = {
  orderItemId: string;
  currentStatus: string;
  vendorNote?: string | null;
};

const orderStatuses = [
  {
    value: "PENDING",
    label: "Pending",
  },
  {
    value: "PROCESSING",
    label: "Processing",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
  {
    value: "REFUNDED",
    label: "Refunded",
  },
];

export default function VendorOrderStatusButton({
  orderItemId,
  currentStatus,
  vendorNote,
}: VendorOrderStatusButtonProps) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus || "PENDING");
  const [note, setNote] = useState(vendorNote || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function updateStatus() {
    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/vendor/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderItemId,
          status,
          vendorNote: note,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(data.message || "Order status update nahi hua.");
        return;
      }

      setMessage(data.message || "Order status updated.");
      router.refresh();
    } catch (error) {
      console.error("UPDATE_VENDOR_ORDER_STATUS_ERROR", error);
      setErrorMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
        Order Status
      </label>

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-xs outline-none focus:border-black"
      >
        {orderStatuses.map((orderStatus) => (
          <option key={orderStatus.value} value={orderStatus.value}>
            {orderStatus.label}
          </option>
        ))}
      </select>

      <label className="mb-2 mt-3 block text-xs font-semibold uppercase text-gray-500">
        Vendor Note
      </label>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note..."
        className="min-h-[70px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs outline-none focus:border-black"
      />

      {message && <p className="mt-2 text-xs text-green-700">{message}</p>}

      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={updateStatus}
        disabled={loading}
        className="mt-3 w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update Status"}
      </button>
    </div>
  );
}