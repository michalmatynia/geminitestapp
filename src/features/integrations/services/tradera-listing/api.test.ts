import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getProductByIdMock,
  addTraderaShopItemMock,
  resolveTraderaCategoryMappingForProductMock,
} = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  addTraderaShopItemMock: vi.fn(),
  resolveTraderaCategoryMappingForProductMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (value: string) => `decrypted:${value}`,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: getProductByIdMock,
  }),
}));

vi.mock('@/features/integrations/services/tradera-api-client', () => ({
  addTraderaShopItem: (...args: unknown[]) => addTraderaShopItemMock(...args),
}));

vi.mock('./category-mapping', () => ({
  resolveTraderaCategoryMappingForProduct: (...args: unknown[]) =>
    resolveTraderaCategoryMappingForProductMock(...args),
}));

import { resolveTraderaApiCategoryId, runTraderaApiListing } from './api';

describe('resolveTraderaApiCategoryId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TRADERA_API_DEFAULT_CATEGORY_ID;
  });

  it('prefers marketplace listing metadata over all other sources', async () => {
    resolveTraderaCategoryMappingForProductMock.mockResolvedValue({
      externalCategoryId: '555',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
    });

    await expect(
      resolveTraderaApiCategoryId(
        {
          connectionId: 'connection-1',
          marketplaceData: {
            tradera: {
              categoryId: 777,
            },
          },
        } as never,
        {
          categoryId: '123',
        }
      )
    ).resolves.toEqual({
      categoryId: 777,
      source: 'marketplaceData',
      categoryPath: null,
      categoryName: null,
    });
  });

  it('uses saved category mapper output before raw product category ids', async () => {
    resolveTraderaCategoryMappingForProductMock.mockResolvedValue({
      externalCategoryId: '555',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
    });

    await expect(
      resolveTraderaApiCategoryId(
        {
          connectionId: 'connection-1',
          marketplaceData: null,
        } as never,
        {
          categoryId: '123',
        }
      )
    ).resolves.toEqual({
      categoryId: 555,
      source: 'categoryMapper',
      categoryPath: 'Collectibles > Pins',
      categoryName: 'Pins',
    });
  });
});

describe('runTraderaApiListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TRADERA_API_DEFAULT_CATEGORY_ID;
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 99,
      stock: 3,
    });
    resolveTraderaCategoryMappingForProductMock.mockResolvedValue({
      externalCategoryId: '555',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
    });
    addTraderaShopItemMock.mockResolvedValue({
      itemId: 1234567,
      requestId: 42,
      resultCode: 'Ok',
      resultMessage: 'Created',
    });
  });

  it('uses category mapper output for Tradera API listings and records the source', async () => {
    const result = await runTraderaApiListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        marketplaceData: null,
      } as never,
      connection: {
        traderaApiAppId: 123,
        traderaApiAppKey: 'encrypted-key',
        traderaApiUserId: 456,
        traderaApiToken: 'encrypted-token',
        traderaApiSandbox: false,
      } as never,
    });

    expect(addTraderaShopItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          categoryId: 555,
          title: 'Example title',
          quantity: 3,
        }),
      })
    );
    expect(result).toEqual({
      externalListingId: '1234567',
      listingUrl: 'https://www.tradera.com/item/1234567',
      metadata: expect.objectContaining({
        mode: 'api',
        categoryId: 555,
        categorySource: 'categoryMapper',
        categoryPath: 'Collectibles > Pins',
        categoryName: 'Pins',
        quantity: 3,
      }),
    });
  });
});
