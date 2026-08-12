"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCartDrawer } from "@/context/CartDrawerContext";

export default function CartDrawer() {
  const {
    isOpen,
    items,
    count,
    subtotal,
    currency,
    closeCart,
    updateCartItem,
  } = useCartDrawer();

  return (
    <>
      <div
        className={`fixed inset-0 z-[99998] bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      <aside
        className={`fixed right-0 top-0 z-[99999] flex h-screen w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
          <h2 className="font-heading text-2xl uppercase text-black">
            Your Cart ({count})
          </h2>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-10 w-10 items-center justify-center rounded-full text-black hover:bg-gray-100"
            aria-label="Close cart"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {items.length > 0 ? (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeCart}
                    className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        ✦
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="line-clamp-2 text-sm font-bold text-black hover:underline"
                        >
                          {item.title}
                        </Link>

                        <p className="mt-1 text-xs uppercase text-gray-500">
                          {item.vendor}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateCartItem(item.id, 0)}
                        className="text-black hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItem(item.id, item.quantity - 1)
                          }
                          className="flex h-9 w-9 items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} />
                        </button>

                        <span className="min-w-8 text-center text-sm">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateCartItem(item.id, item.quantity + 1)
                          }
                          className="flex h-9 w-9 items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-black">
                        {item.currency} {item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-3xl">
                🛒
              </div>

              <h3 className="mt-5 text-xl font-semibold text-black">
                Your cart is empty
              </h3>

              <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
                Add products, services, restaurants or experiences to continue.
              </p>

              <button
                type="button"
                onClick={closeCart}
                className="mt-6 rounded-full bg-black px-8 py-3 text-sm font-semibold text-white"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-8 py-6">
          <div className="mb-5 flex flex-wrap gap-2">
            <button className="rounded-full bg-gray-100 px-5 py-2 text-sm">
              Order Note ›
            </button>

            <button className="rounded-full bg-gray-100 px-5 py-2 text-sm">
              Estimate Shipping ›
            </button>

            <button className="rounded-full bg-gray-100 px-5 py-2 text-sm">
              Coupon ›
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-lg uppercase text-black">
                Estimated Total
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Taxes and shipping calculated at checkout
              </p>
            </div>

            <p className="text-lg font-semibold uppercase text-black">
              {currency} {subtotal.toFixed(2)}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/cart"
              onClick={closeCart}
              className="rounded-full bg-gray-100 px-6 py-4 text-center text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              View Cart
            </Link>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="rounded-full bg-black px-6 py-4 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Check Out
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}