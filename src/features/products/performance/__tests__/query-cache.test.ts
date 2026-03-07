import { describe, expect, it, vi } from 'vitest';

import {
  QueryCache,
  stableStringify,
  withQueryCache,
} from '@/features/products/performance/query-cache';

// -----------------------------------------------------------------------
// stableStringify
// -----------------------------------------------------------------------

describe('stableStringify', () => {
  it('serializes null', () => {
    expect(stableStringify(null)).toBe('null');
  });

  it('serializes a string', () => {
    expect(stableStringify('hello')).toBe('"hello"');
  });

  it('serializes a number', () => {
    expect(stableStringify(42)).toBe('42');
  });

  it('serializes an array as-is (no key sorting)', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
  });

  it('serializes an empty object', () => {
    expect(stableStringify({})).toBe('{}');
  });

  it('produces the same output regardless of key insertion order', () => {
    const a = stableStringify({ search: 'foo', page: 1 });
    const b = stableStringify({ page: 1, search: 'foo' });
    expect(a).toBe(b);
  });

  it('sorts nested object keys', () => {
    const a = stableStringify({ z: { b: 1, a: 2 }, a: 0 });
    const b = stableStringify({ a: 0, z: { a: 2, b: 1 } });
    expect(a).toBe(b);
  });

  it('differs when values differ', () => {
    expect(stableStringify({ page: 1 })).not.toBe(stableStringify({ page: 2 }));
  });

  it('differs when a key is absent vs present', () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 1, b: 2 }));
  });
});

// -----------------------------------------------------------------------
// QueryCache
// -----------------------------------------------------------------------

describe('QueryCache', () => {
  it('returns null on cache miss', () => {
    const cache = new QueryCache();
    expect(cache.get('q', [])).toBeNull();
  });

  it('returns cached value on hit', () => {
    const cache = new QueryCache();
    cache.set('q', ['p1'], { result: 42 });
    expect(cache.get('q', ['p1'])).toEqual({ result: 42 });
  });

  it('returns null after TTL expires', async () => {
    const cache = new QueryCache();
    cache.set('q', [], 'data', { ttl: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(cache.get('q', [])).toBeNull();
  });

  it('invalidateByTag removes matching entries', () => {
    const cache = new QueryCache();
    cache.set('q', [], 'value', { tags: ['products:list'] });
    const count = cache.invalidateByTag('products:list');
    expect(count).toBe(1);
    expect(cache.get('q', [])).toBeNull();
  });

  it('invalidateByTag returns 0 for unknown tag', () => {
    const cache = new QueryCache();
    expect(cache.invalidateByTag('unknown')).toBe(0);
  });

  it('invalidateByPattern removes keys matching regex', () => {
    const cache = new QueryCache();
    cache.set('products:list:abc', [], 'data1');
    cache.set('products:count:abc', [], 'data2');
    cache.set('categories:list', [], 'data3');
    const count = cache.invalidateByPattern(/^query:products:/);
    expect(count).toBe(2);
    expect(cache.get('categories:list', [])).toBe('data3');
  });

  it('clear removes all entries', () => {
    const cache = new QueryCache();
    cache.set('q1', [], 'a');
    cache.set('q2', [], 'b');
    cache.clear();
    expect(cache.get('q1', [])).toBeNull();
    expect(cache.get('q2', [])).toBeNull();
  });

  it('getStats reflects current size', () => {
    const cache = new QueryCache();
    cache.set('q', [], 'val');
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
  });
});

// -----------------------------------------------------------------------
// withQueryCache — cache hit / miss
// -----------------------------------------------------------------------

describe('withQueryCache — basic caching', () => {
  it('calls queryFn on first invocation (cache miss)', async () => {
    const queryFn = vi.fn().mockResolvedValue('result');
    const cached = withQueryCache(queryFn, {
      keyGenerator: () => `test-key-${Math.random()}`,
    });
    const result = await cached();
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('does not call queryFn on second invocation with same key (cache hit)', async () => {
    const queryFn = vi.fn().mockResolvedValue('result');
    const key = `hit-key-${Math.random()}`;
    const cached = withQueryCache(queryFn, {
      keyGenerator: () => key,
      ttl: 60_000,
    });
    await cached();
    await cached();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

// -----------------------------------------------------------------------
// withQueryCache — request deduplication
// -----------------------------------------------------------------------

describe('withQueryCache — request deduplication', () => {
  it('deduplicates concurrent identical requests — queryFn called exactly once', async () => {
    let resolvePromise!: (value: string) => void;
    const controlledPromise = new Promise<string>((res) => {
      resolvePromise = res;
    });
    const queryFn = vi.fn().mockReturnValue(controlledPromise);
    const key = `dedup-key-${Math.random()}`;
    const cached = withQueryCache(queryFn, {
      keyGenerator: () => key,
      ttl: 60_000,
    });

    // Fire three concurrent calls before the first one resolves
    const p1 = cached();
    const p2 = cached();
    const p3 = cached();

    resolvePromise('shared-result');
    const results = await Promise.all([p1, p2, p3]);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['shared-result', 'shared-result', 'shared-result']);
  });

  it('calls queryFn once per distinct key even when concurrent', async () => {
    const queryFn = vi.fn().mockImplementation((id: string) => Promise.resolve(`result-${id}`));
    const cached = withQueryCache(queryFn, {
      keyGenerator: (id: string) => `key-${id}-${Math.random()}`,
      ttl: 60_000,
    });

    const results = await Promise.all([cached('a'), cached('b')]);
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(results[0]).toMatch(/^result-a/);
    expect(results[1]).toMatch(/^result-b/);
  });

  it('allows new call after first completes (no stale pending)', async () => {
    const queryFn = vi.fn().mockResolvedValue('fresh');
    const key = `sequential-key-${Math.random()}`;
    const cached = withQueryCache(queryFn, {
      keyGenerator: () => key,
      ttl: 1, // very short TTL so second call is a miss
    });

    await cached();
    await new Promise((res) => setTimeout(res, 5)); // wait for TTL
    await cached();
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
