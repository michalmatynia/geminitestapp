import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID,
  resolveDefaultProductCategoryTreeCatalogId,
} from './default-category-tree';

describe('default product category tree catalog', () => {
  it('prefers the Mentios catalog name over the fallback id', () => {
    expect(
      resolveDefaultProductCategoryTreeCatalogId([
        { id: 'catalog-legacy-mentios', name: ' Mentios ' },
        { id: DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID, name: 'Imported default' },
      ])
    ).toBe('catalog-legacy-mentios');
  });

  it('falls back to the canonical Mentios catalog id', () => {
    expect(
      resolveDefaultProductCategoryTreeCatalogId([
        { id: 'catalog-1', name: 'Catalog One' },
        { id: DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID, name: 'Shared tree' },
      ])
    ).toBe(DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID);
  });

  it('returns null when no Mentios catalog candidate exists', () => {
    expect(resolveDefaultProductCategoryTreeCatalogId([{ id: 'catalog-1', name: 'Catalog One' }]))
      .toBeNull();
  });

  it('ignores malformed catalog responses', () => {
    expect(resolveDefaultProductCategoryTreeCatalogId({ catalogs: [] })).toBeNull();
    expect(
      resolveDefaultProductCategoryTreeCatalogId([
        { id: 'catalog-1' },
        { name: 'Mentios' },
        null,
      ])
    ).toBeNull();
  });
});
