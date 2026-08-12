export const RESTAURANT_MENU_DESCRIPTION_MAX_WORDS = 100;

/**
 * Converts multiline or irregularly spaced text into one clean line.
 */
export function normalizeSingleLineText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns the number of words in the provided value.
 */
export function countWords(value: unknown): number {
  const normalizedValue = normalizeSingleLineText(value);

  if (!normalizedValue) {
    return 0;
  }

  return normalizedValue.split(" ").length;
}

/**
 * Limits the provided text to the specified number of words.
 */
export function limitWords(
  value: string,
  maximumWords: number
): string {
  if (maximumWords <= 0) {
    return "";
  }

  const normalizedValue = normalizeSingleLineText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .split(" ")
    .slice(0, maximumWords)
    .join(" ");
}