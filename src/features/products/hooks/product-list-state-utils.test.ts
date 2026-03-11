import { describe, expect, it } from 'vitest';

import {
  buildCategoryNameById,
  resolveProductCatalogId,
  resolveProductCategoryId,
  resolveProductCategoryDisplayLabel,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductWithImages } from '@/shared/contracts/products';

describe('product-list-state-utils category guards', () => {
  it('builds category labels from runtime category payloads that expose _id instead of id', () => {
    const map = buildCategoryNameById(
      {
        'catalog-1': [
          {
            _id: '507f1f77bcf86cd799439011',
            name_en: 'Keychains',
            name_pl: 'Breloki',
            catalogId: 'catalog-1',
          },
        ],
      },
      'name_en'
    );

    expect(map.get('507f1f77bcf86cd799439011')).toBe('Keychains');
  });

  it('does not expose opaque category ids when the label lookup is missing', () => {
    const label = resolveProductCategoryDisplayLabel(
      '507f1f77bcf86cd799439011',
      new Map<string, string>()
    );

    expect(label).toBe('—');
  });

  it('keeps human-readable category fallbacks when the id is not opaque', () => {
    const label = resolveProductCategoryDisplayLabel(
      'Accessories',
      new Map<string, string>()
    );

    expect(label).toBe('Accessories');
  });

  it('resolves the category id from an embedded category record when the top-level id is missing', () => {
    const product = {
      categoryId: null,
      catalogId: 'catalog-1',
      category: {
        id: 'category-1',
        catalogId: 'catalog-1',
        name_en: 'Keychains',
      },
    } as ProductWithImages;

    expect(resolveProductCategoryId(product)).toBe('category-1');
  });

  it('resolves the catalog id from an embedded category record when the top-level catalog id is missing', () => {
    const product = {
      categoryId: null,
      catalogId: '',
      category: {
        id: 'category-1',
        catalogId: 'catalog-1',
        name_en: 'Keychains',
      },
      catalogs: [],
    } as ProductWithImages;

    expect(resolveProductCatalogId(product)).toBe('catalog-1');
  });

  it('prefers canonical product catalogs over a stale top-level catalog id', () => {
    const product = {
      categoryId: null,
      catalogId: 'default',
      catalogs: [
        {
          catalogId: 'catalog-mentios',
          catalog: {
            id: 'catalog-mentios',
            name: 'Mentios',
          },
        },
      ],
    } as ProductWithImages;

    expect(resolveProductCatalogId(product)).toBe('catalog-mentios');
  });
});
