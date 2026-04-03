import { describe, expect, it } from 'vitest';

import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  findRedundantShippingGroupRuleCategoryIds,
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
} from './shipping-group-rule-conflicts';

describe('shipping-group-rule-conflicts', () => {
  it('detects overlaps between ancestor and descendant category rules', () => {
    expect(
      buildShippingGroupRuleConflicts({
        shippingGroups: [
          {
            id: 'shipping-group-1',
            name: 'Jewellery 7 EUR',
            description: null,
            catalogId: 'catalog-1',
            traderaShippingCondition: 'Buyer pays shipping',
            traderaShippingPriceEur: 7,
            autoAssignCategoryIds: ['category-jewellery'],
          },
          {
            id: 'shipping-group-2',
            name: 'Rings 5 EUR',
            description: null,
            catalogId: 'catalog-1',
            traderaShippingCondition: 'Buyer pays shipping',
            traderaShippingPriceEur: 5,
            autoAssignCategoryIds: ['category-rings'],
          },
        ],
        categories: [
          { id: 'category-jewellery', name: 'Jewellery', parentId: null } as never,
          { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' } as never,
        ],
      })
    ).toEqual([
      {
        groupIds: ['shipping-group-1', 'shipping-group-2'],
        groupNames: ['Jewellery 7 EUR', 'Rings 5 EUR'],
        overlapCategoryIds: ['category-rings'],
      },
    ]);
  });

  it('builds readable category summaries from path labels', () => {
    const labelById = buildCategoryPathLabelMap([
      { id: 'category-jewellery', name: 'Jewellery', parentId: null } as never,
      { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' } as never,
    ]);

    expect(
      formatCategoryRuleSummary({
        categoryIds: ['category-rings'],
        categoryLabelById: labelById,
      })
    ).toBe('Jewellery / Rings');
  });

  it('normalizes redundant descendant category rules to the parent scope', () => {
    const categories = [
      { id: 'category-jewellery', name: 'Jewellery', parentId: null } as never,
      { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' } as never,
    ];

    expect(
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: ['category-jewellery', 'category-rings'],
        categories,
      })
    ).toEqual(['category-jewellery']);
    expect(
      findRedundantShippingGroupRuleCategoryIds({
        categoryIds: ['category-jewellery', 'category-rings'],
        categories,
      })
    ).toEqual(['category-rings']);
  });

  it('drops missing category ids during normalization without treating them as redundant', () => {
    const categories = [
      { id: 'category-jewellery', name: 'Jewellery', parentId: null } as never,
      { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' } as never,
    ];

    expect(
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: ['category-jewellery', 'category-missing'],
        categories,
      })
    ).toEqual(['category-jewellery']);
    expect(
      findRedundantShippingGroupRuleCategoryIds({
        categoryIds: ['category-jewellery', 'category-missing'],
        categories,
      })
    ).toEqual([]);
  });
});
