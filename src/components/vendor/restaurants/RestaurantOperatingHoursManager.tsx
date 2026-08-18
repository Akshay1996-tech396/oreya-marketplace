"use client";

import { useMemo, useState, type ReactNode } from "react";

type OperatingHour = {
  id: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  slotMinutes: number | null;
  lastReservationTime: string | null;
};

type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  location: string;
  isTableReservationAvailable: boolean;
  reservationSlotMinutes: number;
  reservationBufferMinutes: number;
  reservationAdvanceDays: number;
  reservationNoticeMinutes: number;
  allowSameDayReservation: boolean;
  tableCount: number;
  reservationCount: number;
  operatingHours: OperatingHour[];
};

type OperatingHourFormState = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  slotMinutes: string;
  lastReservationTime: string;
};

type RestaurantOperatingHoursManagerProps = {
  restaurant: RestaurantSummary;
  apiBasePath?: string;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function createDefaultSchedule(): OperatingHourFormState[] {
  return dayLabels.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    openTime: "10:00",
    closeTime: "22:00",
    slotMinutes: "",
    lastReservationTime: "",
  }));
}

function mergeInitialHours(
  initialHours: OperatingHour[]
): OperatingHourFormState[] {
  const defaultSchedule = createDefaultSchedule();

  return defaultSchedule.map((defaultHour) => {
    const savedHour = initialHours.find(
      (hour) => hour.dayOfWeek === defaultHour.dayOfWeek
    );

    if (!savedHour) {
      return defaultHour;
    }

    return {
      dayOfWeek: savedHour.dayOfWeek,
      isClosed: savedHour.isClosed,
      openTime: savedHour.openTime || "10:00",
      closeTime: savedHour.closeTime || "22:00",
      slotMinutes:
        savedHour.slotMinutes === null ? "" : String(savedHour.slotMinutes),
      lastReservationTime: savedHour.lastReservationTime || "",
    };
  });
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimeLabel(value: string | null | undefined) {
  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return "Not set";
  }

  let hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(
    2,
    "0"
  )} ${period}`;
}

function getPreviewText(hour: OperatingHourFormState) {
  if (hour.isClosed) {
    return "Closed";
  }

  const openTime = formatTimeLabel(hour.openTime);
  const closeTime = formatTimeLabel(hour.closeTime);
  const lastReservationTime = hour.lastReservationTime
    ? formatTimeLabel(hour.lastReservationTime)
    : "Closing time";

  return `${openTime} - ${closeTime} · Last reservation: ${lastReservationTime}`;
}

function getSlotDurationLabel(value: string, defaultSlotMinutes: number) {
  if (!value) {
    return `Restaurant default (${defaultSlotMinutes} minutes)`;
  }

  const slotMinutes = Number(value);

  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0) {
    return "Invalid slot duration";
  }

  if (slotMinutes === 60) {
    return "1 hour";
  }

  if (slotMinutes < 60) {
    return `${slotMinutes} minutes`;
  }

  const hours = Math.floor(slotMinutes / 60);
  const minutes = slotMinutes % 60;

  if (minutes === 0) {
    return `${hours} hours`;
  }

  return `${hours} hours ${minutes} minutes`;
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </h3>
      {helper ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function SmallButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
    >
      {children}
    </button>
  );
}

export default function RestaurantOperatingHoursManager({
  restaurant,
  apiBasePath = "/api/vendor/restaurants",
}: RestaurantOperatingHoursManagerProps) {
  const [schedule, setSchedule] = useState<OperatingHourFormState[]>(() =>
    mergeInitialHours(restaurant.operatingHours)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const openDayCount = useMemo(
    () => schedule.filter((hour) => !hour.isClosed).length,
    [schedule]
  );

  const closedDayCount = useMemo(
    () => schedule.filter((hour) => hour.isClosed).length,
    [schedule]
  );

  function updateScheduleItem(
    dayOfWeek: number,
    updates: Partial<OperatingHourFormState>
  ) {
    setSchedule((currentSchedule) =>
      currentSchedule.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...updates } : hour
      )
    );
  }

  function copyMondayToAllDays() {
    const monday = schedule.find((hour) => hour.dayOfWeek === 1);

    if (!monday) {
      return;
    }

    setSchedule((currentSchedule) =>
      currentSchedule.map((hour) => ({
        ...monday,
        dayOfWeek: hour.dayOfWeek,
      }))
    );
  }

  function closeWeekends() {
    setSchedule((currentSchedule) =>
      currentSchedule.map((hour) =>
        hour.dayOfWeek === 0 || hour.dayOfWeek === 6
          ? { ...hour, isClosed: true }
          : hour
      )
    );
  }

  function openAllDays() {
    setSchedule((currentSchedule) =>
      currentSchedule.map((hour) => ({
        ...hour,
        isClosed: false,
        openTime: hour.openTime || "10:00",
        closeTime: hour.closeTime || "22:00",
        slotMinutes: hour.slotMinutes,
      }))
    );
  }

  function useDefaultSlotForAllDays() {
    setSchedule((currentSchedule) =>
      currentSchedule.map((hour) => ({
        ...hour,
        slotMinutes: "",
      }))
    );
    setMessage(null);
  }

  function resetToDefault() {
    setSchedule(createDefaultSchedule());
    setMessage(null);
  }

  function validateSchedule() {
    const invalidHour = schedule.find((hour) => {
      if (hour.isClosed) {
        return false;
      }

      const openTime = parseTimeToMinutes(hour.openTime);
      const closeTime = parseTimeToMinutes(hour.closeTime);
      const hasSlotOverride = Boolean(hour.slotMinutes);
      const slotMinutes = hasSlotOverride ? Number(hour.slotMinutes) : null;

      return (
        openTime === null ||
        closeTime === null ||
        closeTime <= openTime ||
        (hasSlotOverride &&
          (!Number.isInteger(slotMinutes) || Number(slotMinutes) < 15))
      );
    });

    if (!invalidHour) {
      return null;
    }

    return `${dayLabels[invalidHour.dayOfWeek]} has invalid operating hour settings.`;
  }

  async function saveOperatingHours() {
    const validationError = validateSchedule();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${apiBasePath}/${restaurant.id}/operating-hours`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hours: schedule.map((hour) => ({
              dayOfWeek: hour.dayOfWeek,
              isClosed: hour.isClosed,
              openTime: hour.isClosed ? null : hour.openTime,
              closeTime: hour.isClosed ? null : hour.closeTime,
              slotMinutes:
                hour.isClosed || !hour.slotMinutes
                  ? null
                  : Number(hour.slotMinutes),
              lastReservationTime:
                hour.isClosed || !hour.lastReservationTime
                  ? null
                  : hour.lastReservationTime,
            })),
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to save operating hours.");
      }

      setMessage({
        type: "success",
        text: result.message || "Operating hours saved successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save operating hours.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">Restaurant</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              {restaurant.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {restaurant.location}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${
              restaurant.isTableReservationAvailable
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {restaurant.isTableReservationAvailable
              ? "Reservation Enabled"
              : "Reservation Disabled"}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Open Days"
          value={openDayCount}
          helper={`${closedDayCount} closed day${closedDayCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Tables"
          value={restaurant.tableCount}
          helper="Configured tables"
        />
        <StatCard
          label="Reservations"
          value={restaurant.reservationCount}
          helper="Total received"
        />
        <StatCard
          label="Default Slot"
          value={`${restaurant.reservationSlotMinutes} min`}
          helper="Restaurant default"
        />
        <StatCard
          label="Buffer Time"
          value={`${restaurant.reservationBufferMinutes} min`}
          helper="Between reservations"
        />
      </div>

      {message ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Section
        title="Weekly Schedule"
        subtitle="Manage opening and closing hours for each day of the week."
        actions={
          <>
            <SmallButton onClick={copyMondayToAllDays} disabled={isSaving}>
              Copy Monday to All
            </SmallButton>
            <SmallButton onClick={closeWeekends} disabled={isSaving}>
              Close Weekends
            </SmallButton>
            <SmallButton onClick={openAllDays} disabled={isSaving}>
              Open All Days
            </SmallButton>
            <SmallButton
              onClick={useDefaultSlotForAllDays}
              disabled={isSaving}
            >
              Use Default Slot for All
            </SmallButton>
          </>
        }
      >
        <div className="hidden grid-cols-12 gap-4 border-b border-gray-200 pb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400 xl:grid">
          <div className="col-span-2">Day</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Opening Time</div>
          <div className="col-span-2">Closing Time</div>
          <div className="col-span-2">Slot Duration</div>
          <div className="col-span-2">Last Reservation</div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {schedule.map((hour) => (
            <div
              key={hour.dayOfWeek}
              className="grid grid-cols-1 gap-4 py-5 xl:grid-cols-12 xl:items-start"
            >
              <div className="xl:col-span-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {dayLabels[hour.dayOfWeek]}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 xl:hidden">
                  {getPreviewText(hour)}
                </p>
              </div>

              <div className="xl:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <input
                    type="checkbox"
                    checked={!hour.isClosed}
                    onChange={(event) =>
                      updateScheduleItem(hour.dayOfWeek, {
                        isClosed: !event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {hour.isClosed ? "Closed" : "Open"}
                  </span>
                </label>
              </div>

              <div className="xl:col-span-2">
                <input
                  type="time"
                  value={hour.openTime}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateScheduleItem(hour.dayOfWeek, {
                      openTime: event.target.value,
                    })
                  }
                  className={inputClassName}
                />
              </div>

              <div className="xl:col-span-2">
                <input
                  type="time"
                  value={hour.closeTime}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateScheduleItem(hour.dayOfWeek, {
                      closeTime: event.target.value,
                    })
                  }
                  className={inputClassName}
                />
              </div>

              <div className="xl:col-span-2">
                <select
                  value={hour.slotMinutes}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateScheduleItem(hour.dayOfWeek, {
                      slotMinutes: event.target.value,
                    })
                  }
                  className={selectClassName}
                >
                  <option value="">
                    Restaurant default ({restaurant.reservationSlotMinutes} minutes)
                  </option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>

                {!hour.isClosed ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {getSlotDurationLabel(
                      hour.slotMinutes,
                      restaurant.reservationSlotMinutes
                    )}
                  </p>
                ) : null}
              </div>

              <div className="xl:col-span-2">
                <input
                  type="time"
                  value={hour.lastReservationTime}
                  disabled={hour.isClosed}
                  onChange={(event) =>
                    updateScheduleItem(hour.dayOfWeek, {
                      lastReservationTime: event.target.value,
                    })
                  }
                  className={inputClassName}
                />

                {!hour.isClosed ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optional. Leave empty to use closing time.
                  </p>
                ) : null}
              </div>

              <div className="xl:col-span-12">
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {getPreviewText(hour)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Slots are generated automatically from these operating hours,
            tables, blocked slots, buffer time, and existing reservations.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resetToDefault}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reset to Default
            </button>

            <button
              type="button"
              onClick={saveOperatingHours}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Operating Hours"}
            </button>
          </div>
        </div>
      </Section>

      <Section
        title="Reservation Rules"
        subtitle="These rules are used while generating available reservation slots."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Advance Booking
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.reservationAdvanceDays} days
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Notice Period
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.reservationNoticeMinutes} minutes
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Same-Day Booking
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.allowSameDayReservation ? "Allowed" : "Not Allowed"}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reservation Status
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.isTableReservationAvailable ? "Enabled" : "Disabled"}
            </h3>
          </div>
        </div>
      </Section>
    </div>
  );
}