/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { extractScrapeImageLinksFromSourceHtml } from './product-scrape-profile-image-sources';

describe('extractScrapeImageLinksFromSourceHtml', () => {
  it('prefers high-resolution product gallery images and ignores related product images', () => {
    const html = `
      <img src="/environment/cache/images/productGfx_9999_1500_1500/related.jpg">
      <product-gallery>
        <a href="/environment/cache/images/productGfx_9255_0_0/product-one.webp"></a>
        <source srcset="/environment/cache/images/productGfx_9255_1500_1500/product-one.webp 1x">
        <img src="/environment/cache/images/productGfx_9256_500_500/product-two.jpg">
      </product-gallery>
      <img src="/environment/cache/images/productGfx_8888_1500_1500/also-related.jpg">
    `;

    expect(
      extractScrapeImageLinksFromSourceHtml(
        html,
        'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033'
      )
    ).toEqual([
      'https://www.battle-stock.pl/environment/cache/images/productGfx_9255_1500_1500/product-one.webp',
      'https://www.battle-stock.pl/environment/cache/images/productGfx_9256_500_500/product-two.jpg',
    ]);
  });
});
