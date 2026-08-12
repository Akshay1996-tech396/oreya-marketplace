"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CartItemActionsProps = {
  cartItemId: string;
  quantity: number;
};

export default function CartItemActions({
  cartItemId,
  quantity,
}: CartItemActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function refreshCartState() {
    window.dispatchEvent(new Event("cart-updated"));
    router.refresh();
  }

  async function updateQuantity(action: "increment" | "decrement") {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch("/api/cart/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cartItemId,
          action,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorMessage = data.message || "Cart update nahi hua.";
        setMessage(errorMessage);
        alert(errorMessage);
        return;
      }

      refreshCartState();
    } catch (error) {
      console.error("CART_UPDATE_ERROR", error);
      setMessage("Something went wrong.");
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem() {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch("/api/cart/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cartItemId,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorMessage = data.message || "Item remove nahi hua.";
        setMessage(errorMessage);
        alert(errorMessage);
        return;
      }

      refreshCartState();
    } catch (error) {
      console.error("CART_REMOVE_ERROR", error);
      setMessage("Something went wrong.");
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-4 inline-flex items-center rounded-full bg-gray-100">
        <button
          type="button"
          onClick={() => updateQuantity("decrement")}
          disabled={loading}
          className="px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          -
        </button>

        <span className="min-w-10 px-4 text-center text-sm">{quantity}</span>

        <button
          type="button"
          onClick={() => updateQuantity("increment")}
          disabled={loading}
          className="px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={removeItem}
        disabled={loading}
        className="mt-4 block text-xs text-gray-400 underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Updating..." : "Remove"}
      </button>
    </>
  );
}