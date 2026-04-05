import { describe, expect, it } from 'vitest';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  findCachedProductSnapshotById,
  resolveExactProductIdBySku,
  shouldEnableLiveEditProductDetailQuery,
} from './useProductEditHydration';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: '',
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

describe('resolveExactProductIdBySku', () => {
  it('returns the unique exact SKU match using trimmed case-insensitive comparison', () => {
    const result = resolveExactProductIdBySku(
      [
        createProduct({ id: 'product-1', sku: 'sku-1' }),
        createProduct({ id: 'product-2', sku: 'sku-2' }),
      ],
      '  SKU-2  '
    );

    expect(result).toBe('product-2');
  });

  it('returns null when the SKU matches more than one product', () => {
    const result = resolveExactProductIdBySku(
      [
        createProduct({ id: 'product-1', sku: 'sku-1' }),
        createProduct({ id: 'product-2', sku: 'SKU-1' }),
      ],
      'sku-1'
    );

    expect(result).toBeNull();
  });
});

describe('findCachedProductSnapshotById', () => {
  it('returns a matching product from paged list cache entries', () => {
    const cachedProduct = createProduct({ id: 'product-2', sku: 'SKU-2' });

    const result = findCachedProductSnapshotById(
      [
        { items: [createProduct(), cachedProduct] },
        [createProduct({ id: 'product-3', sku: 'SKU-3' })],
      ],
      'product-2'
    );

    expect(result).toBe(cachedProduct);
  });

  it('returns null when no cache entry contains the requested product', () => {
    const result = findCachedProductSnapshotById(
      [
        { items: [createProduct()] },
        [createProduct({ id: 'product-3', sku: 'SKU-3' })],
      ],
      'missing-product'
    );

    expect(result).toBeNull();
  });
});

describe('shouldEnableLiveEditProductDetailQuery', () => {
  it('disables the live detail query while the modal is still hydrating', () => {
    expect(
      shouldEnableLiveEditProductDetailQuery({
        editingProduct: createProduct(),
        isEditHydrating: true,
      })
    ).toBe(false);
  });

  it('disables the live detail query for non-hydrated edit snapshots', () => {
    expect(
      shouldEnableLiveEditProductDetailQuery({
        editingProduct: createProduct(),
        isEditHydrating: false,
      })
    ).toBe(false);
  });

  it('enables the live detail query once a hydrated product is open', () => {
    expect(
      shouldEnableLiveEditProductDetailQuery({
        editingProduct: markEditingProductHydrated(createProduct()),
        isEditHydrating: false,
      })
    ).toBe(true);
  });
});
