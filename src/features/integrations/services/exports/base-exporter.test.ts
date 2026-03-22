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
    producers: [],
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

  it('includes the mapped Base producer id in full exports when no producer template mapping exists', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      }),
      [],
      null,
      {
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_id']).toBe('base-producer-77');
  });

  it('does not include producer ids by default when no Base producer mapping exists', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      })
    );

    expect(result['producer_id']).toBeUndefined();
    expect(result['producer_ids']).toBeUndefined();
  });

  it('includes the mapped Base producer id when an explicit producer template mapping exists', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      }),
      [
        {
          sourceKey: 'producer_id',
          targetField: 'producerIds',
        },
      ],
      null,
      {
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_id']).toBe('base-producer-77');
  });

  it('falls back to the mapped Base producer id when an explicit producer template mapping resolves empty', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      }),
      [
        {
          sourceKey: 'producer_id',
          targetField: 'missingProducerField',
        },
      ],
      null,
      {
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_id']).toBe('base-producer-77');
  });

  it('supports legacy manufacturer aliases in explicit producer template mappings', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            producerId: 'producer-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      }),
      [
        {
          sourceKey: 'producer_id',
          targetField: 'manufacturerId',
        },
      ],
      null,
      {
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_id']).toBe('base-producer-77');
  });

  it('does not include category_id during images-only exports', async () => {
    const result = await buildBaseProductData(createProduct(), [], null, {
      imagesOnly: true,
    });

    expect(result['category_id']).toBeUndefined();
  });

  it('exports attached empty parameters as empty product attributes', async () => {
    const result = await buildBaseProductData(createProduct({
      parameters: [
        {
          parameterId: 'material',
          value: null,
        },
      ],
    }), [
      {
        sourceKey: 'text_fields.features.Material',
        targetField: 'parameter:material',
      },
    ]);

    expect(result['text_fields']).toEqual({
      name: 'Product 1',
      features: {
        Material: '',
      },
    });
  });

  it('does not export parameter attributes when the parameter is missing on the product', async () => {
    const result = await buildBaseProductData(createProduct(), [
      {
        sourceKey: 'text_fields.features.Material',
        targetField: 'parameter:material',
      },
    ]);

    expect(result['text_fields']).toEqual({
      name: 'Product 1',
    });
  });

  it('exports attached empty localized parameters as empty product attributes', async () => {
    const result = await buildBaseProductData(createProduct({
      parameters: [
        {
          parameterId: 'material',
          value: null,
          valuesByLanguage: {
            pl: '',
          },
        },
      ],
    }), [
      {
        sourceKey: 'text_fields.features.Material',
        targetField: 'parameter:material|pl',
      },
    ]);

    expect(result['text_fields']).toEqual({
      name: 'Product 1',
      features: {
        Material: '',
      },
    });
  });
});
