import { describe, expect, it } from 'vitest';

import { cloneJsonSafe, safeJsonStringify } from '@/shared/lib/ai-paths/core/utils/runtime';

describe('cloneJsonSafe', () => {
  it('preserves repeated references across sibling branches', () => {
    const shared = { value: 42 };
    const payload = {
      left: shared,
      right: shared,
    };

    const cloned = cloneJsonSafe(payload) as Record<string, unknown>;
    expect(cloned).not.toBeNull();
    expect(cloned['left']).toEqual({ value: 42 });
    expect(cloned['right']).toEqual({ value: 42 });
  });

  it('drops only circular references', () => {
    const payload: Record<string, unknown> = { label: 'root' };
    payload['self'] = payload;

    const cloned = cloneJsonSafe(payload) as Record<string, unknown>;
    expect(cloned['label']).toBe('root');
    expect(Object.prototype.hasOwnProperty.call(cloned, 'self')).toBe(false);
  });

  it('normalizes Date/Map/Set/bigint and omits function/symbol values', () => {
    const payload = {
      date: new Date('2026-01-24T00:00:00.000Z'),
      map: new Map<string, unknown>([['a', 1]]),
      set: new Set<unknown>(['x', 2]),
      amount: 15n,
      fn: (): string => 'skip',
      symbol: Symbol('skip'),
    };

    const cloned = cloneJsonSafe(payload) as Record<string, unknown>;
    expect(cloned['date']).toBe('2026-01-24T00:00:00.000Z');
    expect(cloned['map']).toEqual({ a: 1 });
    expect(cloned['set']).toEqual(['x', 2]);
    expect(cloned['amount']).toBe('15');
    expect(Object.prototype.hasOwnProperty.call(cloned, 'fn')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned, 'symbol')).toBe(false);
  });
});

describe('safeJsonStringify', () => {
  it('serializes repeated references without dropping sibling keys', () => {
    const shared = { value: 'kept' };
    const json = safeJsonStringify({
      a: shared,
      b: shared,
    });
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed['a']).toEqual({ value: 'kept' });
    expect(parsed['b']).toEqual({ value: 'kept' });
  });
});
