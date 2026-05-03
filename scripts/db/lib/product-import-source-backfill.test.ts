import { describe, expect, it } from 'vitest';

import { buildProductImportSourceBackfillPlan } from './product-import-source-backfill';

describe('buildProductImportSourceBackfillPlan', () => {
  it('targets only products backed by true Base import listings and missing provenance', () => {
    const result = buildProductImportSourceBackfillPlan({
      products: [
        { id: 'product-1', importSource: null },
        { id: 'product-2', importSource: 'base' },
        { id: 'product-3', importSource: null },
      ],
      listings: [
        { productId: 'product-1', marketplaceData: { source: 'base-import' } } as never,
        { productId: 'product-2', marketplaceData: { source: 'base-import' } } as never,
        { productId: 'product-3', marketplaceData: { source: 'base-import-backfill' } } as never,
      ],
    });

    expect(result).toEqual({
      candidateImportedProductIds: ['product-1', 'product-2'],
      targetProductIds: ['product-1'],
      alreadyTaggedProductIds: ['product-2'],
    });
  });

  it('also targets detached products imported through Base import run items', () => {
    const result = buildProductImportSourceBackfillPlan({
      products: [
        { id: 'product-detached', importSource: null },
        { id: 'product-dry-run', importSource: null },
        { id: 'product-tagged', importSource: 'base' },
      ],
      listings: [],
      runItems: [
        {
          importedProductId: 'product-detached',
          status: 'imported',
          action: 'imported',
        },
        {
          importedProductId: 'product-dry-run',
          status: 'imported',
          action: 'dry_run',
        },
        {
          importedProductId: 'product-tagged',
          status: 'imported',
          action: 'imported',
        },
      ],
    });

    expect(result).toEqual({
      candidateImportedProductIds: ['product-detached', 'product-tagged'],
      targetProductIds: ['product-detached'],
      alreadyTaggedProductIds: ['product-tagged'],
    });
  });

  it('ignores malformed ids and unrelated listing metadata', () => {
    const result = buildProductImportSourceBackfillPlan({
      products: [
        { id: '', importSource: null },
        { id: 'product-4', importSource: null },
      ],
      listings: [
        { productId: '', marketplaceData: { source: 'base-import' } } as never,
        { productId: 'product-4', marketplaceData: { source: 'base-export' } } as never,
      ],
    });

    expect(result).toEqual({
      candidateImportedProductIds: [],
      targetProductIds: [],
      alreadyTaggedProductIds: [],
    });
  });
});
