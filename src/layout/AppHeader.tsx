"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import DashboardUserDropdown from "@/components/auth/DashboardUserDropdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faEllipsis,
  faMagnifyingGlass,
  faMoon,
  faSun,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { useSidebar } from "@/context/SidebarContext";

type DashboardSearchItem = {
  label: string;
  path: string;
  keywords: string[];
};

const ADMIN_SEARCH_ITEMS: DashboardSearchItem[] = [
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    keywords: ["dashboard", "overview", "home"],
  },
  {
    label: "Vendors",
    path: "/admin/vendors",
    keywords: [
      "vendor",
      "vendors",
      "seller",
      "sellers",
      "users",
    ],
  },
  {
    label: "Customers",
    path: "/admin/customers",
    keywords: [
      "customer",
      "customers",
      "buyer",
      "buyers",
      "users",
    ],
  },
  {
    label: "Products",
    path: "/admin/products",
    keywords: [
      "product",
      "products",
      "catalogue",
      "catalog",
    ],
  },
  {
    label: "Add Product",
    path: "/admin/products/add",
    keywords: [
      "add product",
      "create product",
      "new product",
    ],
  },
  {
    label: "Services",
    path: "/admin/services",
    keywords: [
      "service",
      "services",
      "appointments",
    ],
  },
  
  {
    label: "Appointments",
    path: "/admin/appointments",
    keywords: [
      "appointment",
      "appointments",
      "service bookings",
    ],
  },
  {
    label: "Restaurants",
    path: "/admin/restaurants",
    keywords: [
      "restaurant",
      "restaurants",
      "restaurant approval",
    ],
  },
  {
    label: "Restaurant Reservations",
    path: "/admin/restaurant-reservations",
    keywords: [
      "restaurant reservation",
      "restaurant reservations",
      "table reservation",
      "table reservations",
    ],
  },
  {
    label: "Orders",
    path: "/admin/orders",
    keywords: [
      "order",
      "orders",
      "customer orders",
    ],
  },
  {
    label: "Categories",
    path: "/admin/categories",
    keywords: [
      "category",
      "categories",
      "catalog tools",
    ],
  },
  {
    label: "Coupons",
    path: "/admin/coupons",
    keywords: [
      "coupon",
      "coupons",
      "discount",
      "discounts",
    ],
  },
  {
    label: "Reviews",
    path: "/admin/reviews",
    keywords: [
      "review",
      "reviews",
      "ratings",
    ],
  },
  {
    label: "Payments",
    path: "/admin/payments",
    keywords: [
      "payment",
      "payments",
      "transactions",
      "revenue",
    ],
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    keywords: [
      "notification",
      "notifications",
      "alerts",
    ],
  },
  {
    label: "General Settings",
    path: "/settings/general",
    keywords: [
      "general settings",
      "settings",
      "image upload size",
    ],
  },
];

const VENDOR_SEARCH_ITEMS: DashboardSearchItem[] = [
  {
    label: "Vendor Dashboard",
    path: "/vendor/dashboard",
    keywords: ["dashboard", "overview", "home"],
  },
  {
    label: "Products",
    path: "/vendor/products",
    keywords: [
      "product",
      "products",
      "my products",
    ],
  },
  {
    label: "Add Product",
    path: "/vendor/products/new",
    keywords: [
      "add product",
      "create product",
      "new product",
    ],
  },
  {
    label: "Services",
    path: "/vendor/services",
    keywords: [
      "service",
      "services",
      "my services",
    ],
  },
  {
    label: "Add Service",
    path: "/vendor/services/new",
    keywords: [
      "add service",
      "create service",
      "new service",
    ],
  },
  {
    label: "Appointments",
    path: "/vendor/appointments",
    keywords: [
      "appointment",
      "appointments",
      "service bookings",
    ],
  },
  {
    label: "Slots",
    path: "/vendor/slots",
    keywords: [
      "slot",
      "slots",
      "service slots",
      "availability",
    ],
  },
  {
    label: "Restaurants",
    path: "/vendor/restaurants",
    keywords: [
      "restaurant",
      "restaurants",
      "my restaurants",
    ],
  },
  {
    label: "Add Restaurant",
    path: "/vendor/restaurants/new",
    keywords: [
      "add restaurant",
      "create restaurant",
      "new restaurant",
    ],
  },
  {
    label: "Restaurant Reservations",
    path: "/vendor/restaurant-reservations",
    keywords: [
      "restaurant reservation",
      "restaurant reservations",
      "table reservation",
      "table reservations",
    ],
  },
  {
    label: "Orders",
    path: "/vendor/orders",
    keywords: [
      "order",
      "orders",
      "customer orders",
    ],
  },
  {
    label: "Categories",
    path: "/vendor/categories",
    keywords: [
      "category",
      "categories",
      "catalog tools",
    ],
  },
  {
    label: "Coupons",
    path: "/vendor/coupons",
    keywords: [
      "coupon",
      "coupons",
      "discount",
      "discounts",
    ],
  },
  {
    label: "Reviews",
    path: "/vendor/reviews",
    keywords: [
      "review",
      "reviews",
      "ratings",
    ],
  },
  {
    label: "Earnings",
    path: "/vendor/earnings",
    keywords: [
      "earning",
      "earnings",
      "revenue",
      "payments",
    ],
  },
  {
    label: "Notifications",
    path: "/vendor/notifications",
    keywords: [
      "notification",
      "notifications",
      "alerts",
    ],
  },
  {
    label: "General Settings",
    path: "/settings/general",
    keywords: [
      "general settings",
      "settings",
    ],
  },
  {
    label: "Payment Settings",
    path: "/settings/payment",
    keywords: [
      "payment settings",
      "settings",
    ],
  },
  {
    label: "Notification Settings",
    path: "/settings/notifications",
    keywords: [
      "notification settings",
      "settings",
    ],
  },
];

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getSearchScore(
  item: DashboardSearchItem,
  query: string
) {
  const normalizedLabel = normalizeSearchText(
    item.label
  );
  const normalizedPath = normalizeSearchText(
    item.path
  );
  const normalizedKeywords = item.keywords.map(
    normalizeSearchText
  );

  if (
    normalizedLabel === query ||
    normalizedPath === query ||
    normalizedKeywords.includes(query)
  ) {
    return 100;
  }

  if (
    normalizedLabel.startsWith(query) ||
    normalizedKeywords.some((keyword) =>
      keyword.startsWith(query)
    )
  ) {
    return 80;
  }

  if (
    normalizedLabel.includes(query) ||
    normalizedPath.includes(query) ||
    normalizedKeywords.some((keyword) =>
      keyword.includes(query)
    )
  ) {
    return 60;
  }

  const queryWords = query
    .split(" ")
    .filter(Boolean);

  const searchableText = [
    normalizedLabel,
    normalizedPath,
    ...normalizedKeywords,
  ].join(" ");

  if (
    queryWords.length > 1 &&
    queryWords.every((word) =>
      searchableText.includes(word)
    )
  ) {
    return 40;
  }

  return 0;
}

function getRenderedDashboardItems(
  isVendorArea: boolean
) {
  if (typeof document === "undefined") {
    return [];
  }

  const permittedPrefixes = isVendorArea
    ? ["/vendor", "/settings"]
    : ["/admin", "/reports", "/settings"];

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      "a[href]"
    )
  );

  const items = links
    .map<DashboardSearchItem | null>(
      (link) => {
        const href =
          link.getAttribute("href") || "";

        const label = link.textContent
          ?.replace(/\s+/g, " ")
          .trim();

        if (
          !label ||
          !href.startsWith("/") ||
          !permittedPrefixes.some(
            (prefix) =>
              href.startsWith(prefix)
          )
        ) {
          return null;
        }

        return {
          label,
          path: href,
          keywords: [],
        };
      }
    )
    .filter(
      (
        item
      ): item is DashboardSearchItem =>
        item !== null
    );

  return items;
}

function mergeSearchItems(
  primaryItems: DashboardSearchItem[],
  secondaryItems: DashboardSearchItem[]
) {
  const itemMap = new Map<
    string,
    DashboardSearchItem
  >();

  [...primaryItems, ...secondaryItems].forEach(
    (item) => {
      const existingItem = itemMap.get(item.path);

      if (!existingItem) {
        itemMap.set(item.path, item);
        return;
      }

      itemMap.set(item.path, {
        ...existingItem,
        label:
          existingItem.label.length >=
          item.label.length
            ? existingItem.label
            : item.label,
        keywords: Array.from(
          new Set([
            ...existingItem.keywords,
            ...item.keywords,
          ])
        ),
      });
    }
  );

  return Array.from(itemMap.values());
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [isApplicationMenuOpen, setApplicationMenuOpen] =
    useState(false);
  const [isDarkMode, setIsDarkMode] =
    useState(false);
  const [searchQuery, setSearchQuery] =
    useState("");
  const [searchMessage, setSearchMessage] =
    useState("");

  const {
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();

  const isVendorArea =
    pathname.startsWith("/vendor");

  const dashboardHomeLink = isVendorArea
    ? "/vendor/dashboard"
    : "/admin/dashboard";

  const configuredSearchItems = useMemo(
    () =>
      isVendorArea
        ? VENDOR_SEARCH_ITEMS
        : ADMIN_SEARCH_ITEMS,
    [isVendorArea]
  );

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(
      (previousValue) => !previousValue
    );
  };

  const toggleDarkMode = () => {
    setIsDarkMode((previousValue) => {
      const nextValue = !previousValue;

      if (nextValue) {
        document.documentElement.classList.add(
          "dark"
        );
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove(
          "dark"
        );
        localStorage.setItem("theme", "light");
      }

      return nextValue;
    });
  };

  function handleDashboardSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedQuery =
      normalizeSearchText(searchQuery);

    if (!normalizedQuery) {
      setSearchMessage(
        "Enter a dashboard page or section name."
      );
      inputRef.current?.focus();
      return;
    }

    const renderedItems =
      getRenderedDashboardItems(
        isVendorArea
      );

    const searchableItems = mergeSearchItems(
      renderedItems,
      configuredSearchItems
    );

    const bestMatch = searchableItems
      .map((item) => ({
        item,
        score: getSearchScore(
          item,
          normalizedQuery
        ),
      }))
      .filter((result) => result.score > 0)
      .sort(
        (firstResult, secondResult) =>
          secondResult.score -
            firstResult.score ||
          firstResult.item.label.localeCompare(
            secondResult.item.label
          )
      )[0];

    if (!bestMatch) {
      setSearchMessage(
        `No dashboard page was found for "${searchQuery.trim()}".`
      );
      inputRef.current?.focus();
      return;
    }

    setSearchMessage("");
    setApplicationMenuOpen(false);
    router.push(bestMatch.item.path);
  }

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add(
        "dark"
      );
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    setSearchMessage("");
  }, [pathname]);

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
          >
            <FontAwesomeIcon
              icon={isMobileOpen ? faXmark : faBars}
              className="h-5 w-5"
              fixedWidth
              aria-hidden="true"
            />
          </button>

          <Link
            href={dashboardHomeLink}
            className="lg:hidden"
          >
            <Image
              width={154}
              height={32}
              className="dark:hidden"
              src="/images/logo/logo.svg"
              alt="Oreya"
            />

            <Image
              width={154}
              height={32}
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt="Oreya"
            />
          </Link>

          <button
            type="button"
            onClick={toggleApplicationMenu}
            aria-label="Toggle application menu"
            aria-expanded={
              isApplicationMenuOpen
            }
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <FontAwesomeIcon
              icon={faEllipsis}
              className="h-5 w-5"
              fixedWidth
              aria-hidden="true"
            />
          </button>

          <div className="hidden lg:block">
            <form
              onSubmit={handleDashboardSearch}
              className="relative"
              role="search"
            >
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="h-4 w-4"
                  fixedWidth
                  aria-hidden="true"
                />
              </span>

              <input
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(
                    event.target.value
                  );

                  if (searchMessage) {
                    setSearchMessage("");
                  }
                }}
                placeholder="Search dashboard..."
                aria-label="Search dashboard"
                aria-describedby={
                  searchMessage
                    ? "dashboard-search-message"
                    : undefined
                }
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-20 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 xl:w-[430px]"
              />

              <kbd className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                Enter
              </kbd>

              {searchMessage ? (
                <p
                  id="dashboard-search-message"
                  role="status"
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-red-600 shadow-theme-md dark:border-gray-800 dark:bg-gray-900 dark:text-red-400"
                >
                  {searchMessage}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <div
          className={`${
            isApplicationMenuOpen
              ? "flex"
              : "hidden"
          } w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:w-auto lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={
                isDarkMode
                  ? "Use light mode"
                  : "Use dark mode"
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <FontAwesomeIcon
                icon={isDarkMode ? faSun : faMoon}
                className="h-5 w-5"
                fixedWidth
                aria-hidden="true"
              />
            </button>

            <DashboardUserDropdown
              isVendorArea={isVendorArea}
            />
          </div>
        </div>
      </div>
    </header>
  );
}