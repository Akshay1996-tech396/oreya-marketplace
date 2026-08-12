"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type VendorItemStatusButtonProps = {
  itemId: string;
  itemType: "PRODUCT" | "SERVICE";
  currentStatus: string;
};

export default function VendorItemStatusButton({
  itemId,
  itemType,
  currentStatus,
}: VendorItemStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isInactive = currentStatus === "INACTIVE";
  const action = isInactive ? "ACTIVATE" : "DEACTIVATE";

  async function handleStatusChange() {
    const confirmMessage = isInactive
      ? `Are you sure you want to activate this ${itemType.toLowerCase()}?`
      : `Are you sure you want to deactivate this ${itemType.toLowerCase()}?`;

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        itemType === "PRODUCT"
          ? `/api/vendor/products/${itemId}`
          : `/api/vendor/services/${itemId}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Status update nahi hua.");
        return;
      }

      alert(data.message || "Status updated successfully.");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStatusChange}
      disabled={loading}
      className={
        isInactive
          ? "mt-3 inline-flex items-center rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          : "mt-3 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading
        ? "Updating..."
        : isInactive
          ? "Activate"
          : "Deactivate"}
    </button>
  );
}