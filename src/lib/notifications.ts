import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type CreateManyNotificationsInput = CreateNotificationInput[];

export async function createNotification(input: CreateNotificationInput) {
  try {
    if (!input.userId) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type || "SYSTEM",
        link: input.link || null,
        metadata: input.metadata ?? undefined,
      },
    });

    return notification;
  } catch (error) {
    console.error("CREATE_NOTIFICATION_ERROR", error);
    return null;
  }
}

export async function createManyNotifications(
  notifications: CreateManyNotificationsInput
) {
  try {
    const validNotifications = notifications.filter(
      (notification) => notification.userId
    );

    if (validNotifications.length === 0) {
      return [];
    }

    const createdNotifications = await Promise.all(
      validNotifications.map((notification) =>
        createNotification(notification)
      )
    );

    return createdNotifications;
  } catch (error) {
    console.error("CREATE_MANY_NOTIFICATIONS_ERROR", error);
    return [];
  }
}

export function getBookingStatusNotificationType(
  status: string
): NotificationType {
  if (status === "CONFIRMED") {
    return "BOOKING_CONFIRMED";
  }

  if (status === "REJECTED") {
    return "BOOKING_REJECTED";
  }

  if (status === "CANCELLED") {
    return "BOOKING_CANCELLED";
  }

  if (status === "COMPLETED") {
    return "BOOKING_COMPLETED";
  }

  return "BOOKING_STATUS_UPDATED";
}

export function getPaymentStatusNotificationType(
  paymentStatus: string
): NotificationType {
  if (paymentStatus === "PAID") {
    return "PAYMENT_PAID";
  }

  if (paymentStatus === "FAILED") {
    return "PAYMENT_FAILED";
  }

  if (paymentStatus === "REFUNDED") {
    return "PAYMENT_REFUNDED";
  }

  return "PAYMENT_STATUS_UPDATED";
}

export function getDashboardLinkByRole(role: string) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "VENDOR") {
    return "/vendor";
  }

  return "/customer";
}