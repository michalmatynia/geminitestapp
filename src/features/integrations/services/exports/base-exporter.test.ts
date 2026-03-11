import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

import { buildBaseProductData } from './base-exporter';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    categoryId: 'base-cat-77',
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    price: 10,
    stock: 5,
    weight: null,
    ean: null,
    images: [],
    imageLinks: [],
    imageBase64s: [],
    parameters: [],
    tags: [],
    catalogs: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('buildBaseProductData', () => {
  it('includes the prepared Base category id in full exports', async () => {
    const result = await buildBaseProductData(createProduct());

    expect(result['category_id']).toBe('base-cat-77');
  });

  it('does not include category_id during images-only exports', async () => {
    const result = await buildBaseProductData(createProduct(), [], null, {
      imagesOnly: true,
    });

    expect(result['category_id']).toBeUndefined();
  });
});
