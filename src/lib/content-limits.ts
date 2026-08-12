export type ContentLimits = {
  description: number;
  shortDescription: number;
  exchangePolicy: number;
  refundPolicy: number;
};

export const CONTENT_LIMIT_SETTING_KEYS = {
  description: "maxDescriptionLength",
  shortDescription: "maxShortDescriptionLength",
  exchangePolicy: "maxExchangePolicyLength",
  refundPolicy: "maxRefundPolicyLength",
} as const;

export const CONTENT_LIMIT_SETTING_KEY_LIST = Object.values(
  CONTENT_LIMIT_SETTING_KEYS
);

export const DEFAULT_CONTENT_LIMITS: Readonly<ContentLimits> = {
  description: 1000,
  shortDescription: 100,
  exchangePolicy: 100,
  refundPolicy: 100,
};

export const MIN_CONTENT_CHARACTER_LIMIT = 1;
export const MAX_CONTENT_CHARACTER_LIMIT = 1000;

export function normalizeContentLimit(
  value: unknown,
  fallback: number
) {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (
    !Number.isFinite(parsedValue) ||
    !Number.isInteger(parsedValue) ||
    parsedValue < MIN_CONTENT_CHARACTER_LIMIT ||
    parsedValue > MAX_CONTENT_CHARACTER_LIMIT
  ) {
    return fallback;
  }

  return parsedValue;
}