/**
 * AI Paths Run Sources
 * 
 * This module defines the valid sources from which an AI Path run can be initiated.
 * It provides constants for canonical source values and filtering, along with
 * validation utilities to ensure runtime integrity.
 */

/**
 * Valid sources that can trigger an AI Path run.
 */
export const AI_PATHS_RUN_SOURCE_VALUES = [
  'ai_paths_ui',
  'ai_paths_direct',
  'trigger_button',
  'product_panel',
] as const;

/**
 * Canonical filter used to include only runs initiated from the primary AI Paths UI.
 */
export const AI_PATHS_CANONICAL_RUN_SOURCE_FILTER = {
  source: 'ai_paths_ui',
  sourceMode: 'include',
} as const;

/**
 * Normalizes a tag string by trimming and converting to lowercase.
 * 
 * @param {unknown} value - The raw tag input.
 * @returns {string | null} The normalized tag or null.
 */
const normalizeTag = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Validates whether a value is a recognized AI Path run source.
 * 
 * @param {unknown} value - The value to check.
 * @returns {boolean} True if the value is a valid run source.
 */
export const isAiPathsRunSourceValue = (value: unknown): boolean => {
  const normalized = normalizeTag(value);
  return normalized
    ? AI_PATHS_RUN_SOURCE_VALUES.includes(normalized as (typeof AI_PATHS_RUN_SOURCE_VALUES)[number])
    : false;
};
