"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckDouble,
  faCircle,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
};

type NotificationsResponse = {
  success?: boolean;
  message?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
};

function formatTime(date: string) {
  const notificationDate = new Date(date);

  return notificationDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTypeLabel(type: string) {
  if (type === "BOOKING_CREATED") return "Booking";
  if (type === "BOOKING_CONFIRMED") return "Confirmed";
  if (type === "BOOKING_REJECTED") return "Rejected";
  if (type === "BOOKING_CANCELLED") return "Cancelled";
  if (type === "BOOKING_COMPLETED") return "Completed";
  if (type === "BOOKING_STATUS_UPDATED") return "Booking Update";
  if (type === "PAYMENT_STATUS_UPDATED") return "Payment Update";
  if (type === "PAYMENT_PAID") return "Paid";
  if (type === "PAYMENT_FAILED") return "Failed";
  if (type === "PAYMENT_REFUNDED") return "Refunded";
  if (type === "ORDER_CREATED") return "Order";
  if (type === "ORDER_STATUS_UPDATED") return "Order Update";
  if (type === "VENDOR_APPROVED") return "Vendor Approved";
  if (type === "VENDOR_REJECTED") return "Vendor Rejected";

  return "System";
}

export default function NotificationBell() {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: NotificationsResponse = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Notifications load nahi ho paayi.");
        return;
      }

      setUnreadCount(data.unreadCount || 0);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("LOAD_NOTIFICATIONS_ERROR", error);
      setErrorMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          notificationId,
        }),
      });

      const data: NotificationsResponse = await response.json();

      if (!response.ok) {
        return;
      }

      setUnreadCount(data.unreadCount || 0);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error("MARK_NOTIFICATION_READ_ERROR", error);
    }
  }

  async function markAllAsRead() {
    try {
      setMarkingAll(true);

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          markAll: true,
        }),
      });

      const data: NotificationsResponse = await response.json();

      if (!response.ok) {
        return;
      }

      setUnreadCount(data.unreadCount || 0);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error("MARK_ALL_NOTIFICATIONS_READ_ERROR", error);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleBellClick() {
    setOpen((currentState) => !currentState);

    if (!open) {
      loadNotifications();
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleBellClick}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:border-black"
        aria-label="Notifications"
      >
        <FontAwesomeIcon icon={faBell} className="h-4 w-4" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[340px] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-xl sm:w-[420px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-heading text-lg uppercase">
                Notifications
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {unreadCount} unread
              </p>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? (
                <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faCheckDouble} className="h-3 w-3" />
              )}
              Mark all
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-5 py-10 text-sm text-gray-500">
                <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            ) : errorMessage ? (
              <div className="px-5 py-10 text-center text-sm text-red-600">
                {errorMessage}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FontAwesomeIcon
                  icon={faBell}
                  className="mx-auto h-8 w-8 text-gray-300"
                />

                <p className="mt-4 text-sm font-medium">
                  No notifications yet
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  New updates yahan show honge.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const content = (
                    <div
                      className={`block px-5 py-4 transition hover:bg-gray-50 ${
                        notification.isRead ? "bg-white" : "bg-yellow-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notification.isRead && (
                          <FontAwesomeIcon
                            icon={faCircle}
                            className="mt-1.5 h-2 w-2 shrink-0 text-red-600"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase text-gray-600">
                              {getTypeLabel(notification.type)}
                            </span>

                            <span className="text-[11px] text-gray-400">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-black">
                            {notification.title}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  if (notification.link) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.link}
                        onClick={() => {
                          markNotificationAsRead(notification.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="w-full text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-5 py-3 text-center text-[11px] text-gray-400">
            Latest 30 notifications
          </div>
        </div>
      )}
    </div>
  );
}