import { describe, expect, it } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';

import { validateNormalizedProductName } from './validateNormalizedProductName';

const CATEGORIES: ProductCategory[] = [
  {
    id: 'parent-pins',
    name: 'Pins',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
  },
  {
    id: 'leaf-anime-pins',
    name: 'Anime Pins',
    color: null,
    parentId: 'parent-pins',
    catalogId: 'catalog-a',
  },
];

const AMBIGUOUS_LEAF_CATEGORIES: ProductCategory[] = [
  {
    id: 'parent-anime',
    name: 'Anime',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
  },
  {
    id: 'parent-gaming',
    name: 'Gaming',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
  },
  {
    id: 'leaf-anime-badges',
    name: 'Badges',
    color: null,
    parentId: 'parent-anime',
    catalogId: 'catalog-a',
  },
  {
    id: 'leaf-gaming-badges',
    name: 'Badges',
    color: null,
    parentId: 'parent-gaming',
    catalogId: 'catalog-a',
  },
];

describe('validateNormalizedProductName', () => {
  it('accepts a valid five-part normalized title and canonicalizes the leaf category name', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Scout Regiment Badge | 4 cm | Metal | anime pins | Attack On Titan',
        categories: CATEGORIES,
      })
    ).toEqual({
      isValid: true,
      normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Anime Pins | Attack On Titan',
    });
  });

  it('accepts a full hierarchy category and rewrites the final title to the leaf name only', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Pins > Anime Pins | Attack On Titan',
        categories: CATEGORIES,
      })
    ).toEqual({
      isValid: true,
      normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Anime Pins | Attack On Titan',
    });
  });

  it('rejects placeholder base titles', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Name | 4 cm | Metal | Anime Pins | Attack On Titan',
        categories: CATEGORIES,
      })
    ).toEqual({
      isValid: false,
      error:
        'Normalize failed: the title segment is still generic. Provide a specific product title.',
    });
  });

  it('rejects placeholder size segments', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Scout Regiment Badge | X cm | Metal | Anime Pins | Attack On Titan',
        categories: CATEGORIES,
      })
    ).toEqual({
      isValid: false,
      error: 'Normalize failed: the size segment is still a placeholder such as "X cm".',
    });
  });

  it('rejects non-leaf categories', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Scout Regiment Badge | 4 cm | Metal | Pins | Attack On Titan',
        categories: CATEGORIES,
      })
    ).toEqual({
      isValid: false,
      error: 'Normalize failed: category must match one of the available leaf categories.',
    });
  });

  it('rejects ambiguous duplicate leaf names unless the hierarchy is provided', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Badge | 4 cm | Metal | Badges | Retro Gaming',
        categories: AMBIGUOUS_LEAF_CATEGORIES,
      })
    ).toEqual({
      isValid: false,
      error:
        'Normalize failed: category leaf is ambiguous. Return the full category hierarchy so the final leaf can be resolved uniquely.',
    });
  });

  it('uses the hierarchy to resolve duplicate leaf names but still writes only the leaf label', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Badge | 4 cm | Metal | Gaming > Badges | Retro Gaming',
        categories: AMBIGUOUS_LEAF_CATEGORIES,
      })
    ).toEqual({
      isValid: true,
      normalizedName: 'Collectible Badge | 4 cm | Metal | Badges | Retro Gaming',
    });
  });
});
