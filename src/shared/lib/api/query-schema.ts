import { z } from 'zod';

const TRUE_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_QUERY_VALUES = new Set(['0', 'false', 'no', 'off']);

export const normalizeOptionalQueryString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseOptionalIntegerQueryValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseOptionalBooleanQueryValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const lowered = normalized.toLowerCase();
  if (TRUE_QUERY_VALUES.has(lowered)) return true;
  if (FALSE_QUERY_VALUES.has(lowered)) return false;
  return undefined;
};

export const parseOptionalCsvQueryValue = (value: unknown): string[] | undefined => {
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const items = normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

export const optionalTrimmedQueryString = (schema: z.ZodString = z.string()) =>
  z.preprocess(normalizeOptionalQueryString, schema.optional());

export const optionalIntegerQuerySchema = (schema: z.ZodNumber) =>
  z.preprocess(parseOptionalIntegerQueryValue, schema.optional());

export const optionalBooleanQuerySchema = (schema: z.ZodBoolean = z.boolean()) =>
  z.preprocess(parseOptionalBooleanQueryValue, schema.optional());

export const optionalCsvQueryStringArray = (itemSchema: z.ZodString = z.string().min(1)) =>
  z.preprocess(parseOptionalCsvQueryValue, z.array(itemSchema).optional());
