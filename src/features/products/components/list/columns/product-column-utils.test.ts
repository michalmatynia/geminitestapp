import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import { resolveEffectiveDefaultPriceGroupId } from './product-column-utils';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Keychain', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Keychain',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 3,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: 'category-1',
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('resolveEffectiveDefaultPriceGroupId', () => {
  it('prefers the product default price group when it is present', () => {
    const product = createProduct({
      defaultPriceGroupId: ' product-group ',
      catalogId: 'catalog-1',
    });

    expect(
      resolveEffectiveDefaultPriceGroupId(
        product,
        new Map([['catalog-1', 'catalog-group']])
      )
    ).toBe('product-group');
  });

  it('falls back to the catalog default price group when the product default is missing', () => {
    const product = createProduct({
      defaultPriceGroupId: null,
      catalogId: ' catalog-1 ',
    });

    expect(
      resolveEffectiveDefaultPriceGroupId(
        product,
        new Map([['catalog-1', 'catalog-group']])
      )
    ).toBe('catalog-group');
  });

  it('returns null when neither product nor catalog provide a default price group', () => {
    const product = createProduct({
      defaultPriceGroupId: '',
      catalogId: 'catalog-1',
    });

    expect(resolveEffectiveDefaultPriceGroupId(product, new Map())).toBeNull();
  });
});
