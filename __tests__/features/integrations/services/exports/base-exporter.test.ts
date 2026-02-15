import { describe, expect, it } from 'vitest';

import { buildBaseProductData } from '@/features/integrations/services/exports/base-exporter';
import type { ProductWithImages } from '@/shared/types/domain/products';

const createProduct = (): ProductWithImages =>
  ({
    id: 'product-1',
    name: {},
    description: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name_en: 'Test Product',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 5,
    price: 20,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: 'catalog-1',
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    images: [],
    catalogs: [],
    tags: [],
    producers: [
      {
        productId: 'product-1',
        producerId: 'producer-local-1',
        assignedAt: new Date().toISOString(),
      },
    ],
  }) as ProductWithImages;

describe('buildBaseProductData producer mapping', () => {
  it('exports producer_id for producer alias mappings', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producer', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_id']).toBe('producer-local-1');
  });

  it('falls back to producer id when lookup is unavailable', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producer', targetField: 'producerIds' }]
    );

    expect(payload['producer_id']).toBe('producer-local-1');
  });

  it('normalizes producerids alias and exports producer list', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producerids', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_ids']).toEqual(['producer-local-1']);
  });

  it('normalizes producers alias and exports producer_ids list', async () => {
    const product = createProduct();
    const payload = await buildBaseProductData(
      product,
      [{ sourceKey: 'producers', targetField: 'producerIds' }],
      null,
      {
        producerNameById: { 'producer-local-1': 'Noe' },
      }
    );

    expect(payload['producer_ids']).toEqual(['producer-local-1']);
  });
});
