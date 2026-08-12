"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddToCartButtonProps = {
  slug: string;
  type: "PRODUCT" | "SERVICE";
};

export default function AddToCartButton({ slug, type }: AddToCartButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAddToCart() {
    try {
      setLoading(true);

      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          slug,
          type,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        alert(data.message || "Only customers can add items to cart.");
        return;
      }

      if (!response.ok) {
        alert(data.message || "Cart me item add nahi hua.");
        return;
      }

      router.push("/cart");
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
      onClick={handleAddToCart}
      disabled={loading}
      className="flex-1 rounded-full bg-gray-100 py-3 text-center text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Adding..." : "Add To Cart"}
    </button>
  );
}