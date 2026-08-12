"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  PauseCircle,
  Search,
  ShieldAlert,
  Store,
  Table2,
  X,
  XCircle,
} from "lucide-react";

type AdminRestaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  coverImage: string | null;
  images: string[];
  cuisineTypes: string[];
  priceForTwo: string | null;
  currency: string;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  area: string | null;
  status: string;
  isTableReservationAvailable: boolean;
  reservationSlotMinutes: number;
  reservationAdvanceDays: number;
  rejectedReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    tables: number;
    reservations: number;
    reviews: number;
  };
};

type AdminRestaurantApprovalManagerProps = {
  initialRestaurants?: AdminRestaurant[];
};

type ActionType =
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "INACTIVE"
  | "ACTIVE";

const MAX_ACTION_REASON_LENGTH = 1000;

function statusBadgeClass(status: string) {
  if (status === "ACTIVE" || status === "APPROVED") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "PENDING_APPROVAL") {
    return "bg-yellow-50 text-yellow-700 ring-yellow-200";
  }

  if (status === "REJECTED" || status === "SUSPENDED") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "INACTIVE") {
    return "bg-gray-50 text-gray-700 ring-gray-200";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getRestaurantImage(restaurant: AdminRestaurant) {
  return (
    restaurant.coverImage ||
    restaurant.logo ||
    restaurant.images[0] ||
    ""
  );
}

function getRestaurantImages(restaurant: AdminRestaurant) {
  return Array.from(
    new Set(
      [
        restaurant.coverImage,
        restaurant.logo,
        ...restaurant.images,
      ].filter((image): image is string => Boolean(image))
    )
  );
}

function getLocationText(restaurant: AdminRestaurant) {
  return (
    [restaurant.area, restaurant.city, restaurant.country]
      .filter(Boolean)
      .join(", ") || "Not added"
  );
}

function normalizeRestaurant(restaurant: AdminRestaurant): AdminRestaurant {
  return {
    ...restaurant,
    images: Array.isArray(restaurant.images) ? restaurant.images : [],
    cuisineTypes: Array.isArray(restaurant.cuisineTypes)
      ? restaurant.cuisineTypes
      : [],
    _count: {
      tables: restaurant._count?.tables || 0,
      reservations: restaurant._count?.reservations || 0,
      reviews: restaurant._count?.reviews || 0,
    },
  };
}

export default function AdminRestaurantApprovalManager({
  initialRestaurants = [],
}: AdminRestaurantApprovalManagerProps) {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>(() =>
    initialRestaurants.map(normalizeRestaurant)
  );

  const [activeStatus, setActiveStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<AdminRestaurant | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    restaurant: AdminRestaurant;
    action: ActionType;
  } | null>(null);

  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!selectedRestaurant && !actionModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedRestaurant, actionModal]);

  const counts = useMemo(() => {
    return {
      all: restaurants.length,
      pending: restaurants.filter((item) => item.status === "PENDING_APPROVAL")
        .length,
      active: restaurants.filter((item) => item.status === "ACTIVE").length,
      rejected: restaurants.filter((item) => item.status === "REJECTED").length,
      suspended: restaurants.filter((item) => item.status === "SUSPENDED")
        .length,
      inactive: restaurants.filter((item) => item.status === "INACTIVE").length,
    };
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesStatus =
        activeStatus === "ALL" || restaurant.status === activeStatus;

      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        restaurant.name.toLowerCase().includes(searchValue) ||
        restaurant.vendor.businessName.toLowerCase().includes(searchValue) ||
        restaurant.vendor.user.email.toLowerCase().includes(searchValue) ||
        (restaurant.city || "").toLowerCase().includes(searchValue) ||
        (restaurant.area || "").toLowerCase().includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [restaurants, activeStatus, search]);

  async function runAction(
    restaurant: AdminRestaurant,
    action: ActionType
  ) {
    const normalizedReason = reason.trim();
    const requiresReason =
      action === "REJECT" || action === "SUSPEND";

    if (requiresReason && !normalizedReason) {
      alert("A reason is required for this action.");
      return;
    }

    if (
      normalizedReason.length >
      MAX_ACTION_REASON_LENGTH
    ) {
      alert(
        "The action reason cannot exceed 1,000 characters."
      );
      return;
    }

    try {
      setProcessingId(restaurant.id);

      const response = await fetch(
        `/api/admin/restaurants/${restaurant.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            action,
            reason: normalizedReason,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok || !data?.success) {
        alert(
          data?.message ||
            "Unable to update the restaurant status."
        );
        return;
      }

      let updatedRestaurant: AdminRestaurant | null = null;

      setRestaurants((currentRestaurants) =>
        currentRestaurants.map((item) => {
          if (item.id !== restaurant.id) {
            return item;
          }

          updatedRestaurant = normalizeRestaurant({
            ...item,
            ...data.restaurant,
            priceForTwo:
              data.restaurant?.priceForTwo !==
                null &&
              data.restaurant?.priceForTwo !==
                undefined
                ? String(
                    data.restaurant.priceForTwo
                  )
                : item.priceForTwo,
            createdAt:
              data.restaurant?.createdAt ||
              item.createdAt,
            approvedAt:
              data.restaurant?.approvedAt ??
              item.approvedAt,
            _count:
              data.restaurant?._count ||
              item._count,
          });

          return updatedRestaurant;
        })
      );

      setSelectedRestaurant((currentRestaurant) => {
        if (
          !currentRestaurant ||
          currentRestaurant.id !== restaurant.id ||
          !updatedRestaurant
        ) {
          return currentRestaurant;
        }

        return updatedRestaurant;
      });

      setActionModal(null);
      setReason("");
    } catch (error) {
      console.error(
        "ADMIN_RESTAURANT_ACTION_ERROR",
        error
      );

      alert(
        "Unable to update the restaurant status. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openActionModal(restaurant: AdminRestaurant, action: ActionType) {
    setReason("");
    setActionModal({
      restaurant,
      action,
    });
  }

  function actionTitle(action: ActionType) {
    if (action === "APPROVE") return "Approve Restaurant";
    if (action === "REJECT") return "Reject Restaurant";
    if (action === "SUSPEND") return "Suspend Restaurant";
    if (action === "INACTIVE") return "Set Restaurant Inactive";
    return "Activate Restaurant";
  }

  function actionButtonText(action: ActionType) {
    if (action === "APPROVE") return "Approve and Activate";
    if (action === "REJECT") return "Reject";
    if (action === "SUSPEND") return "Suspend";
    if (action === "INACTIVE") return "Set Inactive";
    return "Activate";
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => setActiveStatus("ALL")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "ALL"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">All</p>
          <p className="mt-2 text-2xl font-bold">{counts.all}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("PENDING_APPROVAL")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "PENDING_APPROVAL"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">Pending</p>
          <p className="mt-2 text-2xl font-bold">{counts.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("ACTIVE")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "ACTIVE"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">Active</p>
          <p className="mt-2 text-2xl font-bold">{counts.active}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("REJECTED")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "REJECTED"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">Rejected</p>
          <p className="mt-2 text-2xl font-bold">{counts.rejected}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("SUSPENDED")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "SUSPENDED"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">Suspended</p>
          <p className="mt-2 text-2xl font-bold">{counts.suspended}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatus("INACTIVE")}
          className={`rounded-2xl border p-4 text-left ${
            activeStatus === "INACTIVE"
              ? "border-black bg-black text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <p className="text-sm opacity-70">Inactive</p>
          <p className="mt-2 text-2xl font-bold">{counts.inactive}</p>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              aria-label="Search restaurants"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search restaurant, vendor, city, or area..."
              className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none focus:border-black"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filteredRestaurants.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <Store className="mb-4 h-12 w-12 text-gray-400" />

            <h3 className="text-lg font-bold text-gray-950">
              No restaurants found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              No restaurants match the selected filter or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4">Restaurant</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Reservations</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRestaurants.map((restaurant) => {
                  const image = getRestaurantImage(restaurant);

                  return (
                    <tr key={restaurant.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
                            {image ? (
                              <img
                                src={image}
                                alt={restaurant.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Store className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-950">
                              {restaurant.name}
                            </p>

                            <p className="mt-1 line-clamp-1 max-w-[280px] text-xs text-gray-500">
                              {restaurant.shortDescription ||
                                restaurant.description ||
                                "No description added"}
                            </p>

                            <p className="mt-1 text-[11px] text-gray-400">
                              /{restaurant.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {restaurant.vendor.businessName}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {restaurant.vendor.user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

                          <span>{getLocationText(restaurant)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2">
                            <Table2 className="h-4 w-4 text-gray-400" />
                            {restaurant._count.tables} table
                            {restaurant._count.tables === 1 ? "" : "s"}
                          </p>

                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {restaurant._count.reservations} reservation
                            {restaurant._count.reservations === 1 ? "" : "s"}
                          </p>

                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {restaurant.reservationSlotMinutes} minute slots
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(
                            restaurant.status
                          )}`}
                        >
                          {formatStatus(restaurant.status)}
                        </span>

                        {restaurant.rejectedReason && (
                          <p className="mt-1 line-clamp-1 max-w-[180px] text-xs text-red-500">
                            {restaurant.rejectedReason}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRestaurant(restaurant)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100"
                            aria-label="View restaurant"
                          >
                            <Eye size={15} />
                          </button>

                          {restaurant.status === "PENDING_APPROVAL" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(restaurant, "APPROVE")
                                }
                                disabled={processingId === restaurant.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-200 text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                                aria-label="Approve restaurant"
                              >
                                <CheckCircle2 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(restaurant, "REJECT")
                                }
                                disabled={processingId === restaurant.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                aria-label="Reject restaurant"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {restaurant.status === "ACTIVE" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(restaurant, "INACTIVE")
                                }
                                disabled={processingId === restaurant.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                                aria-label="Set inactive"
                              >
                                <PauseCircle size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(restaurant, "SUSPEND")
                                }
                                disabled={processingId === restaurant.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                aria-label="Suspend restaurant"
                              >
                                <Ban size={16} />
                              </button>
                            </>
                          )}

                          {(restaurant.status === "INACTIVE" ||
                            restaurant.status === "REJECTED" ||
                            restaurant.status === "SUSPENDED") && (
                            <button
                              type="button"
                              onClick={() =>
                                openActionModal(restaurant, "ACTIVE")
                              }
                              disabled={processingId === restaurant.id}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-200 text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                              aria-label="Activate restaurant"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRestaurant && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-preview-title"
            className="mx-auto mt-8 max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h3 id="restaurant-preview-title" className="text-xl font-bold text-gray-950">
                  {selectedRestaurant.name}
                </h3>

                <p className="text-sm text-gray-500">
                  Restaurant details preview
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRestaurant(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200"
                aria-label="Close restaurant details"
              >
                <X size={20} />
              </button>
            </div>

            {getRestaurantImages(
              selectedRestaurant
            ).length > 0 ? (
              <div className="border-b border-gray-200 p-5">
                <p className="mb-3 text-sm font-semibold text-gray-700">
                  Restaurant Images
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {getRestaurantImages(
                    selectedRestaurant
                  ).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-2xl bg-gray-100"
                    >
                      <img
                        src={image}
                        alt={`${selectedRestaurant.name} image ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Short Description
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {selectedRestaurant.shortDescription ||
                      "No short description added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Full Description
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {selectedRestaurant.description ||
                      "No description added"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">Vendor</p>

                  <p className="mt-1 text-sm text-gray-600">
                    {selectedRestaurant.vendor.businessName}
                  </p>

                  <p className="text-xs text-gray-500">
                    {selectedRestaurant.vendor.user.email}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Location
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {[
                      selectedRestaurant.address,
                      selectedRestaurant.area,
                      selectedRestaurant.city,
                      selectedRestaurant.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">Cuisine</p>

                  <p className="mt-1 text-sm text-gray-600">
                    {selectedRestaurant.cuisineTypes.length > 0
                      ? selectedRestaurant.cuisineTypes.join(", ")
                      : "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Table Reservation
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {selectedRestaurant.isTableReservationAvailable
                      ? "Available"
                      : "Not available"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {selectedRestaurant.reservationSlotMinutes} minute slots ·{" "}
                    {selectedRestaurant.reservationAdvanceDays} days advance
                    booking
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">Tables</p>

                  <p className="mt-1 text-sm text-gray-600">
                    {selectedRestaurant._count.tables} table
                    {selectedRestaurant._count.tables === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Reservations
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {selectedRestaurant._count.reservations} reservation
                    {selectedRestaurant._count.reservations === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-action-title"
            className="mx-auto mt-24 max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <ShieldAlert className="h-6 w-6 text-gray-700" />
              </div>

              <div>
                <h3 id="restaurant-action-title" className="text-xl font-bold text-gray-950">
                  {actionTitle(actionModal.action)}
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Restaurant:{" "}
                  <span className="font-semibold text-gray-900">
                    {actionModal.restaurant.name}
                  </span>
                </p>
              </div>
            </div>

            {(actionModal.action === "REJECT" ||
              actionModal.action === "SUSPEND") && (
              <div className="mb-5">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason *
                </label>

                <textarea
                  value={reason}
                  maxLength={MAX_ACTION_REASON_LENGTH}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  className="min-h-28 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="Enter the reason for this action."
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {reason.length}/{MAX_ACTION_REASON_LENGTH}
                </p>
              </div>
            )}

            {actionModal.action !== "REJECT" &&
              actionModal.action !== "SUSPEND" && (
                <p className="mb-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                  The vendor will be notified after this action is completed.
                </p>
              )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setReason("");
                }}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  runAction(actionModal.restaurant, actionModal.action)
                }
                disabled={
                  processingId === actionModal.restaurant.id ||
                  ((actionModal.action === "REJECT" ||
                    actionModal.action === "SUSPEND") &&
                    !reason.trim())
                }
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processingId === actionModal.restaurant.id
                  ? "Processing..."
                  : actionButtonText(actionModal.action)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}