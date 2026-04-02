import { describe, expect, it } from 'vitest';

import {
  collectBaseImportedProductIds,
  hasBaseImportMarketplaceSource,
  listingHasBaseImportProvenance,
} from './base-import-provenance';

describe('base import provenance helpers', () => {
  it('recognizes listings stamped by the Base import flow', () => {
    expect(hasBaseImportMarketplaceSource({ source: 'base-import' })).toBe(true);
    expect(hasBaseImportMarketplaceSource({ source: ' BASE-IMPORT ' })).toBe(true);
    expect(hasBaseImportMarketplaceSource({ source: 'base-import-backfill' })).toBe(false);
    expect(hasBaseImportMarketplaceSource({ source: 'base-export' })).toBe(false);
    expect(hasBaseImportMarketplaceSource(null)).toBe(false);
  });

  it('reads provenance from listing marketplace metadata', () => {
    expect(
      listingHasBaseImportProvenance({
        marketplaceData: { source: 'base-import', marketplace: 'base' },
      } as never)
    ).toBe(true);

    expect(
      listingHasBaseImportProvenance({
        marketplaceData: { source: 'base-import-backfill', marketplace: 'base' },
      } as never)
    ).toBe(false);
  });

  it('collects unique product ids from true imported listings only', () => {
    expect(
      collectBaseImportedProductIds([
        {
          productId: 'product-1',
          marketplaceData: { source: 'base-import' },
        } as never,
        {
          productId: 'product-1',
          marketplaceData: { source: 'base-import' },
        } as never,
        {
          productId: 'product-2',
          marketplaceData: { source: 'base-import-backfill' },
        } as never,
        {
          productId: 'product-3',
          marketplaceData: { source: 'base-export' },
        } as never,
      ])
    ).toEqual(['product-1']);
  });
});
