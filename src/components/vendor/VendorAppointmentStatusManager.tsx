"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

type PaymentStatusValue =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

type BookingForEdit = {
  id: string;

  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;

  vendorId?: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerStatus?: string | null;
  ownerType: string;

  serviceTitle: string;
  serviceSlug: string;
  serviceStatus: string;
  serviceVendorId?: string | null;

  slotId: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  slotCapacity: number;
  slotBookedCount: number;
  slotIsActive: boolean;

  bookingDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: string;
  status: BookingStatusValue;
  paymentStatus: PaymentStatusValue;
  customerNote?: string | null;
  vendorNote?: string | null;
  cancelReason?: string | null;
  createdAt: string;
};

type Props = {
  booking: BookingForEdit;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

function getStatusClass(status: string) {
  if (
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "PAID" ||
    status === "ACTIVE" ||
    status === "APPROVED"
  ) {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "PENDING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "INACTIVE" ||
    status === "SUSPENDED"
  ) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function isNonActiveBookingStatus(status: BookingStatusValue) {
  return status === "CANCELLED" || status === "REJECTED";
}

async function readApiResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export default function VendorAppointmentStatusManager({ booking }: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<BookingStatusValue>(booking.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusValue>(
    booking.paymentStatus
  );
  const [vendorNote, setVendorNote] = useState(booking.vendorNote || "");
  const [cancelReason, setCancelReason] = useState(booking.cancelReason || "");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setStatus(booking.status);
    setPaymentStatus(booking.paymentStatus);
    setVendorNote(booking.vendorNote || "");
    setCancelReason(booking.cancelReason || "");
  }, [booking]);

  const paymentUpdateDisabled = isNonActiveBookingStatus(status);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    try {
      setLoading(true);

      /*
       * The existing Vendor booking-status API owns all slot-capacity,
       * booking-status and notification rules. It also uses vendorNote as the
       * cancellation/rejection reason for non-active statuses, so this page
       * keeps that existing behavior unchanged.
       */
      const noteForStatusUpdate = isNonActiveBookingStatus(status)
        ? cancelReason.trim()
        : vendorNote.trim();

      const bookingResponse = await fetch("/api/vendor/bookings/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId: booking.id,
          status,
          vendorNote: noteForStatusUpdate,
        }),
      });

      const bookingData = await readApiResponse(bookingResponse);

      if (bookingResponse.status === 401) {
        router.push("/login");
        return;
      }

      if (!bookingResponse.ok) {
        setErrorMessage(
          bookingData.message || "The booking status could not be updated."
        );
        return;
      }

      /*
       * Do not call the payment endpoint when the value has not changed.
       * This preserves the existing Stripe-controlled payment protection,
       * which intentionally rejects manual payment-status changes.
       */
      if (
        !paymentUpdateDisabled &&
        paymentStatus !== booking.paymentStatus
      ) {
        const paymentResponse = await fetch(
          "/api/vendor/bookings/payment-status",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              bookingId: booking.id,
              paymentStatus,
            }),
          }
        );

        const paymentData = await readApiResponse(paymentResponse);

        if (paymentResponse.status === 401) {
          router.push("/login");
          return;
        }

        if (!paymentResponse.ok) {
          setErrorMessage(
            paymentData.message || "The payment status could not be updated."
          );
          router.refresh();
          return;
        }
      }

      setSuccessMessage("Appointment updated successfully.");
      router.refresh();
    } catch (error) {
      console.error("UPDATE_VENDOR_APPOINTMENT_ERROR", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <form onSubmit={handleSubmit} className="space-y-6">
        {successMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Appointment Control
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Status and Payment
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Date and time are linked with the appointment slot. To change the
              timing, edit the slot from Vendor Slots.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Booking Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as BookingStatusValue)
                }
                disabled={loading}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Status
              </label>

              <select
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value as PaymentStatusValue)
                }
                disabled={loading || paymentUpdateDisabled}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
                {booking.paymentStatus === "CANCELLED" ? (
                  <option value="CANCELLED">Cancelled</option>
                ) : null}
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Internal Note
              </label>

              <textarea
                value={vendorNote}
                onChange={(event) => setVendorNote(event.target.value)}
                disabled={loading}
                placeholder="Add an internal note for this appointment."
                className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cancel / Rejection Reason
              </label>

              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                disabled={loading}
                placeholder="Add the reason when the appointment is cancelled or rejected."
                className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Read Only Details
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Appointment Summary
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Appointment Date
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {formatDate(booking.bookingDate)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Time
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {booking.startTime} - {booking.endTime}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Amount
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {formatMoney(booking.currency, booking.amount)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Created
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating Appointment..." : "Update Appointment"}
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Current Status
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Appointment State
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
                status
              )}`}
            >
              Booking: {status}
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
                paymentStatus
              )}`}
            >
              Payment: {paymentStatus}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">Customer</p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Customer Details
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            <p className="font-medium text-gray-800 dark:text-white/90">
              {booking.customerName}
            </p>

            <p className="text-gray-500 dark:text-gray-400">
              {booking.customerEmail}
            </p>

            <p className="text-gray-500 dark:text-gray-400">
              {booking.customerPhone || "No phone number added."}
            </p>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Customer Note
              </p>

              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {booking.customerNote || "No customer note added."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">
              Service and Owner
            </p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Linked Records
            </h2>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-800 dark:text-white/90">
                {booking.serviceTitle}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {booking.serviceSlug}
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                  booking.serviceStatus
                )}`}
              >
                {booking.serviceStatus}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="font-medium text-gray-800 dark:text-white/90">
                {booking.ownerName}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {booking.ownerEmail}
              </p>

              {booking.ownerStatus ? (
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                    booking.ownerStatus
                  )}`}
                >
                  Vendor: {booking.ownerStatus}
                </span>
              ) : (
                <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  Vendor-Owned
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <p className="text-sm font-medium text-brand-500">Slot</p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Slot Details
            </h2>
          </div>

          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>{formatDate(booking.slotDate)}</p>

            <p>
              {booking.slotStartTime} - {booking.slotEndTime}
            </p>

            <p>
              Capacity: {booking.slotCapacity} | Booked: {booking.slotBookedCount}
            </p>

            <p>Slot Active: {booking.slotIsActive ? "Yes" : "No"}</p>
          </div>
        </section>
      </aside>
    </div>
  );
}