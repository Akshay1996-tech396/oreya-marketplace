export type PaymentProviderMetadataValue = string | number | boolean;

export type PaymentProviderMetadata = Record<
  string,
  PaymentProviderMetadataValue
>;

export type PaymentCustomer = {
  id: string;
  name: string;
  email: string;
  billingCountry?: string | null;
};

export type CreatePaymentSessionInput = {
  amountMinor: number;
  currency: string;
  reference: string;
  description: string;
  customer: PaymentCustomer;
  successUrl: string;
  failureUrl: string;
  idempotencyKey: string;
  metadata: PaymentProviderMetadata;
};

export type ProviderPaymentSession = {
  id: string;
  redirectUrl: string | null;
  raw: Record<string, unknown>;
};

export type ProviderPaymentOutcome =
  | "SUCCESS"
  | "FAILED"
  | "PENDING"
  | "CANCELLED"
  | "UNKNOWN";

export type ProviderPaymentDetails = {
  id: string;
  paymentId: string | null;
  sessionId: string | null;
  status: string;
  outcome: ProviderPaymentOutcome;
  approved: boolean | null;
  amountMinor: number | null;
  currency: string | null;
  reference: string | null;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type ProviderPaymentReversalOutcome =
  | "SUCCESS"
  | "PENDING"
  | "FAILED";

export type ProviderPaymentReversal = {
  id: string;
  status: string;
  outcome: ProviderPaymentReversalOutcome;
  raw: Record<string, unknown>;
};

export type ReversePaymentInput = {
  providerPaymentId: string;
  idempotencyKey: string;
  reference: string;
  metadata?: PaymentProviderMetadata;
};

/**
 * Provider-independent contract used by OREYA payment business logic.
 * Provider adapters must translate their own API payloads into these shapes.
 */
export interface PaymentProvider {
  readonly name: string;

  createPaymentSession(
    input: CreatePaymentSessionInput,
  ): Promise<ProviderPaymentSession>;

  getPaymentDetails(
    providerReferenceId: string,
  ): Promise<ProviderPaymentDetails>;

  reversePayment(
    input: ReversePaymentInput,
  ): Promise<ProviderPaymentReversal>;

  verifyWebhookSignature(
    rawBody: string,
    signature: string | null,
  ): boolean;
}