"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

type CartItem = {
  id: string;
  productId: string | null;
  serviceId: string | null;
  restaurantId?: string | null;
  menuItemId?: string | null;
  title: string;
  slug: string;
  vendor: string;
  image: string;
  quantity: number;
  price: number;
  currency: string;
  type: "PRODUCT" | "SERVICE" | "MENU_ITEM";
  lineTotal: number;
};

type CartData = {
  items: CartItem[];
  count: number;
  subtotal: number;
  currency: string;
};

function itemDetailHref(item: CartItem) {
  if (item.type === "PRODUCT") return `/products/${item.slug}`;
  if (item.type === "SERVICE") return `/services/${item.slug}`;
  return "#";
}

function itemTypeLabel(type: CartItem["type"]) {
  if (type === "PRODUCT") return "Product";
  if (type === "SERVICE") return "Service";
  return "Restaurant Item";
}

export default function CartPageClient() {
  const [cart, setCart] = useState<CartData>({
    items: [],
    count: 0,
    subtotal: 0,
    currency: "AED",
  });

  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/cart/drawer", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      setCart({
        items: data.items || [],
        count: Number(data.count || 0),
        subtotal: Number(data.subtotal || 0),
        currency: data.currency || "AED",
      });
    } catch (error) {
      console.error("CART_PAGE_LOAD_ERROR", error);
      setCart({
        items: [],
        count: 0,
        subtotal: 0,
        currency: "AED",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function updateQuantity(cartItemId: string, quantity: number) {
    try {
      setUpdatingItemId(cartItemId);

      const response = await fetch("/api/cart/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cartItemId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Cart update nahi ho paya.");
        return;
      }

      window.dispatchEvent(new Event("cart-updated"));
      await loadCart();
    } catch (error) {
      console.error("CART_PAGE_UPDATE_ERROR", error);
      alert("Cart update nahi ho paya.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  const shipping = 0;
  const tax = 0;
  const total = cart.subtotal + shipping + tax;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            Loading cart...
          </div>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf7f2] px-4 py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm">
          <ShoppingBag className="mb-5 h-16 w-16 text-gray-400" />

          <h1 className="text-3xl font-semibold text-gray-950">
            Your cart is empty
          </h1>

          <p className="mt-3 max-w-md text-sm leading-6 text-gray-500">
            Products, services ya restaurant menu items cart me add karo.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/restaurants"
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Explore Restaurants
            </Link>

            <Link
              href="/"
              className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] px-4 py-10 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-950">Your Cart</h1>
          <p className="mt-1 text-sm text-gray-500">
            {cart.count} item(s) in your cart
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm"
              >
                <div className="grid gap-4 p-4 md:grid-cols-[120px_1fr_auto] md:items-center">
                  <div className="h-28 overflow-hidden rounded-2xl bg-gray-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {itemTypeLabel(item.type)}
                    </span>

                    <Link
                      href={itemDetailHref(item)}
                      className="mt-3 block text-xl font-semibold text-gray-950 hover:underline"
                    >
                      {item.title}
                    </Link>

                    <p className="mt-1 text-sm text-gray-500">{item.vendor}</p>

                    <p className="mt-3 text-lg font-bold text-gray-950">
                      {item.currency} {item.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        disabled={updatingItemId === item.id}
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="flex h-10 w-10 items-center justify-center text-gray-700 disabled:opacity-50"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="min-w-10 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={updatingItemId === item.id}
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="flex h-10 w-10 items-center justify-center text-gray-700 disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-950">
                        {item.currency} {item.lineTotal.toFixed(2)}
                      </p>

                      <button
                        type="button"
                        disabled={updatingItemId === item.id}
                        onClick={() => updateQuantity(item.id, 0)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-950">
                  {cart.currency} {cart.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Shipping / Delivery</span>
                <span className="font-semibold text-gray-950">
                  {cart.currency} {shipping.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="font-semibold text-gray-950">
                  {cart.currency} {tax.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-950">Total</span>
                  <span className="font-bold text-gray-950">
                    {cart.currency} {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 block rounded-full bg-black px-6 py-3 text-center text-sm font-semibold text-white hover:bg-gray-800"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/restaurants"
              className="mt-3 block rounded-full border border-gray-300 px-6 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}