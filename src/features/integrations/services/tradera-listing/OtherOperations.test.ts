import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';

const {
  getProductByIdMock,
  runPlaywrightListingScriptMock,
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
    proxyServer: '',
    proxyUsername: '',
    proxyPassword: '',
    emulateDevice: false,
    deviceName: 'Desktop Chrome',
  });
});

  it('uses the scripted Tradera path for relist even without a browser-mode override', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-connection-default-relist',
      externalListingId: 'listing-connection-default-relist',
      listingUrl: 'https://www.tradera.com/item/connection-default-relist',
      publishVerified: true,
      personaId: null,
      executionSettings: {
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
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/connection-default-relist' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-connection-default-relist',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'builtin',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'relist',
      browserMode: 'connection_default',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'connection_default',
        input: expect.objectContaining({
          listingAction: 'relist',
          existingExternalListingId: 'external-existing',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
        }),
      })
    );
    expect(runPlaywrightListingScriptMock.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'failureHoldOpenMs'
    );
    expect(result).toMatchObject({
      externalListingId: 'listing-connection-default-relist',
      listingUrl: 'https://www.tradera.com/item/connection-default-relist',
      metadata: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v145',
        scriptStoredOnConnection: false,
        runId: 'run-connection-default-relist',
        requestedBrowserMode: 'connection_default',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
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
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/connection-default-relist' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        categoryFallbackUsed: false,
        categoryName: 'Pins',
        imageInputSource: 'remote',
        imageUploadFallbackUsed: false,
        imagePreviewMismatch: false,
        imageUploadSource: null,
        plannedImageCount: null,
        observedImagePreviewCount: null,
        observedImagePreviewDelta: null,
        observedImagePreviewDescriptors: [],
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: null,
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      }),
    });
    expect((result.metadata as { executionSteps?: unknown[] }).executionSteps).toHaveLength(21);
  });

describe('runTraderaBrowserCheckStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      baseProductId: 'BASE-1',
      name_en: 'Example title',
      description_en: 'Example description',
    });
    runPlaywrightScrapeScriptMock.mockResolvedValue({
      runId: 'run-check-status',
      effectiveBrowserMode: 'headed',
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 0,
        timeout: 30_000,
        navigationTimeout: 30_000,
        humanizeMouse: false,
        mouseJitter: 0,
        clickDelayMin: 0,
        clickDelayMax: 0,
        inputDelayMin: 0,
        inputDelayMax: 0,
        actionDelayMin: 0,
        actionDelayMax: 0,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      outputs: {
        result: {
          externalListingId: 'listing-123',
          listingUrl: 'https://www.tradera.com/item/123',
          status: 'ended',
          verificationSection: 'unsold',
          verificationMatchStrategy: 'title+product-id',
          verificationRawStatusTag: 'ended',
          verificationMatchedProductId: 'BASE-1',
          verificationSearchTitle: 'Example title',
          verificationCandidateCount: 1,
          executionSteps: [
            {
              id: 'auth_check',
              label: 'Validate Tradera session',
              status: 'success',
              message: 'Stored Tradera session could access the seller overview.',
            },
            {
              id: 'overview_open',
              label: 'Open seller overview',
              status: 'success',
              message: 'Tradera seller overview opened successfully.',
            },
            {
              id: 'resolve_status',
              label: 'Resolve Status',
              status: 'success',
              message:
                'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
            },
          ],
        },
      },
      rawResult: {
        externalListingId: 'listing-123',
        listingUrl: 'https://www.tradera.com/item/123',
        status: 'ended',
        verificationSection: 'unsold',
        verificationMatchStrategy: 'title+product-id',
        verificationRawStatusTag: 'ended',
        verificationMatchedProductId: 'BASE-1',
        verificationSearchTitle: 'Example title',
        verificationCandidateCount: 1,
        executionSteps: [
          {
            id: 'auth_check',
            label: 'Validate Tradera session',
            status: 'success',
            message: 'Stored Tradera session could access the seller overview.',
          },
          {
            id: 'overview_open',
            label: 'Open seller overview',
            status: 'success',
            message: 'Tradera seller overview opened successfully.',
          },
          {
            id: 'resolve_status',
            label: 'Resolve Status',
            status: 'success',
            message: 'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
          },
        ],
      },
      finalUrl: null,
      logs: [],
      run: {
        runId: 'run-check-status',
        status: 'completed',
        logs: [],
        artifacts: [],
        result: {
          outputs: {
            result: {
              externalListingId: 'listing-123',
              listingUrl: 'https://www.tradera.com/item/123',
              status: 'ended',
              verificationSection: 'unsold',
              verificationMatchStrategy: 'title+product-id',
              verificationRawStatusTag: 'ended',
              verificationMatchedProductId: 'BASE-1',
              verificationSearchTitle: 'Example title',
              verificationCandidateCount: 1,
              executionSteps: [
                {
                  id: 'auth_check',
                  label: 'Validate Tradera session',
                  status: 'success',
                  message: 'Stored Tradera session could access the seller overview.',
                },
                {
                  id: 'overview_open',
                  label: 'Open seller overview',
                  status: 'success',
                  message: 'Tradera seller overview opened successfully.',
                },
                {
                  id: 'resolve_status',
                  label: 'Resolve Status',
                  status: 'success',
                  message:
                    'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
                },
              ],
            },
          },
        },
      },
    });
  });

  it('passes direct section verification search inputs and returns Tradera verification metadata', async () => {
    const result = await runTraderaBrowserCheckStatus({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'listing-123',
        marketplaceData: {
          tradera: {
            listingUrl: 'https://www.tradera.com/item/123',
          },
        },
      } as never,
      connection: {
        id: 'connection-1',
      } as never,
      browserMode: 'headed',
    });

    expect(runPlaywrightScrapeScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          id: 'connection-1',
        }),
        script: TRADERA_CHECK_STATUS_SCRIPT,
        timeoutMs: 60_000,
        browserMode: 'headed',
        input: expect.objectContaining({
          listingUrl: 'https://www.tradera.com/item/123',
          externalListingId: 'listing-123',
          searchTitle: 'Example title',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
          rawDescriptionEn: 'Example description',
          baseProductId: 'BASE-1',
        }),
        instance: expect.objectContaining({
          kind: 'tradera_listing_status_scrape',
          family: 'scrape',
          listingId: 'listing-1',
        }),
      })
    );

    expect(result).toEqual({
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      metadata: {
        checkedStatus: 'ended',
        checkStatusError: null,
        requestedBrowserMode: 'headed',
        runId: 'run-check-status',
        selectorProfileRequested: 'default',
        selectorProfileResolved: 'default',
        selectorProfileSourceProfiles: ['code'],
        selectorRegistryEntryCount: expect.any(Number),
        selectorRegistryOverlayEntryCount: 0,
        selectorRegistryFallbackToCode: true,
        selectorRegistryFallbackReason: expect.any(String),
        verificationSection: 'unsold',
        verificationMatchStrategy: 'title+product-id',
        verificationRawStatusTag: 'ended',
        verificationMatchedProductId: 'BASE-1',
        verificationSearchTitle: 'Example title',
        verificationCandidateCount: 1,
        executionSteps: [
          {
            id: 'auth_check',
            label: 'Validate Tradera session',
            status: 'success',
            message: 'Stored Tradera session could access the seller overview.',
          },
          {
            id: 'overview_open',
            label: 'Open seller overview',
            status: 'success',
            message: 'Tradera seller overview opened successfully.',
          },
          {
            id: 'resolve_status',
            label: 'Resolve Status',
            status: 'success',
            message: 'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
          },
        ],
      },
    });
  });
});

describe('ensureLoggedIn', () => {
  it('reuses a session that lands on the authenticated /my/listings route even without a visible logout link', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/my/listings?tab=active'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (selector: string) => ({
        first: () => ({
          isVisible: async () => {
            if (selector === LOGIN_SUCCESS_SELECTOR) return false;
            return false;
          },
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
    };

    await ensureLoggedIn(
      page as never,
      {
        username: 'user@example.com',
        password: 'encrypted-password',
      } as never,
      'https://www.tradera.com/en/selling/new'
    );

    expect(gotoMock).toHaveBeenNthCalledWith(
      1,
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenNthCalledWith(
      2,
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenCalledTimes(2);
  });

  it('waits for delayed session-check resolution before accepting a stored Tradera session', async () => {
    let currentUrl = 'about:blank';
    let pollCount = 0;
    const statusMessages: string[] = [];
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/session-check'
        : url;
    });
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (_selector: string) => ({
        first: () => ({
          isVisible: async () => false,
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      waitForTimeout: vi.fn(async () => {
        pollCount += 1;
        if (pollCount >= 2) {
          currentUrl = 'https://www.tradera.com/en/my/listings?tab=active';
        }
      }),
    };

    await ensureLoggedIn(
      page as never,
      {
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: 'stored-state',
      } as never,
      'https://www.tradera.com/en/selling/new',
      {
        onStatus: (update) => {
          statusMessages.push(update.message);
        },
      }
    );

    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(statusMessages).toEqual(
      expect.arrayContaining([
        'Opening Tradera session check page.',
        'Waiting for Tradera account state.',
        'Stored Tradera session was accepted.',
        'Opening Tradera listing form.',
        'Verifying Tradera listing form access.',
      ])
    );
    expect(gotoMock).toHaveBeenNthCalledWith(
      2,
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
  });

  it('treats an unresolved generic /my shell as a session-validation timeout', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/my/'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (_selector: string) => ({
        first: () => ({
          isVisible: async () => false,
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      waitForTimeout: vi.fn(async () => undefined),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
          playwrightStorageState: 'stored-state',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.');

    expect(gotoMock).toHaveBeenCalledTimes(1);
    expect(gotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
  });

  it('keeps the worker and manual-login success selectors aligned', () => {
    expect(LOGIN_SUCCESS_SELECTOR).toBe(TRADERA_SUCCESS_SELECTOR);
    expect(LOGIN_SUCCESS_SELECTOR).toContain('a[href*="/my"]');
    expect(LOGIN_SUCCESS_SELECTOR).toContain('button[aria-label*="Account"]');
  });

  it('requires manual verification instead of retrying credential login when a stored session is invalid', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/login'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (_selector: string) => ({
        first: () => ({
          isVisible: async () => false,
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      waitForTimeout: vi.fn(async () => undefined),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
          playwrightStorageState: 'stored-state',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_REQUIRED: Stored Tradera session expired or requires manual verification.');

    expect(gotoMock).toHaveBeenCalledTimes(1);
    expect(gotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
  });

  it('raises a captcha-specific auth_required error after submit when Tradera demands manual verification', async () => {
    let currentUrl = 'about:blank';
    let phase: 'session-check' | 'login' | 'post-login' = 'session-check';

    const usernameField = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(),
      innerText: vi.fn(async () => ''),
    };
    const passwordField = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(),
      innerText: vi.fn(async () => ''),
    };
    const submitButton = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(async () => {
        phase = 'post-login';
      }),
      innerText: vi.fn(async () => ''),
    };

    const buildLocator = (selector: string) => ({
      first: () => {
        if (selector === '#email' || selector === 'input[name="email"]' || selector === 'input[type="email"]') {
          return usernameField;
        }
        if (selector === '#password' || selector === 'input[name="password"]' || selector === 'input[type="password"]') {
          return passwordField;
        }
        if (
          selector === 'button[data-login-submit="true"]' ||
          selector === '#sign-in-form button[type="submit"]' ||
          selector === 'button:has-text("Sign in")' ||
          selector === 'button:has-text("Logga in")'
        ) {
          return submitButton;
        }

        return {
          count: async () => 1,
          isVisible: async () => {
            if (selector === LOGIN_SUCCESS_SELECTOR) return false;
            if (selector === '#sign-in-form' || selector === 'form[data-sign-in-form="true"]' || selector === 'form[action*="login"]') {
              return phase !== 'session-check';
            }
            if (TRADERA_AUTH_ERROR_SELECTORS.includes(selector as never)) {
              return phase === 'post-login';
            }
            return false;
          },
          fill: vi.fn(),
          click: vi.fn(),
          innerText: vi.fn(async () =>
            TRADERA_AUTH_ERROR_SELECTORS.includes(selector as never)
              ? 'Please complete the captcha challenge.'
              : ''
          ),
        };
      },
    });

    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url;
      if (url.includes('/my/listings')) {
        currentUrl = 'https://www.tradera.com/en/login';
        phase = 'session-check';
        return;
      }
      if (url.includes('/login')) {
        currentUrl = 'https://www.tradera.com/en/login';
        phase = 'login';
      }
    });

    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: buildLocator,
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      waitForTimeout: vi.fn(async () => undefined),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_REQUIRED: Tradera login requires manual verification (captcha).');

    expect(usernameField.fill).toHaveBeenCalledWith('user@example.com');
    expect(passwordField.fill).toHaveBeenCalledWith('decrypted:encrypted-password');
    expect(submitButton.click).toHaveBeenCalledTimes(1);
  });
});
