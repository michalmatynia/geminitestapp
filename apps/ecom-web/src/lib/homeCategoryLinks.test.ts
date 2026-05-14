import { describe, expect, it } from 'vitest';

import { HOME_CONTENT_DEFAULTS, type HomeCategoryCardContent } from '@/data/homeContent';
import { HOME_UNIVERSE_CATEGORY_FILTERS } from '@/data/homeCategoryFilters';
import {
  buildHomeProductTypeCategoryHref,
  FALLBACK_MOVIE_CATEGORY_FILTERS,
  getHomeProductTypeCategoryValues,
  getHomeCategoryCardHref,
  getHomeUniverseCategoryValues,
  HOME_PRODUCT_TYPE_CATEGORY_FILTERS,
  resolveHomeProductTypeFilterKey,
} from './homeCategoryLinks';

function cardByLabel(label: string, overrides: Partial<HomeCategoryCardContent> = {}): HomeCategoryCardContent {
  const card = HOME_CONTENT_DEFAULTS.categories.cards.find((item) => item.label === label);
  if (!card) throw new Error(`${label} default card missing`);
  return { ...card, ...overrides };
}

function categoryParam(href: string): string {
  const query = href.split('?')[1] ?? '';
  return new URLSearchParams(query).get('categories') ?? '';
}

describe('home category links', () => {
  it('uses live Movie categories for the Film & TV card', () => {
    const href = getHomeCategoryCardHref(
      cardByLabel('Film & TV', {
        href: '/products?categories=Film%20Collectibles',
        selectorValues: ['Film Collectibles'],
      }),
      [
        { name: 'Anime Keychain' },
        { name: 'Movie Pin' },
        { name: 'Movie Wallet' },
      ],
    );

    expect(categoryParam(href)).toBe('Movie Pin,Movie Wallet');
    expect(href).not.toContain('Film');
  });

  it('treats live Film category names as movie-universe filters', () => {
    expect(getHomeUniverseCategoryValues('Movie', [
      { name: 'Film Keychain' },
      { name: 'TV Pendant' },
      { name: 'Gaming Pin' },
    ])).toEqual(['Film Keychain', 'TV Pendant']);
  });

  it('falls back to Movie category filters when CMS still has Film Collectibles', () => {
    const href = getHomeCategoryCardHref(
      cardByLabel('Film & TV', {
        href: '/products?categories=Film%20Collectibles',
        selectorValues: ['Film Collectibles'],
      }),
    );
    const values = categoryParam(href).split(',');

    expect(values).toEqual(FALLBACK_MOVIE_CATEGORY_FILTERS);
    expect(values.every((value) => /\bMovie\b/.test(value))).toBe(true);
  });

  it('uses live Anime categories for the Anime card', () => {
    const href = getHomeCategoryCardHref(
      cardByLabel('Anime', {
        selectorValues: ['Anime Ring', 'Anime Keychain'],
      }),
      [
        { name: 'Anime Cards' },
        { name: 'Anime Ring' },
        { name: 'Movie Wallet' },
      ],
    );

    expect(categoryParam(href)).toBe('Anime Cards,Anime Ring');
  });

  it('uses Gaming category filters even when stale CMS still has theme values', () => {
    const href = getHomeCategoryCardHref(
      cardByLabel('Gaming', {
        href: '/products?themes=Elden%20Ring,Warhammer%2040k',
        selectorType: 'theme',
        selectorValues: ['Elden Ring', 'Warhammer 40k'],
      }),
      [
        { name: 'Gaming Pin' },
        { name: 'Gaming Wallet' },
        { name: 'Anime Ring' },
      ],
    );

    expect(categoryParam(href)).toBe('Gaming Pin,Gaming Wallet');
    expect(href).not.toContain('themes=');
  });

  it('falls back to configured universe category filters when live categories are unavailable', () => {
    const href = getHomeCategoryCardHref(cardByLabel('Anime'));

    expect(categoryParam(href).split(',')).toEqual(HOME_UNIVERSE_CATEGORY_FILTERS.Anime);
  });

  it('keeps unrelated category selectors unchanged', () => {
    const href = getHomeCategoryCardHref({
      id: 'dice',
      label: 'Dice',
      sublabel: 'Tabletop',
      tag: 'Accessories',
      visible: true,
      href: '/products?categories=Set%20Of%207%20Dice',
      imageUrl: '',
      selectorType: 'category',
      selectorValues: ['Set Of 7 Dice'],
      fallbackCount: 10,
    });

    expect(categoryParam(href)).toBe('Set Of 7 Dice');
  });

  it('builds product-type catalog links from live category names', () => {
    const href = buildHomeProductTypeCategoryHref('Keychains', [
      { name: 'Anime Keychain', parentName: 'Keychains' },
      { name: 'Gaming Keychain', parentName: 'Keychains' },
      { name: 'Movie Ring', parentName: 'Rings' },
    ]);

    expect(categoryParam(href)).toBe('Anime Keychain,Gaming Keychain');
  });

  it('falls back to product-type category filters without live categories', () => {
    expect(getHomeProductTypeCategoryValues('Bracelets')).toEqual(HOME_PRODUCT_TYPE_CATEGORY_FILTERS.Bracelets);
    expect(getHomeProductTypeCategoryValues('Dice')).toEqual(HOME_PRODUCT_TYPE_CATEGORY_FILTERS.Dice);
    expect(getHomeProductTypeCategoryValues('Pins')).toEqual(HOME_PRODUCT_TYPE_CATEGORY_FILTERS.Pins);
    expect(getHomeProductTypeCategoryValues('Rings')).toEqual(HOME_PRODUCT_TYPE_CATEGORY_FILTERS.Rings);
  });

  it('resolves hero badge labels to product-type filters', () => {
    expect(resolveHomeProductTypeFilterKey('Keychains')).toBe('Keychains');
    expect(resolveHomeProductTypeFilterKey('Pins')).toBe('Pins');
    expect(resolveHomeProductTypeFilterKey('Rings')).toBe('Rings');
    expect(resolveHomeProductTypeFilterKey('Bracelets')).toBe('Bracelets');
    expect(resolveHomeProductTypeFilterKey('Dice')).toBe('Dice');
    expect(resolveHomeProductTypeFilterKey('Anime')).toBeNull();
  });

  it('builds product-type catalog links for Bracelets and Dice', () => {
    expect(categoryParam(buildHomeProductTypeCategoryHref('Bracelets', [
      { name: 'Gaming Bracelets' },
      { name: 'Gaming Ring' },
    ]))).toBe('Gaming Bracelets');

    expect(categoryParam(buildHomeProductTypeCategoryHref('Dice', [
      { name: 'Keychain Mini Dice' },
      { name: 'Set Of 7 Dice' },
      { name: 'Movie Keychain' },
    ]))).toBe('Keychain Mini Dice,Set Of 7 Dice');
  });
});
