import { describe, expect, it } from 'vitest';

import { normalizeFilters } from './filter-normalization';

describe('normalizeFilters', () => {
  it('preserves explicit product id filters for cached product reads', () => {
    expect(
      normalizeFilters({
        ids: [' product-2 ', 'product-1', 'product-2', ''],
        page: '2',
        pageSize: '75',
      })
    ).toEqual({
      ids: ['product-2', 'product-1'],
      page: 2,
      pageSize: 75,
    });
  });

  it('parses comma-separated product id filters from query params', () => {
    expect(normalizeFilters({ ids: 'product-1, product-2,,product-1' })).toEqual({
      ids: ['product-1', 'product-2'],
    });
  });
});
