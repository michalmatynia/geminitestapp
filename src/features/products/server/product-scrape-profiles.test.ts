import { beforeEach, expect, it } from 'vitest';

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

let scrapeProfiles: ProductScrapeProfilesModule;

beforeEach(async () => {
  resetProductScrapeProfileMocks();
  scrapeProfiles = await importProductScrapeProfiles();
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
      options: expect.objectContaining({
        limit: 1,
        catalogDefaults: { catalogIds: ['catalog-battlestock'] },
      }),
    })
  );
  expect(mocks.createProduct).toHaveBeenCalledWith(
    expect.objectContaining({
      sku: 'BATTLESTOCK-13033',
      importSource: 'scrape',
      name_pl: '40k spiritseer',
      supplierName: 'BattleStock',
      supplierLink: BATTLESTOCK_SOURCE_URL,
      sourcePrice: 60,
      catalogIds: ['catalog-battlestock'],
      imageLinks: [
        'https://www.battle-stock.pl/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
      ],
    }),
    undefined
  );
  expect(response.createdCount).toBe(1);
  expect(response.catalog.name).toBe('BattleStock');
  expect(mocks.ensureScrapedSourceListing).toHaveBeenCalledWith('product-created', 'linked');
  expect(mocks.invalidateAll).toHaveBeenCalledTimes(1);
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
