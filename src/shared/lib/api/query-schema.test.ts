/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  normalizeOptionalQueryString,
  optionalBooleanQuerySchema,
  optionalCsvQueryStringArray,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
  parseOptionalBooleanQueryValue,
  parseOptionalCsvQueryValue,
  parseOptionalIntegerQueryValue,
} from './query-schema';

describe('query-schema helpers', () => {
  it('normalizes raw query strings and integers', () => {
    expect(normalizeOptionalQueryString('  value  ')).toBe('value');
    expect(normalizeOptionalQueryString('   ')).toBeUndefined();
    expect(normalizeOptionalQueryString(10)).toBeUndefined();

    expect(parseOptionalIntegerQueryValue(42)).toBe(42);
    expect(parseOptionalIntegerQueryValue(Number.NaN)).toBeUndefined();
    expect(parseOptionalIntegerQueryValue(' 17 ')).toBe(17);
    expect(parseOptionalIntegerQueryValue('not-a-number')).toBeUndefined();
  });

  it('normalizes booleans and csv values from query strings', () => {
    expect(parseOptionalBooleanQueryValue(true)).toBe(true);
    expect(parseOptionalBooleanQueryValue(' YES ')).toBe(true);
    expect(parseOptionalBooleanQueryValue('off')).toBe(false);
    expect(parseOptionalBooleanQueryValue('maybe')).toBeUndefined();

    expect(parseOptionalCsvQueryValue(' a, b ,, c ')).toEqual(['a', 'b', 'c']);
    expect(parseOptionalCsvQueryValue(' , , ')).toBeUndefined();
    expect(parseOptionalCsvQueryValue(null)).toBeUndefined();
  });

  it('preprocesses zod schemas for optional query values', () => {
    expect(optionalTrimmedQueryString().parse('  ok ')).toBe('ok');
    expect(optionalTrimmedQueryString(z.string().min(2)).safeParse(' a ').success).toBe(false);

    expect(optionalIntegerQuerySchema().parse(' 2 ')).toBe(2);
    expect(optionalIntegerQuerySchema(z.number().min(3)).safeParse('2').success).toBe(false);

    expect(optionalBooleanQuerySchema().parse('true')).toBe(true);
    expect(optionalBooleanQuerySchema(z.literal(false)).parse('off')).toBe(false);

    expect(optionalCsvQueryStringArray().parse('one, two')).toEqual(['one', 'two']);
    expect(optionalCsvQueryStringArray(z.string().regex(/^tag-/)).safeParse('tag-a,bad').success).toBe(
      false
    );
  });
});
