import { describe, expect, it } from 'vitest';

import { buildTraderaPricingMetadata } from './pricing-metadata';

describe('buildTraderaPricingMetadata', () => {
  it('normalizes trimmed and duplicate price-group identifiers', () => {
    expect(
      buildTraderaPricingMetadata({
        listingPrice: 55,
        listingCurrencyCode: 'EUR',
        targetCurrencyCode: 'EUR',
        resolvedToTargetCurrency: true,
        basePrice: 123,
        baseCurrencyCode: 'PLN',
        priceSource: 'price_group_target_currency',
        reason: 'resolved_target_currency',
        defaultPriceGroupId: '  price-group-pln  ',
        catalogDefaultPriceGroupId: '  price-group-pln  ',
        catalogId: '  catalog-1  ',
        catalogPriceGroupIds: ['  price-group-pln  ', 'price-group-eur', '', 'price-group-eur'],
        loadedPriceGroupIds: [' price-group-pln ', 'price-group-eur', '  ', 'price-group-eur'],
        matchedTargetPriceGroupIds: ['  price-group-eur ', 'price-group-eur', ''],
      })
    ).toEqual({
      listingPrice: 55,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      priceResolutionReason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      pricingCatalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
  });

  it('supports the scripted catalogId key', () => {
    expect(
      buildTraderaPricingMetadata(
        {
          listingPrice: null,
          listingCurrencyCode: 'PLN',
          targetCurrencyCode: 'EUR',
          resolvedToTargetCurrency: false,
          basePrice: 123,
          baseCurrencyCode: 'PLN',
          priceSource: 'base_price_fallback',
          reason: 'target_currency_unresolved',
          defaultPriceGroupId: 'PLN_STANDARD',
          catalogDefaultPriceGroupId: null,
          catalogId: ' catalog-1 ',
          catalogPriceGroupIds: ['PLN_STANDARD'],
          loadedPriceGroupIds: [],
          matchedTargetPriceGroupIds: [],
        },
        { catalogIdKey: 'catalogId' }
      )
    ).toEqual({
      listingPrice: null,
      listingCurrencyCode: 'PLN',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: false,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'base_price_fallback',
      priceResolutionReason: 'target_currency_unresolved',
      defaultPriceGroupId: 'PLN_STANDARD',
      catalogDefaultPriceGroupId: null,
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['PLN_STANDARD'],
      loadedPriceGroupIds: [],
      matchedTargetPriceGroupIds: [],
    });
  });
});
