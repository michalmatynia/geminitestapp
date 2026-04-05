import { describe, expect, it } from 'vitest';

import { buildTraderaListingDescription } from './description';

describe('buildTraderaListingDescription', () => {
  it('appends both the product id and SKU when they are missing', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: 'Example description',
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example description | Product ID: BASE-1 | SKU: SKU-1');
  });

  it('appends only the missing SKU when the description already contains the product id', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: 'Example description\n\nProduct ID: BASE-1',
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example description\n\nProduct ID: BASE-1 | SKU: SKU-1');
  });

  it('treats the legacy item reference label as an existing product id marker', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: 'Example description\n\nItem reference: BASE-1',
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example description\n\nItem reference: BASE-1 | SKU: SKU-1');
  });

  it('falls back to the title when no description exists', () => {
    expect(
      buildTraderaListingDescription({
        rawDescription: null,
        fallbackTitle: 'Example title',
        baseProductId: 'BASE-1',
        sku: 'SKU-1',
      })
    ).toBe('Example title | Product ID: BASE-1 | SKU: SKU-1');
  });
});
