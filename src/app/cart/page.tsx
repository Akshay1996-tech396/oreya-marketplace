import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getCustomerCart } from "../../lib/cart";
import CartItemActions from "../../components/cart/CartItemActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faCartShopping,
  faChevronRight,
  faTriangleExclamation,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

function getItemTypeLabel(type: string) {
  if (type === "PRODUCT") return "Product";
  if (type === "SERVICE") return "Service";
  if (type === "MENU_ITEM") return "Restaurant Menu Item";
  return type;
}

function getItemPath(item: { type: string; slug: string }) {
  if (item.type === "PRODUCT") {
    return `/products/${item.slug}`;
  }

  if (item.type === "SERVICE") {
    return `/services/${item.slug}`;
  }

  return "#";
}

function formatAmount(currency: string, amount: number) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function getVariantEntries(options?: Record<string, string>) {
  if (!options) {
    return [];
  }

  return Object.entries(options).filter(([name, value]) => {
    return Boolean(name.trim()) && Boolean(value.trim());
  });
}

export default async function CartPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  const cart = await getCustomerCart(user.id);

  const shipping = 0;
  const tax = 0;
  const total = cart.subtotal + shipping + tax;

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-10 border-b border-gray-200 pb-8">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Shopping Cart
          </p>

          <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
            Your Cart
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Welcome, {user.name}. Review your selected products and services
            before proceeding to checkout.
          </p>
        </div>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <FontAwesomeIcon
              icon={faCartShopping}
              className="mx-auto h-10 w-10 text-gray-400"
            />

            <h2 className="mt-5 font-heading text-2xl uppercase">
              Your cart is empty
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              Add products or services to continue to checkout.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/collections/products"
                className="inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white"
              >
                Explore Products
              </Link>

              <Link
                href="/"
                className="inline-block rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-black hover:bg-gray-100"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              {cart.hasUnavailableItems && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="mt-0.5 h-4 w-4"
                    />

                    <div>
                      <p className="font-semibold">
                        Some cart items are currently unavailable.
                      </p>

                      <p className="mt-1">
                        Please remove unavailable items or update their
                        quantities before proceeding to checkout.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cart.items.map((item) => {
                const itemType = String(item.type);

                const itemPath = getItemPath({
                  type: itemType,
                  slug: item.slug,
                });

                const isRestaurantItem = itemType === "MENU_ITEM";
                const variantEntries = getVariantEntries(item.variantOptions);
                const hasVariantDetails =
                  Boolean(item.variantTitle) ||
                  Boolean(item.variantSku) ||
                  variantEntries.length > 0;

                return (
                  <div
                    key={item.id}
                    className={
                      item.isAvailable
                        ? "rounded-[24px] border border-gray-200 p-6"
                        : "rounded-[24px] border border-red-200 bg-red-50 p-6"
                    }
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row">
                        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FontAwesomeIcon
                                icon={faBagShopping}
                                className="h-7 w-7 text-gray-300"
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              {item.category} / {getItemTypeLabel(itemType)}
                            </p>

                            {isRestaurantItem && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                <FontAwesomeIcon
                                  icon={faUtensils}
                                  className="h-3 w-3"
                                />
                                Restaurant Item
                              </span>
                            )}
                          </div>

                          {itemPath === "#" ? (
                            <h2 className="mt-2 block text-xl font-medium">
                              {item.title}
                            </h2>
                          ) : (
                            <Link
                              href={itemPath}
                              className="mt-2 block text-xl font-medium hover:underline"
                            >
                              {item.title}
                            </Link>
                          )}

                          <p className="mt-2 text-sm text-gray-500">
                            {isRestaurantItem ? "Restaurant" : "Vendor"}:{" "}
                            {item.vendor}
                          </p>

                          {hasVariantDetails ? (
                            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  Selected Variation
                                </p>

                                {item.variantTitle ? (
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                                    {item.variantTitle}
                                  </span>
                                ) : null}
                              </div>

                              {variantEntries.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {variantEntries.map(([name, value]) => (
                                    <span
                                      key={`${item.id}-${name}-${value}`}
                                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                                    >
                                      {name}: {value}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {item.variantSku ? (
                                <p className="mt-3 text-xs text-gray-500">
                                  SKU: {item.variantSku}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {typeof item.maxQuantity === "number" ? (
                            <p className="mt-3 text-xs text-gray-500">
                              Available quantity: {item.maxQuantity}
                            </p>
                          ) : null}

                          {!item.isAvailable && item.availabilityMessage && (
                            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-red-700">
                              {item.availabilityMessage}
                            </p>
                          )}

                          <div className="mt-5">
                            <CartItemActions
                              cartItemId={item.id}
                              quantity={item.quantity}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-sm text-gray-500">
                          {formatAmount(item.currency, item.price)}
                        </p>

                        <p className="mt-2 text-lg font-semibold">
                          {formatAmount(item.currency, item.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-[28px] border border-gray-200 p-6">
              <div className="mb-5 flex items-center gap-3">
                <FontAwesomeIcon icon={faBagShopping} className="h-5 w-5" />

                <h2 className="font-heading text-2xl uppercase">
                  Order Summary
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatAmount(cart.currency, cart.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping / Delivery</span>
                  <span>{formatAmount(cart.currency, shipping)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatAmount(cart.currency, tax)}</span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatAmount(cart.currency, total)}</span>
                  </div>
                </div>
              </div>

              {cart.hasUnavailableItems ? (
                <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
                  Checkout is disabled because your cart contains unavailable
                  items.
                </div>
              ) : (
                <Link
                  href="/checkout"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-black py-4 text-sm font-semibold text-white"
                >
                  Proceed to Checkout
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="h-3 w-3"
                  />
                </Link>
              )}

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/collections/products"
                  className="flex w-full items-center justify-center rounded-full border border-gray-300 py-3 text-sm font-semibold text-black hover:bg-gray-100"
                >
                  Browse Products
                </Link>

                <Link
                  href="/"
                  className="flex w-full items-center justify-center rounded-full border border-gray-300 py-3 text-sm font-semibold text-black hover:bg-gray-100"
                >
                  Continue Shopping
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}