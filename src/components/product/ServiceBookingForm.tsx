"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import CustomDatePicker from "@/components/ui/CustomDatePicker";

type AvailableAppointmentSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  capacity: number;
  bookedCount: number;
  note: string | null;
};

type ServiceBookingFormProps = {
  serviceId: string;
  serviceTitle: string;
  price: number;
  currency: string;
  slots: AvailableAppointmentSlot[];
  embedded?: boolean;
  actionPortalTargetId?: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
} | null;

type BookingDatePickerProps = {
  value?: string;
  date?: string;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  availableDates?: string[];
  allowedDates?: string[];
  placeholder?: string;
  className?: string;
  popupFullWidth?: boolean;
  disabled?: boolean;
  onChange?: (
    value: string | Date
  ) => void;
  onDateChange?: (
    value: string | Date
  ) => void;
  onSelect?: (
    value: string | Date
  ) => void;
};

const BookingDatePicker =
  CustomDatePicker as unknown as ComponentType<BookingDatePickerProps>;

function formatDateLabel(
  dateValue: string
) {
  return new Date(
    dateValue
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateKey(
  dateValue: string
) {
  return dateValue.slice(0, 10);
}

function formatDateInputValue(
  date: Date
) {
  const timezoneOffset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
      timezoneOffset
  )
    .toISOString()
    .split("T")[0];
}

function normalizeSelectedDate(
  value: string | Date
) {
  if (value instanceof Date) {
    return formatDateInputValue(
      value
    );
  }

  return getDateKey(
    String(value || "")
  );
}

function formatPrice(
  currency: string,
  price: number
) {
  return `${currency} ${Number(
    price || 0
  ).toFixed(2)}`;
}

function formatDuration(
  minutes: number | null
) {
  if (
    !minutes ||
    minutes <= 0
  ) {
    return "Flexible duration";
  }

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    }`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remainingMinutes =
    minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }

  return `${hours} ${
    hours === 1
      ? "hour"
      : "hours"
  } ${remainingMinutes} ${
    remainingMinutes === 1
      ? "minute"
      : "minutes"
  }`;
}

export default function ServiceBookingForm({
  serviceId,
  serviceTitle,
  price,
  currency,
  slots,
  embedded = false,
  actionPortalTargetId,
}: ServiceBookingFormProps) {
  const router = useRouter();

  const [actionPortalTarget, setActionPortalTarget] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!actionPortalTargetId) {
      setActionPortalTarget(null);
      return;
    }

    setActionPortalTarget(
      document.getElementById(actionPortalTargetId)
    );
  }, [actionPortalTargetId]);

  const availableDateKeys =
    useMemo(() => {
      return Array.from(
        new Set(
          slots.map((slot) =>
            getDateKey(slot.date)
          )
        )
      );
    }, [slots]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    availableDateKeys[0] || ""
  );

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] = useState("");

  const [
    customerNote,
    setCustomerNote,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<FormMessage>(null);

  const slotsForSelectedDate =
    useMemo(() => {
      return slots.filter(
        (slot) =>
          getDateKey(slot.date) ===
          selectedDate
      );
    }, [slots, selectedDate]);

  const selectedSlot =
    useMemo(() => {
      return (
        slots.find(
          (slot) =>
            slot.id ===
            selectedSlotId
        ) || null
      );
    }, [slots, selectedSlotId]);

  const minimumAvailableDate =
    availableDateKeys[0] || "";

  const maximumAvailableDate =
    availableDateKeys[
      availableDateKeys.length - 1
    ] || "";

  function handleDateChange(
    value: string | Date
  ) {
    const nextDate =
      normalizeSelectedDate(value);

    setSelectedDate(nextDate);
    setSelectedSlotId("");
    setMessage(null);
  }

  function continueToCheckout() {
    setMessage(null);

    if (!selectedSlotId) {
      setMessage({
        type: "error",
        text: "Please select an appointment time slot.",
      });

      return;
    }

    if (!selectedSlot) {
      setMessage({
        type: "error",
        text: "The selected appointment slot is no longer available.",
      });

      return;
    }

    setLoading(true);

    const returnPath =
      typeof window === "undefined"
        ? "/products"
        : `${window.location.pathname}${window.location.search}`;

    const checkoutParams =
      new URLSearchParams({
        checkoutType:
          "service-booking",
        serviceId,
        slotId: selectedSlot.id,
        customerNote:
          customerNote.trim(),
        returnPath,
      });

    router.push(
      `/checkout?${checkoutParams.toString()}`
    );
  }

  const bookingContent = (
    <div className="space-y-6" data-calendar-popup-boundary>
      {/* {embedded ? (
        <div className="flex flex-col gap-4 rounded-[18px] border border-[#e5e0d8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8176]">
              Selected Service
            </p>

            <p className="mt-1 break-words font-semibold text-[#111111]">
              {serviceTitle}
            </p>
          </div>

          <p className="shrink-0 font-heading text-2xl text-[#111111]">
            {formatPrice(
              currency,
              price
            )}
          </p>
        </div>
      ) : null} */}

      {slots.length === 0 ? (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          No appointment slots are
          currently available for this
          service. Please check again
          later.
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-[#111111]">
                Select Date
              </label>

              <span className="text-xs text-[#777777]">
                {
                  availableDateKeys.length
                }{" "}
                available{" "}
                {availableDateKeys.length ===
                1
                  ? "date"
                  : "dates"}
              </span>
            </div>

            <BookingDatePicker
              value={selectedDate}
              date={selectedDate}
              selectedDate={
                selectedDate
              }
              minDate={
                minimumAvailableDate
              }
              maxDate={
                maximumAvailableDate
              }
              availableDates={
                availableDateKeys
              }
              allowedDates={
                availableDateKeys
              }
              placeholder="Select appointment date"
              className="w-full"
              popupFullWidth
              onChange={
                handleDateChange
              }
              onDateChange={
                handleDateChange
              }
              onSelect={
                handleDateChange
              }
            />

            <p className="mt-2 text-xs leading-5 text-[#777777]">
              Only dates with available
              appointment slots can be
              selected.
            </p>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#111111]">
                Available Time Slots
              </p>

              {selectedSlot ? (
                <span className="rounded-full bg-[#f4f1ec] px-3 py-1 text-xs font-medium text-[#666666]">
                  Selected
                </span>
              ) : null}
            </div>

            {slotsForSelectedDate.length ===
            0 ? (
              <div className="rounded-[16px] border border-[#e5e0d8] bg-white p-4 text-sm text-[#777777]">
                No time slots are
                available for the
                selected date.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {slotsForSelectedDate.map(
                  (slot) => {
                    const isSelected =
                      selectedSlotId ===
                      slot.id;

                    const availableCount =
                      Math.max(
                        slot.capacity -
                          slot.bookedCount,
                        0
                      );

                    const isFull =
                      availableCount <= 0;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          if (!isFull) {
                            setSelectedSlotId(
                              slot.id
                            );
                            setMessage(
                              null
                            );
                          }
                        }}
                        disabled={
                          isFull
                        }
                        className={
                          isSelected
                            ? "rounded-[16px] border border-black bg-black p-4 text-left text-white shadow-lg shadow-black/10 transition"
                            : isFull
                              ? "cursor-not-allowed rounded-[16px] border border-[#e5e0d8] bg-[#f4f1ec] p-4 text-left text-[#999999] opacity-70"
                              : "rounded-[16px] border border-[#e5e0d8] bg-white p-4 text-left text-[#111111] transition hover:-translate-y-0.5 hover:border-black hover:shadow-md"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {
                                slot.startTime
                              }{" "}
                              -{" "}
                              {
                                slot.endTime
                              }
                            </p>

                            <p
                              className={
                                isSelected
                                  ? "mt-1 text-xs text-white/70"
                                  : "mt-1 text-xs text-[#777777]"
                              }
                            >
                              {formatDuration(
                                slot.durationMinutes
                              )}
                            </p>
                          </div>

                          <span
                            className={
                              isSelected
                                ? "rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white"
                                : isFull
                                  ? "rounded-full bg-[#e8e3dc] px-2.5 py-1 text-xs font-medium text-[#777777]"
                                  : "rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                            }
                          >
                            {isFull
                              ? "Full"
                              : `${availableCount} ${
                                  availableCount ===
                                  1
                                    ? "seat"
                                    : "seats"
                                }`}
                          </span>
                        </div>

                        {slot.note ? (
                          <p
                            className={
                              isSelected
                                ? "mt-3 text-xs leading-5 text-white/70"
                                : "mt-3 text-xs leading-5 text-[#777777]"
                            }
                          >
                            {
                              slot.note
                            }
                          </p>
                        ) : null}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">
              Customer Note
            </label>

            <textarea
              value={customerNote}
              onChange={(event) =>
                setCustomerNote(
                  event.target.value
                )
              }
              maxLength={1000}
              placeholder="Add any special request or instruction."
              className="min-h-[110px] w-full resize-none rounded-[16px] border border-[#e5e0d8] bg-white px-4 py-4 text-sm text-[#111111] outline-none transition placeholder:text-[#999999] focus:border-black focus:ring-4 focus:ring-black/5"
            />

            <p className="mt-1 text-right text-xs text-[#999999]">
              {customerNote.length}/1000
            </p>
          </div>

          {selectedSlot ? (
            <div className="rounded-[16px] border border-[#e5e0d8] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8176]">
                    Selected Appointment
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#111111]">
                    {formatDateLabel(
                      getDateKey(
                        selectedSlot.date
                      )
                    )}
                    ,{" "}
                    {
                      selectedSlot.startTime
                    }{" "}
                    -{" "}
                    {
                      selectedSlot.endTime
                    }
                  </p>
                </div>

                <p className="font-semibold text-[#111111]">
                  {formatPrice(
                    currency,
                    price
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className={`rounded-[14px] border px-4 py-3 text-sm ${
                message.type ===
                "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {actionPortalTargetId ? (
            actionPortalTarget
              ? createPortal(
                  <button
                    type="button"
                    onClick={continueToCheckout}
                    disabled={loading || !selectedSlotId}
                    className="h-12 w-full rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Opening Checkout..."
                      : "Book Appointment"}
                  </button>,
                  actionPortalTarget
                )
              : null
          ) : (
            <button
              type="button"
              onClick={continueToCheckout}
              disabled={loading || !selectedSlotId}
              className="h-12 w-full rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Opening Checkout..."
                : "Book Appointment"}
            </button>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return bookingContent;
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#e5e0d8] bg-white shadow-[0_18px_50px_rgba(17,17,17,0.08)]">
      <div className="border-b border-[#e8e2d9] bg-[#f8f6f2] px-6 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8176]">
              Appointment Booking
            </p>

            <h2 className="mt-2 font-heading text-2xl uppercase tracking-wide text-[#111111]">
              Book Your Slot
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#777777]">
              Select a preferred date
              and time for{" "}
              {serviceTitle}. Your
              booking request will be
              submitted securely.
            </p>
          </div>

          <div className="rounded-[16px] border border-[#e5e0d8] bg-white px-4 py-3 text-left shadow-sm sm:text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-[#999999]">
              Service Price
            </p>

            <p className="mt-1 text-xl font-semibold text-[#111111]">
              {formatPrice(
                currency,
                price
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        {bookingContent}
      </div>
    </div>
  );
}