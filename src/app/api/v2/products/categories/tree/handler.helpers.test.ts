import { describe, expect, it } from 'vitest';

import {
  requireProductCategoryTreeCatalogId,
  shouldFetchFreshProductCategoryTree,
} from './handler.helpers';

describe('product categories tree handler helpers', () => {
  it('requires catalog ids from the parsed query', () => {
    expect(
      requireProductCategoryTreeCatalogId({
        catalogId: 'catalog-1',
        fresh: false,
      })
    ).toBe('catalog-1');

    expect(() => requireProductCategoryTreeCatalogId(undefined)).toThrow(
      'catalogId query parameter is required'
    );
  });

  it('resolves the fresh flag with a safe default', () => {
    expect(shouldFetchFreshProductCategoryTree({ fresh: true })).toBe(true);
    expect(shouldFetchFreshProductCategoryTree({ fresh: false })).toBe(false);
    expect(shouldFetchFreshProductCategoryTree(undefined)).toBe(false);
  });
});
