"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MarketplaceItem } from "@/types/marketplace";
import { useCartDrawer } from "@/context/CartDrawerContext";

type HomeSectionItem = MarketplaceItem & {
  href?: string;
  canAddToCart?: boolean;
  actionLabel?: string;
};

type HomeSectionProps = {
  title: string;
  subtitle: string;
  items: HomeSectionItem[];
  collectionSlug: string;
};

function getPopularLabel(slug: string) {
  if (slug === "restaurants") return "Popular Restaurants";
  if (slug === "services") return "Popular Services";
  if (slug === "experiences") return "Popular Entertainments";
  return "Popular Products";
}

function getNewLabel(slug: string) {
  if (slug === "restaurants") return "New Restaurants";
  if (slug === "services") return "New Services";
  if (slug === "experiences") return "New Entertainments";
  return "New Products";
}

function getShowAllLabel(slug: string) {
  if (slug === "restaurants") return "Shop All Restaurants";
  if (slug === "services") return "Shop All Services";
  if (slug === "experiences") return "All Entertainments";
  return "Shop All Products";
}

function getShowAllHref(slug: string) {
  if (slug === "restaurants") return "/restaurants";

  return `/collections/${slug}`;
}

function getItemHref(item: HomeSectionItem, collectionSlug: string) {
  if (item.href) return item.href;

  if (collectionSlug === "restaurants") {
    return `/restaurants/${item.slug}`;
  }

  return `/products/${item.slug}`;
}

function canAddItemToCart(item: HomeSectionItem, collectionSlug: string) {
  if (collectionSlug === "restaurants") return false;
  if (item.canAddToCart === false) return false;

  return true;
}

function formatPrice(item: HomeSectionItem) {
  if (item.category?.toLowerCase() === "restaurants") {
    if (!item.price || item.price <= 0) {
      return "View Menu";
    }

    return `From ${item.currency} ${item.price.toFixed(2)}`;
  }

  return `${item.currency} ${item.price.toFixed(2)}`;
}

export default function HomeSection({
  title,
  subtitle,
  items,
  collectionSlug,
}: HomeSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItemToCart } = useCartDrawer();

  const [addingItemId, setAddingItemId] = useState("");

  function scrollLeft() {
    scrollRef.current?.scrollBy({
      left: -320,
      behavior: "smooth",
    });
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({
      left: 320,
      behavior: "smooth",
    });
  }

  async function handleAddToCart(item: HomeSectionItem) {
    try {
      setAddingItemId(item.id);
      await addItemToCart(item);
    } finally {
      setAddingItemId("");
    }
  }

  return (
    <section className="border-b border-gray-200 py-12 last:border-b-0">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-wide text-black md:text-[34px]">
            {title}
          </h2>

          <p className="mt-2 max-w-[620px] text-sm leading-6 text-gray-500">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-7 text-xs font-semibold">
          <button
            type="button"
            className="border-b border-black pb-1 text-black"
          >
            {getPopularLabel(collectionSlug)}
          </button>

          <button
            type="button"
            className="pb-1 text-gray-500 transition hover:text-black"
          >
            {getNewLabel(collectionSlug)}
          </button>

          <Link
            href={getShowAllHref(collectionSlug)}
            className="border-b border-black pb-1 text-black"
          >
            {getShowAllLabel(collectionSlug)} ›
          </Link>
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div
            ref={scrollRef}
            className="flex gap-7 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const itemHref = getItemHref(item, collectionSlug);
              const allowCart = canAddItemToCart(item, collectionSlug);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group w-[235px] shrink-0"
                >
                  <div className="relative aspect-[1.04/1] overflow-hidden rounded-[18px] bg-gray-100">
                    <Link href={itemHref} className="block h-full w-full">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-3xl text-gray-400">
                          ✦
                        </div>
                      )}
                    </Link>

                    {allowCart ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={addingItemId === item.id}
                        className="absolute bottom-5 left-1/2 z-10 flex h-12 w-[82%] -translate-x-1/2 translate-y-4 items-center justify-center rounded-full bg-black text-sm font-semibold text-white opacity-0 shadow-lg transition duration-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70 group-hover:translate-y-0 group-hover:opacity-100"
                      >
                        {addingItemId === item.id ? "Adding..." : "Add To Cart"}
                      </button>
                    ) : (
                      <Link
                        href={itemHref}
                        className="absolute bottom-5 left-1/2 z-10 flex h-12 w-[82%] -translate-x-1/2 translate-y-4 items-center justify-center rounded-full bg-black text-sm font-semibold text-white opacity-0 shadow-lg transition duration-300 hover:bg-gray-900 group-hover:translate-y-0 group-hover:opacity-100"
                      >
                        {item.actionLabel || "View Details"}
                      </Link>
                    )}
                  </div>

                  <Link href={itemHref} className="block">
                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                        {item.vendor}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                        {item.category}
                      </p>

                      <h3 className="mt-2 line-clamp-2 min-h-[38px] text-[13px] font-bold leading-[19px] text-black">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-[13px] font-semibold text-black">
                        {formatPrice(item)}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-6">
            <div className="h-px flex-1 bg-gray-200">
              <div className="h-px w-[46%] bg-black" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={scrollLeft}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-black transition hover:border-black"
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={scrollRight}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-black transition hover:border-black"
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No active items found.
        </div>
      )}
    </section>
  );
}