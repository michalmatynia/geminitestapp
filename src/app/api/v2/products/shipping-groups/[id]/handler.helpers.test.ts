import { describe, expect, it } from 'vitest';

import {
  assertAvailableShippingGroupName,
  buildShippingGroupNameLookupInput,
  buildShippingGroupUpdateInput,
  buildShippingGroupValidationDraft,
  parseShippingGroupId,
  shouldValidateShippingGroupRuleConflicts,
} from './handler.helpers';

const currentShippingGroup = {
  id: 'shipping-group-1',
  name: 'Rings 5 EUR',
  description: null,
  catalogId: 'catalog-1',
  traderaShippingCondition: 'Buyer pays shipping',
  traderaShippingPriceEur: 5,
  autoAssignCategoryIds: ['category-rings'],
};

describe('product shipping groups by-id handler helpers', () => {
  it('parses route ids and rejects blank params', () => {
    expect(parseShippingGroupId({ id: ' shipping-group-1 ' })).toBe('shipping-group-1');
    expect(() => parseShippingGroupId({ id: '  ' })).toThrow('Invalid route parameters');
  });

  it('builds target catalog lookups and duplicate-name rejections', () => {
    expect(
      buildShippingGroupNameLookupInput(currentShippingGroup, {
        name: 'Priority',
        catalogId: 'catalog-2',
      })
    ).toEqual({
      name: 'Priority',
      catalogId: 'catalog-2',
    });

    expect(() =>
      assertAvailableShippingGroupName(
        { id: 'shipping-group-2' },
        'shipping-group-1',
        {
          name: 'Priority',
          catalogId: 'catalog-2',
        }
      )
    ).toThrow('A shipping group with this name already exists in this catalog');
  });

  it('builds validation drafts and partial update payloads with current fallbacks', () => {
    expect(
      buildShippingGroupValidationDraft(
        currentShippingGroup,
        {
          catalogId: 'catalog-2',
          traderaShippingPriceEur: null,
        },
        ['category-jewellery'],
        []
      )
    ).toEqual({
      id: 'shipping-group-1',
      name: 'Rings 5 EUR',
      description: null,
      catalogId: 'catalog-2',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: null,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });

    expect(
      buildShippingGroupUpdateInput(
        {
          name: 'Priority',
          description: null,
          traderaShippingPriceEur: 7,
        },
        ['category-jewellery'],
        []
      )
    ).toEqual({
      name: 'Priority',
      description: null,
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });
  });

  it('only revalidates rule conflicts when scope inputs change', () => {
    expect(shouldValidateShippingGroupRuleConflicts({})).toBe(false);
    expect(
      shouldValidateShippingGroupRuleConflicts({
        catalogId: 'catalog-2',
      })
    ).toBe(true);
    expect(
      shouldValidateShippingGroupRuleConflicts({
        autoAssignCategoryIds: ['category-rings'],
      })
    ).toBe(true);
    expect(
      shouldValidateShippingGroupRuleConflicts({
        autoAssignCurrencyCodes: ['EUR'],
      })
    ).toBe(true);
  });
});
