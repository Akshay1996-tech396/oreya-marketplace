import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTypeClass(type: string) {
  if (
    type.includes("ORDER") ||
    type.includes("BOOKING") ||
    type.includes("PAID") ||
    type.includes("APPROVED")
  ) {
    return "bg-green-50 text-green-700";
  }

  if (type.includes("FAILED") || type.includes("REJECTED") || type.includes("CANCELLED")) {
    return "bg-red-50 text-red-700";
  }

  if (type.includes("UPDATED") || type.includes("PENDING")) {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-gray-50 text-gray-700";
}

function getReadClass(isRead: boolean) {
  if (isRead) {
    return "bg-gray-50 text-gray-700";
  }

  return "bg-blue-50 text-blue-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(getDashboardPath(user.role));
  }

  const notifications = await prisma.notification.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all real marketplace notifications.
          </p>
        </div>

        <div className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          Unread: {unreadCount}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Notifications List
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total: {notifications.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Notification
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  User
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Type
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Message
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Read Status
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Date
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {notifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No notifications found.
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {notification.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {notification.id.slice(0, 12)}...
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        {notification.user.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {notification.user.email}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Role: {notification.user.role}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTypeClass(
                          notification.type
                        )}`}
                      >
                        {notification.type}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                      {notification.message}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getReadClass(
                          notification.isRead
                        )}`}
                      >
                        {notification.isRead ? "Read" : "Unread"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-gray-500">
                      {formatDate(notification.createdAt)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          Open
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}