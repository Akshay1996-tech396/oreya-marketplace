"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CustomerBookingCancelButtonProps = {
  bookingId: string;
  currentStatus: string;
  cancelReason?: string | null;
};

type CancelBookingResponse = {
  success?: boolean;
  message?: string;
};

export default function CustomerBookingCancelButton({
  bookingId,
  currentStatus,
  cancelReason,
}: CustomerBookingCancelButtonProps) {
  const router = useRouter();

  const [reason, setReason] = useState(cancelReason || "");
  const [showReasonBox, setShowReasonBox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const cannotCancel =
    currentStatus === "CANCELLED" ||
    currentStatus === "REJECTED" ||
    currentStatus === "COMPLETED";

  async function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/customer/bookings/cancel", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          cancelReason: reason,
        }),
      });

      const data: CancelBookingResponse = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(data.message || "Booking cancel nahi hui.");
        return;
      }

      setMessage(data.message || "Booking cancelled successfully.");
      router.refresh();
    } catch (error) {
      console.error("CUSTOMER_CANCEL_BOOKING_ERROR", error);
      setErrorMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (cannotCancel) {
    return (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs uppercase text-gray-400">Cancel Booking</p>

        <p className="mt-1 text-sm text-gray-600">
          This booking cannot be cancelled now.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
      {!showReasonBox ? (
        <button
          type="button"
          onClick={() => setShowReasonBox(true)}
          className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Cancel Booking
        </button>
      ) : (
        <form onSubmit={handleCancel}>
          <label className="mb-2 block text-xs uppercase text-red-500">
            Cancel Reason
          </label>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason optional hai..."
            disabled={loading}
            className="min-h-[90px] w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {message && (
            <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
              {message}
            </p>
          )}

          {errorMessage && (
            <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Cancelling..." : "Confirm Cancel"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowReasonBox(false);
                setErrorMessage("");
                setMessage("");
              }}
              disabled={loading}
              className="rounded-full border border-red-600 px-5 py-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </form>
      )}
    </div>
  );
}