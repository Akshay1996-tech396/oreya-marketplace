"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AdminBookingStatusButtonProps = {
  bookingId: string;
  currentStatus: string;
  vendorNote?: string | null;
  cancelReason?: string | null;
};

type BookingStatusResponse = {
  success?: boolean;
  message?: string;
};

const bookingStatusOptions = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

export default function AdminBookingStatusButton({
  bookingId,
  currentStatus,
  vendorNote,
  cancelReason,
}: AdminBookingStatusButtonProps) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(vendorNote || cancelReason || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const response = await fetch("/api/admin/bookings/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          status,
          note,
        }),
      });

      const data: BookingStatusResponse = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(data.message || "Booking status update nahi hua.");
        return;
      }

      setMessage(data.message || "Booking status updated successfully.");
      router.refresh();
    } catch (error) {
      console.error("ADMIN_UPDATE_BOOKING_STATUS_ERROR", error);
      setErrorMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <label className="mb-2 block text-xs uppercase text-gray-500">
        Admin Booking Status
      </label>

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        disabled={loading}
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bookingStatusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <label className="mb-2 mt-4 block text-xs uppercase text-gray-500">
        Admin Note
      </label>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={loading}
        placeholder="Optional note..."
        className="min-h-[90px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-60"
      />

      {message && (
        <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update Booking"}
      </button>
    </form>
  );
}