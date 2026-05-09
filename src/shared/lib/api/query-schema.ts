/**
 * Query Schema Utilities
 * 
 * Query parameter parsing and validation utilities.
 * Provides:
 * - Boolean query parameter normalization
 * - Optional query string handling
 * - Zod schema integration for queries
 * - Type-safe query parameter parsing
 * - Common query value sets (true/false)
 */

import { z } from 'zod';

/**
 * String values that are normalized to boolean `true`.
 */
const TRUE_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * String values that are normalized to boolean `false`.
 */
const FALSE_QUERY_VALUES = new Set(['0', 'false', 'no', 'off']);

/**
 * Normalizes an optional query string value.
 * Trims whitespace and returns undefined for empty strings.
 * 
 * @param value - The raw query parameter value.
 * @returns The normalized string or undefined.
 */
export const normalizeOptionalQueryString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Parses an optional integer query value.
 * Handles both number types and strings that can be parsed as integers.
 * 
 * @param value - The raw query parameter value.
 * @returns The parsed integer or undefined.
 */
export const parseOptionalIntegerQueryValue = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Parses an optional boolean query value.
 * Recognizes common truthy/falsy strings like 'yes', 'no', '1', '0'.
 * 
 * @param value - The raw query parameter value.
 * @returns The parsed boolean or undefined.
 */
export const parseOptionalBooleanQueryValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const lowered = normalized.toLowerCase();
  if (TRUE_QUERY_VALUES.has(lowered)) return true;
  if (FALSE_QUERY_VALUES.has(lowered)) return false;
  return undefined;
};

/**
 * Parses an optional CSV (comma-separated values) query value into a string array.
 * 
 * @param value - The raw query parameter value.
 * @returns An array of trimmed strings or undefined.
 */
export const parseOptionalCsvQueryValue = (value: unknown): string[] | undefined => {
  const normalized = normalizeOptionalQueryString(value);
  if (normalized === undefined) return undefined;
  const items = normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

/**
 * Creates a Zod schema for an optional trimmed query string.
 * 
 * @param schema - Optional base schema to use after normalization.
 * @returns A Zod schema.
 */
export const optionalTrimmedQueryString = <TSchema extends z.ZodTypeAny = z.ZodString>(
  schema?: TSchema
) => z.preprocess(normalizeOptionalQueryString, (schema ?? z.string()).optional());

/**
 * Creates a Zod schema for an optional integer query parameter.
 * 
 * @param schema - Optional base schema to use after parsing.
 * @returns A Zod schema.
 */
export const optionalIntegerQuerySchema = <TSchema extends z.ZodTypeAny = z.ZodNumber>(
  schema?: TSchema
) => z.preprocess(parseOptionalIntegerQueryValue, (schema ?? z.number()).optional());

/**
 * Creates a Zod schema for an optional boolean query parameter.
 * 
 * @param schema - Optional base schema to use after parsing.
 * @returns A Zod schema.
 */
export const optionalBooleanQuerySchema = (schema: z.ZodType<boolean> = z.boolean()) =>
  z.preprocess(parseOptionalBooleanQueryValue, schema.optional());

/**
 * Creates a Zod schema for an optional CSV query parameter parsed into a string array.
 * 
 * @param itemSchema - Optional schema for individual items in the array.
 * @returns A Zod schema.
 */
export const optionalCsvQueryStringArray = (itemSchema: z.ZodType<string> = z.string().min(1)) =>
  z.preprocess(parseOptionalCsvQueryValue, z.array(itemSchema).optional());
