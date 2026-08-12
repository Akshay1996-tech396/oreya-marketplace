"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Filter, Grid3X3, List } from "lucide-react";
import type { MarketplaceItem } from "@/types/marketplace";

type FilterableMarketplaceItem = MarketplaceItem & {
  stock?: number;
  createdAt?: string;
};

type CollectionBrowserProps = {
  slug: string;
  title: string;
  items: FilterableMarketplaceItem[];
};

type SortValue = "date-desc" | "price-asc" | "price-desc";
type ViewMode = "grid" | "list";

function getItemImage(item: FilterableMarketplaceItem) {
  return item.images?.[0] || "";
}

function isItemInStock(item: FilterableMarketplaceItem) {
  if (item.type === "SERVICE") {
    return true;
  }

  return Number(item.stock || 0) > 0;
}

function getDetailUrl(item: FilterableMarketplaceItem) {
  return `/products/${item.slug}`;
}

function formatPrice(item: FilterableMarketplaceItem) {
  return `${item.currency || "AED"} ${Number(item.price || 0).toFixed(2)}`;
}

export default function CollectionBrowser({
  slug,
  title,
  items,
}: CollectionBrowserProps) {
  const highestPrice = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    return Math.ceil(Math.max(...items.map((item) => Number(item.price || 0))));
  }, [items]);

  const [showFilters, setShowFilters] = useState(true);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState(String(highestPrice));
  const [sortBy, setSortBy] = useState<SortValue>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [compareEnabled, setCompareEnabled] = useState(false);

  const minPriceNumber = Number(minPrice || 0);
  const maxPriceNumber = Number(maxPrice || highestPrice);

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, number>();

    items.forEach((item) => {
      const category = item.category || title;

      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    return Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [items, title]);

  const inStockCount = useMemo(
    () => items.filter((item) => isItemInStock(item)).length,
    [items]
  );

  const outOfStockCount = useMemo(
    () => items.filter((item) => !isItemInStock(item)).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    let nextItems = [...items];

    if (inStockOnly && !outOfStockOnly) {
      nextItems = nextItems.filter((item) => isItemInStock(item));
    }

    if (outOfStockOnly && !inStockOnly) {
      nextItems = nextItems.filter((item) => !isItemInStock(item));
    }

    nextItems = nextItems.filter((item) => {
      const price = Number(item.price || 0);

      return price >= minPriceNumber && price <= maxPriceNumber;
    });

    if (selectedCategories.length > 0) {
      nextItems = nextItems.filter((item) =>
        selectedCategories.includes(item.category || title)
      );
    }

    if (sortBy === "price-asc") {
      nextItems.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    if (sortBy === "price-desc") {
      nextItems.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    if (sortBy === "date-desc") {
      nextItems.sort((a, b) => {
        const firstDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const secondDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return secondDate - firstDate;
      });
    }

    return nextItems;
  }, [
    items,
    inStockOnly,
    outOfStockOnly,
    minPriceNumber,
    maxPriceNumber,
    selectedCategories,
    sortBy,
    title,
  ]);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }

      return [...prev, category];
    });
  }

  function handleMinPriceChange(value: string) {
    const nextValue = Number(value || 0);

    if (nextValue > maxPriceNumber) {
      setMinPrice(String(maxPriceNumber));
      return;
    }

    setMinPrice(value);
  }

  function handleMaxPriceChange(value: string) {
    const nextValue = Number(value || 0);

    if (nextValue < minPriceNumber) {
      setMaxPrice(String(minPriceNumber));
      return;
    }

    if (nextValue > highestPrice) {
      setMaxPrice(String(highestPrice));
      return;
    }

    setMaxPrice(value);
  }

  function resetFilters() {
    setInStockOnly(false);
    setOutOfStockOnly(false);
    setMinPrice("0");
    setMaxPrice(String(highestPrice));
    setSelectedCategories([]);
    setSortBy("date-desc");
    setViewMode("grid");
    setCompareEnabled(false);
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-black transition hover:border-black"
        >
          <Filter size={17} />
          Filter
        </button>

        <div className="mt-6 border-b border-gray-200 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm uppercase text-black">Availability</h3>
            <span className="text-xl leading-none">−</span>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              In stock
            </span>

            <span className="text-gray-500">{inStockCount}</span>
          </label>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={outOfStockOnly}
                onChange={(event) => setOutOfStockOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Out of stock
            </span>

            <span className="text-gray-400">{outOfStockCount}</span>
          </label>
        </div>

        <div className="mt-6 border-b border-gray-200 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm uppercase text-black">Price</h3>
            <span className="text-xl leading-none">−</span>
          </div>

          <p className="text-sm text-gray-500">
            The highest price is AED {highestPrice.toFixed(2)}
          </p>

          <div className="mt-5">
            <input
              type="range"
              min="0"
              max={highestPrice || 0}
              value={maxPriceNumber}
              onChange={(event) => handleMaxPriceChange(event.target.value)}
              className="h-1 w-full accent-black"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex w-full items-center gap-1 rounded-full bg-gray-100 px-4 py-2">
              <span className="text-xs text-gray-500">د.إ</span>
              <input
                type="number"
                min="0"
                max={highestPrice}
                value={minPrice}
                onChange={(event) => handleMinPriceChange(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex w-full items-center gap-1 rounded-full bg-gray-100 px-4 py-2">
              <span className="text-xs text-gray-500">د.إ</span>
              <input
                type="number"
                min="0"
                max={highestPrice}
                value={maxPrice}
                onChange={(event) => handleMaxPriceChange(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 border-b border-gray-200 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm uppercase text-black">Category</h3>
            <span className="text-xl leading-none">−</span>
          </div>

          <div className="space-y-3">
            {categoryOptions.map((category) => (
              <label
                key={category.name}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-600"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.name)}
                    onChange={() => toggleCategory(category.name)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {category.name}
                </span>

                <span className="text-gray-500">{category.count}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="mt-5 text-sm font-medium text-gray-500 underline underline-offset-4 hover:text-black"
        >
          Clear all filters
        </button>
      </aside>

      <section>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            {filteredItems.length} {slug === "products" ? "products" : "items"}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-black">
              Compare:
              <button
                type="button"
                onClick={() => setCompareEnabled((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${
                  compareEnabled ? "bg-black" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    compareEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center gap-2 text-sm text-black">
              Sort by:
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortValue)}
                className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm outline-none"
              >
                <option value="date-desc">Date, new to old</option>
                <option value="price-asc">Price, low to high</option>
                <option value="price-desc">Price, high to low</option>
              </select>
            </label>

            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-black md:inline">
                View as:
              </span>

              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  viewMode === "grid"
                    ? "bg-black text-white"
                    : "border border-gray-200 text-black"
                }`}
              >
                <Grid3X3 size={18} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  viewMode === "list"
                    ? "bg-black text-white"
                    : "border border-gray-200 text-black"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <GridItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredItems.map((item) => (
                <ListItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
            No items matched your selected filters.
          </div>
        )}
      </section>
    </div>
  );
}

function GridItemCard({ item }: { item: FilterableMarketplaceItem }) {
  const image = getItemImage(item);

  return (
    <Link href={getDetailUrl(item)} className="group block">
      <div className="aspect-square overflow-hidden rounded-3xl bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-2xl text-gray-500">
            🛠
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {item.vendor}
        </p>

        <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
          {item.category}
        </p>

        <h3 className="mt-2 text-sm font-semibold leading-snug text-black transition group-hover:text-pink-600">
          {item.title}
        </h3>

        <p className="mt-2 text-sm font-semibold text-black">
          {formatPrice(item)}
        </p>
      </div>
    </Link>
  );
}

function ListItemCard({ item }: { item: FilterableMarketplaceItem }) {
  const image = getItemImage(item);

  return (
    <Link
      href={getDetailUrl(item)}
      className="group flex gap-5 rounded-3xl border border-gray-100 p-4 transition hover:border-gray-300"
    >
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xl text-gray-500">
            🛠
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {item.vendor}
        </p>

        <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
          {item.category}
        </p>

        <h3 className="mt-2 text-base font-semibold text-black transition group-hover:text-pink-600">
          {item.title}
        </h3>

        <p className="mt-2 text-sm font-semibold text-black">
          {formatPrice(item)}
        </p>
      </div>
    </Link>
  );
}