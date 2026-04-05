import { describe, expect, it } from 'vitest';

import {
  buildMongoPriceGroupCatalogPullUpdate,
  buildMongoPriceGroupCurrencyByIdMap,
  buildMongoPriceGroupCurrencyLookupFilter,
  buildMongoPriceGroupDefaultUnsetUpdate,
  buildMongoPriceGroupFieldLookupFilter,
  buildMongoPriceGroupIdentifierList,
  buildMongoPriceGroupLookupFilter,
  buildMongoPriceGroupSourceUnsetUpdate,
  buildMongoPriceGroupUpdateDocument,
} from './handler.helpers';

describe('product metadata by-type and id handler helpers', () => {
  it('builds lookup filters and currency maps', () => {
    expect(buildMongoPriceGroupLookupFilter('pg-1')).toEqual({
      $or: [{ id: 'pg-1' }, { groupId: 'pg-1' }],
    });
    expect(
      buildMongoPriceGroupCurrencyLookupFilter({
        currencyId: 'EUR',
        currencyCode: 'EUR',
      })
    ).toEqual({
      $or: [{ id: 'EUR' }, { code: 'EUR' }, { code: 'EUR' }],
    });
    expect(
      Array.from(
        buildMongoPriceGroupCurrencyByIdMap({
          id: 'EUR',
          code: 'EUR',
          name: 'Euro',
          symbol: 'EUR',
        } as never).entries()
      )
    ).toEqual([
      [
        'EUR',
        {
          id: 'EUR',
          code: 'EUR',
          name: 'Euro',
          symbol: 'EUR',
        },
      ],
    ]);
    expect(
      buildMongoPriceGroupIdentifierList({
        resolvedId: 'pg-1',
        groupId: 'PLN_STANDARD',
      })
    ).toEqual(['pg-1', 'PLN_STANDARD']);
    expect(
      buildMongoPriceGroupFieldLookupFilter({
        field: 'defaultPriceGroupId',
        identifiers: ['pg-1', 'PLN_STANDARD'],
      })
    ).toEqual({
      defaultPriceGroupId: { $in: ['pg-1', 'PLN_STANDARD'] },
    });
  });

  it('builds a normalized price-group update document', () => {
    const now = new Date('2026-04-04T00:00:00.000Z');

    expect(
      buildMongoPriceGroupUpdateDocument({
        data: {
          groupId: 'EUR_RETAIL',
          name: 'Euro Group',
          description: 'Retail euro group',
          isDefault: true,
          sourceGroupId: 'base-group',
          type: 'dependent',
          basePriceField: 'retailPrice',
          priceMultiplier: '1.5',
          addToPrice: '9.9',
        },
        existing: {
          sourceGroupId: null,
        },
        resolvedSourceGroupId: 'pg-base',
        currencyDoc: {
          id: 'EUR',
          code: 'EUR',
        } as never,
        now,
      })
    ).toEqual({
      updatedAt: now,
      currencyId: 'EUR',
      groupId: 'EUR_RETAIL',
      name: 'Euro Group',
      description: 'Retail euro group',
      isDefault: true,
      sourceGroupId: 'pg-base',
      type: 'dependent',
      basePriceField: 'retailPrice',
      priceMultiplier: 1.5,
      addToPrice: 9,
    });
  });

  it('builds catalog pull and default-unset updates for deletes', () => {
    const now = new Date('2026-04-04T00:00:00.000Z');

    expect(
      buildMongoPriceGroupCatalogPullUpdate({
        identifiers: ['pg-1', 'PLN_STANDARD'],
        now,
      })
    ).toEqual({
      $pull: { priceGroupIds: { $in: ['pg-1', 'PLN_STANDARD'] } },
      $set: { updatedAt: now },
    });
    expect(buildMongoPriceGroupDefaultUnsetUpdate(now)).toEqual({
      $set: { defaultPriceGroupId: null, updatedAt: now },
    });
    expect(buildMongoPriceGroupSourceUnsetUpdate(now)).toEqual({
      $set: { sourceGroupId: null, updatedAt: now },
    });
  });
});
