import { describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright';

import { createPlaywrightPageDriver } from './playwright-page-driver';

describe('createPlaywrightPageDriver', () => {
  it('extracts list fields with a self-contained browser expression', async () => {
    document.body.innerHTML = `
      <product-list>
        <product-tile product-id="13937" name="40k primaris intercessors" price="100">
          <product-link><a href="/pl/p/40k-primaris-intercessors/13937">Open</a></product-link>
          <picture class="product-tile__image_primary"><img src="/image-a.jpg" /></picture>
          <picture class="product-tile__image_secondary"><img src="/image-b.jpg" /></picture>
        </product-tile>
      </product-list>
    `;
    const page = {
      evaluate: vi.fn(async (pageFunction: string) => {
        expect(typeof pageFunction).toBe('string');
        expect(pageFunction).not.toContain('__name');
        return Function(`return ${pageFunction};`)() as unknown;
      }),
    } as unknown as Page;

    const driver = createPlaywrightPageDriver(page);

    await expect(
      driver.extractList('product-list product-tile', {
        productId: { attribute: 'product-id' },
        title: { attribute: 'name' },
        url: { selector: 'product-link a', attribute: 'href' },
        images: {
          selector: 'picture.product-tile__image_primary img, picture.product-tile__image_secondary img',
          attribute: 'src',
          many: true,
        },
      })
    ).resolves.toEqual([
      {
        images: ['/image-a.jpg', '/image-b.jpg'],
        productId: '13937',
        title: '40k primaris intercessors',
        url: '/pl/p/40k-primaris-intercessors/13937',
      },
    ]);
  });
});
