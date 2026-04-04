import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCatalogByIdMock,
  collectionMock,
} = vi.hoisted(() => ({
  getCatalogByIdMock: vi.fn(),
  collectionMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: async () => ({
    getCatalogById: (...args: unknown[]) => getCatalogByIdMock(...args),
  }),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: async () => ({
    collection: (...args: unknown[]) => collectionMock(...args),
  }),
}));

import { resolveTraderaListingPriceForProduct } from './price';

describe('resolveTraderaListingPriceForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the Tradera listing price from the catalog EUR price group', async () => {
    getCatalogByIdMock.mockResolvedValue({
      id: 'catalog-1',
      defaultPriceGroupId: 'price-group-pln',
      priceGroupIds: ['price-group-pln', 'price-group-eur'],
    });

    collectionMock.mockImplementation((name: string) => {
      if (name === 'price_groups') {
        return {
          find: () => ({
            toArray: async () => [
              {
                id: 'price-group-pln',
                groupId: 'PLN',
                currencyId: 'currency-pln',
                type: 'standard',
                isDefault: true,
                sourceGroupId: null,
                priceMultiplier: 1,
                addToPrice: 0,
              },
              {
                id: 'price-group-eur',
                groupId: 'EUR',
                currencyId: 'currency-eur',
                type: 'dependent',
                isDefault: false,
                sourceGroupId: 'price-group-pln',
                priceMultiplier: 0.5,
                addToPrice: 0,
              },
            ],
          }),
        };
      }

      if (name === 'currencies') {
        return {
          find: () => ({
            toArray: async () => [
              { id: 'currency-pln', code: 'PLN' },
              { id: 'currency-eur', code: 'EUR' },
            ],
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    });

    const resolution = await resolveTraderaListingPriceForProduct({
      product: {
        id: 'product-1',
        price: 100,
        defaultPriceGroupId: null,
        catalogId: 'catalog-1',
        catalogs: [{ catalogId: 'catalog-1' }],
      } as never,
      targetCurrencyCode: 'EUR',
    });

    expect(resolution).toEqual({
      listingPrice: 50,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 100,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
  });

  it('reports unresolved EUR pricing when only the base PLN price group is available', async () => {
    getCatalogByIdMock.mockResolvedValue({
      id: 'catalog-1',
      defaultPriceGroupId: 'price-group-pln',
      priceGroupIds: ['price-group-pln'],
    });

    collectionMock.mockImplementation((name: string) => {
      if (name === 'price_groups') {
        return {
          find: () => ({
            toArray: async () => [
              {
                id: 'price-group-pln',
                groupId: 'PLN',
                currencyId: 'currency-pln',
                type: 'standard',
                isDefault: true,
                sourceGroupId: null,
                priceMultiplier: 1,
                addToPrice: 0,
              },
            ],
          }),
        };
      }

      if (name === 'currencies') {
        return {
          find: () => ({
            toArray: async () => [{ id: 'currency-pln', code: 'PLN' }],
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    });

    const resolution = await resolveTraderaListingPriceForProduct({
      product: {
        id: 'product-1',
        price: 99,
        defaultPriceGroupId: null,
        catalogId: 'catalog-1',
        catalogs: [{ catalogId: 'catalog-1' }],
      } as never,
      targetCurrencyCode: 'EUR',
    });

    expect(resolution).toEqual({
      listingPrice: 99,
      listingCurrencyCode: 'PLN',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: false,
      basePrice: 99,
      baseCurrencyCode: 'PLN',
      priceSource: 'base_price_fallback',
      reason: 'target_currency_unresolved',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln'],
      loadedPriceGroupIds: ['price-group-pln'],
      matchedTargetPriceGroupIds: [],
    });
  });

  it('resolves target-currency pricing even when loaded price groups omit groupId', async () => {
    getCatalogByIdMock.mockResolvedValue({
      id: 'catalog-1',
      defaultPriceGroupId: 'price-group-pln',
      priceGroupIds: ['price-group-pln', 'price-group-eur'],
    });

    collectionMock.mockImplementation((name: string) => {
      if (name === 'price_groups') {
        return {
          find: () => ({
            toArray: async () => [
              {
                id: 'price-group-pln',
                currencyId: 'currency-pln',
                type: 'standard',
                isDefault: true,
                sourceGroupId: null,
                priceMultiplier: 1,
                addToPrice: 0,
              },
              {
                id: 'price-group-eur',
                currencyId: 'currency-eur',
                type: 'dependent',
                isDefault: false,
                sourceGroupId: 'price-group-pln',
                priceMultiplier: 0.5,
                addToPrice: 0,
              },
            ],
          }),
        };
      }

      if (name === 'currencies') {
        return {
          find: () => ({
            toArray: async () => [
              { id: 'currency-pln', code: 'PLN' },
              { id: 'currency-eur', code: 'EUR' },
            ],
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    });

    const resolution = await resolveTraderaListingPriceForProduct({
      product: {
        id: 'product-1',
        price: 100,
        defaultPriceGroupId: null,
        catalogId: 'catalog-1',
        catalogs: [{ catalogId: 'catalog-1' }],
      } as never,
      targetCurrencyCode: 'EUR',
    });

    expect(resolution).toEqual({
      listingPrice: 50,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 100,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
  });

  it('resolves the catalog default price group when the catalog stores its groupId identifier', async () => {
    getCatalogByIdMock.mockResolvedValue({
      id: 'catalog-1',
      defaultPriceGroupId: 'PLN_STANDARD',
      priceGroupIds: ['price-group-pln', 'price-group-eur'],
    });

    collectionMock.mockImplementation((name: string) => {
      if (name === 'price_groups') {
        return {
          find: () => ({
            toArray: async () => [
              {
                id: 'price-group-pln',
                groupId: 'PLN_STANDARD',
                currencyId: 'currency-pln',
                type: 'standard',
                isDefault: false,
                sourceGroupId: null,
                priceMultiplier: 1,
                addToPrice: 0,
              },
              {
                id: 'price-group-eur',
                groupId: 'EUR_STANDARD',
                currencyId: 'currency-eur',
                type: 'dependent',
                isDefault: false,
                sourceGroupId: 'price-group-pln',
                priceMultiplier: 0.5,
                addToPrice: 0,
              },
            ],
          }),
        };
      }

      if (name === 'currencies') {
        return {
          find: () => ({
            toArray: async () => [
              { id: 'currency-pln', code: 'PLN' },
              { id: 'currency-eur', code: 'EUR' },
            ],
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    });

    const resolution = await resolveTraderaListingPriceForProduct({
      product: {
        id: 'product-1',
        price: 100,
        defaultPriceGroupId: null,
        catalogId: 'catalog-1',
        catalogs: [{ catalogId: 'catalog-1' }],
      } as never,
      targetCurrencyCode: 'EUR',
    });

    expect(resolution).toEqual({
      listingPrice: 50,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 100,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
  });

  it('loads and canonicalizes catalog price groups when the catalog stores only legacy groupId identifiers', async () => {
    getCatalogByIdMock.mockResolvedValue({
      id: 'catalog-1',
      defaultPriceGroupId: 'PLN_STANDARD',
      priceGroupIds: ['PLN_STANDARD', 'EUR_STANDARD'],
    });

    collectionMock.mockImplementation((name: string) => {
      if (name === 'price_groups') {
        return {
          find: (query: Record<string, unknown>) => ({
            toArray: async () => {
              expect(query).toEqual({
                $or: [
                  { id: { $in: ['PLN_STANDARD', 'EUR_STANDARD'] } },
                  { groupId: { $in: ['PLN_STANDARD', 'EUR_STANDARD'] } },
                ],
              });
              return [
                {
                  id: 'price-group-pln',
                  groupId: 'PLN_STANDARD',
                  currencyId: 'currency-pln',
                  type: 'standard',
                  isDefault: false,
                  sourceGroupId: null,
                  priceMultiplier: 1,
                  addToPrice: 0,
                },
                {
                  id: 'price-group-eur',
                  groupId: 'EUR_STANDARD',
                  currencyId: 'currency-eur',
                  type: 'dependent',
                  isDefault: false,
                  sourceGroupId: 'price-group-pln',
                  priceMultiplier: 0.5,
                  addToPrice: 0,
                },
              ];
            },
          }),
        };
      }

      if (name === 'currencies') {
        return {
          find: () => ({
            toArray: async () => [
              { id: 'currency-pln', code: 'PLN' },
              { id: 'currency-eur', code: 'EUR' },
            ],
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    });

    const resolution = await resolveTraderaListingPriceForProduct({
      product: {
        id: 'product-1',
        price: 100,
        defaultPriceGroupId: null,
        catalogId: 'catalog-1',
        catalogs: [{ catalogId: 'catalog-1' }],
      } as never,
      targetCurrencyCode: 'EUR',
    });

    expect(resolution).toEqual({
      listingPrice: 50,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 100,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
  });
});
