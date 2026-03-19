import { describe, expect, it } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products';

import { resolveValidatorCategoryReplacementId } from './resolveValidatorCategoryReplacement';

const categories: ProductCategory[] = [
  {
    id: 'category-1',
    name: 'Keychains',
    name_en: 'Keychains',
    name_pl: 'Breloki',
    name_de: 'Schlusselanhanger',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'category-2',
    name: 'Wallets',
    name_en: 'Wallets',
    name_pl: 'Portfele',
    name_de: 'Geldborsen',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'anime-pin',
    name: 'Anime Pins',
    name_en: 'Anime Pins',
    name_pl: 'Przypinki Anime',
    name_de: 'Anime Pins',
    color: null,
    parentId: null,
    catalogId: 'catalog-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('resolveValidatorCategoryReplacementId', () => {
  it('returns the category id when the replacement already contains an id', () => {
    expect(resolveValidatorCategoryReplacementId('category-1', categories)).toBe('category-1');
  });

  it('maps a category label back to its id', () => {
    expect(resolveValidatorCategoryReplacementId('Keychains', categories)).toBe('category-1');
    expect(resolveValidatorCategoryReplacementId('Portfele', categories)).toBe('category-2');
  });

  it('matches looser category label variants used by name-segment inference', () => {
    expect(resolveValidatorCategoryReplacementId('Anime Pin', categories)).toBe('anime-pin');
    expect(resolveValidatorCategoryReplacementId('anime-pin', categories)).toBe('anime-pin');
    expect(resolveValidatorCategoryReplacementId(' Anime   Pin ', categories)).toBe('anime-pin');
  });

  it('returns null when the replacement cannot be matched to a category', () => {
    expect(resolveValidatorCategoryReplacementId('Unknown category', categories)).toBeNull();
  });
});
