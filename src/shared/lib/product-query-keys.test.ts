import { describe, expect, it } from 'vitest';

import { QUERY_KEYS } from './query-keys';
import {
  getProductCountQueryKey,
  getProductDetailEditQueryKey,
  getProductDetailQueryKey,
  getProductListQueryKey,
  inactiveProductDetailQueryKey,
  productsAllQueryKey,
  productsCategoriesAllQueryKey,
  productsCountsQueryKey,
  productsDetailsQueryKey,
  productsListsQueryKey,
} from './product-query-keys';

describe('product-query-keys', () => {
  it('re-exports the canonical products query key groups', () => {
    expect(productsAllQueryKey).toBe(QUERY_KEYS.products.all);
    expect(productsListsQueryKey).toEqual(QUERY_KEYS.products.lists());
    expect(productsCountsQueryKey).toEqual(QUERY_KEYS.products.counts());
    expect(productsDetailsQueryKey).toEqual(QUERY_KEYS.products.details());
    expect(productsCategoriesAllQueryKey).toEqual(
      QUERY_KEYS.products.categoriesAll(),
    );
    expect(inactiveProductDetailQueryKey).toEqual([
      ...productsDetailsQueryKey,
      'inactive',
    ]);
  });

  it('derives product list, count, and detail query keys from the shared factory', () => {
    const filters = { category: 'books', active: true };

    expect(getProductListQueryKey(filters)).toEqual(QUERY_KEYS.products.list(filters));
    expect(getProductCountQueryKey(filters)).toEqual(
      QUERY_KEYS.products.count(filters),
    );
    expect(getProductDetailQueryKey('product-42')).toEqual(
      QUERY_KEYS.products.detail('product-42'),
    );
    expect(getProductDetailEditQueryKey('product-42')).toEqual(
      QUERY_KEYS.products.detailEdit('product-42'),
    );
  });
});
