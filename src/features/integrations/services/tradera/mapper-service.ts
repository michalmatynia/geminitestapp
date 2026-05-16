/**
 * Tradera Parameter Mapper Service
 * 
 * Provides transformation, normalization, and validation logic for mapping 
 * internal product parameters to Tradera integration fields.
 */

import {
  type TraderaParameterMapperCategoryFetch,
  type TraderaParameterMapperCatalogEntry,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * Normalizes a lookup key to a clean, comparable string.
 */
export const normalizeLookupKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/**
 * Parses JSON payload using a Zod schema.
 */
export const parseJsonPayload = <T>(
  rawValue: string | null | undefined,
  parser: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  fallback: T
): T => {
  if (!rawValue?.trim()) return fallback;

  try {
    const parsed = parser.safeParse(JSON.parse(rawValue));
    return parsed.success ? parsed.data : fallback;
  } catch (error) {
    logClientCatch(error, {
      source: 'tradera-parameter-mapper',
      action: 'parseJsonPayload',
      level: 'warn',
    });
    return fallback;
  }
};

/**
 * Builds a field key from a field label.
 */
export const buildTraderaParameterMapperFieldKey = (fieldLabel: string): string => {
  const normalized = normalizeLookupKey(fieldLabel);
  return normalized || normalizeLookupKey(fieldLabel.trim());
};

/**
 * Builds a unique catalog entry ID.
 */
export const buildTraderaParameterMapperCatalogEntryId = (input: {
  externalCategoryId: string;
  fieldKey: string;
}): string => `${input.externalCategoryId.trim()}:${input.fieldKey.trim()}`;

/**
 * Compares two catalog entries for sorting.
 */
export const compareCatalogEntries = (
  left: TraderaParameterMapperCatalogEntry,
  right: TraderaParameterMapperCatalogEntry
): number => {
  const byPath = (left.externalCategoryPath ?? left.externalCategoryName).localeCompare(
    right.externalCategoryPath ?? right.externalCategoryName
  );
  if (byPath !== 0) return byPath;
  return left.fieldLabel.localeCompare(right.fieldLabel);
};

/**
 * Compares two category fetches for sorting.
 */
export const compareCategoryFetches = (
  left: TraderaParameterMapperCategoryFetch,
  right: TraderaParameterMapperCategoryFetch
): number => {
  const byPath = (left.externalCategoryPath ?? left.externalCategoryName).localeCompare(
    right.externalCategoryPath ?? right.externalCategoryName
  );
  if (byPath !== 0) return byPath;
  return left.externalCategoryId.localeCompare(right.externalCategoryId);
};
