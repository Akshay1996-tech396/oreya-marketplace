import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getCurrentUser } from "../../lib/auth";
import { getCustomerOrders } from "../../lib/orders";
import CustomerBookingCancelButton from "../../components/customer/CustomerBookingCancelButton";
import type { CustomerOrder, CustomerOrderItem } from "../../types/order";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCalendarCheck,
  faClock,
  faCircleCheck,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "VENDOR") return "/vendor";
  return "/customer";
}

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

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CUSTOMER") {
    redirect(getDashboardPath(user.role));
  }

  const orders: CustomerOrder[] = await getCustomerOrders(user.id);

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: user.id,
    },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          images: true,
        },
      },
      slot: {
        select: {
          id: true,
          note: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

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

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-gray-200 p-6">
            <FontAwesomeIcon icon={faBoxOpen} className="h-5 w-5" />

            <p className="mt-4 text-sm text-gray-500">Total Orders</p>

            <h2 className="mt-1 text-3xl font-semibold">{orders.length}</h2>
          </div>

          <div className="rounded-[24px] border border-gray-200 p-6">
            <FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5" />

            <p className="mt-4 text-sm text-gray-500">Total Bookings</p>

            <h2 className="mt-1 text-3xl font-semibold">{bookings.length}</h2>
          </div>
        </div>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl uppercase">My Bookings</h2>

              <p className="mt-1 text-sm text-gray-500">
                {bookings.length} bookings
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <FontAwesomeIcon
                icon={faCalendarCheck}
                className="mx-auto h-10 w-10 text-gray-400"
              />

              <h2 className="mt-5 font-heading text-2xl uppercase">
                No bookings found
              </h2>

              <p className="mt-3 text-sm text-gray-500">
                Your appointment bookings will appear here.
              </p>

              <Link
                href="/collections/services"
                className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white"
              >
                Explore Services
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => {
                const image = getFirstImage(booking.service.images);

                return (
                  <div
                    key={booking.id}
                    className="rounded-[24px] border border-gray-200 p-6"
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
                              Vendor: {booking.vendor?.businessName || "Admin Service"}
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
                                booking.status
                              )}`}
                            >
                              <FontAwesomeIcon
                                icon={faCircleCheck}
                                className="h-3 w-3"
                              />
                              {booking.status}
                            </span>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${getStatusClass(
                                booking.paymentStatus
                              )}`}
                            >
                              <FontAwesomeIcon
                                icon={faCreditCard}
                                className="h-3 w-3"
                              />
                              {booking.paymentStatus}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-xs uppercase text-gray-400">
                              Date
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {formatBookingDate(booking.bookingDate)}
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
                              {booking.startTime} - {booking.endTime}
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
                              {booking.currency}{" "}
                              {Number(booking.amount).toFixed(2)}
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

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl uppercase">My Orders</h2>

              <p className="mt-1 text-sm text-gray-500">
                {orders.length} orders
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <FontAwesomeIcon
                icon={faBoxOpen}
                className="mx-auto h-10 w-10 text-gray-400"
              />

              <h2 className="mt-5 font-heading text-2xl uppercase">
                No orders found
              </h2>

              <p className="mt-3 text-sm text-gray-500">
                Your placed orders will appear here.
              </p>

              <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order: CustomerOrder) => (
                <div
                  key={order.id}
                  className="rounded-[24px] border border-gray-200 p-6"
                >
                  <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Order ID
                      </p>

                      <p className="mt-1 break-all text-sm font-medium">
                        {order.id}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${getStatusClass(
                          order.status
                        )}`}
                      >
                        <FontAwesomeIcon
                          icon={faCircleCheck}
                          className="h-3 w-3"
                        />
                        {order.status}
                      </span>

                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${getStatusClass(
                          order.paymentStatus
                        )}`}
                      >
                        <FontAwesomeIcon
                          icon={faCreditCard}
                          className="h-3 w-3"
                        />
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {order.items.map((item: CustomerOrderItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium">{item.title}</p>

                          <p className="mt-1 text-xs text-gray-500">
                            Qty: {item.quantity} × {item.currency}{" "}
                            {item.price.toFixed(2)}
                          </p>
                        </div>

                        <p className="text-sm font-medium">
                          {item.currency} {item.total.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-between border-t border-gray-200 pt-5 text-lg font-semibold">
                    <span>Total</span>

                    <span>
                      {order.currency} {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}