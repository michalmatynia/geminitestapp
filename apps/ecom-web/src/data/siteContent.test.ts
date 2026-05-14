import { describe, expect, it } from 'vitest';

import { HOME_UNIVERSE_CATEGORY_FILTERS } from './homeCategoryFilters';
import { SITE_CONTENT_DEFAULTS, normalizeSiteContent, validateSiteContent } from './siteContent';

function categoryParam(href: string): string {
  const [, query = ''] = href.split('?');
  return new URLSearchParams(query).get('categories') ?? '';
}

describe('site content background settings', () => {
  it('defaults the cosmos parallax background to enabled', () => {
    expect(normalizeSiteContent({}).background.cosmosParallaxEnabled).toBe(true);
  });

  it('accepts a disabled cosmos parallax background setting', () => {
    const content = normalizeSiteContent({
      ...SITE_CONTENT_DEFAULTS,
      background: {
        cosmosParallaxEnabled: false,
      },
    });

    expect(content.background.cosmosParallaxEnabled).toBe(false);
  });

  it('falls back to the default when the background setting is invalid', () => {
    const result = validateSiteContent({
      ...SITE_CONTENT_DEFAULTS,
      background: {
        cosmosParallaxEnabled: 'yes',
      },
    });

    expect(result.content.background.cosmosParallaxEnabled).toBe(true);
    expect(result.errors).toContain('background.cosmosParallaxEnabled must be true or false.');
  });
});

describe('stargater navigation links', () => {
  it('routes universe nav items into catalog category filters', () => {
    const navLinks = SITE_CONTENT_DEFAULTS.nav.links;

    expect(navLinks.map((link) => link.label)).toEqual([
      'Anime',
      'Gaming',
      'Film',
      'New Drops',
      'Catalog',
    ]);
    expect(categoryParam(navLinks[0].href).split(',')).toEqual(HOME_UNIVERSE_CATEGORY_FILTERS.Anime);
    expect(categoryParam(navLinks[1].href).split(',')).toEqual(HOME_UNIVERSE_CATEGORY_FILTERS.Gaming);
    expect(categoryParam(navLinks[2].href).split(',')).toEqual(HOME_UNIVERSE_CATEGORY_FILTERS.Movie);
    expect(navLinks[3]).toEqual({ label: 'New Drops', href: '/#new-drops' });
    expect(navLinks[4]).toEqual({ label: 'Catalog', href: '/products' });
  });

  it('normalizes stale CMS collection links to the current catalog nav', () => {
    const content = normalizeSiteContent({
      ...SITE_CONTENT_DEFAULTS,
      nav: {
        ...SITE_CONTENT_DEFAULTS.nav,
        links: [
          { label: 'Anime', href: '/collections/womenswear' },
          { label: 'Gaming', href: '/collections/menswear' },
          { label: 'Film', href: '/collections/accessories' },
          { label: 'New Drops', href: '/products?new=1' },
          { label: 'Catalog', href: '/products' },
        ],
      },
    });

    expect(content.nav.links).toEqual(SITE_CONTENT_DEFAULTS.nav.links);
  });
});
