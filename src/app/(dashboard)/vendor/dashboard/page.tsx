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

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/register");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    productsCount,
    servicesCount,
    slotsCount,
    bookingsCount,
    todayBookingsCount,
    orderItems,
    paidBookings,
    recentBookings,
    restaurantsCount,
    restaurantReservationsCount,
    todayRestaurantReservationsCount,
    pendingRestaurantReservationsCount,
    paidRestaurantReservations,
    recentRestaurantReservations,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.service.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.appointmentSlot.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.booking.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.booking.count({
      where: {
        vendorId: vendor.id,
        bookingDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),

    prisma.orderItem.findMany({
      where: {
        OR: [
          {
            product: {
              is: {
                vendorId: vendor.id,
              },
            },
          },
          {
            service: {
              is: {
                vendorId: vendor.id,
              },
            },
          },
        ],
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            title: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
    }),

    prisma.booking.findMany({
      where: {
        vendorId: vendor.id,
        paymentStatus: "PAID",
      },
      select: {
        amount: true,
      },
    }),

    prisma.booking.findMany({
      take: 5,
      where: {
        vendorId: vendor.id,
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
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

    prisma.restaurant.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.restaurantReservation.count({
      where: {
        restaurant: {
          is: {
            vendorId: vendor.id,
          },
        },
      },
    }),

    prisma.restaurantReservation.count({
      where: {
        restaurant: {
          is: {
            vendorId: vendor.id,
          },
        },
        reservationDate: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),

    prisma.restaurantReservation.count({
      where: {
        restaurant: {
          is: {
            vendorId: vendor.id,
          },
        },
        status: "PENDING",
      },
    }),

    prisma.restaurantReservation.findMany({
      where: {
        restaurant: {
          is: {
            vendorId: vendor.id,
          },
        },
        paymentStatus: "PAID",
      },
      select: {
        amount: true,
      },
    }),

    prisma.restaurantReservation.findMany({
      take: 5,
      where: {
        restaurant: {
          is: {
            vendorId: vendor.id,
          },
        },
      },
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
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

  const sortedOrderItems = orderItems.sort(
    (a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime()
  );

  const paidOrderItems = sortedOrderItems.filter(
    (item) => item.order.paymentStatus === "PAID"
  );

  const productAndServiceEarnings = paidOrderItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const bookingEarnings = paidBookings.reduce(
    (sum, booking) => sum + Number(booking.amount),
    0
  );

  const restaurantReservationEarnings = paidRestaurantReservations.reduce(
    (sum, reservation) => sum + Number(reservation.amount),
    0
  );

  const totalEarnings =
    productAndServiceEarnings +
    bookingEarnings +
    restaurantReservationEarnings;

  const uniqueOrderIds = Array.from(
    new Set(sortedOrderItems.map((item) => item.orderId))
  );

  const recentOrderItems = sortedOrderItems.slice(0, 5);

  const dashboardCards = [
    {
      title: "My Products",
      value: productsCount,
      href: "/vendor/products",
    },
    {
      title: "My Services",
      value: servicesCount,
      href: "/vendor/services",
    },
    {
      title: "Total Orders",
      value: uniqueOrderIds.length,
      href: "/vendor/orders",
    },
    {
      title: "Appointments",
      value: bookingsCount,
      href: "/vendor/appointments",
    },
    {
      title: "Slots",
      value: slotsCount,
      href: "/vendor/slots",
    },
    {
      title: "My Restaurants",
      value: restaurantsCount,
      href: "/vendor/restaurants",
    },
    {
      title: "Restaurant Reservations",
      value: restaurantReservationsCount,
      href: "/vendor/restaurant-reservations",
    },
    {
      title: "Pending Restaurant Reservations",
      value: pendingRestaurantReservationsCount,
      href: "/vendor/restaurant-reservations",
    },
    {
      title: "Restaurant Earnings",
      value: formatMoney("AED", restaurantReservationEarnings),
      href: "/vendor/restaurant-reservations",
    },
    {
      title: "Total Earnings",
      value: formatMoney("AED", totalEarnings),
      href: "/vendor/earnings",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
          Vendor Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real overview for {vendor.businessName}. Vendor status:{" "}
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
              vendor.status
            )}`}
          >
            {vendor.status}
          </span>
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Today Appointments
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Service appointments scheduled for today.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-brand-500 text-2xl font-semibold text-gray-900 dark:text-white">
              {todayBookingsCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Today Restaurant Reservations
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Restaurant table reservations scheduled for today.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-brand-500 text-2xl font-semibold text-gray-900 dark:text-white">
              {todayRestaurantReservationsCount}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg text-gray-900 dark:text-white">
                Recent Order Items
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest products/services ordered from this vendor.
              </p>
            </div>

            <Link
              href="/vendor/orders"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Item
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Customer
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Qty
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    Payment
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentOrderItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No order items found.
                    </td>
                  </tr>
                ) : (
                  recentOrderItems.map((item) => {
                    const itemTitle =
                      item.product?.title || item.service?.title || item.title;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                      >
                        <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                          {itemTitle}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-800 dark:text-white/90">
                            {item.order.customer.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.order.customer.email}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                          {formatMoney(
                            item.currency,
                            Number(item.price) * item.quantity
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              item.order.paymentStatus
                            )}`}
                          >
                            {item.order.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
                Latest service bookings for this vendor.
              </p>
            </div>

            <Link
              href="/vendor/appointments"
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
              Latest table reservations received across your restaurants.
            </p>
          </div>

          <Link
            href="/vendor/restaurant-reservations"
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
                        href="/vendor/restaurant-reservations"
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