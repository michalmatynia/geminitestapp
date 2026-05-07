import { describe, expect, it } from 'vitest';

import { parseInputValue } from './database-utils';

describe('parseInputValue', () => {
  it('preserves Mongo ObjectId values as Extended JSON markers for server normalization', () => {
    expect(parseInputValue('0123456789abcdef01234567', 'ObjectId')).toEqual({
      $oid: '0123456789abcdef01234567',
    });
  });

  it('preserves date values as Extended JSON markers for server normalization', () => {
    expect(parseInputValue('2026-05-07T16:00:00.000Z', 'date')).toEqual({
      $date: '2026-05-07T16:00:00.000Z',
    });
  });

  it('parses null and common scalar values without string degradation', () => {
    expect(parseInputValue('null', 'string')).toBeNull();
    expect(parseInputValue('TRUE', 'boolean')).toBe(true);
    expect(parseInputValue('42', 'number')).toBe(42);
  });

  it('parses JSON object and array values for Mongo document fields', () => {
    expect(parseInputValue('{ "enabled": true }', 'object')).toEqual({ enabled: true });
    expect(parseInputValue('[1, 2, 3]', 'array')).toEqual([1, 2, 3]);
  });
});
