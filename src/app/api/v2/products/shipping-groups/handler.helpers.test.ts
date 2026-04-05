import { describe, expect, it } from 'vitest';

import {
  assertAvailableShippingGroupCreateName,
  buildShippingGroupCreateDraft,
  buildShippingGroupCreateInput,
  requireShippingGroupCatalogId,
} from './handler.helpers';

describe('product shipping groups handler helpers', () => {
  it('requires catalogId query input for list requests', () => {
    expect(requireShippingGroupCatalogId({ catalogId: 'catalog-1' })).toBe('catalog-1');
    expect(() => requireShippingGroupCatalogId({})).toThrow(
      'catalogId query parameter is required'
    );
  });

  it('rejects duplicate shipping group names within the catalog', () => {
    expect(() =>
      assertAvailableShippingGroupCreateName({ id: 'shipping-group-2' }, 'Priority', 'catalog-1')
    ).toThrow('A shipping group with this name already exists in this catalog');
  });

  it('builds matching draft and create payloads with normalized category ids', () => {
    const input = {
      name: 'Priority',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery', 'category-rings'],
    } as const;

    expect(buildShippingGroupCreateDraft(input, ['category-jewellery'], [])).toEqual({
      id: '__draft-shipping-group__',
      name: 'Priority',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });

    expect(buildShippingGroupCreateInput(input, ['category-jewellery'], [])).toEqual({
      name: 'Priority',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['category-jewellery'],
      autoAssignCurrencyCodes: [],
    });
  });
});
