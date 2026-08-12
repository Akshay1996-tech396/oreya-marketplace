import {
  CONTENT_LIMIT_SETTING_KEYS,
  CONTENT_LIMIT_SETTING_KEY_LIST,
  DEFAULT_CONTENT_LIMITS,
  normalizeContentLimit,
  type ContentLimits,
} from "@/lib/content-limits";
import { prisma } from "@/lib/prisma";

export async function getContentLimits(): Promise<ContentLimits> {
  const savedSettings = await prisma.setting.findMany({
    where: {
      key: {
        in: [...CONTENT_LIMIT_SETTING_KEY_LIST],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const settings = new Map(
    savedSettings.map((setting) => [setting.key, setting.value])
  );

  return {
    description: normalizeContentLimit(
      settings.get(CONTENT_LIMIT_SETTING_KEYS.description),
      DEFAULT_CONTENT_LIMITS.description
    ),
    shortDescription: normalizeContentLimit(
      settings.get(CONTENT_LIMIT_SETTING_KEYS.shortDescription),
      DEFAULT_CONTENT_LIMITS.shortDescription
    ),
    exchangePolicy: normalizeContentLimit(
      settings.get(CONTENT_LIMIT_SETTING_KEYS.exchangePolicy),
      DEFAULT_CONTENT_LIMITS.exchangePolicy
    ),
    refundPolicy: normalizeContentLimit(
      settings.get(CONTENT_LIMIT_SETTING_KEYS.refundPolicy),
      DEFAULT_CONTENT_LIMITS.refundPolicy
    ),
  };
}