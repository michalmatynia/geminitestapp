import { describe, expect, it } from 'vitest';

import { resolveEffectiveShippingGroup } from './effective-shipping-group';

describe('resolveEffectiveShippingGroup', () => {
  it('prefers a manual shipping group over category rules', () => {
    const shippingGroups = [
      {
        id: 'group-manual',
        name: 'Manual override',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 9,
        autoAssignCategoryIds: [],
      },
      {
        id: 'group-auto',
        name: 'Jewellery 7 EUR',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-jewellery'],
      },
    ];

    expect(
      resolveEffectiveShippingGroup({
        product: {
          shippingGroupId: 'group-manual',
          categoryId: 'category-rings',
          catalogId: 'catalog-1',
        },
        shippingGroups,
        categories: [
          { id: 'category-jewellery', parentId: null } as never,
          { id: 'category-rings', parentId: 'category-jewellery' } as never,
        ],
      })
    ).toEqual({
      shippingGroup: shippingGroups[0],
      shippingGroupId: 'group-manual',
      source: 'manual',
      reason: 'manual',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['group-manual'],
    });
  });

  it('matches ancestor category rules for automatic assignment', () => {
    const shippingGroup = {
      id: 'group-auto',
      name: 'Jewellery 7 EUR',
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
    };

    expect(
      resolveEffectiveShippingGroup({
        product: {
          shippingGroupId: null,
          categoryId: 'category-rings',
          catalogId: 'catalog-1',
        },
        shippingGroups: [shippingGroup],
        categories: [
          { id: 'category-jewellery', parentId: null } as never,
          { id: 'category-rings', parentId: 'category-jewellery' } as never,
        ],
      })
    ).toEqual({
      shippingGroup,
      shippingGroupId: 'group-auto',
      source: 'category_rule',
      reason: 'category_rule',
      matchedCategoryRuleIds: ['category-jewellery'],
      matchingShippingGroupIds: ['group-auto'],
    });
  });

  it('returns multiple_category_rules when more than one automatic rule matches', () => {
    expect(
      resolveEffectiveShippingGroup({
        product: {
          shippingGroupId: null,
          categoryId: 'category-rings',
          catalogId: 'catalog-1',
        },
        shippingGroups: [
          {
            id: 'group-1',
            name: 'Jewellery 7 EUR',
            catalogId: 'catalog-1',
            traderaShippingCondition: 'Buyer pays shipping',
            traderaShippingPriceEur: 7,
            autoAssignCategoryIds: ['category-jewellery'],
          },
          {
            id: 'group-2',
            name: 'Rings 5 EUR',
            catalogId: 'catalog-1',
            traderaShippingCondition: 'Buyer pays shipping',
            traderaShippingPriceEur: 5,
            autoAssignCategoryIds: ['category-rings'],
          },
        ],
        categories: [
          { id: 'category-jewellery', parentId: null } as never,
          { id: 'category-rings', parentId: 'category-jewellery' } as never,
        ],
      })
    ).toEqual({
      shippingGroup: null,
      shippingGroupId: null,
      source: null,
      reason: 'multiple_category_rules',
      matchedCategoryRuleIds: ['category-jewellery', 'category-rings'],
      matchingShippingGroupIds: ['group-1', 'group-2'],
    });
  });
});
