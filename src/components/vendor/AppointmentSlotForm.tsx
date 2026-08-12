"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

type VendorServiceOption = {
  id: string;
  title: string;
  status: string;
  duration?: number | null;
};

type VendorSummary = {
  businessName: string;
  status: string;
  email: string;
};

type AppointmentSlotFormProps = {
  services: VendorServiceOption[];
  vendor: VendorSummary;
};

type SlotApiResponse = {
  success?: boolean;
  message?: string;
};

function convertTimeToMinutes(value: string) {
  if (!value) return 0;

  const [hours, minutes] = value.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0;
  }

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

function getCurrentDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function getStatusClass(status: string) {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "DRAFT" || status === "PENDING") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }

  return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
}

export default function AppointmentSlotForm({
  services,
  vendor,
}: AppointmentSlotFormProps) {
  const router = useRouter();

  const availableServices = useMemo(
    () => services.filter((service) => service.status !== "INACTIVE"),
    [services]
  );

  const [serviceId, setServiceId] = useState(
    availableServices[0]?.id || ""
  );
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const minimumDate = useMemo(() => getCurrentDate(), []);

  const selectedService = useMemo(
    () =>
      availableServices.find((service) => service.id === serviceId) || null,
    [availableServices, serviceId]
  );

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;

    const startMinutes = convertTimeToMinutes(startTime);
    const endMinutes = convertTimeToMinutes(endTime);

    return endMinutes > startMinutes ? endMinutes - startMinutes : 0;
  }, [startTime, endTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!serviceId || !selectedService) {
      setErrorMessage("Please select a valid service.");
      return;
    }

    if (!date) {
      setErrorMessage("Please select an appointment date.");
      return;
    }

    if (date < minimumDate) {
      setErrorMessage("The appointment date cannot be in the past.");
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage("Please select both the start time and end time.");
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMessage("The end time must be later than the start time.");
      return;
    }

    const numericCapacity = Number(capacity);

    if (!Number.isInteger(numericCapacity) || numericCapacity < 1) {
      setErrorMessage("Capacity must be a whole number greater than zero.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/vendor/appointment-slots", {
        method: "POST",
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
      });

      const data = (await response.json()) as SlotApiResponse;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data.message || "The appointment slot could not be created."
        );
        return;
      }

      setSuccessMessage(
        data.message || "The appointment slot was created successfully."
      );

      setDate("");
      setStartTime("");
      setEndTime("");
      setCapacity("1");
      setNote("");
      setIsActive(true);

      router.refresh();
    } catch (error) {
      console.error("CREATE_VENDOR_APPOINTMENT_SLOT_ERROR", error);
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {successMessage ? (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {availableServices.length === 0 ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          No active services were found. Create or activate a service before
          adding an appointment slot.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Service Owner
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select one of your active services.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service
                </label>

                <select
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                >
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {vendor.businessName}
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {vendor.email}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        selectedService?.status || ""
                      )}`}
                    >
                      Service: {selectedService?.status || "N/A"}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        vendor.status
                      )}`}
                    >
                      Vendor: {vendor.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Date, Time and Capacity
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>

                <CustomDatePicker
                  id="appointment-date"
                  name="appointmentDate"
                  value={date}
                  minDate={minimumDate}
                  placeholder="Select appointment date"
                  required
                  onChange={(selectedDate) => {
                    setDate(String(selectedDate).slice(0, 10));
                    setSuccessMessage("");
                    setErrorMessage("");
                  }}
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Capacity
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  required
                />
              </div>

              <div className="lg:col-span-12">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Slot Duration
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Selected duration: {formatDuration(durationMinutes)}
                  </p>

                  {selectedService?.duration ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Service duration:{" "}
                      {formatDuration(selectedService.duration)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-12">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Internal Note
                </label>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="Optional note for this appointment slot."
                  className="min-h-[110px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />

                <p className="mt-2 text-right text-xs text-gray-400">
                  {note.length}/500
                </p>
              </div>

              <div className="lg:col-span-12">
                <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                  />

                  Keep this slot active and available for customer booking.
                </label>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Slot..." : "Add Slot"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}