import Stripe from "stripe";

import type {
  CreatePaymentSessionInput,
  PaymentProvider,
  PaymentProviderMetadata,
  ProviderPaymentDetails,
  ProviderPaymentOutcome,
  ReversePaymentInput,
} from "../payment-provider";

function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();

  if (!value) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (!value.startsWith("sk_test_")) {
    throw new Error(
      "Step 3 development requires a Stripe Sandbox/Test secret key beginning with sk_test_.",
    );
  }

  return value;
}

function getStripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!value) {
    throw new Error("Stripe webhook signing secret is not configured.");
  }

  if (!value.startsWith("whsec_")) {
    throw new Error("Stripe webhook signing secret is invalid.");
  }

  return value;
}

function getStripeClient() {
  return new Stripe(getStripeSecretKey());
}

function toStripeMetadata(metadata: PaymentProviderMetadata) {
  return Object.entries(metadata).reduce<Record<string, string>>(
    (result, [key, value]) => {
      const cleanKey = key.trim();

      if (!cleanKey || cleanKey.length > 40) {
        throw new Error(
          "Stripe payment metadata contains an invalid metadata key.",
        );
      }

      const cleanValue = String(value);

      if (cleanValue.length > 500) {
        throw new Error(
          `Stripe payment metadata value for ${cleanKey} is too long.`,
        );
      }

      result[cleanKey] = cleanValue;
      return result;
    },
    {},
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeMetadata(
  metadata: Stripe.Metadata | null | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(Object.entries(metadata));
}

function paymentIntentOutcome(
  paymentIntent: Stripe.PaymentIntent | null,
  session: Stripe.Checkout.Session | null,
): ProviderPaymentOutcome {
  if (paymentIntent?.status === "succeeded") {
    return "SUCCESS";
  }


  if (session?.status === "expired") {
    return "CANCELLED";
  }

  if (paymentIntent?.status === "canceled") {
    return "CANCELLED";
  }

  // An open Checkout Session is still retryable. A card decline may leave its
  // PaymentIntent in requires_payment_method with a last_payment_error, but
  // the customer can still submit another card in the same Stripe session.
  // Treating that state as terminal would release the marketplace checkout
  // keys while the original Stripe session is still usable.
  if (session?.status === "open") {
    return "PENDING";
  }

  if (session?.status === "complete" && session.payment_status === "unpaid") {
    return "FAILED";
  }

  if (
    !session &&
    paymentIntent?.status === "requires_payment_method" &&
    paymentIntent.last_payment_error
  ) {
    return "FAILED";
  }

  if (
    paymentIntent?.status === "processing" ||
    paymentIntent?.status === "requires_action" ||
    paymentIntent?.status === "requires_confirmation" ||
    paymentIntent?.status === "requires_capture" ||
    paymentIntent?.status === "requires_payment_method"
  ) {
    return "PENDING";
  }

  return "UNKNOWN";
}

function approvedForOutcome(outcome: ProviderPaymentOutcome) {
  if (outcome === "SUCCESS") {
    return true;
  }

  if (outcome === "FAILED" || outcome === "CANCELLED") {
    return false;
  }

  return null;
}

function paymentIntentFromSession(
  session: Stripe.Checkout.Session,
): Stripe.PaymentIntent | null {
  if (
    session.payment_intent &&
    typeof session.payment_intent === "object" &&
    session.payment_intent.object === "payment_intent"
  ) {
    return session.payment_intent;
  }

  return null;
}

async function retrieveCheckoutSession(
  sessionId: string,
): Promise<ProviderPaymentDetails> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  let paymentIntent = paymentIntentFromSession(session);

  if (!paymentIntent && typeof session.payment_intent === "string") {
    paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent,
    );
  }

  const outcome = paymentIntentOutcome(paymentIntent, session);

  return {
    id: session.id,
    paymentId: paymentIntent?.id ?? null,
    sessionId: session.id,
    status: paymentIntent
      ? `${session.status ?? "unknown"}:${session.payment_status}:${paymentIntent.status}`
      : `${session.status ?? "unknown"}:${session.payment_status}`,
    outcome,
    approved: approvedForOutcome(outcome),
    amountMinor: session.amount_total,
    currency: session.currency?.toUpperCase() ?? null,
    reference: session.client_reference_id,
    metadata: normalizeMetadata(session.metadata),
    raw: {
      sessionId: session.id,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      paymentIntentId: paymentIntent?.id ?? null,
      paymentIntentStatus: paymentIntent?.status ?? null,
      amountTotal: session.amount_total,
      currency: session.currency,
      clientReferenceId: session.client_reference_id,
    },
  };
}

async function retrievePaymentIntent(
  paymentIntentId: string,
): Promise<ProviderPaymentDetails> {
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const outcome = paymentIntentOutcome(paymentIntent, null);

  return {
    id: paymentIntent.id,
    paymentId: paymentIntent.id,
    sessionId: null,
    status: paymentIntent.status,
    outcome,
    approved: approvedForOutcome(outcome),
    amountMinor: paymentIntent.amount,
    currency: paymentIntent.currency.toUpperCase(),
    reference: null,
    metadata: normalizeMetadata(paymentIntent.metadata),
    raw: {
      paymentIntentId: paymentIntent.id,
      paymentIntentStatus: paymentIntent.status,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
    },
  };
}

export const stripePaymentProvider: PaymentProvider = {
  name: "stripe",

  async createPaymentSession(input: CreatePaymentSessionInput) {
    const stripe = getStripeClient();
    const metadata = toStripeMetadata(input.metadata);
    const description = input.description.trim() || "OREYA Marketplace Payment";
    const reference = input.reference.trim().slice(0, 200);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: input.customer.email,
        client_reference_id: reference || undefined,
        success_url: input.successUrl,
        cancel_url: input.failureUrl,
        billing_address_collection: "auto",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              product_data: {
                name: description.slice(0, 120),
              },
            },
          },
        ],
        metadata,
        payment_intent_data: {
          description: description.slice(0, 500),
          metadata,
        },
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return {
      id: session.id,
      redirectUrl: session.url,
      raw: {
        id: session.id,
        url: session.url,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        client_reference_id: session.client_reference_id,
        expires_at: session.expires_at,
      },
    };
  },

  async getPaymentDetails(providerReferenceId: string) {
    const value = providerReferenceId.trim();

    if (/^cs_(test|live)_[A-Za-z0-9]+$/.test(value)) {
      return retrieveCheckoutSession(value);
    }

    if (/^pi_[A-Za-z0-9]+$/.test(value)) {
      return retrievePaymentIntent(value);
    }

    throw new Error("Invalid Stripe payment or checkout session identifier.");
  },

  async reversePayment(input: ReversePaymentInput) {
    const stripe = getStripeClient();

    if (!/^pi_[A-Za-z0-9]+$/.test(input.providerPaymentId)) {
      throw new Error(
        "A Stripe PaymentIntent ID is required before requesting a payment reversal.",
      );
    }

    const metadata = input.metadata
      ? toStripeMetadata(input.metadata)
      : undefined;

    const refund = await stripe.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        metadata,
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );

    const status = refund.status ?? "unknown";
    const outcome =
      status === "succeeded"
        ? "SUCCESS"
        : status === "failed" || status === "canceled"
          ? "FAILED"
          : "PENDING";

    return {
      id: refund.id,
      status,
      outcome,
      raw: asRecord({
        id: refund.id,
        status,
        paymentIntentId: input.providerPaymentId,
      }),
    };
  },

  verifyWebhookSignature(rawBody: string, signature: string | null) {
    if (!signature) {
      return false;
    }

    const stripe = getStripeClient();

    try {
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        getStripeWebhookSecret(),
      );
      return true;
    } catch {
      return false;
    }
  },
};