import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCatalog: vi.fn(),
  createProduct: vi.fn(),
  captureException: vi.fn(),
  dryRun: vi.fn(),
  ensureScrapedSourceListing: vi.fn(),
  getCategoryById: vi.fn(),
  findProductBySupplierLink: vi.fn(),
  getDraft: vi.fn(),
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

vi.mock('@/features/drafter/services/draft-service', () => ({
  getDraft: mocks.getDraft,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: () => Promise.resolve({
    createCatalog: mocks.createCatalog,
    listCatalogs: mocks.listCatalogs,
  }),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: () => Promise.resolve({
    getCategoryById: mocks.getCategoryById,
  }),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    createProduct: mocks.createProduct,
    findProductBySupplierLink: mocks.findProductBySupplierLink,
    getProductBySku: mocks.getProductBySku,
    updateProduct: mocks.updateProduct,
  },
}));

vi.mock('./product-scraped-source-common', () => ({
  ensureScrapedSourceListing: mocks.ensureScrapedSourceListing,
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
    mocks.getCategoryById.mockResolvedValue({
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
    });
    mocks.dryRun.mockResolvedValue(makeSource([makeDraft()]));
    mocks.getDraft.mockResolvedValue(null);
    mocks.getProductBySku.mockResolvedValue(null);
    mocks.findProductBySupplierLink.mockResolvedValue(null);
    mocks.createProduct.mockResolvedValue({
      id: 'product-created',
      sku: 'BATTLESTOCK-13033',
    });
    mocks.captureException.mockResolvedValue(undefined);
    mocks.ensureScrapedSourceListing.mockResolvedValue({});
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
        importSource: 'scrape',
        name_pl: '40k spiritseer',
        supplierName: 'BattleStock',
        supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
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

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
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
        sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
      })
    );
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

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
    });

    expect(mocks.findProductBySupplierLink).toHaveBeenCalledWith(
      'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033'
    );
    expect(mocks.updateProduct).toHaveBeenCalledWith(
      'product-existing-source',
      expect.objectContaining({
        sku: 'BATTLESTOCK-13033',
        supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
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
        supplierLink:
          'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033?utm_source=category#details',
      },
    };
    mocks.dryRun.mockResolvedValue(makeSource([makeDraft(), duplicateDraft]));

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
    });

    expect(mocks.createProduct).toHaveBeenCalledTimes(1);
    expect(response.createdCount).toBe(1);
    expect(response.skippedCount).toBe(1);
    expect(response.products[1]).toMatchObject({
      status: 'skipped',
      error: 'Duplicate scraped product in this run.',
      sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    });
  });

  it('renders selected scrape template placeholders into created products', async () => {
    mocks.getDraft.mockResolvedValue({
      id: 'draft-template-1',
      name: 'BattleStock pendant template',
      draftKind: 'scrape_template',
      scrapeProfileId: 'battlestock-warhammer-40k-30k',
      name_en: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
      name_pl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
      supplierName: 'BattleStock',
      supplierLink: '[sourceUrl]',
      priceComment: 'Scraped [price] [currency]',
      ean: '[externalId]',
      price: 99,
      weight: 0.2,
      sizeLength: 5,
      sizeWidth: 1,
      length: 5,
      stock: 4,
      defaultPriceGroupId: 'price-group-retail',
      shippingGroupId: 'shipping-small',
      catalogIds: ['catalog-template'],
      categoryId: 'category-pendants',
      tagIds: ['tag-warhammer'],
      producerIds: ['producer-games-workshop'],
      customFields: [{ fieldId: 'source-url', textValue: '[sourceUrl]' }],
      parameters: [
        { parameterId: 'source-brand', value: '[brand]' },
        {
          parameterId: 'material',
          value: 'Metal',
          valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
          skipParameterInference: true,
        },
      ],
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-allegro'],
          title: '[name] custom listing',
          description: '[description]',
        },
      ],
      notes: { text: 'Scraped category [category]', color: '#60a5fa' },
    });
    mocks.dryRun.mockResolvedValue(
      makeSource([
        {
          ...makeDraft(),
          mapped: {
            title: '40k spiritseer',
            description: 'Psyker unit',
            price: 60,
            currency: 'PLN',
            images: [],
            sku: null,
            ean: null,
            brand: 'Games Workshop',
            category: 'Eldar / Aeldari',
            sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
            externalId: '13033',
            raw: {},
          },
          raw: {
            product_id: '13033',
            name: '40k spiritseer',
            price_raw: '60',
            currency: 'PLN',
            producer: 'Games Workshop',
          },
        },
      ])
    );

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
      draftTemplateId: 'draft-template-1',
    });

    expect(mocks.getDraft).toHaveBeenCalledWith('draft-template-1');
    expect(mocks.getCategoryById).toHaveBeenCalledWith('category-pendants');
    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name_en: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
        name_pl: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
        supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
        priceComment: 'Scraped 60 PLN',
        ean: '13033',
        price: 99,
        weight: 0.2,
        sizeLength: 5,
        sizeWidth: 1,
        length: 5,
        stock: 4,
        defaultPriceGroupId: 'price-group-retail',
        shippingGroupId: 'shipping-small',
        categoryId: 'category-pendants',
        tagIds: ['tag-warhammer'],
        producerIds: ['producer-games-workshop'],
        customFields: [
          {
            fieldId: 'source-url',
            textValue: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
          },
        ],
        parameters: [
          { parameterId: 'source-brand', value: 'Games Workshop' },
          {
            parameterId: 'material',
            value: 'Metal',
            valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
            skipParameterInference: true,
          },
        ],
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-allegro'],
            title: '40k spiritseer custom listing',
            description: 'Psyker unit',
          },
        ],
        notes: { text: 'Scraped category Eldar / Aeldari', color: '#60a5fa' },
        sourcePrice: 60,
      }),
      undefined
    );
    expect(response.products[0]?.title).toBe(
      '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k'
    );
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

  it('renders selected scrape template placeholders in dry run results', async () => {
    mocks.getDraft.mockResolvedValue({
      id: 'draft-template-1',
      name: 'BattleStock pendant template',
      draftKind: 'scrape_template',
      scrapeProfileId: 'battlestock-warhammer-40k-30k',
      name_pl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
    });

    const response = await runProductScrapeProfile({
      profileId: 'battlestock-warhammer-40k-30k',
      draftTemplateId: 'draft-template-1',
      dryRun: true,
    });

    expect(mocks.createProduct).not.toHaveBeenCalled();
    expect(mocks.updateProduct).not.toHaveBeenCalled();
    expect(response.products[0]).toMatchObject({
      status: 'dry_run',
      title: '40k spiritseer | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
    });
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
