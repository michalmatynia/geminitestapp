import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  BATTLESTOCK_PROFILE_ID,
  BATTLESTOCK_SOURCE_URL,
  battleStockCatalog,
  importProductScrapeProfiles,
  makeDraft,
  makeSource,
  productScrapeProfileMocks as mocks,
  type ProductScrapeProfilesModule,
  resetProductScrapeProfileMocks,
} from './__tests__/product-scrape-profiles.support';
import { PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY } from '@/shared/lib/browser-execution/product-scrape-runtime-constants';

let scrapeProfiles: ProductScrapeProfilesModule;

beforeEach(async () => {
  resetProductScrapeProfileMocks();
  scrapeProfiles = await importProductScrapeProfiles();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('lists the BattleStock scrape profile', () => {
  const response = scrapeProfiles.listProductScrapeProfiles();

  expect(response.profiles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: BATTLESTOCK_PROFILE_ID,
        targetCatalogName: 'BattleStock',
        scripterId: BATTLESTOCK_PROFILE_ID,
      }),
    ])
  );
});

it('creates scraped BattleStock products in the BattleStock catalog', async () => {
  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    limit: 1,
  });

  expect(mocks.dryRun).toHaveBeenCalledWith(
    expect.objectContaining({
      scripterId: BATTLESTOCK_PROFILE_ID,
      runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
      executionSettings: expect.objectContaining({ headless: false }),
      options: expect.objectContaining({
        limit: 1,
        catalogDefaults: { catalogIds: ['catalog-battlestock'] },
      }),
    })
  );
  expect(mocks.resolveRuntimeActionDefinition).toHaveBeenCalledWith(
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY
  );
  expect(mocks.createProduct).toHaveBeenCalledWith(
    expect.objectContaining({
      sku: 'BATTLESTOCK-13033',
      importSource: 'scrape',
      name_pl: '40k spiritseer',
      supplierName: 'BattleStock',
      supplierLink: BATTLESTOCK_SOURCE_URL,
      sourcePrice: 60,
      sourcePriceCurrencyCode: 'PLN',
      catalogIds: ['catalog-battlestock'],
      imageLinks: [
        'https://www.battle-stock.pl/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
      ],
    }),
    undefined
  );
  expect(response.createdCount).toBe(1);
  expect(response.catalog.name).toBe('BattleStock');
  expect(response.runtime).toMatchObject({
    queueName: null,
    runtimeActionId: 'runtime-action-battlestock',
    runtimeActionName: 'BattleStock Product Scrape',
    runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
    browserMode: 'headed',
    enabledStepCount: 0,
    totalStepCount: 0,
  });
  expect(mocks.ensureScrapedSourceListing).toHaveBeenCalledWith('product-created', 'linked');
  expect(mocks.invalidateAll).toHaveBeenCalledTimes(1);
});

it('calculates imported BattleStock product prices from catalog price group settings', async () => {
  mocks.listCatalogs.mockResolvedValue([
    {
      ...battleStockCatalog,
      defaultPriceGroupId: 'price-group-retail',
      priceGroupIds: ['price-group-retail'],
    },
  ]);
  mocks.getMongoDb.mockResolvedValue({
    collection: vi.fn((name: string) => {
      if (name === 'price_groups') {
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([
              {
                id: 'price-group-retail',
                groupId: 'RETAIL',
                currencyId: 'PLN',
                type: 'standard',
                basePriceField: 'sourcePrice',
                sourceGroupId: null,
                priceMultiplier: 1.5,
                addToPrice: 10,
              },
            ]),
          })),
        };
      }
      if (name === 'currencies') {
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([
              {
                id: 'PLN',
                code: 'PLN',
                name: 'Polish Zloty',
                symbol: 'zł',
              },
            ]),
          })),
        };
      }
      throw new Error(`Unexpected collection lookup: ${name}`);
    }),
  });

  await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    limit: 1,
  });

  expect(mocks.createProduct).toHaveBeenCalledWith(
    expect.objectContaining({
      defaultPriceGroupId: 'price-group-retail',
      sourcePrice: 60,
      sourcePriceCurrencyCode: 'PLN',
      price: 100,
    }),
    undefined
  );
});

it('downloads scraped images as product files when requested', async () => {
  const fetchMock = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['image-bytes'], { type: 'image/jpeg' })),
    headers: { get: () => 'image/jpeg' },
  }));
  vi.stubGlobal('fetch', fetchMock);

  await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    limit: 1,
    imageImportMode: 'files',
  });

  expect(fetchMock).toHaveBeenCalledWith(
    'https://www.battle-stock.pl/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
    { cache: 'no-store' }
  );
  expect(mocks.uploadFile).toHaveBeenCalledWith(
    expect.objectContaining({
      name: '40k-spiritseer.jpg',
      type: 'image/jpeg',
    }),
    expect.objectContaining({
      category: 'products',
      sku: 'BATTLESTOCK-13033',
      filenameOverride: '40k-spiritseer.jpg',
    })
  );
  expect(mocks.createProduct).toHaveBeenCalledWith(
    expect.objectContaining({
      imageFileIds: ['image-file-1'],
      imageLinks: [
        'https://www.battle-stock.pl/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
      ],
    }),
    undefined
  );
});

it('keeps the product import successful when scraped source linking fails', async () => {
  const linkError = new Error('listing write failed');
  mocks.ensureScrapedSourceListing.mockRejectedValueOnce(linkError);

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    limit: 1,
  });

  expect(response.createdCount).toBe(1);
  expect(response.failedCount).toBe(0);
  expect(mocks.captureException).toHaveBeenCalledWith(
    linkError,
    expect.objectContaining({
      service: 'product-scrape-profiles',
      action: 'linkPersistedScrapedProduct',
      productId: 'product-created',
      sourceUrl: BATTLESTOCK_SOURCE_URL,
    })
  );
});

it('updates existing SKU matches and preserves their other catalog memberships', async () => {
  mocks.getProductBySku.mockResolvedValue({
    id: 'product-existing',
    sku: 'BATTLESTOCK-13033',
    catalogs: [{ productId: 'product-existing', catalogId: 'catalog-other', assignedAt: '' }],
  });

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
  });

  expect(mocks.updateProduct).toHaveBeenCalledWith(
    'product-existing',
    expect.objectContaining({
      sku: 'BATTLESTOCK-13033',
      importSource: 'scrape',
      catalogIds: ['catalog-other', 'catalog-battlestock'],
    }),
    undefined
  );
  expect(mocks.createProduct).not.toHaveBeenCalled();
  expect(response.updatedCount).toBe(1);
  expect(mocks.ensureScrapedSourceListing).toHaveBeenCalledWith('product-updated', 'linked');
});

it('updates existing source URL matches when the scraped SKU changed', async () => {
  mocks.getProductBySku.mockResolvedValue(null);
  mocks.findProductBySupplierLink.mockResolvedValue({
    id: 'product-existing-source',
    sku: 'BATTLESTOCK-OLD-13033',
    catalogs: [{ productId: 'product-existing-source', catalogId: 'catalog-other', assignedAt: '' }],
  });

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
  });

  expect(mocks.findProductBySupplierLink).toHaveBeenCalledWith(BATTLESTOCK_SOURCE_URL);
  expect(mocks.updateProduct).toHaveBeenCalledWith(
    'product-existing-source',
    expect.objectContaining({
      sku: 'BATTLESTOCK-13033',
      supplierLink: BATTLESTOCK_SOURCE_URL,
      catalogIds: ['catalog-other', 'catalog-battlestock'],
    }),
    undefined
  );
  expect(mocks.createProduct).not.toHaveBeenCalled();
  expect(response.updatedCount).toBe(1);
  expect(mocks.ensureScrapedSourceListing).toHaveBeenCalledWith('product-updated', 'linked');
});

it('skips duplicate scraped candidates within a single run', async () => {
  const duplicateDraft = {
    ...makeDraft(),
    index: 1,
    externalId: null,
    raw: { product_id: null, name: '40k spiritseer', price_raw: '60' },
    draft: {
      ...makeDraft().draft,
      supplierLink: `${BATTLESTOCK_SOURCE_URL}?utm_source=category#details`,
    },
  };
  mocks.dryRun.mockResolvedValue(makeSource([makeDraft(), duplicateDraft]));

  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
  });

  expect(mocks.createProduct).toHaveBeenCalledTimes(1);
  expect(response.createdCount).toBe(1);
  expect(response.skippedCount).toBe(1);
  expect(response.products[1]).toMatchObject({
    status: 'skipped',
    error: 'Duplicate scraped product in this run.',
    sourceUrl: BATTLESTOCK_SOURCE_URL,
  });
});

it('supports dry runs without mutating products', async () => {
  const response = await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    dryRun: true,
  });

  expect(mocks.createProduct).not.toHaveBeenCalled();
  expect(mocks.updateProduct).not.toHaveBeenCalled();
  expect(mocks.invalidateAll).not.toHaveBeenCalled();
  expect(response.products[0]?.status).toBe('dry_run');
});

it('creates the BattleStock catalog when it does not exist', async () => {
  mocks.listCatalogs.mockResolvedValue([]);
  mocks.createCatalog.mockResolvedValue({ ...battleStockCatalog, isDefault: true });

  await scrapeProfiles.runProductScrapeProfile({
    profileId: BATTLESTOCK_PROFILE_ID,
    dryRun: true,
  });

  expect(mocks.createCatalog).toHaveBeenCalledWith({
    name: 'BattleStock',
    description: null,
    isDefault: true,
    languageIds: [],
    defaultLanguageId: null,
    priceGroupIds: [],
    defaultPriceGroupId: null,
  });
});
