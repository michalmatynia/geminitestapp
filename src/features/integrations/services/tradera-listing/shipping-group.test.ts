import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getShippingGroupByIdMock } = vi.hoisted(() => ({
  getShippingGroupByIdMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getShippingGroupRepository: async () => ({
    getShippingGroupById: getShippingGroupByIdMock,
  }),
}));

import {
  resolveTraderaShippingGroupResolutionForProduct,
  selectPreferredTraderaShippingGroupResolution,
} from './shipping-group';

describe('selectPreferredTraderaShippingGroupResolution', () => {
  it('returns missing_shipping_group when the product has no assigned shipping group', () => {
    expect(
      selectPreferredTraderaShippingGroupResolution({
        product: {
          shippingGroupId: null,
        } as never,
        shippingGroup: null,
      })
    ).toEqual({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      reason: 'missing_shipping_group',
    });
  });

  it('returns shipping_group_without_condition when the assigned group has no Tradera override', () => {
    const shippingGroup = {
      id: 'group-1',
      name: 'Default parcels',
      catalogId: 'catalog-1',
      traderaShippingCondition: null,
    };

    expect(
      selectPreferredTraderaShippingGroupResolution({
        product: {
          shippingGroupId: 'group-1',
        } as never,
        shippingGroup: shippingGroup as never,
      })
    ).toEqual({
      shippingGroup,
      shippingGroupId: 'group-1',
      shippingCondition: null,
      reason: 'shipping_group_without_condition',
    });
  });
});

describe('resolveTraderaShippingGroupResolutionForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the assigned shipping group and returns the mapped Tradera shipping condition', async () => {
    getShippingGroupByIdMock.mockResolvedValue({
      id: 'group-1',
      name: 'Small parcel',
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
    });

    await expect(
      resolveTraderaShippingGroupResolutionForProduct({
        product: {
          shippingGroupId: 'group-1',
        } as never,
      })
    ).resolves.toEqual({
      shippingGroup: {
        id: 'group-1',
        name: 'Small parcel',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
      },
      shippingGroupId: 'group-1',
      shippingCondition: 'Buyer pays shipping',
      reason: 'mapped',
    });
    expect(getShippingGroupByIdMock).toHaveBeenCalledWith('group-1');
  });

  it('returns shipping_group_not_found when the product points at a missing group', async () => {
    getShippingGroupByIdMock.mockResolvedValue(null);

    await expect(
      resolveTraderaShippingGroupResolutionForProduct({
        product: {
          shippingGroupId: 'missing-group',
        } as never,
      })
    ).resolves.toEqual({
      shippingGroup: null,
      shippingGroupId: 'missing-group',
      shippingCondition: null,
      reason: 'shipping_group_not_found',
    });
  });
});
