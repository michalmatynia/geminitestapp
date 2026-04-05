import { describe, expect, it } from 'vitest';

import {
  buildProductCategoryBatchResponse,
  parseProductCategoryBatchCatalogIds,
  shouldFetchFreshProductCategoryBatch,
} from './handler.helpers';

describe('product categories batch handler helpers', () => {
  it('parses trimmed catalog ids and rejects missing input', () => {
    expect(
      parseProductCategoryBatchCatalogIds({
        catalogIds: ' catalog-1 , , catalog-2 ',
        fresh: false,
      })
    ).toEqual(['catalog-1', 'catalog-2']);

    expect(() => parseProductCategoryBatchCatalogIds(undefined)).toThrow(
      'catalogIds query parameter is required'
    );
    expect(() =>
      parseProductCategoryBatchCatalogIds({
        catalogIds: ' , , ',
        fresh: false,
      })
    ).toThrow('catalogIds must contain at least one ID');
  });

  it('rejects too many catalog ids and resolves the fresh flag', () => {
    const catalogIds = Array.from({ length: 26 }, (_, index) => `catalog-${index + 1}`).join(',');

    expect(() =>
      parseProductCategoryBatchCatalogIds({
        catalogIds,
        fresh: true,
      })
    ).toThrow('catalogIds may contain at most 25 IDs');

    expect(shouldFetchFreshProductCategoryBatch({ fresh: true })).toBe(true);
    expect(shouldFetchFreshProductCategoryBatch({ fresh: false })).toBe(false);
    expect(shouldFetchFreshProductCategoryBatch(undefined)).toBe(false);
  });

  it('builds grouped response records', () => {
    expect(
      buildProductCategoryBatchResponse([
        ['catalog-1', [{ id: 'category-1', name: 'Priority', catalogId: 'catalog-1' }]],
        ['catalog-2', []],
      ])
    ).toEqual({
      'catalog-1': [{ id: 'category-1', name: 'Priority', catalogId: 'catalog-1' }],
      'catalog-2': [],
    });
  });
});
