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

const SPECIFIC_KEYCHAIN_CATEGORIES: ProductCategory[] = [
  {
    id: 'parent-accessories',
    name: 'Accessories',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
  },
  {
    id: 'parent-keychains',
    name: 'Keychains',
    color: null,
    parentId: 'parent-accessories',
    catalogId: 'catalog-a',
  },
  {
    id: 'leaf-movie-keychain',
    name: 'Movie Keychain',
    color: null,
    parentId: 'parent-keychains',
    catalogId: 'catalog-a',
  },
  {
    id: 'leaf-gaming-keychain',
    name: 'Gaming Keychain',
    color: null,
    parentId: 'parent-keychains',
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
      error:
        'Normalize failed: category is too generic. Return the most specific terminal leaf category or the full hierarchy so the final leaf can be resolved.',
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

  it('rejects generic hierarchy segments when the context registry exposes more specific terminal leaves', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Charm | 4 cm | Metal | Keychains | Retro Gaming',
        categories: SPECIFIC_KEYCHAIN_CATEGORIES,
      })
    ).toEqual({
      isValid: false,
      error:
        'Normalize failed: category is too generic. Return the most specific terminal leaf category or the full hierarchy so the final leaf can be resolved.',
    });
  });

  it('uses a more specific category hint hierarchy to rewrite a generic normalized category to the terminal leaf', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Charm | 4 cm | Metal | Keychains | Retro Gaming',
        categoryHint: 'Accessories > Keychains > Gaming Keychain',
        categories: SPECIFIC_KEYCHAIN_CATEGORIES,
      })
    ).toEqual({
      isValid: true,
      normalizedName: 'Collectible Charm | 4 cm | Metal | Gaming Keychain | Retro Gaming',
    });
  });

  it('uses AI Path live category context when local categories are unavailable', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Charm | 4 cm | Metal | Keychains | Retro Gaming',
        categoryHint: 'Accessories > Keychains > Gaming Keychain',
        categories: [],
        categoryContext: {
          leafCategories: [
            {
              label: 'Movie Keychain',
              fullPath: 'Accessories > Keychains > Movie Keychain',
            },
            {
              label: 'Gaming Keychain',
              fullPath: 'Accessories > Keychains > Gaming Keychain',
            },
          ],
          allowedLeafLabels: ['Movie Keychain', 'Gaming Keychain'],
          totalLeafCategories: 2,
        },
      })
    ).toEqual({
      isValid: true,
      normalizedName: 'Collectible Charm | 4 cm | Metal | Gaming Keychain | Retro Gaming',
    });
  });

  it('rejects normalize results when the AI Path reports no live leaf categories', () => {
    expect(
      validateNormalizedProductName({
        normalizedName: 'Collectible Charm | 4 cm | Metal | Keychains | Retro Gaming',
        categories: [],
        categoryContext: {
          leafCategories: [],
          allowedLeafLabels: [],
          totalLeafCategories: 0,
        },
      })
    ).toEqual({
      isValid: false,
      error: 'Normalize failed: category context unavailable.',
    });
  });
});
