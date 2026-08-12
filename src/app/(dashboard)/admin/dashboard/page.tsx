import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatReservationDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getStatusClass(status: string) {
  if (
    status === "PAID" ||
    status === "APPROVED" ||
    status === "COMPLETED" ||
    status === "CONFIRMED" ||
    status === "ACTIVE"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (status === "PENDING" || status === "PROCESSING" || status === "DRAFT") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED" ||
    status === "NO_SHOW" ||
    status === "INACTIVE"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const [
    totalVendors,
    pendingVendors,
    totalCustomers,
    totalProducts,
    totalServices,
    totalOrders,
    totalBookings,
    totalPayments,
    recentOrders,
    recentBookings,
    totalRestaurants,
    totalRestaurantReservations,
    pendingRestaurantReservations,
    todayRestaurantReservations,
    paidRestaurantReservations,
    recentRestaurantReservations,
  ] = await Promise.all([
    prisma.vendorProfile.count(),
    prisma.vendorProfile.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),
    prisma.product.count(),
    prisma.service.count(),
    prisma.order.count(),
    prisma.booking.count(),
    prisma.payment.findMany({
      where: {
        status: "PAID",
      },
      select: {
        amount: true,
      },
    }),
    prisma.order.findMany({
      take: 5,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            title: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.booking.findMany({
      take: 5,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        vendor: {
          select: {
            businessName: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.restaurant.count(),
    prisma.restaurantReservation.count(),
    prisma.restaurantReservation.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.restaurantReservation.count({
      where: {
        reservationDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    }),
    prisma.restaurantReservation.findMany({
      where: {
        paymentStatus: "PAID",
      },
      select: {
        amount: true,
      },
    }),
    prisma.restaurantReservation.findMany({
      take: 5,
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
            vendor: {
              select: {
                businessName: true,
              },
            },
          },
        },
        table: {
          select: {
            tableNumber: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalRevenue = totalPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const restaurantRevenue = paidRestaurantReservations.reduce(
    (sum, reservation) => sum + Number(reservation.amount),
    0
  );

  const dashboardCards = [
    {
      title: "Total Vendors",
      value: totalVendors,
      href: "/admin/vendors",
    },
    {
      title: "Pending Vendors",
      value: pendingVendors,
      href: "/admin/vendors",
    },
    {
      title: "Customers",
      value: totalCustomers,
      href: "/admin/customers",
    },
    {
      title: "Products",
      value: totalProducts,
      href: "/admin/products",
    },
    {
      title: "Services",
      value: totalServices,
      href: "/admin/services",
    },
    {
      title: "Orders",
      value: totalOrders,
      href: "/admin/orders",
    },
    {
      title: "Appointments",
      value: totalBookings,
      href: "/admin/appointments",
    },
    {
      title: "Restaurants",
      value: totalRestaurants,
      href: "/admin/restaurants",
    },
    {
      title: "Restaurant Reservations",
      value: totalRestaurantReservations,
      href: "/admin/restaurant-reservations",
    },
    {
      title: "Pending Reservations",
      value: pendingRestaurantReservations,
      href: "/admin/restaurant-reservations",
    },
    {
      title: "Today Reservations",
      value: todayRestaurantReservations,
      href: "/admin/restaurant-reservations",
    },
    {
      title: "Restaurant Revenue",
      value: formatMoney("AED", restaurantRevenue),
      href: "/admin/restaurant-reservations",
    },
    {
      title: "Revenue",
      value: formatMoney("AED", totalRevenue),
      href: "/admin/payments",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real marketplace overview with vendors, customers, products, services,
          orders and revenue.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {card.title}
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
              {card.value}
            </h2>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest customer orders.
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Order
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Items
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {order.id.slice(0, 10)}...
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {order.customer.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.customer.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {order.items.length}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatMoney(order.currency, Number(order.total))}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Recent Appointments
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest service bookings.
              </p>
            </div>

            <Link
              href="/admin/appointments"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No appointments found.
              </p>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {booking.service.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Customer: {booking.customer.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Vendor: {booking.vendor?.businessName || "Admin Service"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(booking.bookingDate)} | {booking.startTime} -{" "}
                        {booking.endTime}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-gray-900 dark:text-white">
              Recent Restaurant Reservations
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest table reservations across all marketplace restaurants.
            </p>
          </div>

          <Link
            href="/admin/restaurant-reservations"
            className="w-fit rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
          >
            View all
          </Link>
        </div>

        <div className="space-y-4">
          {recentRestaurantReservations.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No restaurant reservations found.
            </p>
          ) : (
            recentRestaurantReservations.map((reservation) => {
              const customerName =
                reservation.customerName ||
                reservation.customer?.name ||
                "Guest Customer";

              const customerEmail =
                reservation.customerEmail ||
                reservation.customer?.email ||
                "Email not provided";

              return (
                <div
                  key={reservation.id}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {reservation.restaurant.name}
                        </p>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            reservation.status
                          )}`}
                        >
                          {reservation.status}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            reservation.paymentStatus
                          )}`}
                        >
                          {reservation.paymentStatus}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Reservation: {reservation.reservationCode}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Vendor: {reservation.restaurant.vendor.businessName}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Customer: {customerName} · {customerEmail}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatReservationDate(reservation.reservationDate)} |{" "}
                        {reservation.startTime} - {reservation.endTime}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Guests: {reservation.guests}
                        {reservation.table
                          ? ` · Table ${reservation.table.tableNumber}`
                          : " · Table not assigned"}
                      </p>
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMoney(
                          reservation.currency,
                          Number(reservation.amount)
                        )}
                      </p>

                      <Link
                        href="/admin/restaurant-reservations"
                        className="mt-3 inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                      >
                        Manage Reservation
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}