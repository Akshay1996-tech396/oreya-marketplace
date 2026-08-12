"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

type ServiceOption = {
  id: string;
  title: string;
  duration?: number | null;
  status: string;
};

type SlotValue = {
  id: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  note: string | null;
  isActive: boolean;
};

type Props = {
  slot: SlotValue;
  services: ServiceOption[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes <= 0) return "0 minutes";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return [
    hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
    minutes ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getTodayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function EditAppointmentSlotForm({
  slot,
  services,
}: Props) {
  const router = useRouter();

  const [serviceId, setServiceId] = useState(slot.serviceId);
  const [date, setDate] = useState(slot.date);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [note, setNote] = useState(slot.note || "");
  const [isActive, setIsActive] = useState(slot.isActive);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const minimumDate = useMemo(() => getTodayValue(), []);
  const hasBookings = slot.bookedCount > 0;

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId]
  );

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    return end > start ? end - start : 0;
  }, [startTime, endTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const numericCapacity = Number(capacity);

    if (!serviceId || !date || !startTime || !endTime) {
      setErrorMessage("Complete all mandatory slot fields.");
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

      const response = await fetch(
        `/api/vendor/appointment-slots/${slot.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            serviceId,
            date,
            startTime,
            endTime,
            capacity: numericCapacity,
            note: note.trim(),
            isActive,
          }),
        }
      );

      const data = (await response.json()) as ApiResponse;

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

      setMessage(
        data.message || "The appointment slot was updated successfully."
      );

      router.refresh();
    } catch (error) {
      console.error("UPDATE_APPOINTMENT_SLOT_ERROR", error);
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="font-heading text-2xl uppercase text-black">
          Edit Appointment Slot
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Update the appointment date, time, capacity, note, and availability.
        </p>
      </div>

      {hasBookings ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This slot already has {slot.bookedCount} booking
          {slot.bookedCount === 1 ? "" : "s"}. The service, date, and time
          cannot be changed.
        </div>
      ) : null}

      {message ? (
        <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
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
            className="mb-2 block text-sm font-medium text-black"
          >
            Service
          </label>

          <select
            id="appointment-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            disabled={loading || hasBookings}
            className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
                {service.duration
                  ? ` — ${formatDuration(service.duration)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedService?.duration ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-sm text-gray-500">
              Standard Service Duration
            </p>
            <p className="mt-1 font-semibold text-black">
              {formatDuration(selectedService.duration)}
            </p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="appointment-date"
            className="mb-2 block text-sm font-medium text-black"
          >
            Appointment Date
          </label>

          <CustomDatePicker
            id="appointment-date"
            name="appointmentDate"
            value={date}
            minDate={minimumDate}
            placeholder="Select appointment date"
            required
            disabled={loading || hasBookings}
            onChange={(selectedDate) => {
              setDate(String(selectedDate).slice(0, 10));
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="appointment-start-time"
              className="mb-2 block text-sm font-medium text-black"
            >
              Start Time
            </label>

            <input
              id="appointment-start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={loading || hasBookings}
              className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="appointment-end-time"
              className="mb-2 block text-sm font-medium text-black"
            >
              End Time
            </label>

            <input
              id="appointment-end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={loading || hasBookings}
              className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
              required
            />
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 px-5 py-4">
          <p className="text-sm text-gray-500">Calculated Slot Duration</p>
          <p className="mt-1 text-lg font-semibold text-black">
            {formatDuration(durationMinutes)}
          </p>
        </div>

        <div>
          <label
            htmlFor="appointment-capacity"
            className="mb-2 block text-sm font-medium text-black"
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
            className="w-full rounded-full border border-gray-200 px-5 py-3 text-sm outline-none transition focus:border-black"
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
            className="mb-2 block text-sm font-medium text-black"
          >
            Slot Note
          </label>

          <textarea
            id="appointment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            disabled={loading}
            className="min-h-[100px] w-full resize-y rounded-2xl border border-gray-200 px-5 py-4 text-sm outline-none transition focus:border-black"
          />

          <p className="mt-2 text-right text-xs text-gray-400">
            {note.length}/500
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 px-5 py-4 text-sm text-black">
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
          {loading ? "Updating Appointment Slot..." : "Update Appointment Slot"}
        </button>
      </form>
    </div>
  );
}