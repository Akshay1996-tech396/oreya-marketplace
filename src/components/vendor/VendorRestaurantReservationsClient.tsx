"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | string;

type VendorSummary = {
  id: string;
  businessName: string;
  status: string;
};

type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
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
  };
  table: {
    id: string;
    tableNumber: string;
    capacity: number;
    seatingArea: string | null;
  } | null;
};

type VendorRestaurantReservationsClientProps = {
  vendor: VendorSummary;
  restaurants: RestaurantOption[];
  initialReservations: RestaurantReservation[];
};

const statusOptions = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const actionOptions = [
  {
    status: "CONFIRMED",
    label: "Confirm",
    icon: "fa-regular fa-circle-check",
    className: "btn-success",
  },
  {
    status: "ARRIVED",
    label: "Mark Arrived",
    icon: "fa-solid fa-person-walking-arrow-right",
    className: "btn-primary",
  },
  {
    status: "COMPLETED",
    label: "Complete",
    icon: "fa-solid fa-check-double",
    className: "btn-dark",
  },
  {
    status: "NO_SHOW",
    label: "No Show",
    icon: "fa-regular fa-circle-xmark",
    className: "btn-warning",
  },
  {
    status: "CANCELLED",
    label: "Cancel",
    icon: "fa-regular fa-trash-can",
    className: "btn-outline-danger",
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
      return "bg-success-subtle text-success border border-success-subtle";
    case "PENDING":
      return "bg-warning-subtle text-warning border border-warning-subtle";
    case "ARRIVED":
      return "bg-primary-subtle text-primary border border-primary-subtle";
    case "COMPLETED":
      return "bg-dark text-white border border-dark";
    case "CANCELLED":
      return "bg-danger-subtle text-danger border border-danger-subtle";
    case "NO_SHOW":
      return "bg-warning text-dark border border-warning";
    default:
      return "bg-light text-muted border";
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
  if (currentStatus === "CANCELLED") {
    return false;
  }

  if (currentStatus === "COMPLETED") {
    return false;
  }

  if (currentStatus === nextStatus) {
    return false;
  }

  if (nextStatus === "CONFIRMED") {
    return currentStatus === "PENDING";
  }

  if (nextStatus === "ARRIVED") {
    return currentStatus === "CONFIRMED";
  }

  if (nextStatus === "COMPLETED") {
    return currentStatus === "CONFIRMED" || currentStatus === "ARRIVED";
  }

  if (nextStatus === "NO_SHOW") {
    return currentStatus === "PENDING" || currentStatus === "CONFIRMED";
  }

  if (nextStatus === "CANCELLED") {
    return currentStatus === "PENDING" || currentStatus === "CONFIRMED";
  }

  return false;
}

export default function VendorRestaurantReservationsClient({
  vendor,
  restaurants,
  initialReservations,
}: VendorRestaurantReservationsClientProps) {
  const [reservations, setReservations] = useState<RestaurantReservation[]>(
    initialReservations
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [restaurantFilter, setRestaurantFilter] = useState("ALL");
  const [updatingReservationId, setUpdatingReservationId] = useState<
    string | null
  >(null);
  const [selectedReservation, setSelectedReservation] =
    useState<RestaurantReservation | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        reservation.reservationCode.toLowerCase().includes(normalizedSearch) ||
        reservation.restaurant.name.toLowerCase().includes(normalizedSearch) ||
        reservation.customerName?.toLowerCase().includes(normalizedSearch) ||
        reservation.customerEmail?.toLowerCase().includes(normalizedSearch) ||
        reservation.customerPhone?.toLowerCase().includes(normalizedSearch) ||
        getRestaurantLocation(reservation)
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || reservation.status === statusFilter;

      const matchesRestaurant =
        restaurantFilter === "ALL" ||
        reservation.restaurantId === restaurantFilter;

      return matchesSearch && matchesStatus && matchesRestaurant;
    });
  }, [reservations, searchTerm, statusFilter, restaurantFilter]);

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

    if (nextStatus === "CANCELLED") {
      const reason = window.prompt(
        "Please enter the cancellation reason for this reservation."
      );

      if (reason === null) {
        return;
      }

      cancellationReason = reason.trim() || "Cancelled by vendor.";
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark reservation ${reservation.reservationCode} as ${formatStatusLabel(
        nextStatus
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingReservationId(reservation.id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/vendor/restaurant-reservations/${reservation.id}`,
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

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="row g-3">
          <div className="col-12 col-sm-6 col-xl">
            <div className="panel h-100">
              <p className="text-muted small mb-1">Total Reservations</p>
              <h2 className="h3 mb-0">{summary.total}</h2>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl">
            <div className="panel h-100">
              <p className="text-muted small mb-1">Upcoming</p>
              <h2 className="h3 mb-0">{summary.upcoming}</h2>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl">
            <div className="panel h-100">
              <p className="text-muted small mb-1">Pending</p>
              <h2 className="h3 mb-0">{summary.pending}</h2>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl">
            <div className="panel h-100">
              <p className="text-muted small mb-1">Confirmed</p>
              <h2 className="h3 mb-0">{summary.confirmed}</h2>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl">
            <div className="panel h-100">
              <p className="text-muted small mb-1">Completed</p>
              <h2 className="h3 mb-0">{summary.completed}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow mb-1">Vendor</p>
              <h2 className="h5 mb-0">{vendor.businessName}</h2>
            </div>

            <Link href="/vendor/restaurants" className="btn btn-light btn-sm">
              <i className="fa-solid fa-store me-2" aria-hidden="true" />
              Manage Restaurants
            </Link>
          </div>

          {message ? (
            <div
              className={`alert ${
                message.type === "success" ? "alert-success" : "alert-danger"
              }`}
              role="alert"
            >
              {message.text}
            </div>
          ) : null}

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <label className="form-label" htmlFor="reservationSearch">
                Search Reservations
              </label>
              <input
                id="reservationSearch"
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by code, customer, restaurant, phone, or email"
              />
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="restaurantFilter">
                Restaurant
              </label>
              <select
                id="restaurantFilter"
                className="form-select"
                value={restaurantFilter}
                onChange={(event) => setRestaurantFilter(event.target.value)}
              >
                <option value="ALL">All Restaurants</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="statusFilter">
                Status
              </label>
              <select
                id="statusFilter"
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All Statuses" : formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-1 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-light w-100"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setRestaurantFilter("ALL");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="col-12">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow mb-1">Reservations</p>
              <h2 className="h5 mb-0">Reservation List</h2>
            </div>

            <span className="badge rounded-pill bg-light text-dark border">
              {filteredReservations.length} result
              {filteredReservations.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fa-regular fa-calendar-xmark fa-2x text-muted" />
              </div>
              <h3 className="h5">No reservations found</h3>
              <p className="text-muted mb-0">
                No restaurant reservations match the selected filters.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Reservation</th>
                    <th>Restaurant</th>
                    <th>Customer</th>
                    <th>Date and Time</th>
                    <th>Guests</th>
                    <th>Table</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <strong>{reservation.reservationCode}</strong>
                        <p className="small text-muted mb-0">
                          Created {formatDateLabel(reservation.createdAt.slice(0, 10))}
                        </p>
                      </td>

                      <td>
                        <div>
                          <strong>{reservation.restaurant.name}</strong>
                          <p className="small text-muted mb-0">
                            {getRestaurantLocation(reservation)}
                          </p>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>
                            {reservation.customerName || "Guest Customer"}
                          </strong>
                          <p className="small text-muted mb-0">
                            {reservation.customerPhone || "Phone not added"}
                          </p>
                          <p className="small text-muted mb-0">
                            {reservation.customerEmail || "Email not added"}
                          </p>
                        </div>
                      </td>

                      <td>
                        <strong>{formatDateLabel(reservation.reservationDate)}</strong>
                        <p className="small text-muted mb-0">
                          {formatTimeLabel(reservation.startTime)} -{" "}
                          {formatTimeLabel(reservation.endTime)}
                        </p>
                      </td>

                      <td>{reservation.guests}</td>

                      <td>
                        {reservation.table ? (
                          <>
                            <strong>Table {reservation.table.tableNumber}</strong>
                            <p className="small text-muted mb-0">
                              {reservation.table.capacity} guests
                              {reservation.table.seatingArea
                                ? ` · ${reservation.table.seatingArea}`
                                : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge rounded-pill ${getStatusBadgeClass(
                            reservation.status
                          )}`}
                        >
                          {formatStatusLabel(reservation.status)}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() => setSelectedReservation(reservation)}
                          >
                            Details
                          </button>

                          <div className="dropdown">
                            <button
                              className="btn btn-outline-dark btn-sm dropdown-toggle"
                              type="button"
                              data-bs-toggle="dropdown"
                              disabled={updatingReservationId === reservation.id}
                            >
                              {updatingReservationId === reservation.id
                                ? "Updating..."
                                : "Update"}
                            </button>

                            <ul className="dropdown-menu dropdown-menu-end">
                              {actionOptions.map((action) => (
                                <li key={action.status}>
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    disabled={
                                      !canApplyAction(
                                        reservation.status,
                                        action.status
                                      )
                                    }
                                    onClick={() =>
                                      updateReservationStatus(
                                        reservation,
                                        action.status
                                      )
                                    }
                                  >
                                    <i
                                      className={`${action.icon} me-2`}
                                      aria-hidden="true"
                                    />
                                    {action.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedReservation ? (
        <div
          className="modal fade show"
          style={{
            display: "block",
            background: "rgba(15, 23, 42, 0.55)",
          }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0">
              <div className="modal-header">
                <div>
                  <p className="eyebrow mb-1">Reservation Details</p>
                  <h5 className="modal-title">
                    {selectedReservation.reservationCode}
                  </h5>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setSelectedReservation(null)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Restaurant</p>
                      <h6 className="mb-1">
                        {selectedReservation.restaurant.name}
                      </h6>
                      <p className="text-muted mb-2">
                        {getRestaurantLocation(selectedReservation)}
                      </p>
                      <Link
                        href={`/restaurants/${selectedReservation.restaurant.slug}`}
                        className="btn btn-light btn-sm"
                        target="_blank"
                      >
                        View Restaurant
                      </Link>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Status</p>
                      <span
                        className={`badge rounded-pill ${getStatusBadgeClass(
                          selectedReservation.status
                        )}`}
                      >
                        {formatStatusLabel(selectedReservation.status)}
                      </span>

                      <div className="mt-3 small text-muted">
                        Payment Status: {formatStatusLabel(selectedReservation.paymentStatus)}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Customer</p>
                      <h6 className="mb-1">
                        {selectedReservation.customerName || "Guest Customer"}
                      </h6>
                      <p className="mb-1">
                        {selectedReservation.customerPhone || "Phone not added"}
                      </p>
                      <p className="mb-0">
                        {selectedReservation.customerEmail || "Email not added"}
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Schedule</p>
                      <h6 className="mb-1">
                        {formatDateLabel(selectedReservation.reservationDate)}
                      </h6>
                      <p className="mb-0">
                        {formatTimeLabel(selectedReservation.startTime)} -{" "}
                        {formatTimeLabel(selectedReservation.endTime)}
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Guests</p>
                      <h6 className="mb-0">
                        {selectedReservation.guests} guest
                        {selectedReservation.guests === 1 ? "" : "s"}
                      </h6>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="border rounded-4 p-3 h-100">
                      <p className="text-muted small mb-1">Table</p>
                      {selectedReservation.table ? (
                        <>
                          <h6 className="mb-1">
                            Table {selectedReservation.table.tableNumber}
                          </h6>
                          <p className="mb-0">
                            {selectedReservation.table.capacity} guests
                            {selectedReservation.table.seatingArea
                              ? ` · ${selectedReservation.table.seatingArea}`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <p className="mb-0 text-muted">Not assigned</p>
                      )}
                    </div>
                  </div>

                  {selectedReservation.customerNote ? (
                    <div className="col-12">
                      <div className="border rounded-4 p-3">
                        <p className="text-muted small mb-1">
                          Customer Special Request
                        </p>
                        <p className="mb-0">{selectedReservation.customerNote}</p>
                      </div>
                    </div>
                  ) : null}

                  {selectedReservation.cancellationReason ? (
                    <div className="col-12">
                      <div className="border rounded-4 p-3 bg-danger-subtle text-danger">
                        <p className="small mb-1">Cancellation Reason</p>
                        <p className="mb-0">
                          {selectedReservation.cancellationReason}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setSelectedReservation(null)}
                >
                  Close
                </button>

                <div className="d-flex flex-wrap gap-2">
                  {actionOptions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className={`btn btn-sm ${action.className}`}
                      disabled={
                        updatingReservationId === selectedReservation.id ||
                        !canApplyAction(selectedReservation.status, action.status)
                      }
                      onClick={() =>
                        updateReservationStatus(
                          selectedReservation,
                          action.status
                        )
                      }
                    >
                      <i className={`${action.icon} me-2`} aria-hidden="true" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}