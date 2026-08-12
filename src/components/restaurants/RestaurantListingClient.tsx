"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RestaurantCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  coverImage: string | null;
  logo: string | null;
  images: string[];
  cuisineTypes: string[];
  priceForTwo: string | null;
  currency: string;
  city: string | null;
  area: string | null;
  state: string | null;
  country: string | null;
  isTableReservationAvailable: boolean;
  reservationSlotMinutes?: number;
  reservationAdvanceDays?: number;
  reservationMinGuests?: number;
  reservationMaxGuests?: number | null;
  vendorName: string;
  tablesCount?: number;
  reservationsCount?: number;
  _count?: {
    tables: number;
    reservations: number;
  };
};

type RestaurantListingClientProps = {
  restaurants: RestaurantCard[];
};

type SortOption = "newest" | "priceLowToHigh" | "priceHighToLow" | "name";

const fallbackRestaurantImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22600%22%20height%3D%22600%22%20viewBox%3D%220%200%20600%20600%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22600%22%20height%3D%22600%22%20fill%3D%22%23F4F1EC%22/%3E%3Ctext%20x%3D%22300%22%20y%3D%22308%22%20font-family%3D%22Arial%22%20font-size%3D%2232%22%20fill%3D%22%239A8A7A%22%20text-anchor%3D%22middle%22%3ERestaurant%3C/text%3E%3C/svg%3E";

function normalizeImageSource(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const imageValue = value.trim();

  if (!imageValue) {
    return null;
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

function getRestaurantImage(restaurant: RestaurantCard) {
  const rawImage =
    restaurant.coverImage || restaurant.images[0] || restaurant.logo || null;

  return normalizeImageSource(rawImage) || fallbackRestaurantImage;
}

function getNumericPrice(restaurant: RestaurantCard) {
  const amount = Number(restaurant.priceForTwo || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function getRestaurantPrice(restaurant: RestaurantCard) {
  const amount = getNumericPrice(restaurant);

  if (amount <= 0) {
    return `${restaurant.currency} 0.00`;
  }

  return `${restaurant.currency} ${amount.toFixed(2)}`;
}

function getHighestPrice(restaurants: RestaurantCard[]) {
  const prices = restaurants.map(getNumericPrice).filter((price) => price > 0);

  if (prices.length === 0) {
    return 0;
  }

  return Math.max(...prices);
}

function FilterIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 4H17L12 10V15L8 17V10L3 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductGridIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 3H8V8H3V3ZM12 3H17V8H12V3ZM3 12H8V17H3V12ZM12 12H17V17H12V12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ProductListIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 5H5.5M8 5H16M4 10H5.5M8 10H16M4 15H5.5M8 15H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccordionToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-[1.5px] w-3.5 rounded-full bg-black transition-transform duration-300 ease-out" />
      <span
        className={`absolute h-3.5 w-[1.5px] rounded-full bg-black transition-all duration-300 ease-out ${
          isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
        }`}
      />
    </span>
  );
}

export default function RestaurantListingClient({
  restaurants,
}: RestaurantListingClientProps) {
  const highestPrice = useMemo(() => getHighestPrice(restaurants), [restaurants]);

  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [minimumPrice, setMinimumPrice] = useState(0);
  const [maximumPrice, setMaximumPrice] = useState(highestPrice);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);

  useEffect(() => {
    setMinimumPrice(0);
    setMaximumPrice(highestPrice);
  }, [highestPrice]);

  const inStockCount = restaurants.filter(
    (restaurant) => restaurant.isTableReservationAvailable
  ).length;

  const outOfStockCount = restaurants.length - inStockCount;

  const selectedCurrency = restaurants[0]?.currency || "INR";

  const priceRangePercentage = useMemo(() => {
    if (highestPrice <= 0) {
      return {
        left: 0,
        right: 0,
      };
    }

    return {
      left: (minimumPrice / highestPrice) * 100,
      right: 100 - (maximumPrice / highestPrice) * 100,
    };
  }, [highestPrice, maximumPrice, minimumPrice]);

  const filteredRestaurants = useMemo(() => {
    let nextRestaurants = [...restaurants];

    if (showAvailableOnly || showUnavailableOnly) {
      nextRestaurants = nextRestaurants.filter((restaurant) => {
        if (showAvailableOnly && restaurant.isTableReservationAvailable) {
          return true;
        }

        if (showUnavailableOnly && !restaurant.isTableReservationAvailable) {
          return true;
        }

        return false;
      });
    }

    nextRestaurants = nextRestaurants.filter((restaurant) => {
      const price = getNumericPrice(restaurant);

      return price >= minimumPrice && price <= maximumPrice;
    });

    if (sortOption === "priceLowToHigh") {
      nextRestaurants.sort(
        (firstRestaurant, secondRestaurant) =>
          getNumericPrice(firstRestaurant) - getNumericPrice(secondRestaurant)
      );
    }

    if (sortOption === "priceHighToLow") {
      nextRestaurants.sort(
        (firstRestaurant, secondRestaurant) =>
          getNumericPrice(secondRestaurant) - getNumericPrice(firstRestaurant)
      );
    }

    if (sortOption === "name") {
      nextRestaurants.sort((firstRestaurant, secondRestaurant) =>
        firstRestaurant.name.localeCompare(secondRestaurant.name)
      );
    }

    return nextRestaurants;
  }, [
    restaurants,
    showAvailableOnly,
    showUnavailableOnly,
    minimumPrice,
    maximumPrice,
    sortOption,
  ]);

  function handleMinimumPriceChange(value: string) {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    setMinimumPrice(Math.min(nextValue, maximumPrice));
  }

  function handleMaximumPriceChange(value: string) {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    setMaximumPrice(Math.max(nextValue, minimumPrice));
  }

  function handleAvailableChange(checked: boolean) {
    setShowAvailableOnly(checked);

    if (checked) {
      setShowUnavailableOnly(false);
    }
  }

  function handleUnavailableChange(checked: boolean) {
    setShowUnavailableOnly(checked);

    if (checked) {
      setShowAvailableOnly(false);
    }
  }

  return (
    <main className="bg-white text-black">
      <section className="mx-auto max-w-[1180px] px-5 pb-20 pt-6 lg:px-0">
        <div className="mb-8 flex items-center gap-3 text-sm text-[#656565]">
          <Link href="/" className="text-black hover:underline">
            ‹
          </Link>

          <Link href="/" className="text-black hover:underline">
            Home
          </Link>

          <span className="text-[#c6c6c6]">|</span>

          <span>Restaurants</span>
        </div>

        <div className="mb-8">
          <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#ff0066] text-3xl shadow-sm">
            🍽️
          </div>

          <p className="mt-3 text-sm font-medium uppercase tracking-wide text-black">
            Diners
          </p>
        </div>

        <div className="mb-9 border-t border-[#e5e5e5]" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <button
              type="button"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d9d9d9] bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 ease-out hover:border-black"
            >
              <FilterIcon />
              Filter
            </button>

            <div className="border-b border-[#e5e5e5] pb-7">
              <button
                type="button"
                onClick={() =>
                  setIsAvailabilityOpen((currentValue) => !currentValue)
                }
                aria-expanded={isAvailabilityOpen}
                className="mb-4 flex w-full items-center justify-between text-left transition-colors duration-300 ease-out hover:text-[#777777]"
              >
                <h2 className="font-heading text-base uppercase text-black">
                  Availability
                </h2>

                <AccordionToggleIcon isOpen={isAvailabilityOpen} />
              </button>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isAvailabilityOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 text-sm text-[#666666] transition-colors duration-300 ease-out hover:text-black">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={(event) =>
                          handleAvailableChange(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-[#bdbdbd]"
                      />
                      In stock
                    </span>

                    <span>{inStockCount}</span>
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#999999] transition-colors duration-300 ease-out hover:text-black">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showUnavailableOnly}
                        onChange={(event) =>
                          handleUnavailableChange(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-[#bdbdbd]"
                      />
                      Out of stock
                    </span>

                    <span>{outOfStockCount}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-b border-[#e5e5e5] py-7">
              <button
                type="button"
                onClick={() => setIsPriceOpen((currentValue) => !currentValue)}
                aria-expanded={isPriceOpen}
                className="mb-4 flex w-full items-center justify-between text-left transition-colors duration-300 ease-out hover:text-[#777777]"
              >
                <h2 className="font-heading text-base uppercase text-black">
                  Price
                </h2>

                <AccordionToggleIcon isOpen={isPriceOpen} />
              </button>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isPriceOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="mb-5 text-sm leading-6 text-[#777777]">
                    The highest price is {selectedCurrency}{" "}
                    {highestPrice.toFixed(2)}
                  </p>

                  <div className="relative mb-6 h-6">
                    <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#d8d8d8]" />

                    <div
                      className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-black transition-all duration-300 ease-out"
                      style={{
                        left: `${priceRangePercentage.left}%`,
                        right: `${priceRangePercentage.right}%`,
                      }}
                    />

                    <input
                      type="range"
                      min={0}
                      max={highestPrice}
                      step={1}
                      value={minimumPrice}
                      onChange={(event) =>
                        handleMinimumPriceChange(event.target.value)
                      }
                      className="pointer-events-none absolute left-0 top-0 h-6 w-full appearance-none bg-transparent accent-black [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-out hover:[&::-webkit-slider-thumb]:scale-110"
                      aria-label="Minimum price"
                    />

                    <input
                      type="range"
                      min={0}
                      max={highestPrice}
                      step={1}
                      value={maximumPrice}
                      onChange={(event) =>
                        handleMaximumPriceChange(event.target.value)
                      }
                      className="pointer-events-none absolute left-0 top-0 h-6 w-full appearance-none bg-transparent accent-black [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-out hover:[&::-webkit-slider-thumb]:scale-110"
                      aria-label="Maximum price"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-full bg-[#f0f0f0] px-4 py-3 text-center text-sm text-[#777777] transition-colors duration-300 ease-out">
                      {Math.round(minimumPrice)}
                    </div>

                    <div className="rounded-full bg-[#f0f0f0] px-4 py-3 text-center text-sm text-[#777777] transition-colors duration-300 ease-out">
                      {Math.round(maximumPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[#777777]">
                {filteredRestaurants.length}{" "}
                {filteredRestaurants.length === 1 ? "product" : "products"}
              </p>

              <div className="flex flex-wrap items-center gap-5">
                <label className="hidden items-center gap-2 text-sm font-medium text-black md:flex">
                  Compare:
                  <span className="relative inline-flex h-5 w-10 rounded-full bg-[#d9d9d9]">
                    <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white" />
                  </span>
                </label>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-black">Sort by:</span>

                  <select
                    value={sortOption}
                    onChange={(event) =>
                      setSortOption(event.target.value as SortOption)
                    }
                    className="h-11 rounded-full border border-[#dedede] bg-white px-5 text-sm text-black outline-none"
                  >
                    <option value="newest">Date, new to old</option>
                    <option value="priceLowToHigh">Price, low to high</option>
                    <option value="priceHighToLow">Price, high to low</option>
                    <option value="name">Alphabetically, A-Z</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-black">
                  <span>View as:</span>

                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"
                    aria-label="Grid view"
                  >
                    <ProductGridIcon />
                  </button>

                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white text-black"
                    aria-label="List view"
                  >
                    <ProductListIcon />
                  </button>
                </div>
              </div>
            </div>

            {filteredRestaurants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dedede] px-8 py-16 text-center">
                <h2 className="font-heading text-2xl text-black">
                  No restaurants found
                </h2>

                <p className="mt-3 text-sm text-[#777777]">
                  Try changing your filter options to see more restaurants.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
                {filteredRestaurants.map((restaurant) => {
                  const imageUrl = getRestaurantImage(restaurant);

                  return (
                    <Link
                      key={restaurant.id}
                      href={`/restaurants/${restaurant.slug}`}
                      className="group block"
                    >
                      <div className="aspect-square overflow-hidden rounded-[18px] bg-[#f4f1ec]">
                        <img
                          src={imageUrl}
                          alt={restaurant.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.src = fallbackRestaurantImage;
                          }}
                        />
                      </div>

                      <div className="mt-4">
                        <p className="text-xs uppercase leading-5 tracking-wide text-[#777777]">
                          {restaurant.vendorName}
                        </p>

                        <p className="text-xs uppercase leading-5 tracking-wide text-[#777777]">
                          Restaurants
                        </p>

                        <h2 className="mt-1 text-[15px] font-semibold leading-6 text-black">
                          {restaurant.name}
                        </h2>

                        <p className="mt-1 text-[15px] font-semibold leading-6 text-black">
                          From {getRestaurantPrice(restaurant)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}