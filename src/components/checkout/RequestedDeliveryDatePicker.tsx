"use client";

import {
  useMemo,
  useState,
  type ComponentType,
} from "react";

import CustomDatePicker from "@/components/ui/CustomDatePicker";

type DeliveryTimePeriod =
  | "MORNING"
  | "AFTERNOON"
  | "EVENING";

type CheckoutDatePickerProps = {
  value?: string;
  date?: string;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  availableDates?: string[];
  allowedDates?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onChange?: (value: string | Date) => void;
  onDateChange?: (value: string | Date) => void;
  onSelect?: (value: string | Date) => void;
};

type RequestedDeliveryDatePickerProps = {
  minimumDeliveryDate: string;
  deliveryLeadTimeHours: number;
  deliveryLeadTimeLabel: string;
  earliestDeliveryLabel: string;
};

type DeliveryTimeOption = {
  value: DeliveryTimePeriod;
  title: string;
  timeRange: string;
  description: string;
};

const CheckoutDatePicker =
  CustomDatePicker as unknown as ComponentType<CheckoutDatePickerProps>;

const deliveryTimeOptions: DeliveryTimeOption[] = [
  {
    value: "MORNING",
    title: "Morning",
    timeRange: "8:00 AM – 12:00 PM",
    description:
      "Suitable for deliveries required before midday.",
  },
  {
    value: "AFTERNOON",
    title: "Afternoon",
    timeRange: "12:00 PM – 5:00 PM",
    description:
      "Suitable for deliveries required during business hours.",
  },
  {
    value: "EVENING",
    title: "Evening",
    timeRange: "5:00 PM – 9:00 PM",
    description:
      "Suitable for deliveries required after business hours.",
  },
];

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeSelectedDate(
  value: string | Date
) {
  if (value instanceof Date) {
    return formatDateInputValue(value);
  }

  return String(value || "").slice(0, 10);
}

function getSafeInitialDate(
  minimumDeliveryDate: string
) {
  return (
    minimumDeliveryDate ||
    formatDateInputValue(new Date())
  );
}

export default function RequestedDeliveryDatePicker({
  minimumDeliveryDate,
  deliveryLeadTimeHours,
  deliveryLeadTimeLabel,
  earliestDeliveryLabel,
}: RequestedDeliveryDatePickerProps) {
  const safeMinimumDeliveryDate = useMemo(() => {
    return getSafeInitialDate(
      minimumDeliveryDate
    );
  }, [minimumDeliveryDate]);

  const [
    isRequestedDeliveryEnabled,
    setIsRequestedDeliveryEnabled,
  ] = useState(false);

  const [
    requestedDeliveryDate,
    setRequestedDeliveryDate,
  ] = useState(safeMinimumDeliveryDate);

  const [
    requestedDeliveryTimePeriod,
    setRequestedDeliveryTimePeriod,
  ] = useState<DeliveryTimePeriod>("MORNING");

  function handleDeliveryScheduleToggle(
    enabled: boolean
  ) {
    setIsRequestedDeliveryEnabled(enabled);

    if (!enabled) {
      setRequestedDeliveryDate(
        safeMinimumDeliveryDate
      );

      setRequestedDeliveryTimePeriod(
        "MORNING"
      );
    }
  }

  function handleDeliveryDateChange(
    value: string | Date
  ) {
    const nextDate =
      normalizeSelectedDate(value);

    if (!nextDate) {
      setRequestedDeliveryDate(
        safeMinimumDeliveryDate
      );

      return;
    }

    if (
      nextDate < safeMinimumDeliveryDate
    ) {
      setRequestedDeliveryDate(
        safeMinimumDeliveryDate
      );

      return;
    }

    setRequestedDeliveryDate(nextDate);
  }

  return (
    <div>
      <input
        type="hidden"
        name="isRequestedDeliveryDateEnabled"
        value={
          isRequestedDeliveryEnabled
            ? "true"
            : "false"
        }
      />

      <input
        type="hidden"
        name="deliveryLeadTimeHours"
        value={deliveryLeadTimeHours}
      />

      <input
        type="hidden"
        name="requestedDeliveryDate"
        value={
          isRequestedDeliveryEnabled
            ? requestedDeliveryDate
            : ""
        }
      />

      <input
        type="hidden"
        name="requestedDeliveryTimePeriod"
        value={
          isRequestedDeliveryEnabled
            ? requestedDeliveryTimePeriod
            : ""
        }
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300">
        <input
          type="checkbox"
          checked={
            isRequestedDeliveryEnabled
          }
          onChange={(event) =>
            handleDeliveryScheduleToggle(
              event.target.checked
            )
          }
          className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
        />

        <span>
          <span className="block text-sm font-semibold text-black">
            Request a preferred delivery
            date and time
          </span>

          <span className="mt-1 block text-xs leading-5 text-gray-500">
            Enable this option when the
            customer requires delivery on a
            specific date and during a
            preferred time period, such as
            for a gift or special occasion.
          </span>
        </span>
      </label>

      {isRequestedDeliveryEnabled ? (
        <div className="mt-5 space-y-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Preferred Delivery Date{" "}
              <span className="text-red-500">
                *
              </span>
            </label>

            <CheckoutDatePicker
              value={
                requestedDeliveryDate
              }
              date={
                requestedDeliveryDate
              }
              selectedDate={
                requestedDeliveryDate
              }
              minDate={
                safeMinimumDeliveryDate
              }
              placeholder="Select the preferred delivery date"
              className="w-full"
              onChange={
                handleDeliveryDateChange
              }
              onDateChange={
                handleDeliveryDateChange
              }
              onSelect={
                handleDeliveryDateChange
              }
            />

            <p className="mt-3 text-xs leading-5 text-gray-500">
              The selected date must allow
              for the minimum preparation
              time of{" "}
              {deliveryLeadTimeLabel}. The
              earliest available delivery
              date is{" "}
              {earliestDeliveryLabel}.
            </p>
          </div>

          <fieldset>
            <legend className="mb-3 block text-sm font-semibold text-gray-900">
              Preferred Delivery Time{" "}
              <span className="text-red-500">
                *
              </span>
            </legend>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {deliveryTimeOptions.map(
                (option) => {
                  const isSelected =
                    requestedDeliveryTimePeriod ===
                    option.value;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-black bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="requestedDeliveryTimePeriodSelection"
                        value={
                          option.value
                        }
                        checked={
                          isSelected
                        }
                        onChange={() =>
                          setRequestedDeliveryTimePeriod(
                            option.value
                          )
                        }
                        className="sr-only"
                      />

                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">
                            {option.title}
                          </span>

                          <span className="mt-1 block text-xs font-medium text-gray-700">
                            {
                              option.timeRange
                            }
                          </span>
                        </span>

                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-black bg-black"
                              : "border-gray-300 bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </span>

                      <span className="mt-3 block text-xs leading-5 text-gray-500">
                        {
                          option.description
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              The selected period represents
              the customer&apos;s preferred
              delivery window. The precise
              delivery time may vary
              depending on order processing,
              traffic and courier
              availability.
            </p>
          </fieldset>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs leading-5 text-blue-800">
              Preferred delivery scheduling
              is a customer request and does
              not override the minimum
              preparation period required by
              the vendor.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          No preferred delivery schedule
          will be recorded. The order will
          follow the vendor&apos;s standard
          preparation and delivery process.
        </p>
      )}
    </div>
  );
}