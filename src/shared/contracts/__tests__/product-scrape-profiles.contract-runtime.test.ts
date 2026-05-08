import { describe, expect, it } from 'vitest';

import {
  productScrapeProfileRunResponseSchema,
  productScrapeProfileRuntimeSnapshotSchema,
} from '@/shared/contracts/products/scrape-profiles';

const baseRunResponse = {
  profileId: 'battlestock-warhammer-40k-30k',
  profileLabel: 'BattleStock Warhammer 40k / 30k',
  dryRun: false,
  catalog: { id: 'catalog-battle', name: 'BattleStock' },
  scrapedCount: 1,
  createdCount: 1,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  issueCount: 0,
  products: [
    {
      index: 0,
      status: 'created',
      productId: 'product-1',
      sku: 'BATTLESTOCK-13033',
      title: '40k Spiritseer',
      sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
      error: null,
    },
  ],
  summary: {
    rawCount: 1,
    mappedCount: 1,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
  },
};

const baseRuntime = {
  queueName: 'product-scrape-profile',
  runtimeActionId: 'runtime-action-battlestock',
  runtimeActionName: 'BattleStock Product Scrape',
  runtimeActionKey: 'product_scrape_battlestock',
  browserMode: 'headless',
  enabledStepCount: 14,
  totalStepCount: 16,
};

const imageStepControls = {
  applyImagePayload: true,
  collectProductGalleryImages: true,
  collectScrapedImageLinks: true,
  downloadProductGalleryImages: true,
  downloadScrapedImages: true,
  uploadProductImages: true,
};

describe('product scrape profiles contract runtime', () => {
  it('parses runtime image import metadata for completed scrape runs', () => {
    const parsed = productScrapeProfileRunResponseSchema.parse({
      ...baseRunResponse,
      runtime: {
        ...baseRuntime,
        imageImportMode: 'files',
        imageStepControls,
      },
    });

    expect(parsed.runtime?.imageImportMode).toBe('files');
    expect(parsed.runtime?.imageStepControls?.downloadScrapedImages).toBe(true);
    expect(parsed.runtime?.imageStepControls?.uploadProductImages).toBe(true);
  });

  it('keeps older runtime results without image metadata compatible', () => {
    const parsed = productScrapeProfileRuntimeSnapshotSchema.parse({
      run: {
        completedAt: '2026-05-08T12:01:00.000Z',
        createdAt: '2026-05-08T12:00:00.000Z',
        dryRun: false,
        error: null,
        id: 'product-scrape-profile__battlestock__run-1',
        profileId: 'battlestock-warhammer-40k-30k',
        queueName: 'product-scrape-profile',
        result: {
          ...baseRunResponse,
          runtime: baseRuntime,
        },
        startedAt: '2026-05-08T12:00:10.000Z',
        status: 'completed',
        updatedAt: '2026-05-08T12:01:00.000Z',
      },
    });

    expect(parsed.run?.result?.runtime?.runtimeActionKey).toBe('product_scrape_battlestock');
    expect(parsed.run?.result?.runtime?.imageImportMode).toBeUndefined();
    expect(parsed.run?.result?.runtime?.imageStepControls).toBeUndefined();
  });

  it('parses queued runtime runs with image import mode before completion', () => {
    const parsed = productScrapeProfileRuntimeSnapshotSchema.parse({
      run: {
        completedAt: null,
        createdAt: '2026-05-08T12:00:00.000Z',
        dryRun: false,
        error: null,
        id: 'product-scrape-profile__battlestock__run-2',
        imageImportMode: 'files',
        profileId: 'battlestock-warhammer-40k-30k',
        queueName: 'product-scrape-profile',
        result: null,
        startedAt: null,
        status: 'queued',
        updatedAt: '2026-05-08T12:00:00.000Z',
      },
    });

    expect(parsed.run?.status).toBe('queued');
    expect(parsed.run?.imageImportMode).toBe('files');
  });
});
