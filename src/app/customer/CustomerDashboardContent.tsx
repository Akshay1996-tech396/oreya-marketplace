"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import CustomerBookingCancelButton from "../../components/customer/CustomerBookingCancelButton";
import type { CustomerOrder, CustomerOrderItem } from "../../types/order";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCalendarCheck,
  faClock,
  faCircleCheck,
  faCreditCard,
  faSpinner,
  faSearch,
  faFilter,
  faSort,
  faTimes,
  faChevronDown,
  faSlidersH,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

function getStatusClass(status: string) {
  if (status === "PAID") {
    return "bg-green-100 text-green-700";
  }

  if (status === "COMPLETED") {
    return "bg-green-100 text-green-700";
  }

  if (status === "CONFIRMED") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "PROCESSING") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "PENDING") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "CANCELLED") {
    return "bg-red-100 text-red-700";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-700";
  }

  if (status === "FAILED") {
    return "bg-red-100 text-red-700";
  }

  if (status === "REFUNDED") {
    return "bg-purple-100 text-purple-700";
  }

  return "bg-gray-100 text-gray-700";
}

function formatBookingDate(date: Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFirstImage(images: string[]) {
  return images.find((image) => image && image.trim().length > 0) || "";
}

interface Booking {
  id: string;
  status: string;
  paymentStatus: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  currency?: string;
  amount?: number;
  customerNote?: string;
  vendorNote?: string;
  cancelReason?: string;
  createdAt: Date;
  vendor?: {
    id: string;
    businessName: string;
    slug: string;
  } | null;
  service: {
    id: string;
    title: string;
    slug: string;
    images: string[];
  };
  slot?: {
    id: string;
    note: string;
  } | null;
}

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  orders: CustomerOrder[];
  bookings: Booking[];
}

export default function CustomerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  
  // Enhanced state for filtering, sorting, and searching
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  useEffect(() => {
    const section = searchParams?.get("section") || "all";
    setSelectedSection(section);
  }, [searchParams]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/customer/dashboard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setSectionLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSectionChange = async (section: string) => {
    setSectionLoading(true);
    setSelectedSection(section);
    
    // Update URL without page refresh
    const url = section === "all" ? "/customer" : `/customer?section=${section}`;
    window.history.pushState({}, "", url);
    
    // Fetch updated data via AJAX
    await fetchDashboardData();
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    
    let filtered = [...data.orders];
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.items.some(item => 
          item.title.toLowerCase().includes(query) ||
          item.vendorName?.toLowerCase().includes(query)
        )
      );
    }
    
    // Apply status filter
    if (orderStatusFilter !== "all") {
      filtered = filtered.filter(order => order.status === orderStatusFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => b.total - a.total);
        break;
      case "lowest":
        filtered.sort((a, b) => a.total - b.total);
        break;
    }
    
    return filtered;
  }, [data?.orders, searchQuery, orderStatusFilter, sortBy]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    if (!data?.bookings) return [];
    
    let filtered = [...data.bookings];
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(query) ||
        booking.service.title.toLowerCase().includes(query) ||
        booking.vendor?.businessName?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (bookingStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === bookingStatusFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        break;
      case "lowest":
        filtered.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        break;
    }
    
    return filtered;
  }, [data?.bookings, searchQuery, bookingStatusFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setOrderStatusFilter("all");
    setBookingStatusFilter("all");
    setSortBy("newest");
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (orderStatusFilter !== "all") count++;
    if (bookingStatusFilter !== "all") count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [searchQuery, orderStatusFilter, bookingStatusFilter, sortBy]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                className="mx-auto h-10 w-10 text-gray-400"
              />
              <p className="mt-4 text-sm text-gray-500">Loading your dashboard...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const { user, orders, bookings } = data;

  const showBookings =
    selectedSection === "all" || selectedSection === "bookings";

  const showOrders =
    selectedSection === "all" || selectedSection === "orders";

  // Get unique statuses for filters
  const orderStatuses = Array.from(new Set(orders.map(o => o.status)));
  const bookingStatuses = Array.from(new Set(bookings.map(b => b.status)));

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-10 border-b border-gray-200 pb-8">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Customer Account
          </p>

          <h1 className="mt-2 font-heading text-4xl uppercase tracking-wide">
            My Account
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Welcome {user.name}. Track your orders and appointment bookings.
          </p>
        </div>

        {/* ============================================================
            SEARCH AND FILTER CONTROLS
            ============================================================ */}
        <div className="mb-8 rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              {/* Search toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                  showSearch || searchQuery
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FontAwesomeIcon icon={faSearch} className="h-3.5 w-3.5" />
                Search
                {searchQuery && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                    {searchQuery.length}
                  </span>
                )}
              </button>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                  showFilters || orderStatusFilter !== "all" || bookingStatusFilter !== "all"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FontAwesomeIcon icon={faFilter} className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 pr-10 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-100 focus:border-black focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
                <FontAwesomeIcon 
                  icon={faChevronDown} 
                  className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                />
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition-all duration-300 hover:bg-red-50 hover:border-red-400"
                >
                  <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5" />
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FontAwesomeIcon icon={faSlidersH} className="h-3.5 w-3.5" />
              <span className="font-medium">
                {showOrders && showBookings 
                  ? `${filteredOrders.length + filteredBookings.length} results`
                  : showOrders 
                    ? `${filteredOrders.length} orders`
                    : `${filteredBookings.length} bookings`
                }
              </span>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="mt-4 overflow-hidden">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, product name, or vendor..."
                  className="w-full rounded-full border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-sm transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300 hover:text-gray-600"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 overflow-hidden">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {showOrders && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Status
                    </label>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 appearance-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showBookings && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Status
                    </label>
                    <select
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all duration-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 appearance-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      {bookingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick stats */}
                <div className="flex items-end gap-4">
                  <div className="flex-1 rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Total Orders</p>
                      <FontAwesomeIcon icon={faBoxOpen} className="h-3 w-3 text-gray-400" />
                    </div>
                    <p className="mt-1 text-lg font-bold">{orders.length}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Total Bookings</p>
                      <FontAwesomeIcon icon={faCalendarCheck} className="h-3 w-3 text-gray-400" />
                    </div>
                    <p className="mt-1 text-lg font-bold">{bookings.length}</p>
                  </div>
                </div>
              </div>

              {/* Active filters display */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                  <span className="text-xs text-gray-400 font-medium">Active filters:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs">
                      <FontAwesomeIcon icon={faSearch} className="h-2 w-2 text-gray-400" />
                      "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-gray-400 transition-colors duration-300 hover:text-gray-600"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                  {orderStatusFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs">
                      Order: {orderStatusFilter.replace(/_/g, " ").toLowerCase()}
                      <button
                        onClick={() => setOrderStatusFilter("all")}
                        className="text-blue-400 transition-colors duration-300 hover:text-blue-600"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                  {bookingStatusFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs">
                      Booking: {bookingStatusFilter.replace(/_/g, " ").toLowerCase()}
                      <button
                        onClick={() => setBookingStatusFilter("all")}
                        className="text-purple-400 transition-colors duration-300 hover:text-purple-600"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                  {sortBy !== "newest" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs">
                      <FontAwesomeIcon icon={faSort} className="h-2 w-2 text-gray-400" />
                      {sortBy}
                      <button
                        onClick={() => setSortBy("newest")}
                        className="text-gray-400 transition-colors duration-300 hover:text-gray-600"
                      >
                        <FontAwesomeIcon icon={faTimes} className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================
            STATS CARDS - REMOVED (already in filter section)
            ============================================================ */}

        {/* ============================================================
            ACCOUNT SECTION FILTER
            ============================================================ */}
        <div className="mb-10 flex flex-col gap-4 rounded-[24px] border border-gray-200 bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              View
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Choose what you want to see in your account.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              onClick={() => handleSectionChange("all")}
              disabled={sectionLoading}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                selectedSection === "all"
                  ? "bg-black text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              } ${sectionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              All
            </button>

            <button
              onClick={() => handleSectionChange("orders")}
              disabled={sectionLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                selectedSection === "orders"
                  ? "bg-black text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              } ${sectionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FontAwesomeIcon icon={faBoxOpen} className="h-3.5 w-3.5" />
              Orders
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] transition-all duration-300 ${
                  selectedSection === "orders"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => handleSectionChange("bookings")}
              disabled={sectionLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                selectedSection === "bookings"
                  ? "bg-black text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              } ${sectionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FontAwesomeIcon
                icon={faCalendarCheck}
                className="h-3.5 w-3.5"
              />
              Bookings
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] transition-all duration-300 ${
                  selectedSection === "bookings"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {bookings.length}
              </span>
            </button>
          </div>
        </div>

        {sectionLoading && (
          <div className="mb-8 flex items-center justify-center rounded-[24px] border border-gray-200 bg-gray-50 p-4">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="mr-3 h-5 w-5 text-gray-400"
            />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {/* ============================================================
            MY BOOKINGS
            ============================================================ */}
        {showBookings && !sectionLoading && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl uppercase">
                  My Bookings
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredBookings.length} bookings
                  {searchQuery && ` (filtered from ${bookings.length})`}
                </p>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <FontAwesomeIcon
                  icon={faCalendarCheck}
                  className="mx-auto h-10 w-10 text-gray-400"
                />

                <h2 className="mt-5 font-heading text-2xl uppercase">
                  {searchQuery || bookingStatusFilter !== "all" 
                    ? "No matching bookings found" 
                    : "No bookings found"}
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  {searchQuery || bookingStatusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Your appointment bookings will appear here."}
                </p>

                <Link
                  href="/collections/services"
                  className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-all duration-300 hover:opacity-90"
                >
                  Explore Services
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredBookings.map((booking) => {
                  const image = getFirstImage(booking.service.images || []);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-[24px] border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[120px_1fr]">
                        <div className="h-28 w-28 overflow-hidden rounded-2xl bg-gray-100">
                          {image ? (
                            <img
                              src={image}
                              alt={booking.service.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FontAwesomeIcon
                                icon={faCalendarCheck}
                                className="h-8 w-8 text-gray-400"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-start md:justify-between">
                            <div>
                              <Link
                                href={`/products/${booking.service.slug}`}
                                className="text-lg font-semibold hover:underline"
                              >
                                {booking.service.title}
                              </Link>

                              <p className="mt-2 text-sm text-gray-500">
                                Vendor:{" "}
                                {booking.vendor?.businessName ||
                                  "Admin Service"}
                              </p>

                              <p className="mt-1 break-all text-xs text-gray-400">
                                Booking ID: {booking.id}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                Created:{" "}
                                {new Date(booking.createdAt).toLocaleString()}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${getStatusClass(
                                  booking.status || "PENDING"
                                )}`}
                              >
                                <FontAwesomeIcon
                                  icon={faCircleCheck}
                                  className="h-3 w-3"
                                />
                                {booking.status || "PENDING"}
                              </span>

                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${getStatusClass(
                                  booking.paymentStatus || "PENDING"
                                )}`}
                              >
                                <FontAwesomeIcon
                                  icon={faCreditCard}
                                  className="h-3 w-3"
                                />
                                {booking.paymentStatus || "PENDING"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs uppercase text-gray-400">
                                Date
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {booking.bookingDate ? 
                                  formatBookingDate(booking.bookingDate) : 
                                  "Not specified"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs uppercase text-gray-400">
                                Time
                              </p>

                              <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                                <FontAwesomeIcon
                                  icon={faClock}
                                  className="h-3 w-3"
                                />
                                {booking.startTime || "N/A"} - {booking.endTime || "N/A"}
                              </p>

                              {booking.durationMinutes && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Duration: {booking.durationMinutes} minutes
                                </p>
                              )}
                            </div>

                            <div className="rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs uppercase text-gray-400">
                                Amount
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {booking.currency || "USD"}{" "}
                                {Number(booking.amount || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {booking.customerNote && (
                            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                              <p className="text-xs uppercase text-gray-400">
                                Your Note
                              </p>

                              <p className="mt-1 text-sm text-gray-700">
                                {booking.customerNote}
                              </p>
                            </div>
                          )}

                          {booking.vendorNote && (
                            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                              <p className="text-xs uppercase text-blue-500">
                                Vendor Note
                              </p>

                              <p className="mt-1 text-sm text-blue-800">
                                {booking.vendorNote}
                              </p>
                            </div>
                          )}

                          {booking.cancelReason && (
                            <div className="mt-4 rounded-2xl bg-red-50 p-4">
                              <p className="text-xs uppercase text-red-500">
                                Cancel / Reject Reason
                              </p>

                              <p className="mt-1 text-sm text-red-800">
                                {booking.cancelReason}
                              </p>
                            </div>
                          )}

                          <CustomerBookingCancelButton
                            bookingId={booking.id}
                            currentStatus={booking.status}
                            cancelReason={booking.cancelReason}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================
            MY ORDERS
            ============================================================ */}
        {showOrders && !sectionLoading && (
          <section className={showBookings ? "mt-14" : ""}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl uppercase">
                  My Orders
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredOrders.length} orders
                  {searchQuery && ` (filtered from ${orders.length})`}
                </p>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <FontAwesomeIcon
                  icon={faBoxOpen}
                  className="mx-auto h-10 w-10 text-gray-400"
                />

                <h2 className="mt-5 font-heading text-2xl uppercase">
                  {searchQuery || orderStatusFilter !== "all"
                    ? "No matching orders found"
                    : "No orders found"}
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  {searchQuery || orderStatusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Your placed orders will appear here."}
                </p>

                <Link
                  href="/"
                  className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-all duration-300 hover:opacity-90"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredOrders.map((order: CustomerOrder) => {
                  const formatStatus = (status: string) => {
                    return status
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (letter) => letter.toUpperCase());
                  };

                  const formatDateTime = (date: string) => {
                    return new Date(date).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  };

                  const formatDate = (date: string | null) => {
                    if (!date) return "Not specified";

                    return new Date(date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  };

                  const formatTimePeriod = (period: string | null) => {
                    if (!period) return "Not specified";

                    switch (period) {
                      case "MORNING":
                        return "Morning (8:00 AM - 12:00 PM)";

                      case "AFTERNOON":
                        return "Afternoon (12:00 PM - 5:00 PM)";

                      case "EVENING":
                        return "Evening (5:00 PM - 9:00 PM)";

                      case "NIGHT":
                        return "Night (9:00 PM - 12:00 AM)";

                      default:
                        return formatStatus(period);
                    }
                  };

                  const getOrderStatusMessage = (status: string) => {
                    switch (status) {
                      case "PENDING":
                        return "Your order has been received and is waiting for confirmation.";

                      case "CONFIRMED":
                        return "Your order has been confirmed.";

                      case "PROCESSING":
                        return "Your order is currently being processed.";

                      case "COMPLETED":
                        return "Your order has been completed.";

                      case "CANCELLED":
                        return "Your order has been cancelled.";

                      case "REJECTED":
                        return "Your order has been rejected.";

                      case "FAILED":
                        return "There was a problem processing your order.";

                      case "REFUNDED":
                        return "Your order has been refunded.";

                      default:
                        return `Your order is ${formatStatus(
                          status
                        ).toLowerCase()}.`;
                    }
                  };

                  const getStatusClasses = (status: string) => {
                    switch (status) {
                      case "PAID":
                      case "COMPLETED":
                        return "border-green-200 bg-green-50 text-green-700";

                      case "CONFIRMED":
                      case "PROCESSING":
                        return "border-blue-200 bg-blue-50 text-blue-700";

                      case "PENDING":
                        return "border-yellow-200 bg-yellow-50 text-yellow-700";

                      case "CANCELLED":
                      case "REJECTED":
                      case "FAILED":
                        return "border-red-200 bg-red-50 text-red-700";

                      case "REFUNDED":
                        return "border-purple-200 bg-purple-50 text-purple-700";

                      default:
                        return "border-gray-200 bg-gray-50 text-gray-700";
                    }
                  };

                  const itemCount = order.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );

                  const deliveryArea =
                    order.deliveryArea ||
                    order.deliveryCity ||
                    order.deliveryState ||
                    order.deliveryCountry ||
                    "Delivery address not provided";

                  return (
                    <article
                      key={order.id}
                      className="overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
                    >
                      {/* ORDER HEADER */}
                      <div className="p-6 md:p-7">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                                  order.status
                                )}`}
                              >
                                {formatStatus(order.status)}
                              </span>

                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                                  order.paymentStatus
                                )}`}
                              >
                                Payment {formatStatus(order.paymentStatus)}
                              </span>
                            </div>

                            <h3 className="mt-4 break-all font-heading text-2xl uppercase tracking-wide">
                              Order #{order.id}
                            </h3>

                            <p className="mt-2 text-sm text-gray-500">
                              {getOrderStatusMessage(order.status)}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-gray-500">
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faClock}
                                  className="h-3.5 w-3.5"
                                />

                                {formatDateTime(order.createdAt)}
                              </span>

                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faBoxOpen}
                                  className="h-3.5 w-3.5"
                                />

                                {itemCount}{" "}
                                {itemCount === 1 ? "Item" : "Items"}
                              </span>

                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faCreditCard}
                                  className="h-3.5 w-3.5"
                                />

                                {order.paymentMethod || "Payment"}
                              </span>

                              <span>{deliveryArea}</span>
                            </div>
                          </div>

                          {/* TOTAL PAID */}
                          <div className="rounded-[20px] bg-gray-50 px-7 py-5 text-left lg:min-w-[245px] lg:text-right">
                            <p className="text-sm text-gray-500">
                              Total Paid
                            </p>

                            <p className="mt-1 text-2xl font-medium">
                              {order.currency} {order.total.toFixed(2)}
                            </p>

                            {order.requestedDeliveryDate && (
                              <p className="mt-2 text-xs text-gray-500">
                                {formatDate(order.requestedDeliveryDate)}
                                {order.requestedDeliveryTimePeriod
                                  ? ` · ${formatTimePeriod(
                                      order.requestedDeliveryTimePeriod
                                    )}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200" />

                      {/* DELIVERY INFORMATION */}
                      <div className="p-6 md:p-7">
                        <div className="rounded-[18px] border border-gray-200 bg-gray-50/50 p-5 md:p-6">
                          <div className="mb-5 flex items-center gap-2">
                            <span className="text-base">●</span>

                            <h4 className="font-heading text-base uppercase tracking-wide">
                              Delivery Information
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                              <p className="text-xs text-gray-500">
                                City / Area
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {order.deliveryCity ||
                                  order.deliveryArea ||
                                  "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Phone Number
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {order.deliveryPhone || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Full Name
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {order.deliveryFullName || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Preferred Delivery Date
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {formatDate(order.requestedDeliveryDate)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Preferred Delivery Time
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {formatTimePeriod(
                                  order.requestedDeliveryTimePeriod
                                )}
                              </p>
                            </div>
                          </div>

                          {(order.deliveryAddress ||
                            order.deliveryAddressLine1 ||
                            order.deliveryAddressLine2) && (
                            <div className="mt-5">
                              <p className="text-xs text-gray-500">
                                Complete Address
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {[
                                  order.deliveryAddress,
                                  order.deliveryAddressLine1,
                                  order.deliveryAddressLine2,
                                  order.deliveryCity,
                                  order.deliveryState,
                                  order.deliveryZipCode,
                                  order.deliveryCountry,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                          )}

                          {order.deliveryNote && (
                            <div className="mt-5">
                              <p className="text-xs text-gray-500">
                                Delivery Note
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {order.deliveryNote}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ORDERED ITEMS */}
                      <div className="px-6 pb-6 md:px-7 md:pb-7">
                        <div className="mb-5 flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faBoxOpen}
                            className="h-4 w-4"
                          />

                          <h4 className="font-heading text-lg uppercase tracking-wide">
                            Ordered Items
                          </h4>
                        </div>

                        <div className="overflow-hidden rounded-[18px] border border-gray-200">
                          {/* TABLE HEADER */}
                          <div className="hidden grid-cols-[minmax(260px,2fr)_1fr_1fr_100px_140px_140px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4 text-xs text-gray-500 lg:grid">
                            <div>Item Details</div>
                            <div>Type / Vendor</div>
                            <div>Variation</div>
                            <div>Quantity</div>
                            <div>Unit Price</div>
                            <div className="text-right">Amount</div>
                          </div>

                          {order.items.map(
                            (item: CustomerOrderItem) => (
                              <div
                                key={item.id}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(260px,2fr)_1fr_1fr_100px_140px_140px] lg:items-center lg:gap-4">
                                  {/* ITEM */}
                                  <div className="flex min-w-0 gap-4">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                      {item.image ? (
                                        <img
                                          src={item.image}
                                          alt={item.title}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <FontAwesomeIcon
                                            icon={faBoxOpen}
                                            className="h-6 w-6 text-gray-400"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <span
                                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${getStatusClasses(
                                          item.status
                                        )}`}
                                      >
                                        {formatStatus(item.status)}
                                      </span>

                                      {item.productSlug ? (
                                        <Link
                                          href={`/products/${item.productSlug}`}
                                          className="mt-2 block text-sm font-medium hover:underline"
                                        >
                                          {item.title}
                                        </Link>
                                      ) : item.serviceSlug ? (
                                        <Link
                                          href={`/products/${item.serviceSlug}`}
                                          className="mt-2 block text-sm font-medium hover:underline"
                                        >
                                          {item.title}
                                        </Link>
                                      ) : (
                                        <p className="mt-2 text-sm font-medium">
                                          {item.title}
                                        </p>
                                      )}

                                      <p className="mt-1 break-all text-[11px] text-gray-400">
                                        Item ID: {item.id}
                                      </p>
                                    </div>
                                  </div>

                                  {/* TYPE / VENDOR */}
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.type}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.vendorName}
                                    </p>
                                  </div>

                                  {/* VARIATION */}
                                  <div>
                                    {item.variantTitle ? (
                                      <span className="inline-flex rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white">
                                        {item.variantTitle}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400">
                                        —
                                      </span>
                                    )}

                                    {Object.entries(
                                      item.variantOptions
                                    ).map(([key, value]) => (
                                      <p
                                        key={key}
                                        className="mt-2 inline-flex rounded-full border border-gray-200 px-3 py-1 text-[11px] text-gray-500"
                                      >
                                        {key}: {value}
                                      </p>
                                    ))}
                                  </div>

                                  {/* QUANTITY */}
                                  <div>
                                    <p className="text-xs text-gray-500 lg:hidden">
                                      Quantity
                                    </p>

                                    <p className="mt-1 text-sm font-medium lg:mt-0">
                                      {item.quantity}
                                    </p>
                                  </div>

                                  {/* UNIT PRICE */}
                                  <div>
                                    <p className="text-xs text-gray-500 lg:hidden">
                                      Unit Price
                                    </p>

                                    <p className="mt-1 text-sm font-medium lg:mt-0">
                                      {item.currency}{" "}
                                      {item.price.toFixed(2)}
                                    </p>
                                  </div>

                                  {/* AMOUNT */}
                                  <div className="lg:text-right">
                                    <p className="text-xs text-gray-500 lg:hidden">
                                      Amount
                                    </p>

                                    <p className="mt-1 text-sm font-medium lg:mt-0">
                                      {item.currency}{" "}
                                      {item.total.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* TOTAL BREAKDOWN */}
                      <div className="px-6 pb-6 md:px-7 md:pb-7">
                        <div className="grid grid-cols-2 gap-5 rounded-[18px] border border-gray-200 p-5 md:grid-cols-4 md:p-6">
                          <div>
                            <p className="text-sm text-gray-500">Subtotal</p>

                            <p className="mt-1 text-sm font-medium">
                              {order.currency}{" "}
                              {order.subtotal.toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">
                              Shipping / Delivery
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {order.currency}{" "}
                              {order.shipping.toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Tax</p>

                            <p className="mt-1 text-sm font-medium">
                              {order.currency} {order.tax.toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Total</p>

                            <p className="mt-1 text-sm font-medium">
                              {order.currency} {order.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-wrap gap-3 px-6 pb-7 md:px-7">
                        <Link
                          href={`/customer/orders/${order.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-black"
                        >
                          Track Order
                          <span className="ml-2">›</span>
                        </Link>

                        <Link
                          href={`/customer/orders/${order.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
                        >
                          View Receipt
                          <span className="ml-2">›</span>
                        </Link>

                        <Link
                          href="/"
                          className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
                        >
                          Continue Shopping
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}