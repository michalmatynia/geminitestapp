import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const mocks = vi.hoisted(() => ({
  callBaseApiMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/imports/base-client', () => ({
  callBaseApi: (...args: unknown[]) => mocks.callBaseApiMock(...args),
}));

import { buildBaseProductData, exportProductToBase } from './base-exporter';

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callBaseApiMock.mockResolvedValue({ status: 'SUCCESS', product_id: 'base-product-1' });
  });

  it('includes the prepared Base category id in full exports', async () => {
    const result = await buildBaseProductData(createProduct());

    expect(result['category_id']).toBe('base-cat-77');
  });

  it('includes the mapped Base manufacturer id in full exports when no producer template mapping exists', async () => {
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

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
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

    expect(result['manufacturer_id']).toBeUndefined();
    expect(result['producer_id']).toBeUndefined();
    expect(result['producer_ids']).toBeUndefined();
  });

  it('includes the mapped Base manufacturer id for legacy product producerIds arrays', async () => {
    const legacyProduct = {
      ...createProduct({
        producers: [],
      }),
      producerIds: ['producer-1'],
    } as ProductWithImages & { producerIds: string[] };

    const result = await buildBaseProductData(legacyProduct, [], null, {
      producerNameById: {
        'producer-1': 'Acme',
      },
      producerExternalIdByInternalId: {
        'producer-1': 'base-producer-77',
      },
    });

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
  });

  it('includes the mapped Base manufacturer id for legacy top-level producer objects', async () => {
    const legacyProduct = {
      ...createProduct({
        producers: [],
      }),
      producer: {
        id: 'producer-1',
      },
    } as ProductWithImages & { producer: { id: string } };

    const result = await buildBaseProductData(legacyProduct, [], null, {
      producerNameById: {
        'producer-1': 'Acme',
      },
      producerExternalIdByInternalId: {
        'producer-1': 'base-producer-77',
      },
    });

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
  });

  it('includes the mapped Base manufacturer id for name-only producer payloads when lookups are available', async () => {
    const result = await buildBaseProductData(
      createProduct({
        producers: [
          {
            productId: 'product-1',
            assignedAt: '2026-03-01T00:00:00.000Z',
            producer: {
              id: '',
              name: 'Acme',
            },
          } as unknown as NonNullable<ProductWithImages['producers']>[number],
        ],
      }),
      [],
      null,
      {
        producerNameById: {
          'producer-1': 'Acme',
        },
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
  });

  it('includes the mapped Base manufacturer id when an explicit producer template mapping exists', async () => {
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

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
  });

  it('normalizes explicit producer_ids template mappings to manufacturer_id for single-producer exports', async () => {
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
          sourceKey: 'producer_ids',
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

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
    expect(result['producer_ids']).toBeUndefined();
  });

  it('falls back to the mapped Base manufacturer id when an explicit producer template mapping resolves empty', async () => {
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

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
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

    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
  });

  it('supports producer_name template mappings without coercing names to producer ids', async () => {
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
          sourceKey: 'producer_name',
          targetField: 'producerName',
        },
      ],
      null,
      {
        producerNameById: {
          'producer-1': 'Acme',
        },
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_name']).toBe('Acme');
    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
    expect(result['producer_ids']).toBeUndefined();
  });

  it('supports producer_names template mappings without coercing names to producer ids', async () => {
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
          sourceKey: 'producer_names',
          targetField: 'producerNames',
        },
      ],
      null,
      {
        producerNameById: {
          'producer-1': 'Acme',
        },
        producerExternalIdByInternalId: {
          'producer-1': 'base-producer-77',
        },
      }
    );

    expect(result['producer_names']).toEqual(['Acme']);
    expect(result['manufacturer_id']).toBe('base-producer-77');
    expect(result['producer_id']).toBeUndefined();
    expect(result['producer_ids']).toBeUndefined();
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

describe('exportProductToBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callBaseApiMock.mockResolvedValue({ status: 'SUCCESS', product_id: 'base-product-1' });
  });

  it('sends manufacturer_id to Base when a mapped producer is present', async () => {
    await exportProductToBase(
      'token-1',
      'inventory-1',
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

    expect(mocks.callBaseApiMock).toHaveBeenCalledWith(
      'token-1',
      'addInventoryProduct',
      expect.objectContaining({
        inventory_id: 'inventory-1',
        manufacturer_id: 'base-producer-77',
      })
    );
    expect(mocks.callBaseApiMock.mock.calls[0]?.[2]).not.toHaveProperty('producer_id');
    expect(mocks.callBaseApiMock.mock.calls[0]?.[2]).not.toHaveProperty('producer_ids');
  });

  it('keeps manufacturer_id at the API boundary when the template uses producer_id aliases', async () => {
    await exportProductToBase(
      'token-1',
      'inventory-1',
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

    expect(mocks.callBaseApiMock).toHaveBeenCalledWith(
      'token-1',
      'addInventoryProduct',
      expect.objectContaining({
        inventory_id: 'inventory-1',
        manufacturer_id: 'base-producer-77',
      })
    );
    expect(mocks.callBaseApiMock.mock.calls[0]?.[2]).not.toHaveProperty('producer_id');
    expect(mocks.callBaseApiMock.mock.calls[0]?.[2]).not.toHaveProperty('producer_ids');
  });
});
