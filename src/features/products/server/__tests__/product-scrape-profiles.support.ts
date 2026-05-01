import { vi } from 'vitest';

import type {
  ScripterImportDraft,
  ScripterImportSourceResult,
} from '@/features/playwright/scripters';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type * as ProductScrapeProfilesApi from '../product-scrape-profiles';

export const BATTLESTOCK_PROFILE_ID = 'battlestock-warhammer-40k-30k';
export const BATTLESTOCK_SOURCE_URL =
  'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033';

const mocks = vi.hoisted(() => ({
  createCatalog: vi.fn(),
  createProduct: vi.fn(),
  captureException: vi.fn(),
  dryRun: vi.fn(),
  ensureScrapedSourceListing: vi.fn(),
  findProductBySupplierLink: vi.fn(),
  getMongoDb: vi.fn(),
  getCategoryById: vi.fn(),
  getDraft: vi.fn(),
  getProductBySku: vi.fn(),
  invalidateAll: vi.fn(),
  listCatalogs: vi.fn(),
  registryGet: vi.fn(),
  updateProduct: vi.fn(),
}));

export const productScrapeProfileMocks = mocks;

vi.mock('@/features/playwright/scripters/public', () => ({
  getDefaultScripterRegistry: () => ({
    get: productScrapeProfileMocks.registryGet,
  }),
  getDefaultScripterServer: () => ({
    dryRun: productScrapeProfileMocks.dryRun,
  }),
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateAll: productScrapeProfileMocks.invalidateAll,
  },
}));

vi.mock('@/features/drafter/services/draft-service', () => ({
  getDraft: productScrapeProfileMocks.getDraft,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: productScrapeProfileMocks.captureException,
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: productScrapeProfileMocks.getMongoDb,
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: () =>
    Promise.resolve({
      createCatalog: productScrapeProfileMocks.createCatalog,
      listCatalogs: productScrapeProfileMocks.listCatalogs,
    }),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: () =>
    Promise.resolve({
      getCategoryById: productScrapeProfileMocks.getCategoryById,
    }),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    createProduct: productScrapeProfileMocks.createProduct,
    findProductBySupplierLink: productScrapeProfileMocks.findProductBySupplierLink,
    getProductBySku: productScrapeProfileMocks.getProductBySku,
    updateProduct: productScrapeProfileMocks.updateProduct,
  },
}));

vi.mock('../product-scraped-source-common', () => ({
  ensureScrapedSourceListing: productScrapeProfileMocks.ensureScrapedSourceListing,
}));

export type ProductScrapeProfilesModule = typeof ProductScrapeProfilesApi;

export const importProductScrapeProfiles = async (): Promise<ProductScrapeProfilesModule> =>
  await import('../product-scrape-profiles');

export const battleStockCatalog: CatalogRecord = {
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

const gamingPendantCategory: ProductCategory = {
  id: 'category-pendants',
  name: 'Gaming Pendant',
  name_en: 'Gaming Pendant',
  name_pl: null,
  name_de: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-battlestock',
  sortIndex: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const scripterDefinition = {
  id: BATTLESTOCK_PROFILE_ID,
  version: 1,
  siteHost: 'www.battle-stock.pl',
  entryUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
  steps: [],
  fieldMap: { bindings: {} },
};

export const makeSource = (
  drafts: ScripterImportDraft[]
): ScripterImportSourceResult => ({
  source: {
    type: 'scripter',
    scripterId: BATTLESTOCK_PROFILE_ID,
    scripterVersion: 1,
    siteHost: 'www.battle-stock.pl',
    executionMode: 'dry_run',
    visitedUrls: ['https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45'],
  },
  drafts,
  rawResult: {
    records: drafts.map((draft) => draft.raw),
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

export const makeDraft = (): ScripterImportDraft => ({
  index: 0,
  externalId: '13033',
  draft: {
    name: '40k spiritseer',
    name_en: '40k spiritseer',
    name_pl: null,
    price: 60,
    supplierLink: BATTLESTOCK_SOURCE_URL,
    imageLinks: ['/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg'],
  },
  raw: {
    product_id: '13033',
    name: '40k spiritseer',
    price_raw: '60',
  },
  issues: [],
});

export const resetProductScrapeProfileMocks = (): void => {
  vi.clearAllMocks();
  productScrapeProfileMocks.registryGet.mockResolvedValue(scripterDefinition);
  productScrapeProfileMocks.listCatalogs.mockResolvedValue([battleStockCatalog]);
  productScrapeProfileMocks.getCategoryById.mockResolvedValue(gamingPendantCategory);
  productScrapeProfileMocks.dryRun.mockResolvedValue(makeSource([makeDraft()]));
  productScrapeProfileMocks.getDraft.mockResolvedValue(null);
  productScrapeProfileMocks.getProductBySku.mockResolvedValue(null);
  productScrapeProfileMocks.findProductBySupplierLink.mockResolvedValue(null);
  productScrapeProfileMocks.getMongoDb.mockResolvedValue({
    collection: vi.fn((name: string) => {
      if (name === 'price_groups') {
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        };
      }
      if (name === 'currencies') {
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        };
      }
      throw new Error(`Unexpected collection lookup: ${name}`);
    }),
  });
  productScrapeProfileMocks.createProduct.mockResolvedValue({
    id: 'product-created',
    sku: 'BATTLESTOCK-13033',
  });
  productScrapeProfileMocks.captureException.mockResolvedValue(undefined);
  productScrapeProfileMocks.ensureScrapedSourceListing.mockResolvedValue({});
  productScrapeProfileMocks.updateProduct.mockResolvedValue({
    id: 'product-updated',
    sku: 'BATTLESTOCK-13033',
  });
};
