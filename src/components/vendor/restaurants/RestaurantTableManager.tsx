"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";

type RestaurantTableStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | string;

type RestaurantTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  seatingArea: string | null;
  status: RestaurantTableStatus;
  isReservable: boolean;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  location: string;
  status: string;
  isTableReservationAvailable: boolean;
  reservationMinGuests: number;
  reservationMaxGuests: number | null;
  tableCount: number;
  reservationCount: number;
  tables: RestaurantTable[];
};

type RestaurantTableManagerProps = {
  restaurant: RestaurantSummary;
};

type TableFormState = {
  tableNumber: string;
  capacity: string;
  seatingArea: string;
  status: RestaurantTableStatus;
  isReservable: boolean;
  note: string;
  sortOrder: string;
};

const initialFormState: TableFormState = {
  tableNumber: "",
  capacity: "2",
  seatingArea: "",
  status: "ACTIVE",
  isReservable: true,
  note: "",
  sortOrder: "0",
};

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30";

const selectClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
    case "INACTIVE":
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "MAINTENANCE":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function TextInput({
  id,
  label,
  value,
  placeholder,
  type = "text",
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

function ToggleInput({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>

      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
      />
    </label>
  );
}

export default function RestaurantTableManager({
  restaurant,
}: RestaurantTableManagerProps) {
  const [tables, setTables] = useState<RestaurantTable[]>(restaurant.tables);
  const [formState, setFormState] =
    useState<TableFormState>(initialFormState);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeTableCount = useMemo(
    () =>
      tables.filter(
        (table) => table.status === "ACTIVE" && table.isReservable
      ).length,
    [tables]
  );

  const inactiveTableCount = useMemo(
    () =>
      tables.filter(
        (table) =>
          table.status === "INACTIVE" || table.status === "MAINTENANCE"
      ).length,
    [tables]
  );

  const totalCapacity = useMemo(
    () =>
      tables
        .filter((table) => table.status === "ACTIVE" && table.isReservable)
        .reduce((total, table) => total + table.capacity, 0),
    [tables]
  );

  function updateField<K extends keyof TableFormState>(
    field: K,
    value: TableFormState[K]
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingTableId(null);
    setFormState(initialFormState);
    setMessage(null);
  }

  function startEditing(table: RestaurantTable) {
    setEditingTableId(table.id);
    setFormState({
      tableNumber: table.tableNumber,
      capacity: String(table.capacity),
      seatingArea: table.seatingArea || "",
      status: table.status,
      isReservable: table.isReservable,
      note: table.note || "",
      sortOrder: String(table.sortOrder),
    });
    setMessage(null);
  }

  function validateForm() {
    const tableNumber = formState.tableNumber.trim();
    const capacity = Number(formState.capacity);
    const sortOrder = Number(formState.sortOrder);

    if (!tableNumber) {
      return "Table number is required.";
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      return "Table capacity must be at least 1.";
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return "Sort order must be 0 or greater.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      tableNumber: formState.tableNumber.trim(),
      capacity: Number(formState.capacity),
      seatingArea: formState.seatingArea.trim() || null,
      status: formState.status,
      isReservable: formState.isReservable,
      note: formState.note.trim() || null,
      sortOrder: Number(formState.sortOrder),
    };

    try {
      const endpoint = editingTableId
        ? `/api/vendor/restaurants/${restaurant.id}/tables/${editingTableId}`
        : `/api/vendor/restaurants/${restaurant.id}/tables`;

      const response = await fetch(endpoint, {
        method: editingTableId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to save table details.");
      }

      const savedTable = result.table as RestaurantTable;

      setTables((currentTables) => {
        const updatedTables = editingTableId
          ? currentTables.map((table) =>
              table.id === savedTable.id ? savedTable : table
            )
          : [...currentTables, savedTable];

        return updatedTables.sort((firstTable, secondTable) => {
          if (firstTable.sortOrder !== secondTable.sortOrder) {
            return firstTable.sortOrder - secondTable.sortOrder;
          }

          return firstTable.tableNumber.localeCompare(secondTable.tableNumber);
        });
      });

      setMessage({
        type: "success",
        text:
          result.message ||
          (editingTableId
            ? "Table updated successfully."
            : "Table created successfully."),
      });

      setEditingTableId(null);
      setFormState(initialFormState);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save table details.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTable(table: RestaurantTable) {
    const confirmed = window.confirm(
      `Are you sure you want to delete table ${table.tableNumber}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingTableId(table.id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/vendor/restaurants/${restaurant.id}/tables/${table.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to delete table.");
      }

      setTables((currentTables) =>
        currentTables.filter((currentTable) => currentTable.id !== table.id)
      );

      setMessage({
        type: "success",
        text: result.message || "Table deleted successfully.",
      });

      if (editingTableId === table.id) {
        resetForm();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Unable to delete table.",
      });
    } finally {
      setDeletingTableId(null);
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
          label="Total Tables"
          value={tables.length}
          helper="Created tables"
        />
        <StatCard
          label="Reservable Tables"
          value={activeTableCount}
          helper="Active and available"
        />
        <StatCard
          label="Inactive Tables"
          value={inactiveTableCount}
          helper="Inactive or maintenance"
        />
        <StatCard
          label="Total Capacity"
          value={totalCapacity}
          helper="Reservable seats"
        />
        <StatCard
          label="Reservations"
          value={restaurant.reservationCount}
          helper="Total received"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <Section
            title={editingTableId ? "Edit Table" : "Create Table"}
            subtitle="Add table number, capacity, area, and reservation status."
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <TextInput
                id="tableNumber"
                label="Table Number"
                value={formState.tableNumber}
                placeholder="Example: T01"
                onChange={(value) => updateField("tableNumber", value)}
              />

              <TextInput
                id="capacity"
                label="Capacity"
                type="number"
                min="1"
                value={formState.capacity}
                placeholder="2"
                onChange={(value) => updateField("capacity", value)}
              />

              <TextInput
                id="seatingArea"
                label="Seating Area"
                value={formState.seatingArea}
                placeholder="Indoor, Outdoor, Family Section"
                onChange={(value) => updateField("seatingArea", value)}
              />

              <div>
                <label
                  htmlFor="tableStatus"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Status
                </label>

                <select
                  id="tableStatus"
                  value={formState.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className={selectClassName}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              <TextInput
                id="sortOrder"
                label="Sort Order"
                type="number"
                min="0"
                value={formState.sortOrder}
                placeholder="0"
                onChange={(value) => updateField("sortOrder", value)}
              />

              <div>
                <label
                  htmlFor="tableNote"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Internal Note
                </label>

                <textarea
                  id="tableNote"
                  rows={4}
                  value={formState.note}
                  placeholder="Optional note for the vendor team."
                  onChange={(event) => updateField("note", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <ToggleInput
                id="isReservable"
                label="Allow Reservation"
                checked={formState.isReservable}
                onChange={(value) => updateField("isReservable", value)}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : editingTableId
                    ? "Update Table"
                    : "Create Table"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Reset
                </button>
              </div>
            </form>
          </Section>
        </div>

        <div className="xl:col-span-2">
          <Section
            title="Table List"
            subtitle="Review and manage all tables configured for this restaurant."
          >
            {tables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center dark:border-gray-700">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  🍽️
                </div>

                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  No tables created yet
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create at least one active and reservable table before testing
                  customer reservations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {[
                        "Table",
                        "Capacity",
                        "Area",
                        "Status",
                        "Reservation",
                        "Sort",
                        "Updated",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tables.map((table) => (
                      <tr
                        key={table.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            Table {table.tableNumber}
                          </p>

                          {table.note ? (
                            <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                              {table.note}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {table.capacity} guests
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {table.seatingArea || "Not specified"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                              table.status
                            )}`}
                          >
                            {formatStatusLabel(table.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              table.isReservable
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
                                : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {table.isReservable ? "Allowed" : "Disabled"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {table.sortOrder}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDateLabel(table.updatedAt)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(table)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTable(table)}
                              disabled={deletingTableId === table.id}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                            >
                              {deletingTableId === table.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>

      <Section
        title="Reservation Rules"
        subtitle="Only active and reservable tables are shown to customers during slot selection."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Minimum Guests
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.reservationMinGuests}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Maximum Guests
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {restaurant.reservationMaxGuests || "Not limited"}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Restaurant Status
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-800 dark:text-white/90">
              {formatStatusLabel(restaurant.status)}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Table Reservation
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