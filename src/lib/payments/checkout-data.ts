import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeJsonValue(
          (value as Record<string, unknown>)[key],
        );
        return result;
      }, {});
  }

  return value;
}

/**
 * Produces a stable representation of checkout data so equivalent checkout
 * requests generate the same local duplicate-protection key.
 */
export function stableSerializeCheckoutData(
  value: Prisma.InputJsonValue | Prisma.JsonValue,
) {
  return JSON.stringify(normalizeJsonValue(value));
}

export function createCheckoutKey(
  namespace: string,
  customerId: string,
  checkoutData: Prisma.InputJsonValue,
) {
  const cleanNamespace = namespace.trim().toUpperCase();

  if (!cleanNamespace) {
    throw new Error("A checkout namespace is required.");
  }

  const digest = createHash("sha256")
    .update(customerId)
    .update(":")
    .update(cleanNamespace)
    .update(":")
    .update(stableSerializeCheckoutData(checkoutData))
    .digest("hex");

  return `${cleanNamespace}:${digest}`;
}