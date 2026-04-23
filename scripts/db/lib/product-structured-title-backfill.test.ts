import { describe, expect, it } from 'vitest';

import { buildProductStructuredTitleBackfillResult } from './product-structured-title-backfill';

describe('buildProductStructuredTitleBackfillResult', () => {
  it('derives structured title fields from the English product title when storage is missing', () => {
    const result = buildProductStructuredTitleBackfillResult({
      id: 'product-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      structuredTitle: null,
    });

    expect(result).toEqual({
      productId: 'product-1',
      currentStructuredTitle: {},
      nextStructuredTitle: {
        size: '4 cm',
        material: 'Metal',
        theme: 'Attack On Titan',
      },
      changed: true,
      populatedFieldCount: 3,
      cleared: false,
    });
  });

  it('treats normalized stored values as already backfilled and ignores unrelated keys', () => {
    const result = buildProductStructuredTitleBackfillResult({
      id: 'product-2',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      structuredTitle: {
        size: ' 4 cm ',
        material: 'Metal',
        theme: ' Attack On Titan ',
        category: 'ignored',
      },
    });

    expect(result).toEqual({
      productId: 'product-2',
      currentStructuredTitle: {
        size: '4 cm',
        material: 'Metal',
        theme: 'Attack On Titan',
      },
      nextStructuredTitle: {
        size: '4 cm',
        material: 'Metal',
        theme: 'Attack On Titan',
      },
      changed: false,
      populatedFieldCount: 3,
      cleared: false,
    });
  });

  it('clears stale structured title fields when the English title no longer contains them', () => {
    const result = buildProductStructuredTitleBackfillResult({
      id: 'product-3',
      name_en: 'Scout Regiment',
      structuredTitle: {
        size: '4 cm',
        material: 'Metal',
        theme: 'Attack On Titan',
      },
    });

    expect(result).toEqual({
      productId: 'product-3',
      currentStructuredTitle: {
        size: '4 cm',
        material: 'Metal',
        theme: 'Attack On Titan',
      },
      nextStructuredTitle: {},
      changed: true,
      populatedFieldCount: 0,
      cleared: true,
    });
  });
});
