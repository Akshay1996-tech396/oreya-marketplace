"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | string;

type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
  vendor: {
    id: string;
    businessName: string;
  };
};

type RestaurantReservation = {
  id: string;
  reservationCode: string;
  restaurantId: string;
  tableId: string | null;
  reservationDate: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  guests: number;
  amount: string;
  currency: string;
  status: ReservationStatus;
  source: string;
  paymentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  cancellationReason: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    coverImage: string | null;
    logo: string | null;
    city: string | null;
    area: string | null;
    phone: string | null;
    email: string | null;
    vendor: {
      id: string;
      businessName: string;
      status: string;
    };
  };
  table: {
    id: string;
    tableNumber: string;
    capacity: number;
    seatingArea: string | null;
  } | null;
};

type AdminRestaurantReservationsClientProps = {
  restaurants: RestaurantOption[];
  initialReservations: RestaurantReservation[];
};

type ParsedReservationMenuLine = {
  foodPackage: string;
  quantity: string;
  amount: string;
};

const statusOptions = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const actionOptions = [
  {
    status: "CONFIRMED",
    label: "Confirm",
  },
  {
    status: "COMPLETED",
    label: "Complete",
  },
  {
    status: "NO_SHOW",
    label: "Mark No-Show",
  },
  {
    status: "REJECTED",
    label: "Reject",
  },
  {
    status: "CANCELLED",
    label: "Cancel",
  },
];

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
    case "COMPLETED":
      return "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
    case "NO_SHOW":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getPaymentStatusBadgeClass(status: string) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
    case "REFUNDED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
  }
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
  if (!value) {
    return "Not set";
  }

  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return value;
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

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(currency: string, amount: string | number | null) {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${parsedAmount.toFixed(2)}`;
}

function getRestaurantLocation(reservation: RestaurantReservation) {
  return (
    [reservation.restaurant.area, reservation.restaurant.city]
      .filter(Boolean)
      .join(", ") || "Location not added"
  );
}

function isUpcomingReservation(reservation: RestaurantReservation) {
  const [year, month, day] = reservation.reservationDate.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const reservationDate = new Date(year, month - 1, day);

  return reservationDate.getTime() >= todayOnly.getTime();
}

function canApplyAction(currentStatus: string, nextStatus: string) {
  if (
    currentStatus === "CANCELLED" ||
    currentStatus === "COMPLETED" ||
    currentStatus === "NO_SHOW" ||
    currentStatus === "REJECTED"
  ) {
    return false;
  }

  if (currentStatus === nextStatus) {
    return false;
  }

  if (nextStatus === "CONFIRMED") {
    return currentStatus === "PENDING";
  }

  if (nextStatus === "COMPLETED") {
    return currentStatus === "CONFIRMED";
  }

  if (nextStatus === "NO_SHOW") {
    return currentStatus === "PENDING" || currentStatus === "CONFIRMED";
  }

  if (nextStatus === "CANCELLED") {
    return currentStatus === "PENDING" || currentStatus === "CONFIRMED";
  }

  if (nextStatus === "REJECTED") {
    return currentStatus === "PENDING";
  }

  return false;
}

function splitReservationNote(customerNote: string | null) {
  if (!customerNote) {
    return {
      plainNote: "",
      menuLines: [] as string[],
    };
  }

  const marker = "Selected menu items:";
  const markerIndex = customerNote.indexOf(marker);

  if (markerIndex === -1) {
    return {
      plainNote: customerNote.trim(),
      menuLines: [] as string[],
    };
  }

  const plainNote = customerNote.slice(0, markerIndex).trim();
  const menuText = customerNote.slice(markerIndex + marker.length).trim();

  const menuLines = menuText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, ""));

  return {
    plainNote,
    menuLines,
  };
}

function parseMenuLineForTable(line: string): ParsedReservationMenuLine {
  const match = line.match(/^(.*?)\s×\s(\d+)\s\((.*?)\)\s=\s(.+)$/);

  if (!match) {
    return {
      foodPackage: line,
      quantity: "-",
      amount: "-",
    };
  }

  return {
    foodPackage: match[1].trim(),
    quantity: match[2].trim(),
    amount: match[4].trim(),
  };
}

function getReservationMenuDetails(reservation: RestaurantReservation) {
  const noteDetails = splitReservationNote(reservation.customerNote);

  return {
    plainNote: noteDetails.plainNote,
    menuItems: noteDetails.menuLines.map(parseMenuLineForTable),
  };
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </h3>
    </div>
  );
}

export default function AdminRestaurantReservationsClient({
  restaurants,
  initialReservations,
}: AdminRestaurantReservationsClientProps) {
  const [reservations, setReservations] = useState<RestaurantReservation[]>(
    initialReservations
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [restaurantFilter, setRestaurantFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [updatingReservationId, setUpdatingReservationId] = useState<
    string | null
  >(null);
  const [selectedReservation, setSelectedReservation] =
    useState<RestaurantReservation | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const vendors = useMemo(() => {
    const uniqueVendors = new Map<string, { id: string; businessName: string }>();

    restaurants.forEach((restaurant) => {
      uniqueVendors.set(restaurant.vendor.id, restaurant.vendor);
    });

    return Array.from(uniqueVendors.values()).sort((first, second) =>
      first.businessName.localeCompare(second.businessName)
    );
  }, [restaurants]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const menuDetails = getReservationMenuDetails(reservation);
      const menuSearchText = menuDetails.menuItems
        .map((item) => `${item.foodPackage} ${item.quantity} ${item.amount}`)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        reservation.reservationCode.toLowerCase().includes(normalizedSearch) ||
        reservation.restaurant.name.toLowerCase().includes(normalizedSearch) ||
        reservation.restaurant.vendor.businessName
          .toLowerCase()
          .includes(normalizedSearch) ||
        reservation.customerName?.toLowerCase().includes(normalizedSearch) ||
        reservation.customerEmail?.toLowerCase().includes(normalizedSearch) ||
        reservation.customerPhone?.toLowerCase().includes(normalizedSearch) ||
        getRestaurantLocation(reservation)
          .toLowerCase()
          .includes(normalizedSearch) ||
        menuSearchText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || reservation.status === statusFilter;

      const matchesRestaurant =
        restaurantFilter === "ALL" ||
        reservation.restaurantId === restaurantFilter;

      const matchesVendor =
        vendorFilter === "ALL" ||
        reservation.restaurant.vendor.id === vendorFilter;

      return matchesSearch && matchesStatus && matchesRestaurant && matchesVendor;
    });
  }, [reservations, searchTerm, statusFilter, restaurantFilter, vendorFilter]);

  const summary = useMemo(() => {
    return {
      total: reservations.length,
      upcoming: reservations.filter((reservation) =>
        isUpcomingReservation(reservation)
      ).length,
      pending: reservations.filter(
        (reservation) => reservation.status === "PENDING"
      ).length,
      confirmed: reservations.filter(
        (reservation) => reservation.status === "CONFIRMED"
      ).length,
      completed: reservations.filter(
        (reservation) => reservation.status === "COMPLETED"
      ).length,
    };
  }, [reservations]);

  async function updateReservationStatus(
    reservation: RestaurantReservation,
    nextStatus: string
  ) {
    let cancellationReason: string | null = null;

    if (nextStatus === "CANCELLED" || nextStatus === "REJECTED") {
      const reason = window.prompt(
        `Please enter the reason to mark this reservation as ${formatStatusLabel(
          nextStatus
        )}.`
      );

      if (reason === null) {
        return;
      }

      cancellationReason =
        reason.trim() ||
        (nextStatus === "REJECTED"
          ? "Rejected by admin."
          : "Cancelled by admin.");
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark reservation ${
        reservation.reservationCode
      } as ${formatStatusLabel(nextStatus)}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingReservationId(reservation.id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/restaurant-reservations/${reservation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
            cancellationReason,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to update reservation status."
        );
      }

      const updatedReservation = result.reservation as RestaurantReservation;

      setReservations((currentReservations) =>
        currentReservations.map((currentReservation) =>
          currentReservation.id === updatedReservation.id
            ? updatedReservation
            : currentReservation
        )
      );

      setSelectedReservation((currentReservation) =>
        currentReservation?.id === updatedReservation.id
          ? updatedReservation
          : currentReservation
      );

      setMessage({
        type: "success",
        text: result.message || "Reservation status updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update reservation status.",
      });
    } finally {
      setUpdatingReservationId(null);
    }
  }

  const selectedReservationMenuDetails = selectedReservation
    ? getReservationMenuDetails(selectedReservation)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Reservations" value={summary.total} />
        <SummaryCard label="Upcoming" value={summary.upcoming} />
        <SummaryCard label="Pending" value={summary.pending} />
        <SummaryCard label="Confirmed" value={summary.confirmed} />
        <SummaryCard label="Completed" value={summary.completed} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">Admin</p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Restaurant Reservations
            </h2>
          </div>

          <Link
            href="/admin/restaurants"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Manage Restaurants
          </Link>
        </div>

        {message ? (
          <div
            className={`mb-5 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label
              htmlFor="reservationSearch"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Search Reservations
            </label>

            <input
              id="reservationSearch"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by code, customer, vendor, restaurant, phone, email, or menu"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="vendorFilter"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Vendor
            </label>

            <select
              id="vendorFilter"
              value={vendorFilter}
              onChange={(event) => setVendorFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.businessName}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="restaurantFilter"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Restaurant
            </label>

            <select
              id="restaurantFilter"
              value={restaurantFilter}
              onChange={(event) => setRestaurantFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="ALL">All Restaurants</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="statusFilter"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All Statuses" : formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end lg:col-span-1">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setRestaurantFilter("ALL");
                setVendorFilter("ALL");
              }}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-500">Reservations</p>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Reservation List
            </h2>
          </div>

          <span className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {filteredReservations.length} result
            {filteredReservations.length === 1 ? "" : "s"}
          </span>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              📅
            </div>

            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              No reservations found
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No restaurant reservations match the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1350px] divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {[
                    "Reservation",
                    "Restaurant",
                    "Vendor",
                    "Customer",
                    "Date and Time",
                    "Guests",
                    "Table",
                    "Amount",
                    "Payment",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {reservation.reservationCode}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Created{" "}
                        {formatDateLabel(reservation.createdAt.slice(0, 10))}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {reservation.restaurant.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {getRestaurantLocation(reservation)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {reservation.restaurant.vendor.businessName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatStatusLabel(
                          reservation.restaurant.vendor.status
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {reservation.customerName || "Guest Customer"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {reservation.customerPhone || "Phone not added"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {reservation.customerEmail || "Email not added"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatDateLabel(reservation.reservationDate)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeLabel(reservation.startTime)} -{" "}
                        {formatTimeLabel(reservation.endTime)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {reservation.guests}
                    </td>

                    <td className="px-5 py-4">
                      {reservation.table ? (
                        <>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            Table {reservation.table.tableNumber}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {reservation.table.capacity} guests
                            {reservation.table.seatingArea
                              ? ` · ${reservation.table.seatingArea}`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {formatAmount(reservation.currency, reservation.amount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPaymentStatusBadgeClass(
                          reservation.paymentStatus
                        )}`}
                      >
                        {formatStatusLabel(reservation.paymentStatus)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                          reservation.status
                        )}`}
                      >
                        {formatStatusLabel(reservation.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReservation(reservation)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          Details
                        </button>

                        <select
                          value=""
                          disabled={updatingReservationId === reservation.id}
                          onChange={(event) => {
                            const nextStatus = event.target.value;

                            if (nextStatus) {
                              updateReservationStatus(reservation, nextStatus);
                            }
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <option value="">
                            {updatingReservationId === reservation.id
                              ? "Updating..."
                              : "Update"}
                          </option>
                          {actionOptions.map((action) => (
                            <option
                              key={action.status}
                              value={action.status}
                              disabled={
                                !canApplyAction(
                                  reservation.status,
                                  action.status
                                )
                              }
                            >
                              {action.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReservation ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-brand-500">
                  Reservation Details
                </p>

                <h3 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
                  {selectedReservation.reservationCode}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Restaurant
                </p>

                <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                  {selectedReservation.restaurant.name}
                </h4>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {getRestaurantLocation(selectedReservation)}
                </p>

                <Link
                  href={`/restaurants/${selectedReservation.restaurant.slug}`}
                  target="_blank"
                  className="mt-3 inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  View Restaurant
                </Link>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Vendor
                </p>

                <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                  {selectedReservation.restaurant.vendor.businessName}
                </h4>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Status:{" "}
                  {formatStatusLabel(
                    selectedReservation.restaurant.vendor.status
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                    selectedReservation.status
                  )}`}
                >
                  {formatStatusLabel(selectedReservation.status)}
                </span>

                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPaymentStatusBadgeClass(
                      selectedReservation.paymentStatus
                    )}`}
                  >
                    Payment:{" "}
                    {formatStatusLabel(selectedReservation.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customer
                </p>

                <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                  {selectedReservation.customerName || "Guest Customer"}
                </h4>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedReservation.customerPhone || "Phone not added"}
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedReservation.customerEmail || "Email not added"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Schedule
                </p>

                <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                  {formatDateLabel(selectedReservation.reservationDate)}
                </h4>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatTimeLabel(selectedReservation.startTime)} -{" "}
                  {formatTimeLabel(selectedReservation.endTime)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Guests
                </p>

                <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                  {selectedReservation.guests} guest
                  {selectedReservation.guests === 1 ? "" : "s"}
                </h4>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Table
                </p>

                {selectedReservation.table ? (
                  <>
                    <h4 className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                      Table {selectedReservation.table.tableNumber}
                    </h4>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedReservation.table.capacity} guests
                      {selectedReservation.table.seatingArea
                        ? ` · ${selectedReservation.table.seatingArea}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Not assigned
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reservation Amount
                </p>

                <h4 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
                  {formatAmount(
                    selectedReservation.currency,
                    selectedReservation.amount
                  )}
                </h4>
              </div>

              {selectedReservationMenuDetails &&
              selectedReservationMenuDetails.menuItems.length > 0 ? (
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2">
                  <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Menu Items
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-950">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                            Food Package
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-400">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selectedReservationMenuDetails.menuItems.map(
                          (item, index) => (
                            <tr
                              key={`${selectedReservation.id}-${item.foodPackage}-${index}`}
                            >
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                                {item.foodPackage}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                                {item.amount}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {selectedReservationMenuDetails?.plainNote ? (
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 md:col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customer Special Request
                  </p>

                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {selectedReservationMenuDetails.plainNote}
                  </p>
                </div>
              ) : null}

              {selectedReservation.cancellationReason ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 md:col-span-2">
                  <p className="text-sm font-medium">
                    Cancellation or Rejection Reason
                  </p>

                  <p className="mt-1 text-sm">
                    {selectedReservation.cancellationReason}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Close
              </button>

              <div className="flex flex-wrap gap-2">
                {actionOptions.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={
                      updatingReservationId === selectedReservation.id ||
                      !canApplyAction(selectedReservation.status, action.status)
                    }
                    onClick={() =>
                      updateReservationStatus(selectedReservation, action.status)
                    }
                    className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}