import { describe, expect, it } from 'vitest';

import { buildTraderaListingDescription } from './description';

describe('buildTraderaListingDescription', () => {
  it('appends both the item reference and SKU when they are missing', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: 'Example description',
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example description\n\nItem reference: BASE-1\nSKU: SKU-1');
  });

  it('appends only the missing SKU when the description already contains the item reference', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: 'Example description\n\nItem reference: BASE-1',
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example description\n\nItem reference: BASE-1\n\nSKU: SKU-1');
  });

  it('falls back to the title when no description exists', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: null,
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example title\n\nItem reference: BASE-1\nSKU: SKU-1');
  });
});
