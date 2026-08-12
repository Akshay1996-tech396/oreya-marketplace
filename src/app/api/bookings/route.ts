import { PaymentPurpose } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createCheckoutKey } from "@/lib/payments/checkout-data";
import { createOnlinePaymentSession } from "@/lib/payments/payment-service";
import { stripePaymentProvider } from "@/lib/payments/providers/stripe";
import { buildServiceBookingCheckoutData } from "@/lib/payments/service-booking-payment";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CreateBookingBody = {
  serviceId?: string;
  slotId?: string;
  customerNote?: string;
  returnPath?: string;
};

const MAX_CUSTOMER_NOTE_LENGTH = 1000;

function getTodayDateOnly() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return today;
}

function formatBooking(booking: any) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    customerName: booking.customer?.name || "",
    customerEmail: booking.customer?.email || "",
    vendorId: booking.vendorId,
    vendorName: booking.vendor?.businessName || "Admin Service",
    serviceId: booking.serviceId,
    serviceTitle: booking.service?.title || "",
    serviceSlug: booking.service?.slug || "",
    slotId: booking.slotId,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationMinutes: booking.durationMinutes,
    amount: Number(booking.amount),
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    customerNote: booking.customerNote,
    vendorNote: booking.vendorNote,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
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

    if (user.role === "CUSTOMER") {
      const bookings = await prisma.booking.findMany({
        where: {
          customerId: user.id,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
          slot: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        bookings: bookings.map(formatBooking),
      });
    }

    if (user.role === "VENDOR") {
      const vendor = await prisma.vendorProfile.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!vendor) {
        return NextResponse.json(
          {
            success: false,
            message: "Vendor profile was not found.",
          },
          { status: 404 }
        );
      }

      const bookings = await prisma.booking.findMany({
        where: {
          vendorId: vendor.id,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
          slot: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        bookings: bookings.map(formatBooking),
      });
    }

    if (user.role === "ADMIN") {
      const bookings = await prisma.booking.findMany({
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
          slot: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        bookings: bookings.map(formatBooking),
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid user role.",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("GET_BOOKINGS_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load bookings.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          message: "Only customers can book appointments.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateBookingBody;

    const serviceId = body.serviceId?.trim();
    const slotId = body.slotId?.trim();
    const customerNote = body.customerNote?.trim() || null;
    const returnPath = body.returnPath?.trim() || "/products";

    if (
      customerNote &&
      customerNote.length > MAX_CUSTOMER_NOTE_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Customer note cannot exceed ${MAX_CUSTOMER_NOTE_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Service ID is required.",
        },
        { status: 400 }
      );
    }

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select an appointment time slot.",
        },
        { status: 400 }
      );
    }

    const slot = await prisma.appointmentSlot.findFirst({
      where: {
        id: slotId,
        serviceId,
      },
      include: {
        service: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!slot) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected appointment slot was not found.",
        },
        { status: 404 }
      );
    }

    if (!slot.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected slot is not active.",
        },
        { status: 400 }
      );
    }

    if (slot.service.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "This service is not active right now.",
        },
        { status: 400 }
      );
    }

    if (slot.service.vendorId) {
      if (!slot.service.vendor) {
        return NextResponse.json(
          {
            success: false,
            message: "Service vendor was not found.",
          },
          { status: 404 }
        );
      }

      if (slot.service.vendor.status !== "APPROVED") {
        return NextResponse.json(
          {
            success: false,
            message: "This vendor is not approved for appointment bookings.",
          },
          { status: 400 }
        );
      }
    }

    if ((slot.vendorId || null) !== (slot.service.vendorId || null)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected slot owner does not match the selected service owner.",
        },
        { status: 400 }
      );
    }

    if (slot.date < getTodayDateOnly()) {
      return NextResponse.json(
        {
          success: false,
          message: "Past date appointments cannot be booked.",
        },
        { status: 400 }
      );
    }

    if (slot.bookedCount >= slot.capacity) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected slot is fully booked.",
        },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        customerId: user.id,
        slotId: slot.id,
        status: {
          notIn: ["CANCELLED", "REJECTED"],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already booked this slot.",
        },
        { status: 409 }
      );
    }

    if (slot.service.price.lte(0)) {
      return NextResponse.json(
        {
          success: false,
          message: "This service does not have a valid online payment amount.",
        },
        { status: 400 }
      );
    }

    const checkoutData = buildServiceBookingCheckoutData({
      serviceId: slot.serviceId,
      serviceTitle: slot.service.title,
      vendorId: slot.service.vendorId,
      slotId: slot.id,
      slotVendorId: slot.vendorId,
      bookingDate: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes:
        slot.durationMinutes ?? slot.service.duration ?? null,
      amount: slot.service.price,
      currency: slot.service.currency,
      customerNote,
    });

    const checkoutKey = createCheckoutKey(
      "SERVICE_BOOKING",
      user.id,
      checkoutData
    );

    const checkoutDigest = checkoutKey.split(":")[1];
    const idempotencyKey = `service-${checkoutDigest}`;
    const origin = new URL(request.url).origin;

    const successUrl = `${origin}/checkout/success?type=service-payment&session_id={CHECKOUT_SESSION_ID}`;

    const failureUrl = new URL("/checkout", origin);
    failureUrl.searchParams.set("checkoutType", "service-booking");
    failureUrl.searchParams.set("serviceId", slot.serviceId);
    failureUrl.searchParams.set("slotId", slot.id);
    failureUrl.searchParams.set("payment", "cancelled");

    if (customerNote) {
      failureUrl.searchParams.set("customerNote", customerNote);
    }

    if (
      returnPath.startsWith("/") &&
      !returnPath.startsWith("//") &&
      !returnPath.startsWith("/admin") &&
      !returnPath.startsWith("/vendor") &&
      !returnPath.startsWith("/customer") &&
      !returnPath.startsWith("/checkout")
    ) {
      failureUrl.searchParams.set("returnPath", returnPath);
    }

    const paymentSession = await createOnlinePaymentSession(
      stripePaymentProvider,
      {
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        purpose: PaymentPurpose.SERVICE_BOOKING,
        amount: slot.service.price,
        currency: slot.service.currency,
        idempotencyKey,
        checkoutKey,
        checkoutData,
        reference: `OREYA-SERVICE-${checkoutDigest.slice(0, 24)}`,
        description: `OREYA Service Appointment - ${slot.service.title}`,
        successUrl,
        failureUrl: failureUrl.toString(),
        metadata: {
          service_id: slot.serviceId,
          slot_id: slot.id,
        },
      }
    );

    if (!paymentSession.redirectUrl) {
      throw new Error("Stripe did not return a secure checkout URL.");
    }

    return NextResponse.json(
      {
        success: true,
        message: paymentSession.reused
          ? "Existing secure payment session loaded successfully."
          : "Secure payment session created successfully.",
        requiresOnlinePayment: true,
        paymentId: paymentSession.paymentId,
        providerSessionId: paymentSession.providerSessionId,
        redirectUrl: paymentSession.redirectUrl,
        reused: paymentSession.reused,
      },
      { status: paymentSession.reused ? 200 : 201 }
    );
  } catch (error) {
    console.error("CREATE_SERVICE_PAYMENT_SESSION_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start secure payment for this appointment.",
      },
      { status: 500 }
    );
  }
}
