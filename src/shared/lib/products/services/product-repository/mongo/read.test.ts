import { describe, expect, it, vi } from 'vitest';

import { buildListProjectStage, mongoProductReadImpl } from './read';

describe('buildListProjectStage', () => {
  it('includes parameters and custom fields in the paged list projection when SKU filtering is not used', () => {
    const stage = buildListProjectStage({});

    expect(stage).not.toBeNull();
    expect(stage).toMatchObject({
      importSource: 1,
      supplierName: 1,
      supplierLink: 1,
      catalogs: 1,
      category: {
        id: '$category.id',
        name: '$category.name',
        catalogId: '$category.catalogId',
        name_en: '$category.name_en',
      },
      parameters: 1,
      customFields: 1,
      notes: 1,
      name_en: 1,
      name_pl: 1,
      name_de: 1,
      description_en: 1,
      description_pl: 1,
      marketplaceContentOverrides: 1,
      sourcePrice: 1,
    });
  });

  it('disables the compact projection for direct SKU lookups', () => {
    expect(buildListProjectStage({ sku: 'KEYCHA1217' })).toBeNull();
  });
});

describe('mongoProductReadImpl duplicate SKU enrichment', () => {
  it('finds products by exact supplier link for scrape deduplication', async () => {
    const findOne = vi.fn().mockResolvedValue({
      _id: 'product-source-1',
      id: 'product-source-1',
      sku: 'BATTLESTOCK-13033',
      supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      name_en: '40k spiritseer',
      published: false,
    });

    const product = await mongoProductReadImpl.findProductBySupplierLink(
      'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
      async () =>
        ({
          findOne,
        }) as never
    );

    expect(findOne).toHaveBeenCalledWith({
      supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    });
    expect(product?.id).toBe('product-source-1');
  });

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

  it('preserves explicit product id order for parsed-match list filters', async () => {
    const aggregate = vi
      .fn()
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([
          {
            products: [
              {
                _id: 'product-b',
                id: 'product-b',
                sku: 'B',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                catalogId: 'catalog-1',
                name_en: 'Product B',
                published: false,
              },
              {
                _id: 'product-a',
                id: 'product-a',
                sku: 'A',
                createdAt: new Date('2026-01-03T00:00:00.000Z'),
                updatedAt: new Date('2026-01-03T00:00:00.000Z'),
                catalogId: 'catalog-1',
                name_en: 'Product A',
                published: false,
              },
            ],
            meta: [{ total: 2 }],
          },
        ]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      });

    const result = await mongoProductReadImpl.getProductsWithCount(
      { ids: ['product-b', 'product-a'], page: 1, pageSize: 20 } as never,
      async () =>
        ({
          aggregate,
        }) as never
    );

    const firstPipeline = aggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const facetStage = firstPipeline[1] as {
      $facet: { products: Array<Record<string, unknown>> };
    };

    expect(facetStage.$facet.products[0]).toHaveProperty('$addFields');
    expect(facetStage.$facet.products[1]).toEqual({
      $sort: { __productIdOrder: 1, createdAt: -1 },
    });
    expect(JSON.stringify(facetStage.$facet.products[0])).toContain(
      '"$indexOfArray":[["product-b","product-a"],"$id"]'
    );
    expect(result.products.map((product) => product.id)).toEqual(['product-b', 'product-a']);
  });
});
