"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentNote?: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

const bookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

const paymentStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
];

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminAppointmentStatusManager({
  bookingId,
  currentStatus,
  currentPaymentStatus,
  currentNote,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [note, setNote] = useState(currentNote || "");
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    setStatus(currentStatus);
    setPaymentStatus(currentPaymentStatus);
    setNote(currentNote || "");
  }, [currentStatus, currentPaymentStatus, currentNote]);

  async function updateBookingStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setStatusLoading(true);
      setStatusMessage("");
      setStatusError("");

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

      const data = (await response.json()) as ApiResponse;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setStatusError(
          data.message || "The booking status could not be updated."
        );
        return;
      }

      setStatusMessage(
        data.message || "The booking status was updated successfully."
      );
      router.refresh();
    } catch (error) {
      console.error("ADMIN_APPOINTMENT_STATUS_UPDATE_ERROR", error);
      setStatusError("An unexpected error occurred.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function updatePaymentStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setPaymentLoading(true);
      setPaymentMessage("");
      setPaymentError("");

      const response = await fetch("/api/admin/bookings/payment-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          paymentStatus,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setPaymentError(
          data.message || "The payment status could not be updated."
        );
        return;
      }

      setPaymentMessage(
        data.message || "The payment status was updated successfully."
      );
      router.refresh();
    } catch (error) {
      console.error("ADMIN_APPOINTMENT_PAYMENT_UPDATE_ERROR", error);
      setPaymentError("An unexpected error occurred.");
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5">
        <h2 className="font-heading text-lg text-gray-900 dark:text-white">
          Manage Appointment
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update booking and payment statuses. Successful changes are reflected
          in both the vendor and customer accounts.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={updateBookingStatus}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Booking Status
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={statusLoading}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          >
            {bookingStatuses.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>

          <label className="mb-2 mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Internal Note
          </label>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={statusLoading}
            rows={4}
            placeholder="Add an optional internal note."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          />

          {statusMessage ? (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {statusMessage}
            </p>
          ) : null}

          {statusError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={statusLoading}
            className="mt-4 w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {statusLoading ? "Updating..." : "Update Booking Status"}
          </button>
        </form>

        <form
          onSubmit={updatePaymentStatus}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment Status
          </label>

          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            disabled={paymentLoading}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          >
            {paymentStatuses.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>

          <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
            The updated payment status will be visible to both the vendor and
            the customer.
          </p>

          {paymentMessage ? (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {paymentMessage}
            </p>
          ) : null}

          {paymentError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {paymentError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={paymentLoading}
            className="mt-4 w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {paymentLoading ? "Updating..." : "Update Payment Status"}
          </button>
        </form>
      </div>
    </section>
  );
}