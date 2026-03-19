import { describe, expect, it } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products';

import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS,
  PRODUCT_VALIDATION_SOURCE_FIELD_IDS,
  PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS,
  buildProductValidationSourceValues,
} from './validatorSourceFields';

const categories: ProductCategory[] = [
  {
    id: 'category-1',
    name: 'Keychains',
    name_en: 'Keychains',
    name_pl: 'Breloki',
    name_de: 'Schlusselanhanger',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('validatorSourceFields', () => {
  it('exposes replacement fields as source options before derived fields', () => {
    expect(PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS[0]).toEqual({
      value: 'sku',
      label: 'SKU',
    });

    expect(PRODUCT_VALIDATION_SOURCE_FIELD_OPTIONS).toEqual(
      expect.arrayContaining([
        { value: 'price', label: 'Price' },
        { value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.primaryCatalogId, label: 'Primary Catalog ID' },
        { value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.categoryName, label: 'Category Name' },
        { value: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment4, label: 'Name EN Segment #4' },
      ])
    );
  });

  it('builds derived validator source values from form values and metadata', () => {
    expect(
      buildProductValidationSourceValues({
        baseValues: {
          name_en: 'Wallet | Leather | Premium | Keychains',
          categoryId: '',
          price: 12,
        },
        categories,
        selectedCategoryId: 'category-1',
        selectedCatalogIds: ['catalog-selected'],
        fallbackCatalogId: 'catalog-fallback',
      })
    ).toMatchObject({
      name_en: 'Wallet | Leather | Premium | Keychains',
      categoryId: 'category-1',
      categoryName: 'Keychains',
      primaryCatalogId: 'catalog-selected',
      nameEnSegment4: 'Keychains',
      nameEnSegment4RegexEscaped: 'Keychains',
    });
  });

  it('falls back to the persisted catalog id and escapes regex characters in derived segments', () => {
    expect(
      buildProductValidationSourceValues({
        baseValues: {
          name_en: 'Wallet | Leather | Premium | Keychains (XL)+',
          categoryId: 'category-1',
        },
        categories,
        selectedCatalogIds: [],
        fallbackCatalogId: 'catalog-fallback',
      })
    ).toMatchObject({
      categoryId: 'category-1',
      categoryName: 'Keychains',
      primaryCatalogId: 'catalog-fallback',
      nameEnSegment4: 'Keychains (XL)+',
      nameEnSegment4RegexEscaped: 'Keychains \\(XL\\)\\+',
    });
  });

  it('extracts the fourth name segment from the product title example used for category inference', () => {
    expect(
      buildProductValidationSourceValues({
        baseValues: {
          name_en: 'Awa Awa no Mi | 4 cm | Metal | Anime Pin | One Piece',
          categoryId: '',
        },
        categories,
        selectedCatalogIds: ['catalog-fallback'],
      })
    ).toMatchObject({
      nameEnSegment4: 'Anime Pin',
      nameEnSegment4RegexEscaped: 'Anime Pin',
    });
  });
});
