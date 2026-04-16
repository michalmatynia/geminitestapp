import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  priceGroupFindOne: vi.fn(),
  currencyFindOne: vi.fn(),
  callBaseApi: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: async () => ({
    collection: (name: string) => {
      if (name === 'price_groups') {
        return {
          findOne: mocks.priceGroupFindOne,
        };
      }

      if (name === 'currencies') {
        return {
          findOne: mocks.currencyFindOne,
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    },
  }),
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: vi.fn(),
}));

vi.mock('@/features/integrations/services/base-token-resolver', () => ({
  resolveBaseConnectionToken: vi.fn(),
}));

vi.mock('@/features/integrations/services/imports/base-client', () => ({
  callBaseApi: (...args: unknown[]) => mocks.callBaseApi(...args),
  fetchBaseProductDetails: vi.fn(),
}));

import { resolvePriceGroupContext } from './base-import-service-context';

describe('resolvePriceGroupContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.priceGroupFindOne.mockResolvedValue({
      id: 'group-pln',
      groupId: 'PLN_STANDARD',
      currencyId: 'currency-pln',
      currencyCode: 'PLN',
    });
    mocks.currencyFindOne.mockResolvedValue({
      id: 'currency-pln',
      code: 'PLN',
    });
  });

  it('resolves a preferred price group when the caller passes a legacy groupId', async () => {
    const result = await resolvePriceGroupContext('mongodb' as never, 'PLN_STANDARD');

    expect(mocks.priceGroupFindOne).toHaveBeenCalledWith(
      {
        $or: [{ id: 'PLN_STANDARD' }, { groupId: 'PLN_STANDARD' }],
      },
      {
        projection: {
          id: 1,
          groupId: 1,
          currencyId: 1,
          currencyCode: 1,
        },
      }
    );
    expect(result).toEqual({
      defaultPriceGroupId: 'group-pln',
      preferredCurrencies: ['PLN', 'PLNSTANDARD', 'CURRENCYPLN'],
    });
  });

  it('adds matching Base inventory price-group ids to the preferred identifiers', async () => {
    mocks.callBaseApi.mockResolvedValue({
      status: 'SUCCESS',
      price_groups: [
        {
          price_group_id: 3772,
          name: 'Domyslna',
          currency: 'PLN',
        },
        {
          price_group_id: 29877,
          name: 'GBP Automat',
          currency: 'GBP',
        },
        {
          price_group_id: 77295,
          name: 'Allegro Portfele Obnizka',
          currency: 'PLN',
        },
      ],
    });

    const result = await resolvePriceGroupContext('mongodb' as never, 'PLN_STANDARD', {
      baseToken: 'token-1',
      inventoryId: '4069',
    });

    expect(mocks.callBaseApi).toHaveBeenCalledWith('token-1', 'getInventoryPriceGroups', {
      inventory_id: '4069',
    });
    expect(result).toEqual({
      defaultPriceGroupId: 'group-pln',
      preferredCurrencies: ['PLN', 'PLNSTANDARD', 'CURRENCYPLN', '3772', '77295'],
    });
  });
});
