import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getShippingGroupByIdMock,
  listShippingGroupsMock,
  listCategoriesMock,
} = vi.hoisted(() => ({
  getShippingGroupByIdMock: vi.fn(),
  listShippingGroupsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/shipping-group-repository', () => ({
  getShippingGroupRepository: async () => ({
    getShippingGroupById: getShippingGroupByIdMock,
    listShippingGroups: listShippingGroupsMock,
  }),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: async () => ({
    listCategories: listCategoriesMock,
  }),
}));

import {
  resolveTraderaShippingGroupResolutionForProduct,
  selectPreferredTraderaShippingGroupResolution,
} from './shipping-group';

describe('selectPreferredTraderaShippingGroupResolution', () => {
  it('returns missing_shipping_group when no manual or category-rule match exists', () => {
    expect(
      selectPreferredTraderaShippingGroupResolution({
        effectiveResolution: {
          shippingGroup: null,
          shippingGroupId: null,
          source: null,
          reason: 'none',
          matchedCategoryRuleIds: [],
          matchingShippingGroupIds: [],
        },
      })
    ).toEqual({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    });
  });

  it('returns shipping_group_without_condition for a manual group without Tradera override', () => {
    const shippingGroup = {
      id: 'group-1',
      name: 'Default parcels',
      catalogId: 'catalog-1',
      traderaShippingCondition: null,
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
    };

    expect(
      selectPreferredTraderaShippingGroupResolution({
        effectiveResolution: {
          shippingGroup: shippingGroup as never,
          shippingGroupId: 'group-1',
          source: 'manual',
          reason: 'manual',
          matchedCategoryRuleIds: [],
          matchingShippingGroupIds: ['group-1'],
        },
      })
    ).toEqual({
      shippingGroup,
      shippingGroupId: 'group-1',
      shippingCondition: null,
      shippingPriceEur: 5,
      shippingGroupSource: 'manual',
      reason: 'shipping_group_without_condition',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['group-1'],
    });
  });

  it('returns multiple_matching_shipping_groups when category rules collide', () => {
    expect(
      selectPreferredTraderaShippingGroupResolution({
        effectiveResolution: {
          shippingGroup: null,
          shippingGroupId: null,
          source: null,
          reason: 'multiple_category_rules',
          matchedCategoryRuleIds: ['jewellery'],
          matchingShippingGroupIds: ['group-1', 'group-2'],
        },
      })
    ).toEqual({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'multiple_matching_shipping_groups',
      matchedCategoryRuleIds: ['jewellery'],
      matchingShippingGroupIds: ['group-1', 'group-2'],
    });
  });
});

describe('resolveTraderaShippingGroupResolutionForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listShippingGroupsMock.mockResolvedValue([]);
    listCategoriesMock.mockResolvedValue([]);
  });

  it('loads the manually assigned shipping group and returns the mapped Tradera shipping condition', async () => {
    getShippingGroupByIdMock.mockResolvedValue({
      id: 'group-1',
      name: 'Small parcel',
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
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
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
      },
      shippingGroupId: 'group-1',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 5,
      shippingGroupSource: 'manual',
      reason: 'mapped',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['group-1'],
    });
    expect(getShippingGroupByIdMock).toHaveBeenCalledWith('group-1');
    expect(listShippingGroupsMock).not.toHaveBeenCalled();
  });

  it('returns shipping_group_not_found when a manual shipping group is missing', async () => {
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
      shippingPriceEur: null,
      shippingGroupSource: 'manual',
      reason: 'shipping_group_not_found',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['missing-group'],
    });
  });

  it('auto-assigns a shipping group from an ancestor category rule when no manual group is set', async () => {
    listShippingGroupsMock.mockResolvedValue([
      {
        id: 'group-7-eur',
        name: 'Jewellery 7 EUR',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
    ]);
    listCategoriesMock.mockResolvedValue([
      {
        id: 'category-jewellery',
        name: 'Jewellery',
        parentId: null,
        catalogId: 'catalog-1',
      },
      {
        id: 'category-rings',
        name: 'Rings',
        parentId: 'category-jewellery',
        catalogId: 'catalog-1',
      },
    ]);

    await expect(
      resolveTraderaShippingGroupResolutionForProduct({
        product: {
          shippingGroupId: null,
          categoryId: 'category-rings',
          catalogId: 'catalog-1',
          catalogs: [{ catalogId: 'catalog-1' }],
        } as never,
      })
    ).resolves.toEqual({
      shippingGroup: {
        id: 'group-7-eur',
        name: 'Jewellery 7 EUR',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
      shippingGroupId: 'group-7-eur',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 7,
      shippingGroupSource: 'category_rule',
      reason: 'mapped',
      matchedCategoryRuleIds: ['category-jewellery'],
      matchingShippingGroupIds: ['group-7-eur'],
    });
    expect(listShippingGroupsMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
  });
});
