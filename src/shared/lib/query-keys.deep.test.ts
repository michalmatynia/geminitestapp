import { describe, expect, it } from 'vitest';

import { QUERY_KEYS } from './query-keys';

const buildArgs = (path: string[], arity: number): unknown[] => {
  const factoryPath = path.join('.');
  if (factoryPath === 'products.scansLatest' || factoryPath === 'notes.lookup') {
    return [['alpha', 'beta']].slice(0, arity);
  }
  if (factoryPath === 'kangur.socialImageAddons') {
    return [{ limit: 25, ids: ['alpha', 'beta'] }].slice(0, arity);
  }
  const sharedArgs = [
    'alpha',
    'beta',
    { filters: { search: 'needle' }, page: 1, pageSize: 10 },
    true,
    25,
  ];
  return sharedArgs.slice(0, arity);
};

const invokeFactories = (
  value: unknown,
  path: string[] = [],
  results: Array<{ path: string; value: unknown }> = []
): Array<{ path: string; value: unknown }> => {
  if (typeof value === 'function') {
    results.push({
      path: path.join('.'),
      value: value(...buildArgs(path, value.length)),
    });
    return results;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      invokeFactories(nested, [...path, key], results);
    }
  }

  return results;
};

describe('QUERY_KEYS', () => {
  it('builds array query keys for every registered factory', () => {
    const invoked = invokeFactories(QUERY_KEYS);

    expect(invoked.length).toBeGreaterThan(100);
    for (const entry of invoked) {
      expect(Array.isArray(entry.value)).toBe(true);
      expect((entry.value as unknown[]).length).toBeGreaterThan(0);
    }
  });
});
