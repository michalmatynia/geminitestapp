import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getProductByIdMock,
  addTraderaShopItemMock,
  resolveTraderaCategoryMappingResolutionForProductMock,
  resolveTraderaShippingGroupResolutionForProductMock,
} = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  addTraderaShopItemMock: vi.fn(),
  resolveTraderaCategoryMappingResolutionForProductMock: vi.fn(),
  resolveTraderaShippingGroupResolutionForProductMock: vi.fn(),
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
  resolveTraderaCategoryMappingResolutionForProduct: (...args: unknown[]) =>
    resolveTraderaCategoryMappingResolutionForProductMock(...args),
}));

vi.mock('./shipping-group', () => ({
  resolveTraderaShippingGroupResolutionForProduct: (...args: unknown[]) =>
    resolveTraderaShippingGroupResolutionForProductMock(...args),
}));

import { resolveTraderaApiCategoryId, runTraderaApiListing } from './api';

describe('resolveTraderaApiCategoryId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TRADERA_API_DEFAULT_CATEGORY_ID;
  });

  it('prefers marketplace listing metadata over all other sources', async () => {
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValue({
      mapping: {
        externalCategoryId: '555',
        externalCategoryName: 'Pins',
        externalCategoryPath: 'Collectibles > Pins',
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
    });
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Small parcel',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
      },
      shippingGroupId: 'shipping-group-1',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 5,
      shippingGroupSource: 'manual',
      reason: 'mapped',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['shipping-group-1'],
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
      categoryMappingReason: null,
      categoryMatchScope: null,
      categoryInternalCategoryId: null,
    });
  });

  it('uses saved category mapper output before raw product category ids', async () => {
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValue({
      mapping: {
        externalCategoryId: '555',
        externalCategoryName: 'Pins',
        externalCategoryPath: 'Collectibles > Pins',
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
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
      categoryMappingReason: 'mapped',
      categoryMatchScope: 'catalog_match',
      categoryInternalCategoryId: 'internal-category-1',
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
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValue({
      mapping: {
        externalCategoryId: '555',
        externalCategoryName: 'Pins',
        externalCategoryPath: 'Collectibles > Pins',
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
    });
    addTraderaShopItemMock.mockResolvedValue({
      itemId: 1234567,
      requestId: 42,
      resultCode: 'Ok',
      resultMessage: 'Created',
    });
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Small parcel',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
      },
      shippingGroupId: 'shipping-group-1',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 5,
      shippingGroupSource: 'manual',
      reason: 'mapped',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['shipping-group-1'],
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
          shippingCondition: 'Buyer pays shipping',
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
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
        quantity: 3,
      }),
    });
  });

  it('preserves mapper diagnostics when Tradera falls back to the raw product category', async () => {
    getProductByIdMock.mockResolvedValueOnce({
      id: 'product-1',
      sku: 'SKU-1',
      categoryId: '77',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 99,
      stock: 3,
    });
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValue({
      mapping: null,
      reason: 'ambiguous_external_category',
      matchScope: 'cross_catalog',
      internalCategoryId: '77',
    });
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    });

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
          categoryId: 77,
          shippingCondition: 'Shipping paid by buyer',
        }),
      })
    );
    expect(result).toEqual({
      externalListingId: '1234567',
      listingUrl: 'https://www.tradera.com/item/1234567',
      metadata: expect.objectContaining({
        categoryId: 77,
        categorySource: 'product',
        categoryMappingReason: 'ambiguous_external_category',
        categoryMatchScope: 'cross_catalog',
        categoryInternalCategoryId: '77',
        shippingGroupId: null,
        shippingGroupName: null,
        shippingGroupSource: null,
        shippingCondition: 'Shipping paid by buyer',
        shippingPriceEur: null,
        shippingConditionSource: 'default',
        shippingConditionReason: 'missing_shipping_group',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: [],
      }),
    });
  });
});
