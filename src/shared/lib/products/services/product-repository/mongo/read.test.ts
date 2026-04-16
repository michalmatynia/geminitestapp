import { describe, expect, it, vi } from 'vitest';

import { buildListProjectStage, mongoProductReadImpl } from './read';

describe('buildListProjectStage', () => {
  it('includes parameters in the paged list projection when SKU filtering is not used', () => {
    const stage = buildListProjectStage({});

    expect(stage).not.toBeNull();
    expect(stage).toMatchObject({
      importSource: 1,
      category: {
        id: '$category.id',
        name: '$category.name',
        catalogId: '$category.catalogId',
        name_en: '$category.name_en',
      },
      parameters: 1,
      notes: 1,
      name_en: 1,
      name_pl: 1,
      name_de: 1,
    });
  });

  it('disables the compact projection for direct SKU lookups', () => {
    expect(buildListProjectStage({ sku: 'KEYCHA1217' })).toBeNull();
  });
});

describe('mongoProductReadImpl duplicate SKU enrichment', () => {
  it('attaches duplicateSkuCount to listed products using normalized SKU matching', async () => {
    const aggregate = vi
      .fn()
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'product-1',
            id: 'product-1',
            sku: ' keycha1045 ',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            catalogId: 'catalog-1',
            name_en: 'Keychain',
            published: false,
          },
        ]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([{ _id: 'KEYCHA1045', count: 2 }]),
      });

    const products = await mongoProductReadImpl.getProducts(
      {},
      async () =>
        ({
          aggregate,
        }) as never
    );

    expect(products).toHaveLength(1);
    expect(products[0]?.duplicateSkuCount).toBe(2);
    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('attaches duplicateSkuCount to paged products without affecting the total', async () => {
    const aggregate = vi
      .fn()
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'product-2',
            id: 'product-2',
            sku: 'KEYCHA1045',
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            catalogId: 'catalog-1',
            name_en: 'Keychain',
            published: false,
          },
        ]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([{ _id: 'KEYCHA1045', count: 3 }]),
      });

    const result = await mongoProductReadImpl.getProductsWithCount(
      { name: 'Keychain' } as never,
      async () =>
        ({
          aggregate,
          estimatedDocumentCount: vi.fn().mockResolvedValue(7),
        }) as never
    );

    expect(result.total).toBe(7);
    expect(result.products[0]?.duplicateSkuCount).toBe(3);
    expect(aggregate).toHaveBeenCalledTimes(2);
  });
});
