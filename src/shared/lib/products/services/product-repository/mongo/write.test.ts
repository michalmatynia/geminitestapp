import { describe, expect, it, vi } from 'vitest';

import { mongoProductWriteImpl } from './write';
import type { ProductWithImages } from '@/shared/contracts/products';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: 'base-123',
    importSource: 'base',
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

describe('mongoProductWriteImpl.duplicateProduct', () => {
  it('clears external linkage and import provenance on duplicates', async () => {
    const getProductById = vi.fn().mockResolvedValue(createProduct());
    const createProductMock = vi.fn().mockResolvedValue({ id: 'product-2' });

    await mongoProductWriteImpl.duplicateProduct(
      'product-1',
      'SKU-2',
      getProductById,
      createProductMock
    );

    expect(createProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-2',
        baseProductId: null,
        importSource: null,
      })
    );
  });
});
