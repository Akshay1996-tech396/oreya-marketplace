"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Utensils,
  Users,
} from "lucide-react";

type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "REJECTED"
  | string;

export type RestaurantReservation = {
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
  };
  table: {
    id: string;
    tableNumber: string;
    capacity: number;
    seatingArea: string | null;
  } | null;
};

export type CustomerRestaurantReservationsClientProps = {
  initialReservations: RestaurantReservation[];
  searchQuery?: string;
  statusFilter?: string;
  sortBy?: string;
};

type ParsedReservationMenuLine = {
  foodPackage: string;
  quantity: string;
  amount: string;
};

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-700 ring-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700 ring-yellow-200";
    case "COMPLETED":
      return "bg-gray-900 text-white ring-gray-900";
    case "CANCELLED":
      return "bg-red-100 text-red-700 ring-red-200";
    case "REJECTED":
      return "bg-red-100 text-red-700 ring-red-200";
    case "NO_SHOW":
      return "bg-orange-100 text-orange-700 ring-orange-200";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-200";
  }
}

function getPaymentStatusBadgeClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700 ring-green-200";
    case "FAILED":
      return "bg-red-100 text-red-700 ring-red-200";
    case "REFUNDED":
      return "bg-blue-100 text-blue-700 ring-blue-200";
    case "PENDING":
    default:
      return "bg-yellow-100 text-yellow-700 ring-yellow-200";
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

function getReservationImage(reservation: RestaurantReservation) {
  return (
    reservation.restaurant.coverImage ||
    reservation.restaurant.logo ||
    "/placeholder.png"
  );
}

function getRestaurantLocation(reservation: RestaurantReservation) {
  return (
    [reservation.restaurant.area, reservation.restaurant.city]
      .filter(Boolean)
      .join(", ") || "Location not added"
  );
}

function isUpcomingReservation(reservation: RestaurantReservation) {
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const [year, month, day] = reservation.reservationDate.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const reservationDate = new Date(year, month - 1, day);

  return reservationDate.getTime() >= todayOnly.getTime();
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

export function CustomerRestaurantReservationsSection({
  initialReservations,
  searchQuery = "",
  statusFilter = "all",
  sortBy = "newest",
}: CustomerRestaurantReservationsClientProps) {
  const [openReservationIds, setOpenReservationIds] = useState<
    Record<string, boolean>
  >({});
  const [openMenuReservationIds, setOpenMenuReservationIds] = useState<
    Record<string, boolean>
  >({});

  function toggleReservation(reservationId: string) {
    setOpenReservationIds((current) => ({
      ...current,
      [reservationId]: !current[reservationId],
    }));
  }

  function toggleMenuItems(reservationId: string) {
    setOpenMenuReservationIds((current) => ({
      ...current,
      [reservationId]: !current[reservationId],
    }));
  }

  const reservations = useMemo(() => {
    let filtered = [...initialReservations];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();

      filtered = filtered.filter((reservation) => {
        const menuDetails = getReservationMenuDetails(reservation);
        const menuSearchText = menuDetails.menuItems
          .map((item) => `${item.foodPackage} ${item.quantity} ${item.amount}`)
          .join(" ")
          .toLowerCase();

        return (
          reservation.reservationCode.toLowerCase().includes(query) ||
          reservation.restaurant.name.toLowerCase().includes(query) ||
          getRestaurantLocation(reservation).toLowerCase().includes(query) ||
          menuSearchText.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((reservation) => reservation.status === statusFilter);
    }

    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "highest":
        filtered.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        break;
      case "lowest":
        filtered.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        break;
    }

    return filtered;
  }, [initialReservations, searchQuery, statusFilter, sortBy]);

  const summary = useMemo(() => {
    return {
      total: initialReservations.length,
      upcoming: initialReservations.filter((reservation) =>
        isUpcomingReservation(reservation)
      ).length,
      confirmed: initialReservations.filter(
        (reservation) => reservation.status === "CONFIRMED"
      ).length,
      pending: initialReservations.filter(
        (reservation) => reservation.status === "PENDING"
      ).length,
    };
  }, [initialReservations]);

  return (
      <section>
      <div className="mx-auto max-w-7xl py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-500">Total Reservations</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">
              {summary.total}
            </h2>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-500">Upcoming</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">
              {summary.upcoming}
            </h2>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-500">Confirmed</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">
              {summary.confirmed}
            </h2>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-950">
              {summary.pending}
            </h2>
          </div>
        </div>



        {reservations.length === 0 ? (
          <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#faf7f2]">
              <CalendarDays className="h-7 w-7 text-gray-500" />
            </div>

            <h2 className="font-heading text-2xl font-semibold text-gray-950">
              No reservations found
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">
              You do not have any restaurant reservations matching the selected
              filters.
            </p>

            <Link
              href="/restaurants"
              className="mt-6 inline-flex rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {reservations.map((reservation) => {
              const menuDetails = getReservationMenuDetails(reservation);

              return (
                <article
                  key={reservation.id}
                  className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5"
                >
                  <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                    <div className="relative min-h-[220px] bg-gray-100">
                      <img
                        src={getReservationImage(reservation)}
                        alt={reservation.restaurant.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClass(
                                reservation.status
                              )}`}
                            >
                              {formatStatusLabel(reservation.status)}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getPaymentStatusBadgeClass(
                                reservation.paymentStatus
                              )}`}
                            >
                              Payment:{" "}
                              {formatStatusLabel(reservation.paymentStatus)}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                              {reservation.reservationCode}
                            </span>
                          </div>

                          <h2 className="mt-3 font-heading text-2xl font-semibold text-gray-950">
                            {reservation.restaurant.name}
                          </h2>

                          <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {getRestaurantLocation(reservation)}
                          </p>
                        </div>

                        <Link
                          href={`/restaurants/${reservation.restaurant.slug}`}
                          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-900"
                        >
                          View Restaurant
                        </Link>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => toggleReservation(reservation.id)}
                          aria-expanded={openReservationIds[reservation.id] === true}
                          aria-controls={`reservation-details-${reservation.id}`}
                          className="w-full bg-[#faf7f2] px-3 py-3 text-left transition-colors duration-200 hover:bg-[#f6f0e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-inset md:px-4"
                        >
                          <div className="grid items-center gap-2 md:grid-cols-[1.2fr_1.4fr_1fr_1fr_1.2fr_auto] md:gap-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                Date
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-gray-950">
                                {formatDateLabel(reservation.reservationDate)}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                Time
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-gray-950">
                                {formatTimeLabel(reservation.startTime)} - {formatTimeLabel(reservation.endTime)}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                Table
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-gray-950">
                                {reservation.table ? `Table ${reservation.table.tableNumber}` : "Not assigned"}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                <Users className="h-3.5 w-3.5 shrink-0" />
                                Guest
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-gray-950">
                                {reservation.guests} guest{reservation.guests === 1 ? "" : "s"}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                Amount
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-gray-950">
                                {formatAmount(reservation.currency, reservation.amount)}
                              </p>
                            </div>

                            <div className="flex justify-end">
                              <ChevronDown
                                className={`h-5 w-5 text-gray-500 transition-transform duration-300 ease-in-out ${
                                  openReservationIds[reservation.id] ? "rotate-180" : "rotate-0"
                                }`}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </button>

                        <div
                          id={`reservation-details-${reservation.id}`}
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                            openReservationIds[reservation.id] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="border-t border-gray-100 bg-white pt-4">
                      {reservation.table ? (
                        <div className="mt-4 rounded-2xl border border-gray-100 p-4 text-sm text-gray-600">
                          Table capacity:{" "}
                          <strong>{reservation.table.capacity} guests</strong>
                          {reservation.table.seatingArea
                            ? ` · ${reservation.table.seatingArea}`
                            : ""}
                        </div>
                      ) : null}

                      {menuDetails.menuItems.length > 0 ? (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                          <button
                            type="button"
                            onClick={() => toggleMenuItems(reservation.id)}
                            aria-expanded={
                              openMenuReservationIds[reservation.id] === true
                            }
                            aria-controls={`selected-menu-items-${reservation.id}`}
                            className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-inset"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Utensils className="h-4 w-4 shrink-0 text-gray-500" />
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Selected Menu Items
                              </span>
                            </span>

                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out ${
                                openMenuReservationIds[reservation.id]
                                  ? "rotate-180"
                                  : "rotate-0"
                              }`}
                              aria-hidden="true"
                            />
                          </button>

                          <div
                            id={`selected-menu-items-${reservation.id}`}
                            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                              openMenuReservationIds[reservation.id]
                                ? "grid-rows-[1fr]"
                                : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div className="overflow-x-auto border-t border-gray-100 bg-white">
                                <table className="w-full min-w-[560px] text-left text-sm">
                                  <thead className="bg-white">
                                    <tr>
                                      <th className="px-4 py-3 font-semibold text-gray-600">
                                        Food Package
                                      </th>

                                      <th className="px-4 py-3 text-center font-semibold text-gray-600">
                                        Quantity
                                      </th>

                                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                                        Amount
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-gray-100">
                                    {menuDetails.menuItems.map((item, index) => (
                                      <tr
                                        key={`${reservation.id}-${item.foodPackage}-${index}`}
                                      >
                                        <td className="px-4 py-3 font-medium text-gray-950">
                                          {item.foodPackage}
                                        </td>

                                        <td className="px-4 py-3 text-center text-gray-700">
                                          {item.quantity}
                                        </td>

                                        <td className="px-4 py-3 text-right font-semibold text-gray-950">
                                          {item.amount}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {menuDetails.plainNote ? (
                        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                          <strong>Special Request:</strong>{" "}
                          {menuDetails.plainNote}
                        </div>
                      ) : null}

                      {reservation.cancellationReason ? (
                        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                          <strong>Cancellation Reason:</strong>{" "}
                          {reservation.cancellationReason}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-500">
                        {reservation.restaurant.phone ? (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {reservation.restaurant.phone}
                          </span>
                        ) : null}

                        {reservation.restaurant.email ? (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {reservation.restaurant.email}
                          </span>
                        ) : null}
                      </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CustomerRestaurantReservationsClient({
  initialReservations,
}: CustomerRestaurantReservationsClientProps) {
  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <section className="bg-[#15100c] px-4 py-10 text-white md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Customer Dashboard
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold md:text-5xl">
              My Restaurant Reservations
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
              Review your restaurant table bookings, reservation status, table
              details, selected menu items, amount, and restaurant contact
              information.
            </p>
          </div>
        </div>
      </section>
      <CustomerRestaurantReservationsSection initialReservations={initialReservations} />
    </main>
  );
}
