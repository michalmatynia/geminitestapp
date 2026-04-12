import { z } from 'zod';

const TRUE_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_QUERY_VALUES = new Set(['0', 'false', 'no', 'off']);

const normalizeQueryString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeOptionalEntityId = (value: unknown): string | undefined => {
  const normalized = normalizeQueryString(value);
  if (!normalized) return undefined;
  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return undefined;
  return normalized;
};

const parseBooleanQueryValue = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (TRUE_QUERY_VALUES.has(normalized)) return true;
  if (FALSE_QUERY_VALUES.has(normalized)) return false;
  return value;
};

export const catalogIdQuerySchema = z.object({
  catalogId: z.preprocess(
    normalizeOptionalEntityId,
    z
      .string()
      .min(1, 'catalogId query parameter is required')
      .max(128, 'catalogId query parameter is too long')
  ),
});

export type CatalogIdQuery = z.infer<typeof catalogIdQuerySchema>;

export const catalogIdsQuerySchema = z.object({
  catalogIds: z.preprocess(
    normalizeOptionalEntityId,
    z
      .string()
      .min(1, 'catalogIds query parameter is required')
      .max(1024, 'catalogIds query parameter is too long')
  ),
});

export type CatalogIdsQuery = z.infer<typeof catalogIdsQuerySchema>;

export const freshQuerySchema = z.preprocess(parseBooleanQueryValue, z.boolean().optional());

/**
 * Standard product catalog query with fresh data flag.
 */
export const catalogIdWithFreshQuerySchema = catalogIdQuerySchema.extend({
  fresh: freshQuerySchema.default(false),
});

export type CatalogIdWithFreshQuery = z.infer<typeof catalogIdWithFreshQuerySchema>;

/**
 * Standard product catalog IDs query with fresh data flag.
 */
export const catalogIdsWithFreshQuerySchema = catalogIdsQuerySchema.extend({
  fresh: freshQuerySchema.default(false),
});

export type CatalogIdsWithFreshQuery = z.infer<typeof catalogIdsWithFreshQuerySchema>;

export const connectionIdQuerySchema = z.object({
  connectionId: z.preprocess(
    normalizeOptionalEntityId,
    z
      .string()
      .min(1, 'connectionId query parameter is required')
      .max(128, 'connectionId query parameter is too long')
  ),
});

export type ConnectionIdQuery = z.infer<typeof connectionIdQuerySchema>;

export const descriptionContextQuerySchema = z.object({
  catalogId: z.preprocess(normalizeOptionalEntityId, z.string().min(1).max(128).optional()),
  categoryId: z.preprocess(normalizeOptionalEntityId, z.string().min(1).max(128).optional()),
  includeCategories: z.preprocess(parseBooleanQueryValue, z.boolean().optional()).default(true),
});

export type DescriptionContextQuery = z.infer<typeof descriptionContextQuerySchema>;
