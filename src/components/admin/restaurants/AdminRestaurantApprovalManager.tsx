"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Search,
  XCircle,
} from "lucide-react";

type AdminRestaurant = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  logo: string | null;
  coverImage: string | null;
  images: string[];
  cuisineTypes: string[];
  status: string;
  city: string | null;
  area: string | null;
  state: string | null;
  isTableReservationAvailable: boolean;
  vendor: {
    id: string;
    businessName: string;
    status: string;
    user: { name: string | null; email: string };
  };
  _count: {
    operatingHours: number;
    menuItems: number;
    tables: number;
    reservations: number;
  };
};

type Props = {
  initialRestaurants?: AdminRestaurant[];
};

type ActionType =
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "INACTIVE"
  | "ACTIVE";

const MAX_REASON = 1000;

const fallbackRestaurantImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22900%22%20height%3D%22600%22%20viewBox%3D%220%200%20900%20600%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22900%22%20height%3D%22600%22%20fill%3D%22%23F4F1EC%22/%3E%3Ctext%20x%3D%22450%22%20y%3D%22305%22%20font-family%3D%22Arial%22%20font-size%3D%2238%22%20fill%3D%22%239A8A7A%22%20text-anchor%3D%22middle%22%3ERestaurant%3C/text%3E%3C/svg%3E";

function normalizeRestaurantImage(value: string | null | undefined) {
  if (!value) {
    return fallbackRestaurantImage;
  }

  const imageValue = value.trim();

  if (!imageValue) {
    return fallbackRestaurantImage;
  }

  if (
    imageValue.startsWith("http://") ||
    imageValue.startsWith("https://") ||
    imageValue.startsWith("/") ||
    imageValue.startsWith("data:") ||
    imageValue.startsWith("blob:")
  ) {
    return imageValue;
  }

  return `/uploads/restaurants/${imageValue}`;
}

function getRestaurantImage(
  coverImage: string | null,
  logo: string | null,
  images: string[]
) {
  if (coverImage) {
    return normalizeRestaurantImage(coverImage);
  }

  if (logo) {
    return normalizeRestaurantImage(logo);
  }

  if (images[0]) {
    return normalizeRestaurantImage(images[0]);
  }

  return fallbackRestaurantImage;
}

function formatLocation(
  area: string | null,
  city: string | null,
  state: string | null
) {
  const location = [area, city, state].filter(Boolean).join(", ");

  return location || "Location not added";
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
  }

  if (status === "INACTIVE") {
    return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
}

export default function AdminRestaurantApprovalManager({
  initialRestaurants = [],
}: Props) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    restaurant: AdminRestaurant;
    action: ActionType;
  } | null>(null);
  const [reason, setReason] = useState("");

  const counts = useMemo(
    () => ({
      all: restaurants.length,
      pending: restaurants.filter(
        (restaurant) => restaurant.status === "PENDING_APPROVAL"
      ).length,
      active: restaurants.filter(
        (restaurant) =>
          restaurant.status === "ACTIVE" ||
          restaurant.status === "APPROVED"
      ).length,
      rejected: restaurants.filter(
        (restaurant) => restaurant.status === "REJECTED"
      ).length,
      suspended: restaurants.filter(
        (restaurant) => restaurant.status === "SUSPENDED"
      ).length,
      inactive: restaurants.filter(
        (restaurant) => restaurant.status === "INACTIVE"
      ).length,
    }),
    [restaurants]
  );

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        restaurant.status === statusFilter ||
        (statusFilter === "ACTIVE" &&
          restaurant.status === "APPROVED");

      const matchesSearch =
        !query ||
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.vendor.businessName.toLowerCase().includes(query) ||
        restaurant.vendor.user.email.toLowerCase().includes(query) ||
        formatLocation(
          restaurant.area,
          restaurant.city,
          restaurant.state
        )
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [restaurants, search, statusFilter]);

  async function executeAction() {
    if (!modal) {
      return;
    }

    const needsReason =
      modal.action === "REJECT" || modal.action === "SUSPEND";
    const cleanReason = reason.trim();

    if (needsReason && !cleanReason) {
      return;
    }

    if (cleanReason.length > MAX_REASON) {
      return;
    }

    try {
      setProcessingId(modal.restaurant.id);

      const response = await fetch(
        `/api/admin/restaurants/${modal.restaurant.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            action: modal.action,
            reason: cleanReason,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        alert(
          data?.message ||
            "Unable to update restaurant status."
        );
        return;
      }

      setRestaurants((currentRestaurants) =>
        currentRestaurants.map((restaurant) =>
          restaurant.id === modal.restaurant.id
            ? {
                ...restaurant,
                status:
                  data.restaurant?.status ??
                  restaurant.status,
              }
            : restaurant
        )
      );

      setModal(null);
      setReason("");
    } catch (error) {
      console.error(
        "ADMIN_RESTAURANT_ACTION_ERROR",
        error
      );
      alert(
        "Unable to update restaurant status. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openAction(
    restaurant: AdminRestaurant,
    action: ActionType
  ) {
    setReason("");
    setModal({ restaurant, action });
  }

  const filterCards = [
    ["ALL", "All", counts.all],
    ["PENDING_APPROVAL", "Pending", counts.pending],
    ["ACTIVE", "Active", counts.active],
    ["REJECTED", "Rejected", counts.rejected],
    ["SUSPENDED", "Suspended", counts.suspended],
    ["INACTIVE", "Inactive", counts.inactive],
  ] as const;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
        {filterCards.map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-xl border p-4 text-left shadow-sm transition ${
              statusFilter === value
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
            }`}
          >
            <p className="text-sm opacity-80">{label}</p>
            <p className="mt-1 text-2xl font-semibold">
              {count}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row dark:border-gray-800 dark:bg-white/[0.03]">
        <Link
          href="/admin/restaurants/add"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          Add Restaurant
        </Link>

        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search restaurant, vendor, city, or area..."
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {filteredRestaurants.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-800">
            🍽️
          </div>

          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            No restaurants found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Try another search or status filter, or add a
            new restaurant.
          </p>

          <Link
            href="/admin/restaurants/add"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            Add Restaurant
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:gap-6">
          {filteredRestaurants.map((restaurant) => {
            const imageUrl = getRestaurantImage(
              restaurant.coverImage,
              restaurant.logo,
              restaurant.images
            );

            return (
              <article
                key={restaurant.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="grid grid-cols-1 xl:grid-cols-[160px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="relative h-52 bg-gray-100 dark:bg-gray-800 xl:h-full">
                    <img
                      src={imageUrl}
                      alt={restaurant.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 p-4 xl:p-2.5 2xl:p-5">
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start 2xl:flex 2xl:flex-row 2xl:items-start 2xl:justify-between 2xl:gap-5">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 2xl:mb-3 2xl:gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium xl:px-1.5 xl:py-0.5 xl:text-[10px] 2xl:px-2.5 2xl:py-1 2xl:text-xs ${getStatusBadgeClass(
                              restaurant.status
                            )}`}
                          >
                            {formatStatusLabel(
                              restaurant.status
                            )}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium xl:px-1.5 xl:py-0.5 xl:text-[10px] 2xl:px-2.5 2xl:py-1 2xl:text-xs ${
                              restaurant.isTableReservationAvailable
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                            }`}
                          >
                            {restaurant.isTableReservationAvailable
                              ? "Reservations Enabled"
                              : "Reservations Disabled"}
                          </span>
                        </div>

                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 xl:text-base 2xl:text-xl">
                          {restaurant.name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 xl:mt-0.5 xl:text-xs 2xl:mt-1 2xl:text-sm">
                          {formatLocation(
                            restaurant.area,
                            restaurant.city,
                            restaurant.state
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Vendor:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {restaurant.vendor.businessName}
                          </span>
                        </p>

                        {restaurant.shortDescription ? (
                          <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-600 dark:text-gray-300 xl:mt-1 xl:overflow-hidden xl:text-ellipsis xl:whitespace-nowrap xl:text-xs xl:leading-4 2xl:mt-3 2xl:overflow-visible 2xl:whitespace-normal 2xl:text-sm 2xl:leading-6">
                            {restaurant.shortDescription}
                          </p>
                        ) : null}

                        {restaurant.cuisineTypes.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 xl:mt-1 2xl:mt-3 2xl:gap-2">
                            {restaurant.cuisineTypes.map(
                              (cuisine) => (
                                <span
                                  key={cuisine}
                                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 xl:px-2 xl:text-[10px] 2xl:px-3 2xl:py-1 2xl:text-xs"
                                >
                                  {cuisine}
                                </span>
                              )
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid w-full grid-cols-2 gap-1.5 text-center sm:grid-cols-4 xl:grid-cols-2 2xl:w-auto 2xl:min-w-[430px] 2xl:grid-cols-4 2xl:gap-3">
                        <Stat
                          value={restaurant._count.operatingHours}
                          label="Open Days"
                        />
                        <Stat
                          value={restaurant._count.menuItems}
                          label="Menus"
                        />
                        <Stat
                          value={restaurant._count.tables}
                          label="Tables"
                        />
                        <Stat
                          value={restaurant._count.reservations}
                          label="Reservations"
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1.5 border-t border-gray-200 pt-2 dark:border-gray-800 sm:grid-cols-2 xl:grid-cols-6 2xl:mt-5 2xl:gap-3 2xl:pt-5">
                      <ActionLink
                        href={`/admin/restaurants/${restaurant.id}/edit`}
                        label="Edit Restaurant"
                      />

                      <ActionLink
                        href={`/admin/restaurants/${restaurant.id}/menu`}
                        label="Manage Menu"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-amber-500 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm hover:bg-amber-600 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      />

                      <ActionLink
                        href={`/admin/restaurants/${restaurant.id}/hours`}
                        label="Operating Hours"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-gray-100 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-200 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      />

                      <ActionLink
                        href={`/admin/restaurants/${restaurant.id}/tables`}
                        label="Tables"
                        className="inline-flex min-h-8 items-center justify-center rounded-lg bg-gray-900 px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                      />

                      <ActionLink
                        href="/admin/restaurant-reservations"
                        label="Reservations"
                      />

                      <ActionLink
                        href={`/restaurants/${restaurant.slug}`}
                        label="View Public Page"
                        target="_blank"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800 2xl:mt-3">
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Admin Controls
                      </span>

                      {restaurant.status ===
                      "PENDING_APPROVAL" ? (
                        <>
                          <AdminButton
                            title="Approve"
                            onClick={() =>
                              openAction(
                                restaurant,
                                "APPROVE"
                              )
                            }
                            icon={
                              <CheckCircle2 className="h-4 w-4" />
                            }
                          />
                          <AdminButton
                            title="Reject"
                            danger
                            onClick={() =>
                              openAction(
                                restaurant,
                                "REJECT"
                              )
                            }
                            icon={
                              <XCircle className="h-4 w-4" />
                            }
                          />
                        </>
                      ) : null}

                      {restaurant.status === "ACTIVE" ||
                      restaurant.status === "APPROVED" ? (
                        <AdminButton
                          title="Pause / Suspend"
                          onClick={() =>
                            openAction(
                              restaurant,
                              "SUSPEND"
                            )
                          }
                          icon={
                            <PauseCircle className="h-4 w-4" />
                          }
                        />
                      ) : null}

                      {restaurant.status === "SUSPENDED" ||
                      restaurant.status === "REJECTED" ||
                      restaurant.status === "INACTIVE" ? (
                        <AdminButton
                          title="Activate"
                          onClick={() =>
                            openAction(
                              restaurant,
                              "ACTIVE"
                            )
                          }
                          icon={
                            <PlayCircle className="h-4 w-4" />
                          }
                        />
                      ) : null}

                      {restaurant.status !== "INACTIVE" &&
                      restaurant.status !== "SUSPENDED" ? (
                        <AdminButton
                          title="Set Inactive"
                          danger
                          onClick={() =>
                            openAction(
                              restaurant,
                              "INACTIVE"
                            )
                          }
                          icon={
                            <Ban className="h-4 w-4" />
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatStatusLabel(modal.action)} Restaurant
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {modal.restaurant.name}
            </p>

            {modal.action === "REJECT" ||
            modal.action === "SUSPEND" ? (
              <div className="mt-5">
                <label
                  htmlFor="admin-restaurant-action-reason"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Reason *
                </label>

                <textarea
                  id="admin-restaurant-action-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  maxLength={MAX_REASON}
                  className="min-h-28 w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter the reason for this action."
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {reason.length}/{MAX_REASON}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                The vendor will be notified after this action.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setReason("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  processingId === modal.restaurant.id ||
                  ((modal.action === "REJECT" ||
                    modal.action === "SUSPEND") &&
                    !reason.trim())
                }
                onClick={executeAction}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId === modal.restaurant.id
                  ? "Processing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-1 dark:bg-gray-900 2xl:rounded-xl 2xl:p-3">
      <p className="text-sm font-semibold text-gray-800 dark:text-white/90 2xl:text-lg">
        {value}
      </p>
      <p className="text-[9px] leading-3 text-gray-500 dark:text-gray-400 2xl:mt-1 2xl:text-xs 2xl:leading-normal">
        {label}
      </p>
    </div>
  );
}

function ActionLink({
  href,
  label,
  className = "",
  target,
}: {
  href: string;
  label: string;
  className?: string;
  target?: string;
}) {
  const defaultClassName =
    "inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 2xl:px-4 2xl:py-2.5 2xl:text-sm";

  return (
    <Link
      href={href}
      target={target}
      className={className || defaultClassName}
    >
      {label}
    </Link>
  );
}

function AdminButton({
  title,
  icon,
  onClick,
  danger = false,
}: {
  title: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
        danger
          ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon}
      {title}
    </button>
  );
}
