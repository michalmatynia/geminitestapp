import { z } from 'zod';

const TRUE_FRESH_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_FRESH_QUERY_VALUES = new Set(['0', 'false', 'no', 'off']);

const parseFreshQueryValue = (value: unknown): unknown => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return undefined;
  if (TRUE_FRESH_QUERY_VALUES.has(normalized)) return true;
  if (FALSE_FRESH_QUERY_VALUES.has(normalized)) return false;
  return value;
};

export const freshQuerySchema = z.preprocess(parseFreshQueryValue, z.boolean().optional());
