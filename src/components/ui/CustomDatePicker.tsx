"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DateValue = string | Date;

type DateChangeHandler = (value: string) => void;

type CustomDatePickerProps = {
  id?: string;
  name?: string;
  value?: DateValue;
  date?: DateValue;
  selectedDate?: DateValue;
  defaultValue?: DateValue;
  onChange?: DateChangeHandler;
  onDateChange?: DateChangeHandler;
  onSelect?: DateChangeHandler;
  required?: boolean;
  placeholder?: string;
  minDate?: DateValue;
  maxDate?: DateValue;
  availableDates?: DateValue[];
  allowedDates?: DateValue[];
  yearRange?: number;
  className?: string;
  popupFullWidth?: boolean;
  disabled?: boolean;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): DateParts | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);

  if (
    Number.isNaN(parsedYear) ||
    Number.isNaN(parsedMonth) ||
    Number.isNaN(parsedDay)
  ) {
    return null;
  }

  if (parsedMonth < 1 || parsedMonth > 12 || parsedDay < 1 || parsedDay > 31) {
    return null;
  }

  return {
    year: parsedYear,
    month: parsedMonth,
    day: parsedDay,
  };
}

function formatDisplayDate(value: string) {
  const dateParts = parseDateValue(value);

  if (!dateParts) {
    return "";
  }

  return `${String(dateParts.day).padStart(2, "0")} ${
    monthNames[dateParts.month - 1]
  } ${dateParts.year}`;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value: DateValue | null | undefined) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return formatDateValue(value);
  }

  return String(value || "").trim().slice(0, 10);
}

function getMonthDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const leadingBlankDays = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: Array<Date | null> = [];

  for (let index = 0; index < leadingBlankDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function isDateBeforeMinDate(dateValue: string, minDateValue: string) {
  return Boolean(minDateValue) && dateValue < minDateValue;
}

function isDateAfterMaxDate(dateValue: string, maxDateValue: string) {
  return Boolean(maxDateValue) && dateValue > maxDateValue;
}

function isMonthBeforeMinimumMonth(
  year: number,
  monthIndex: number,
  minDate: string
) {
  const minDateParts = parseDateValue(minDate);

  if (!minDateParts) {
    return false;
  }

  if (year < minDateParts.year) {
    return true;
  }

  if (year === minDateParts.year && monthIndex + 1 < minDateParts.month) {
    return true;
  }

  return false;
}

function isMonthAfterMaximumMonth(
  year: number,
  monthIndex: number,
  maxDate: string
) {
  const maxDateParts = parseDateValue(maxDate);

  if (!maxDateParts) {
    return false;
  }

  if (year > maxDateParts.year) {
    return true;
  }

  return year === maxDateParts.year && monthIndex + 1 > maxDateParts.month;
}

function getInitialCalendarMonth(initialValue: string, minimumDate: string) {
  const initialDateParts = parseDateValue(initialValue);

  if (initialDateParts) {
    return new Date(initialDateParts.year, initialDateParts.month - 1, 1);
  }

  const minimumDateParts = parseDateValue(minimumDate);

  if (minimumDateParts) {
    return new Date(minimumDateParts.year, minimumDateParts.month - 1, 1);
  }

  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function getYearOptions(
  minimumDate: string,
  maximumDate: string,
  selectedValue: string,
  currentMonth: Date,
  yearRange: number
) {
  const minimumDateParts = parseDateValue(minimumDate);
  const maximumDateParts = parseDateValue(maximumDate);
  const selectedDateParts = parseDateValue(selectedValue);

  const startYear = minimumDateParts
    ? minimumDateParts.year
    : currentMonth.getFullYear();

  const selectedYear = selectedDateParts?.year || currentMonth.getFullYear();
  const calculatedEndYear = maximumDateParts
    ? maximumDateParts.year
    : Math.max(startYear + yearRange, selectedYear);
  const endYear = Math.max(startYear, calculatedEndYear);

  const years: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }

  return years;
}

export default function CustomDatePicker({
  id,
  name,
  value,
  date,
  selectedDate,
  defaultValue = "",
  onChange,
  onDateChange,
  onSelect,
  required = false,
  placeholder = "Select date",
  minDate,
  maxDate,
  availableDates,
  allowedDates,
  yearRange = 30,
  className = "",
  popupFullWidth = false,
  disabled = false,
}: CustomDatePickerProps) {
  const minimumDate = normalizeDateValue(minDate) || getTodayDateValue();
  const maximumDate = normalizeDateValue(maxDate);

  const controlledSource =
    value !== undefined
      ? value
      : selectedDate !== undefined
        ? selectedDate
        : date;
  const isControlled =
    value !== undefined ||
    selectedDate !== undefined ||
    date !== undefined;

  const controlledValue = normalizeDateValue(controlledSource);
  const initialValue = controlledValue || normalizeDateValue(defaultValue);

  const [isMounted, setIsMounted] = useState(false);
  const [internalValue, setInternalValue] = useState(initialValue);
  const selectedValue = isControlled ? controlledValue : internalValue;

  const selectableDates = useMemo(() => {
    const dateSource = allowedDates ?? availableDates;

    if (!dateSource || dateSource.length === 0) {
      return null;
    }

    const normalizedDates = dateSource
      .map((dateValue) => normalizeDateValue(dateValue))
      .filter(Boolean);

    return new Set(normalizedDates);
  }, [allowedDates, availableDates]);

  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() =>
    getInitialCalendarMonth(initialValue, minimumDate)
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!disabled) {
      return;
    }

    setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    const selectedDateParts = parseDateValue(selectedValue);

    if (!selectedDateParts) {
      return;
    }

    setCurrentMonth(
      new Date(selectedDateParts.year, selectedDateParts.month - 1, 1)
    );
  }, [selectedValue]);

  useLayoutEffect(() => {
    if (!isOpen || !popupFullWidth || !rootRef.current) {
      setPopupPosition(null);
      return;
    }

    function updatePopupPosition() {
      if (!rootRef.current) {
        return;
      }

      const triggerRect = rootRef.current.getBoundingClientRect();
      const boundaryElement = rootRef.current.closest(
        "[data-calendar-popup-boundary]"
      ) as HTMLElement | null;
      const boundaryRect = boundaryElement?.getBoundingClientRect() || triggerRect;

      const viewportPadding = 12;
      const maximumWidth = Math.max(
        window.innerWidth - viewportPadding * 2,
        280
      );
      const preferredWidth = Math.max(boundaryRect.width, 340);
      const width = Math.min(preferredWidth, maximumWidth);

      const minimumLeft = window.scrollX + viewportPadding;
      const maximumLeft =
        window.scrollX + window.innerWidth - viewportPadding - width;
      const preferredLeft = boundaryRect.left + window.scrollX;
      const left = Math.max(
        minimumLeft,
        Math.min(preferredLeft, maximumLeft)
      );

      setPopupPosition({
        left,
        top: triggerRect.bottom + window.scrollY + 12,
        width,
      });
    }

    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
    };
  }, [isOpen, popupFullWidth]);

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const yearOptions = useMemo(
    () =>
      getYearOptions(
        minimumDate,
        maximumDate,
        selectedValue,
        currentMonth,
        yearRange
      ),
    [minimumDate, maximumDate, selectedValue, currentMonth, yearRange]
  );

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const minimumDateParts = parseDateValue(minimumDate);
  const maximumDateParts = parseDateValue(maximumDate);

  const isPreviousMonthDisabled = minimumDateParts
    ? currentYear < minimumDateParts.year ||
      (currentYear === minimumDateParts.year &&
        currentMonthIndex + 1 <= minimumDateParts.month)
    : false;

  const isNextMonthDisabled = maximumDateParts
    ? currentYear > maximumDateParts.year ||
      (currentYear === maximumDateParts.year &&
        currentMonthIndex + 1 >= maximumDateParts.month)
    : false;

  const displayText =
    isMounted && selectedValue ? formatDisplayDate(selectedValue) : placeholder;

  function notifyDateChange(nextValue: string) {
    const callbacks = [onChange, onDateChange, onSelect];
    const invokedCallbacks = new Set<DateChangeHandler>();

    callbacks.forEach((callback) => {
      if (!callback || invokedCallbacks.has(callback)) {
        return;
      }

      invokedCallbacks.add(callback);
      callback(nextValue);
    });
  }

  function isDateSelectable(dateValue: string) {
    if (
      isDateBeforeMinDate(dateValue, minimumDate) ||
      isDateAfterMaxDate(dateValue, maximumDate)
    ) {
      return false;
    }

    return !selectableDates || selectableDates.has(dateValue);
  }

  function updateValue(nextValue: string) {
    if (disabled) {
      return;
    }

    if (!nextValue) {
      if (!isControlled) {
        setInternalValue("");
      }

      notifyDateChange("");
      setIsOpen(false);
      return;
    }

    if (!isDateSelectable(nextValue)) {
      return;
    }

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    notifyDateChange(nextValue);
    setIsOpen(false);
  }

  function goToPreviousMonth() {
    if (isPreviousMonthDisabled) {
      return;
    }

    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  function goToNextMonth() {
    if (isNextMonthDisabled) {
      return;
    }

    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  function handleYearChange(nextYear: string) {
    const parsedYear = Number(nextYear);

    if (Number.isNaN(parsedYear)) {
      return;
    }

    let nextMonthIndex = currentMonthIndex;

    if (
      minimumDateParts &&
      parsedYear === minimumDateParts.year &&
      nextMonthIndex + 1 < minimumDateParts.month
    ) {
      nextMonthIndex = minimumDateParts.month - 1;
    }

    if (
      maximumDateParts &&
      parsedYear === maximumDateParts.year &&
      nextMonthIndex + 1 > maximumDateParts.month
    ) {
      nextMonthIndex = maximumDateParts.month - 1;
    }

    setCurrentMonth(new Date(parsedYear, nextMonthIndex, 1));
  }

  function handleMonthChange(nextMonth: string) {
    const parsedMonthIndex = Number(nextMonth);

    if (Number.isNaN(parsedMonthIndex)) {
      return;
    }

    if (
      isMonthBeforeMinimumMonth(currentYear, parsedMonthIndex, minimumDate) ||
      isMonthAfterMaximumMonth(currentYear, parsedMonthIndex, maximumDate)
    ) {
      return;
    }

    setCurrentMonth(new Date(currentYear, parsedMonthIndex, 1));
  }

  const calendarPanel = (
        <div
          role="dialog"
          className={
            popupFullWidth
              ? "z-[9999] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-950"
              : "absolute left-0 z-50 mt-3 w-full min-w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-950"
          }
          style={
            popupFullWidth && popupPosition
              ? {
                  position: "absolute",
                  left: popupPosition.left,
                  top: popupPosition.top,
                  width: popupPosition.width,
                }
              : undefined
          }
        >
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Year
              </label>

              <select
                value={currentYear}
                onChange={(event) => handleYearChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Month
              </label>

              <select
                value={currentMonthIndex}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {monthNames.map((month, index) => {
                  const isDisabled =
                    isMonthBeforeMinimumMonth(
                      currentYear,
                      index,
                      minimumDate
                    ) ||
                    isMonthAfterMaximumMonth(
                      currentYear,
                      index,
                      maximumDate
                    );

                  return (
                    <option key={month} value={index} disabled={isDisabled}>
                      {month}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              disabled={isPreviousMonthDisabled}
              onClick={goToPreviousMonth}
              className={`rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold dark:border-gray-800 ${
                isPreviousMonthDisabled
                  ? "cursor-not-allowed text-gray-300 opacity-60 dark:text-gray-700"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300"
              }`}
            >
              Previous
            </button>

            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {monthNames[currentMonthIndex]} {currentYear}
            </p>

            <button
              type="button"
              disabled={isNextMonthDisabled}
              onClick={goToNextMonth}
              className={`rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold dark:border-gray-800 ${
                isNextMonthDisabled
                  ? "cursor-not-allowed text-gray-300 opacity-60 dark:text-gray-700"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300"
              }`}
            >
              Next
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-gray-400">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, index) => {
              if (!date) {
                return <div key={`blank-${index}`} />;
              }

              const dateValue = formatDateValue(date);
              const isSelected = dateValue === selectedValue;
              const isDisabled = !isDateSelectable(dateValue);

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => updateValue(dateValue)}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    isSelected
                      ? "bg-black text-white"
                      : isDisabled
                        ? "cursor-not-allowed bg-gray-100 text-gray-300 opacity-60 dark:bg-gray-900 dark:text-gray-700"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => updateValue("")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <input
        type="hidden"
        id={id}
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 text-left text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <span className={selectedValue && isMounted ? "" : "text-gray-400"}>
          {displayText}
        </span>

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-gray-400"
        >
          <path
            d="M7 2V5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M17 2V5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M3.5 9H20.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6.5 4H17.5C19.157 4 20.5 5.343 20.5 7V18C20.5 19.657 19.157 21 17.5 21H6.5C4.843 21 3.5 19.657 3.5 18V7C3.5 5.343 4.843 4 6.5 4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen
        ? popupFullWidth
          ? isMounted && popupPosition
            ? createPortal(calendarPanel, document.body)
            : null
          : calendarPanel
        : null}
    </div>
  );
}