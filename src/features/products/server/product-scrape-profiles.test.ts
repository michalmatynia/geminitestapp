import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCatalog: vi.fn(),
  createProduct: vi.fn(),
  dryRun: vi.fn(),
  getProductBySku: vi.fn(),
  invalidateAll: vi.fn(),
  listCatalogs: vi.fn(),
  registryGet: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock('@/features/playwright/scripters/public', () => ({
  getDefaultScripterRegistry: () => ({
    get: mocks.registryGet,
  }),
  getDefaultScripterServer: () => ({
    dryRun: mocks.dryRun,
  }),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateAll: mocks.invalidateAll,
  },
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: async () => ({
    createCatalog: mocks.createCatalog,
    listCatalogs: mocks.listCatalogs,
  }),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    createProduct: mocks.createProduct,
    getProductBySku: mocks.getProductBySku,
    updateProduct: mocks.updateProduct,
  },
}));

import {
  listProductScrapeProfiles,
  runProductScrapeProfile,
} from './product-scrape-profiles';

const battleStockCatalog = {
  id: 'catalog-battlestock',
  name: 'BattleStock',
  description: null,
  isDefault: false,
  defaultLanguageId: null,
  defaultPriceGroupId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  languageIds: [],
  priceGroupIds: [],
};

const scripterDefinition = {
  id: 'battlestock-warhammer-40k-30k',
  version: 1,
  siteHost: 'www.battle-stock.pl',
  entryUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
  steps: [],
  fieldMap: { bindings: {} },
};

const makeSource = (drafts: unknown[]) => ({
  source: {
    type: 'scripter',
    scripterId: 'battlestock-warhammer-40k-30k',
    scripterVersion: 1,
    siteHost: 'www.battle-stock.pl',
    executionMode: 'dry_run',
    visitedUrls: ['https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45'],
  },
  drafts,
  rawResult: {
    records: drafts.map((draft) => (draft as { raw: Record<string, unknown> }).raw),
    run: {
      records: [],
      telemetry: [],
      errors: [],
      visitedUrls: ['https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45'],
    },
  },
  summary: {
    rawCount: drafts.length,
    mappedCount: drafts.length,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
    issueCountByField: {},
  },
});

const makeDraft = () => ({
  index: 0,
  externalId: '13033',
  draft: {
    name: '40k spiritseer',
    name_en: '40k spiritseer',
    name_pl: null,
    price: 60,
    supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    imageLinks: ['/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg'],
  },
  raw: {
    product_id: '13033',
    name: '40k spiritseer',
    price_raw: '60',
  },
  issues: [],
});

describe('product scrape profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.registryGet.mockResolvedValue(scripterDefinition);
    mocks.listCatalogs.mockResolvedValue([battleStockCatalog]);
    mocks.dryRun.mockResolvedValue(makeSource([makeDraft()]));
    mocks.getProductBySku.mockResolvedValue(null);
    mocks.createProduct.mockResolvedValue({
      id: 'product-created',
      sku: 'BATTLESTOCK-13033',
    });
    mocks.updateProduct.mockResolvedValue({
      id: 'product-updated',
      sku: 'BATTLESTOCK-13033',
    });
  });

  it('lists the BattleStock scrape profile', () => {
    const response = listProductScrapeProfiles();

    expect(response.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'battlestock-warhammer-40k-30k',
          targetCatalogName: 'BattleStock',
          scripterId: 'battlestock-warhammer-40k-30k',
        }),
      ])
    );
  });

  it('creates scraped BattleStock products in the BattleStock catalog', async () => {
    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
      limit: 1,
    });

    expect(mocks.dryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        scripterId: 'battlestock-warhammer-40k-30k',
        options: expect.objectContaining({
          limit: 1,
          catalogDefaults: { catalogIds: ['catalog-battlestock'] },
        }),
      })
    );
    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'BATTLESTOCK-13033',
        name_pl: '40k spiritseer',
        supplierName: 'BattleStock',
        supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
        price: 60,
        catalogIds: ['catalog-battlestock'],
        imageLinks: [
          'https://www.battle-stock.pl/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
        ],
      }),
      undefined
    );
    expect(response.createdCount).toBe(1);
    expect(response.catalog.name).toBe('BattleStock');
    expect(mocks.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('updates existing SKU matches and preserves their other catalog memberships', async () => {
    mocks.getProductBySku.mockResolvedValue({
      id: 'product-existing',
      sku: 'BATTLESTOCK-13033',
      catalogs: [{ productId: 'product-existing', catalogId: 'catalog-other', assignedAt: '' }],
    });

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
    });

    expect(mocks.updateProduct).toHaveBeenCalledWith(
      'product-existing',
      expect.objectContaining({
        sku: 'BATTLESTOCK-13033',
        catalogIds: ['catalog-other', 'catalog-battlestock'],
      }),
      undefined
    );
    expect(mocks.createProduct).not.toHaveBeenCalled();
    expect(response.updatedCount).toBe(1);
  });

  it('supports dry runs without mutating products', async () => {
    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
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

    await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
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
});
