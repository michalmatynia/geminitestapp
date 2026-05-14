import { describe, expect, it } from 'vitest';

import { HOME_CONTENT_DEFAULTS } from '@/data/homeContent';
import { HOME_UNIVERSE_CATEGORY_FILTERS } from '@/data/homeCategoryFilters';
import {
  buildHomeFeaturedFilterHref,
  getHomeFeaturedFilterConfigs,
  resolveHomeFeaturedFilterKey,
} from './homeFeaturedFilters';

describe('home featured filters', () => {
  it('resolves Fresh Drops filter labels to universe keys', () => {
    expect(resolveHomeFeaturedFilterKey('All')).toBe('all');
    expect(resolveHomeFeaturedFilterKey('Anime')).toBe('Anime');
    expect(resolveHomeFeaturedFilterKey('Gaming')).toBe('Gaming');
    expect(resolveHomeFeaturedFilterKey('Film')).toBe('Movie');
    expect(resolveHomeFeaturedFilterKey('Film & TV')).toBe('Movie');
  });

  it('builds category URLs for filtered Fresh Drops CTAs', () => {
    expect(buildHomeFeaturedFilterHref(['Anime Pin', 'Anime Wallet'])).toBe(
      '/products?categories=Anime+Pin%2CAnime+Wallet',
    );
  });

  it('maps default Fresh Drops buttons to live Anime, Gaming, and Movie categories', () => {
    const configs = getHomeFeaturedFilterConfigs(HOME_CONTENT_DEFAULTS.featured.filters, [
      { name: 'Anime Pin' },
      { name: 'Gaming Wallet' },
      { name: 'Movie Keychain' },
      { name: 'Set Of 7 Dice' },
    ]);

    expect(configs.find((filter) => filter.label === 'All')?.categories).toEqual([]);
    expect(configs.find((filter) => filter.label === 'Anime')?.categories).toEqual(['Anime Pin']);
    expect(configs.find((filter) => filter.label === 'Gaming')?.categories).toEqual(['Gaming Wallet']);
    expect(configs.find((filter) => filter.label === 'Film')?.categories).toEqual(['Movie Keychain']);
  });

  it('falls back to configured universe categories without a live catalog list', () => {
    const configs = getHomeFeaturedFilterConfigs(['Film']);

    expect(configs[0]?.categories).toEqual(HOME_UNIVERSE_CATEGORY_FILTERS.Movie);
  });
});
