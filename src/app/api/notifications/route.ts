import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UpdateNotificationBody = {
  notificationId?: string;
  markAll?: boolean;
};

function formatNotification(notification: any) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    link: notification.link,
    isRead: notification.isRead,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      }),

      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("GET_NOTIFICATIONS_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Notifications load nahi ho paayi.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as UpdateNotificationBody;

    const notificationId = body.notificationId?.trim();
    const markAll = Boolean(body.markAll);

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read.",
        unreadCount,
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification ID required hai.",
        },
        { status: 400 }
      );
    }

    const updatedNotification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    });

    if (updatedNotification.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification nahi mili.",
        },
        { status: 404 }
      );
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
      unreadCount,
    });
  } catch (error) {
    console.error("UPDATE_NOTIFICATION_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification record nahi mila.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Notification update nahi ho paayi.",
      },
      { status: 500 }
    );
  }
}