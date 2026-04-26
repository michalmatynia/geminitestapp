import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';

const {
  getProductByIdMock,
  runPlaywrightListingScriptMock,
  runPlaywrightConnectionNativeTaskMock,
  persistPlaywrightConnectionStorageStateMock,
  runPlaywrightScrapeScriptMock,
  updateConnectionMock,
  accessMock,
  copyFileMock,
  mkdtempMock,
  statMock,
  getCategoryByIdMock,
  listCategoryMappingsMock,
  listCategoriesMock,
  resolveTraderaShippingGroupResolutionForProductMock,
  resolveTraderaListingPriceForProductMock,
  resolveConnectionPlaywrightSettingsMock,
  listParametersMock,
} = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  runPlaywrightListingScriptMock: vi.fn().mockResolvedValue({
    runId: 'run-stable',
    status: 'success',
    externalListingId: 'listing-stable',
    listingUrl: 'https://www.tradera.com/item/stable',
    publishVerified: true,
    logs: [],
    rawResult: {},
  }),
  runPlaywrightConnectionNativeTaskMock: vi.fn().mockResolvedValue(undefined),
  persistPlaywrightConnectionStorageStateMock: vi.fn().mockResolvedValue(undefined),
  runPlaywrightScrapeScriptMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  accessMock: vi.fn(),
  copyFileMock: vi.fn(),
  mkdtempMock: vi.fn(),
  statMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  listCategoryMappingsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  resolveTraderaShippingGroupResolutionForProductMock: vi.fn(),
  resolveTraderaListingPriceForProductMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  listParametersMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  copyFile: (...args: unknown[]) => copyFileMock(...args),
  mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    copyFile: (...args: unknown[]) => copyFileMock(...args),
    mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
    stat: (...args: unknown[]) => statMock(...args),
  },
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  decryptSecret: (value: string) => `decrypted:${value}`,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: getProductByIdMock,
  }),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: async () => ({
    listParameters: (...args: unknown[]) => listParametersMock(...args),
  }),
}));

vi.mock('../integration-repository', () => ({
  getIntegrationRepository: async () => ({
    updateConnection: updateConnectionMock,
  }),
}));

vi.mock('../category-mapping-repository', () => ({
  getCategoryMappingRepository: () => ({
    listByConnection: listCategoryMappingsMock,
  }),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: async () => ({
    getCategoryById: getCategoryByIdMock,
    listCategories: listCategoriesMock,
  }),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    runPlaywrightListingScript: (...args: unknown[]) =>
      runPlaywrightListingScriptMock(...args) as Promise<unknown>,
    runPlaywrightConnectionNativeTask: (...args: unknown[]) =>
      runPlaywrightConnectionNativeTaskMock(...args) as Promise<unknown>,
    persistPlaywrightConnectionStorageState: (...args: unknown[]) =>
      persistPlaywrightConnectionStorageStateMock(...args) as Promise<unknown>,
    runPlaywrightScrapeScript: (...args: unknown[]) =>
      runPlaywrightScrapeScriptMock(...args) as Promise<unknown>,
    createTraderaListingStatusScrapePlaywrightInstance: (
      input: Record<string, unknown> = {}
    ) => ({
      kind: 'tradera_listing_status_scrape',
      family: 'scrape',
      label: 'Tradera listing status scrape',
      tags: ['integration', 'tradera', 'status', 'scrape'],
      ...input,
    }),
  };
});

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args) as Promise<unknown>,
  parsePersistedStorageState: vi.fn(),
}));

vi.mock('./shipping-group', () => ({
  resolveTraderaShippingGroupResolutionForProduct: (...args: unknown[]) =>
    resolveTraderaShippingGroupResolutionForProductMock(...args),
}));

vi.mock('./price', () => ({
  resolveTraderaListingPriceForProduct: (...args: unknown[]) =>
    resolveTraderaListingPriceForProductMock(...args),
}));

import { ensureLoggedIn, runTraderaBrowserCheckStatus, runTraderaBrowserListing } from './browser';
import {
  LOGIN_SUCCESS_SELECTOR,
  TRADERA_AUTH_ERROR_SELECTORS,
} from './config';
import { TRADERA_SUCCESS_SELECTOR } from '../tradera-browser-test-utils';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';
import { TRADERA_CHECK_STATUS_SCRIPT } from './check-status-script';

const EXPECTED_TRADERA_PRICING_METADATA = {
  listingPrice: 55,
  listingCurrencyCode: 'EUR',
  targetCurrencyCode: 'EUR',
  resolvedToTargetCurrency: true,
  basePrice: 123,
  baseCurrencyCode: 'PLN',
  priceSource: 'price_group_target_currency',
  priceResolutionReason: 'resolved_target_currency',
  defaultPriceGroupId: 'price-group-pln',
  catalogDefaultPriceGroupId: 'price-group-pln',
  pricingCatalogId: 'catalog-1',
  catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
  loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
  matchedTargetPriceGroupIds: ['price-group-eur'],
};

beforeEach(() => {
  vi.resetAllMocks();
  runPlaywrightListingScriptMock.mockResolvedValue({
    runId: 'run-stable',
    status: 'success',
    externalListingId: 'listing-stable',
    listingUrl: 'https://www.tradera.com/item/stable',
    publishVerified: true,
    logs: [],
    rawResult: {},
  });
  runPlaywrightConnectionNativeTaskMock.mockResolvedValue(undefined);
  persistPlaywrightConnectionStorageStateMock.mockResolvedValue(undefined);
  accessMock.mockResolvedValue(undefined);
  copyFileMock.mockResolvedValue(undefined);
  mkdtempMock.mockResolvedValue('/tmp/tradera-browser-test');
  statMock.mockResolvedValue({
    isFile: () => true,
    size: 20_000,
  });
  getCategoryByIdMock.mockResolvedValue(null);
  listCategoriesMock.mockResolvedValue([]);
  getProductByIdMock.mockResolvedValue({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: 'BASE-1',
    categoryId: 'internal-category-1',
    catalogId: 'catalog-1',
    catalogs: [{ catalogId: 'catalog-1' }],
    name_en: 'Example title',
    description_en: 'Example description',
    price: 123,
    imageLinks: ['https://cdn.example.com/a.jpg'],
    images: [
      {
        imageFile: {
          filepath: '/uploads/products/SKU-1/example.png',
        },
      },
    ],
  });
  listCategoryMappingsMock.mockResolvedValue([
    {
      id: 'mapping-1',
      connectionId: 'connection-1',
      externalCategoryId: '101',
      internalCategoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      isActive: true,
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
      externalCategory: {
        id: 'external-category-101',
        connectionId: 'connection-1',
        externalId: '101',
        name: 'Pins',
        parentExternalId: '100',
        path: 'Collectibles > Pins',
        depth: 1,
        isLeaf: true,
        metadata: null,
        fetchedAt: '2026-04-02T10:00:00.000Z',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      internalCategory: {
        id: 'internal-category-1',
        name: 'Pins',
        description: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
    },
  ]);
  resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
    shippingGroup: {
      id: 'shipping-group-1',
      name: 'Small parcel',
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
    },
    shippingGroupId: 'shipping-group-1',
    shippingCondition: 'Buyer pays shipping',
    shippingPriceEur: 5,
    shippingGroupSource: 'manual',
    reason: 'mapped',
    matchedCategoryRuleIds: [],
    matchingShippingGroupIds: ['shipping-group-1'],
  });
  resolveTraderaListingPriceForProductMock.mockResolvedValue({
    listingPrice: 55,
    listingCurrencyCode: 'EUR',
    targetCurrencyCode: 'EUR',
    resolvedToTargetCurrency: true,
    basePrice: 123,
    baseCurrencyCode: 'PLN',
    priceSource: 'price_group_target_currency',
    reason: 'resolved_target_currency',
    defaultPriceGroupId: 'price-group-pln',
    catalogDefaultPriceGroupId: 'price-group-pln',
    catalogId: 'catalog-1',
    catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
    loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
    matchedTargetPriceGroupIds: ['price-group-eur'],
  });
  listParametersMock.mockResolvedValue([]);
  resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
    headless: true,
    slowMo: 85,
    timeout: 30000,
    navigationTimeout: 45000,
    humanizeMouse: true,
    mouseJitter: 12,
    clickDelayMin: 40,
    clickDelayMax: 140,
    inputDelayMin: 30,
    inputDelayMax: 110,
    actionDelayMin: 220,
    actionDelayMax: 800,
    proxyEnabled: false,
    emulateDevice: false,
    deviceName: 'Desktop Chrome',
  });
});

it('fails before launching the scripted runner when the Tradera title exceeds 80 characters', async () => {
  getProductByIdMock.mockResolvedValue({
    id: 'product-1',
    sku: 'HANDMAD007',
    baseProductId: 'HANDMAD007',
    categoryId: 'internal-category-1',
    catalogId: 'catalog-1',
    catalogs: [{ catalogId: 'catalog-1' }],
    name_en: 'A'.repeat(81),
    description_en: 'Example description',
    price: 123,
    imageLinks: ['https://cdn.example.com/a.jpg'],
    images: [],
  });

  await expect(
    runTraderaBrowserListing({
      listing: {
        id: 'listing-title-too-long',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    })
  ).rejects.toMatchObject({
    message:
      'FAIL_PUBLISH_VALIDATION: Tradera title is 81 characters, but Tradera allows at most 80. Shorten the marketplace title before retrying.',
    meta: expect.objectContaining({
      failureCode: 'tradera_title_too_long',
      productId: 'product-1',
      listingId: 'listing-title-too-long',
      connectionId: 'connection-1',
      titleLength: 81,
      titleMaxLength: 80,
    }),
  });

  expect(resolveTraderaListingPriceForProductMock).not.toHaveBeenCalled();
  expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
});

  it('keeps publish-verified modern Tradera item urls successful even when raw draft metadata still reports Loading', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-modern-url-loading-draft',
      externalListingId: null,
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'publish_verified',
        currentUrl: 'https://www.tradera.com/en/selling/draft/69d2a549aa5fcd00016e7a06',
        validationMessages: ['Loading'],
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-modern-url-loading-draft',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      metadata: expect.objectContaining({
        runId: 'run-modern-url-loading-draft',
        publishVerified: true,
        latestStage: 'publish_verified',
        latestStageUrl: 'https://www.tradera.com/en/selling/draft/69d2a549aa5fcd00016e7a06',
        rawResult: expect.objectContaining({
          validationMessages: ['Loading'],
        }),
      }),
    });
  });

  it('records runtime fallback metadata when the mapped Tradera category is unavailable in the browser flow', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-fallback-from-mapped',
      externalListingId: 'listing-fallback-from-mapped',
      listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaCategory: expect.objectContaining({
            externalId: '101',
            path: 'Collectibles > Pins',
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      externalListingId: 'listing-fallback-from-mapped',
      listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
      metadata: {
        categoryMappingReason: 'mapped',
        categoryId: '101',
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });
  });

  it('allows scripted publish success without immediate external listing id when publish was verified', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-url-only-success',
      externalListingId: null,
      listingUrl: null,
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'publish_verified',
        currentUrl: 'https://www.tradera.com/en/my/listings?tab=active',
        publishVerified: true,
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: null,
      listingUrl: undefined,
      metadata: {
        runId: 'run-url-only-success',
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        publishVerified: true,
        latestStage: 'publish_verified',
        latestStageUrl: 'https://www.tradera.com/en/my/listings?tab=active',
      },
    });
  });

  it('rejects mapper-mode listings when the Tradera category mapper has no active mapping', async () => {
    listCategoryMappingsMock.mockResolvedValue([]);
    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
          relistPolicy: {
            enabled: true,
            leadMinutes: 30,
            durationHours: 48,
            templateId: 'template-1',
          },
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toThrow(
      'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.'
    );
    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('rejects mapper-mode listings when the mapped Tradera category is stale', async () => {
    listCategoryMappingsMock.mockResolvedValue([
      {
        id: 'mapping-stale',
        connectionId: 'connection-1',
        externalCategoryId: '101',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        externalCategory: {
          id: 'external-category-101',
          connectionId: 'connection-1',
          externalId: '101',
          name: '[Missing external category: Pins]',
          parentExternalId: '100',
          path: 'Collectibles > Pins',
          depth: 1,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-02T10:00:00.000Z',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
        internalCategory: {
          id: 'internal-category-1',
          name: 'Pins',
          description: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toThrow(
      'The mapped Tradera category is stale or missing from fetched Tradera categories. Fetch Tradera categories again, update the mapping, and retry.'
    );
    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('rejects mapper-mode listings when the mapped Tradera category is invalid', async () => {
    listCategoryMappingsMock.mockResolvedValue([
      {
        id: 'mapping-invalid',
        connectionId: 'connection-1',
        externalCategoryId: '',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        externalCategory: {
          id: 'external-category-invalid',
          connectionId: 'connection-1',
          externalId: '',
          name: 'Pins',
          parentExternalId: '100',
          path: 'Collectibles > Pins',
          depth: 1,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-02T10:00:00.000Z',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
        internalCategory: {
          id: 'internal-category-1',
          name: 'Pins',
          description: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toThrow(
      'The mapped Tradera category is invalid. Fetch Tradera categories again, update the Tradera category mapping, and retry.'
    );
    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('preserves the autofilled Tradera category when top_suggested strategy is enabled', async () => {
    listCategoryMappingsMock.mockResolvedValue([]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-autofill-no-mapping',
      externalListingId: 'listing-autofill-no-mapping',
      listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
        categoryPath: 'Accessories > Patches & pins > Pins',
        categorySource: 'autofill',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        traderaCategoryStrategy: 'top_suggested',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    const playwrightInput = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;

    expect(playwrightInput).toBeDefined();
    expect(playwrightInput).not.toHaveProperty('traderaCategory');
    expect(playwrightInput).toMatchObject({
      traderaCategoryMapping: {
        reason: 'no_active_mapping',
        matchScope: 'none',
      },
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-autofill-no-mapping',
      listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
      metadata: {
        categoryMappingReason: 'no_active_mapping',
        categoryMatchScope: 'none',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: null,
        categoryPath: 'Accessories > Patches & pins > Pins',
        categorySource: 'autofill',
      },
    });
  });

  it('does not inject Tradera extra field selections when category strategy is top_suggested', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
      parameters: [{ parameterId: 'param-metal', value: 'Metal' }],
    });
    listParametersMock.mockResolvedValue([
      {
        id: 'param-metal',
        catalogId: 'catalog-1',
        name: 'Metal',
        name_en: 'Metal',
        name_pl: null,
        name_de: null,
        selectorType: 'select',
        optionLabels: ['Metal'],
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-top-suggested',
      externalListingId: 'listing-top-suggested',
      listingUrl: 'https://www.tradera.com/item/top-suggested',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/top-suggested' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-top-suggested',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        traderaCategoryStrategy: 'top_suggested',
        playwrightListingScript: 'export default async function run() {}',
        traderaParameterMapperRulesJson: JSON.stringify({
          version: 1,
          rules: [
            {
              id: 'rule-1',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              parameterCatalogId: 'catalog-1',
              sourceValue: 'Metal',
              targetOptionLabel: '24K',
              isActive: true,
              createdAt: '2026-04-08T10:00:00.000Z',
              updatedAt: '2026-04-08T10:05:00.000Z',
            },
          ],
        }),
        traderaParameterMapperCatalogJson: JSON.stringify({
          version: 1,
          entries: [
            {
              id: '101:jewellerymaterial',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              optionLabels: ['18K', '24K'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-catalog-1',
            },
          ],
        }),
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    const playwrightInput = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;

    expect(playwrightInput).toBeDefined();
    expect(playwrightInput).toMatchObject({
      categoryStrategy: 'top_suggested',
    });
    expect(listParametersMock).not.toHaveBeenCalled();
    expect(playwrightInput).not.toHaveProperty('traderaCategory');
    expect(playwrightInput).not.toHaveProperty('traderaExtraFieldSelections');
  });

  it('fails before launching the scripted runner when Tradera shipping price is missing', async () => {
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message:
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
      meta: expect.objectContaining({
        productId: 'product-1',
        productShippingGroupId: null,
        connectionId: 'connection-1',
        shippingGroupResolutionReason: 'missing_shipping_group',
        shippingGroupId: null,
        shippingGroupSource: null,
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: [],
      }),
    });

    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('fails before launching the scripted runner when Tradera listing price cannot be resolved to EUR', async () => {
    resolveTraderaListingPriceForProductMock.mockResolvedValue({
      listingPrice: 123,
      listingCurrencyCode: 'PLN',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: false,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'base_price_fallback',
      reason: 'target_currency_unresolved',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln'],
      loadedPriceGroupIds: ['price-group-pln'],
      matchedTargetPriceGroupIds: [],
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: 'FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.',
      meta: expect.objectContaining({
        mode: 'scripted',
        productId: 'product-1',
        listingId: 'listing-1',
        connectionId: 'connection-1',
        listingPrice: 123,
        listingCurrencyCode: 'PLN',
        targetCurrencyCode: 'EUR',
        resolvedToTargetCurrency: false,
        basePrice: 123,
        baseCurrencyCode: 'PLN',
        priceSource: 'base_price_fallback',
        priceResolutionReason: 'target_currency_unresolved',
      }),
    });

    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('sanitizes invalid Tradera listing form urls before passing them to the scripted flow', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-invalid-url',
      externalListingId: 'listing-invalid-url',
      listingUrl: 'https://www.tradera.com/item/777',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/777' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.facebook.com/Tradera',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling/new',
          },
        }),
      })
    );
  });

  it('resolves local Tradera image uploads from public image URLs and local imageLinks when filepath is absent', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['http://localhost:3000/uploads/products/SKU-1/link-only.png'],
      images: [
        {
          imageFile: {
            filepath: 'https://cdn.example.com/remote-only.png',
            publicUrl: 'http://localhost:3000/uploads/products/SKU-1/public-only.png',
            url: 'http://localhost:3000/uploads/products/SKU-1/public-only.png',
          },
        },
      ],
    });
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-public-url',
      externalListingId: 'listing-public-url',
      listingUrl: 'https://www.tradera.com/item/555',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/555' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          localImagePaths: [
            expect.stringContaining('/tmp/'),
            expect.stringContaining('/tmp/'),
          ],
          imageUrls: [
            'http://localhost:3000/uploads/products/SKU-1/public-only.png',
            'http://localhost:3000/uploads/products/SKU-1/link-only.png',
          ],
          traderaImageOrder: {
            strategy: 'local-complete',
            imageCount: 2,
            localImageCoverageCount: 2,
          },
        }),
      })
    );
    const input = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;
    expect(input).toBeDefined();
  expect((input?.['localImagePaths'] as string[])?.map((value) => new URL(`file://${value}`).pathname.split('/').pop())).toEqual([
      'BASE-1_01.png',
      'BASE-1_02.png',
    ]);
  });
