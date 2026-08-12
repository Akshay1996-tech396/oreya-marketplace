"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { ComponentType } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

type AdminServiceOption = {
  id: string;
  title: string;
  status: string;
  duration?: number | null;
  vendorId?: string | null;
  vendor: {
    id: string;
    businessName: string;
    status: string;
    user: {
      email: string;
    };
  } | null;
};

type SlotForEdit = {
  id: string;
  vendorId?: string | null;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number | null;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  note?: string | null;
  bookingsCount: number;
};

type Props = {
  slot: SlotForEdit;
  services: AdminServiceOption[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

type DatePickerProps = {
  id?: string;
  name?: string;
  value?: string;
  minDate?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string | Date) => void;
};

const AdminDatePicker =
  CustomDatePicker as unknown as ComponentType<DatePickerProps>;

function formatDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getTodayValue() {
  return formatDateValue(new Date());
}

function normalizeDateValue(value: string | Date) {
  if (value instanceof Date) {
    return formatDateValue(value);
  }

  return String(value || "").slice(0, 10);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "0 minutes";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return [
    hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
    minutes ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getOwnerLabel(service: AdminServiceOption) {
  return service.vendor?.businessName || "Administrator Service";
}

export default function AdminAppointmentSlotEditForm({
  slot,
  services,
}: Props) {
  const router = useRouter();

  const availableServices = useMemo(
    () =>
      services.filter((service) => {
        if (service.status === "INACTIVE") {
          return false;
        }

        if (!service.vendorId || !service.vendor) {
          return true;
        }

        return service.vendor.status === "APPROVED";
      }),
    [services]
  );

  const [serviceId, setServiceId] = useState(slot.serviceId);
  const [date, setDate] = useState(normalizeDateValue(slot.date));
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [note, setNote] = useState(slot.note || "");
  const [isActive, setIsActive] = useState(slot.isActive);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const minimumDate = useMemo(() => getTodayValue(), []);
  const hasBookings = slot.bookingsCount > 0;

  const selectedService = useMemo(
    () =>
      availableServices.find((service) => service.id === serviceId) || null,
    [availableServices, serviceId]
  );

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) {
      return 0;
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    return end > start ? end - start : 0;
  }, [startTime, endTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    const numericCapacity = Number(capacity);

    if (!serviceId || !selectedService) {
      setErrorMessage("Please select a valid service.");
      return;
    }

    if (!date || !startTime || !endTime) {
      setErrorMessage("Complete all mandatory appointment slot fields.");
      return;
    }

    if (date < minimumDate) {
      setErrorMessage("The appointment date cannot be in the past.");
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMessage("The end time must be later than the start time.");
      return;
    }

    if (
      !Number.isInteger(numericCapacity) ||
      numericCapacity < Math.max(1, slot.bookedCount)
    ) {
      setErrorMessage(
        `Capacity must be at least ${Math.max(1, slot.bookedCount)}.`
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          serviceId,
          vendorId: selectedService.vendorId || null,
          date,
          startTime,
          endTime,
          capacity: numericCapacity,
          note: note.trim(),
          isActive,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = (await response.json()) as ApiResponse;
      } catch {
        data = {};
      }

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data.message || "The appointment slot could not be updated."
        );
        return;
      }

      setSuccessMessage(
        data.message || "The appointment slot was updated successfully."
      );

      router.refresh();
    } catch (error) {
      console.error("ADMIN_APPOINTMENT_SLOT_UPDATE_ERROR", error);
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6">
        <h2 className="font-heading text-2xl uppercase text-black dark:text-white">
          Edit Appointment Slot
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Update the appointment date, time, capacity, note, and availability.
        </p>
      </div>

      {hasBookings ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          This slot already has {slot.bookingsCount} booking
          {slot.bookingsCount === 1 ? "" : "s"}. The service, date, and time
          cannot be changed.
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="appointment-service"
            className="mb-2 block text-sm font-medium text-black dark:text-white"
          >
            Service
          </label>

          <select
            id="appointment-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            disabled={loading || hasBookings}
            className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            required
          >
            {availableServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title} — {getOwnerLabel(service)}
                {service.duration
                  ? ` — ${formatDuration(service.duration)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedService?.duration ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Standard Service Duration
            </p>

            <p className="mt-1 font-semibold text-black dark:text-white">
              {formatDuration(selectedService.duration)}
            </p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="appointment-date"
            className="mb-2 block text-sm font-medium text-black dark:text-white"
          >
            Appointment Date
          </label>

          <AdminDatePicker
            id="appointment-date"
            name="appointmentDate"
            value={date}
            minDate={minimumDate}
            placeholder="Select appointment date"
            required
            disabled={loading || hasBookings}
            className="w-full"
            onChange={(selectedDate) => {
              setDate(normalizeDateValue(selectedDate));
              setSuccessMessage("");
              setErrorMessage("");
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="appointment-start-time"
              className="mb-2 block text-sm font-medium text-black dark:text-white"
            >
              Start Time
            </label>

            <input
              id="appointment-start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={loading || hasBookings}
              className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="appointment-end-time"
              className="mb-2 block text-sm font-medium text-black dark:text-white"
            >
              End Time
            </label>

            <input
              id="appointment-end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={loading || hasBookings}
              className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Calculated Slot Duration
          </p>

          <p className="mt-1 text-lg font-semibold text-black dark:text-white">
            {formatDuration(durationMinutes)}
          </p>
        </div>

        <div>
          <label
            htmlFor="appointment-capacity"
            className="mb-2 block text-sm font-medium text-black dark:text-white"
          >
            Capacity
          </label>

          <input
            id="appointment-capacity"
            type="number"
            min={Math.max(1, slot.bookedCount)}
            step="1"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            disabled={loading}
            className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            required
          />

          <p className="mt-2 text-xs text-gray-500">
            Current bookings: {slot.bookedCount}. Capacity cannot be lower
            than the number of existing bookings.
          </p>
        </div>

        <div>
          <label
            htmlFor="appointment-note"
            className="mb-2 block text-sm font-medium text-black dark:text-white"
          >
            Slot Note
          </label>

          <textarea
            id="appointment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            disabled={loading}
            className="min-h-[100px] w-full resize-y rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none transition focus:border-black dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />

          <p className="mt-2 text-right text-xs text-gray-400">
            {note.length}/500
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 px-5 py-4 text-sm text-black dark:border-gray-800 dark:text-white">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={loading}
            className="h-4 w-4 cursor-pointer accent-black"
          />

          <span>Make this appointment slot active</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Updating Appointment Slot..."
            : "Update Appointment Slot"}
        </button>
      </form>
    </div>
  );
}