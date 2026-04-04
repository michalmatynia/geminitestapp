import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  priceGroupsRows: [] as Array<{ id?: string; groupId?: string }>,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: async () => ({
    collection: (name: string) => {
      if (name !== 'price_groups') {
        throw new Error(`Unexpected collection ${name}`);
      }

      return {
        find: () => ({
          toArray: async () => mocks.priceGroupsRows,
        }),
      };
    },
  }),
}));

import { normalizeCatalogPriceGroupSelection } from './price-group-normalization';

describe('normalizeCatalogPriceGroupSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.priceGroupsRows = [
      { id: 'group-pln', groupId: 'PLN_STANDARD' },
      { id: 'group-eur', groupId: 'EUR_STANDARD' },
    ];
  });

  it('normalizes legacy group identifiers to canonical ids for mongodb catalogs', async () => {
    await expect(
      normalizeCatalogPriceGroupSelection('mongodb', {
        priceGroupIds: ['PLN_STANDARD', 'group-eur'],
        defaultPriceGroupId: 'PLN_STANDARD',
      })
    ).resolves.toEqual({
      priceGroupIds: ['group-pln', 'group-eur'],
      defaultPriceGroupId: 'group-pln',
    });
  });

  it('passes values through unchanged for non-mongodb providers', async () => {
    await expect(
      normalizeCatalogPriceGroupSelection('json', {
        priceGroupIds: ['PLN_STANDARD', 'group-eur'],
        defaultPriceGroupId: 'PLN_STANDARD',
      })
    ).resolves.toEqual({
      priceGroupIds: ['PLN_STANDARD', 'group-eur'],
      defaultPriceGroupId: 'PLN_STANDARD',
    });
  });
});
