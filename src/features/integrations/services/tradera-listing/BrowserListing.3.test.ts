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

  it('refreshes legacy default scripts that still rely on dynamic imports', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-456',
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
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
        playwrightListingScript:
          'export default async function run() { const fs = await import(\'node:fs/promises\'); return fs; }\n// tradera-quicklist',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      metadata: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v129',
        scriptStoredOnConnection: false,
        runId: 'run-456',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
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
  });

  it('refreshes stale managed default scripts that predate the selling-page handoff fix', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-789',
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
    });

    const staleManagedDefaultScript = `export default async function run({ page, input, emit, log }) {
  // tradera-quicklist-default:v85
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  log?.('tradera.quicklist.start', { baseProductId: input?.baseProductId ?? null });
  throw new Error('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.');
}`;

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
        playwrightListingScript: staleManagedDefaultScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      metadata: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v129',
        scriptStoredOnConnection: false,
        runId: 'run-789',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
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
  });

  it('refreshes managed scripts with the current marker when the stored body is stale', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-790',
      externalListingId: 'listing-790',
      listingUrl: 'https://www.tradera.com/item/790',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/790' },
    });

    const staleMarkedManagedScript = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      'let currentImageUploadSource = null;\n\n  try {',
      'try {\n    emitStage(\'draft_cleared\');\n\n    let currentImageUploadSource = null;'
    );

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
        playwrightListingScript: staleMarkedManagedScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-790',
      listingUrl: 'https://www.tradera.com/item/790',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-790',
        managedQuicklistDesktopMode: true,
      },
    });
  });

  it('keeps known-good managed v76 scripts instead of auto-refreshing them', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-v76-compat',
      externalListingId: 'listing-v76-compat',
      listingUrl: 'https://www.tradera.com/item/v76-compat',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/v76-compat' },
    });

    const compatibleManagedV76Script = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      /tradera-quicklist-default:v\d+/,
      'tradera-quicklist-default:v76'
    );

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
        playwrightListingScript: compatibleManagedV76Script,
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
        script: compatibleManagedV76Script,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-v76-compat',
      listingUrl: 'https://www.tradera.com/item/v76-compat',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v76',
        scriptStoredOnConnection: true,
        runId: 'run-v76-compat',
      },
    });
  });

  it('surfaces stale image-state runtime errors from saved connection scripts', async () => {
    runPlaywrightListingScriptMock
      .mockRejectedValueOnce(new Error('ReferenceError: currentImageUploadSource is not defined'))
      .mockResolvedValueOnce({
        runId: 'run-runtime-refresh',
        externalListingId: 'listing-runtime-refresh',
        listingUrl: 'https://www.tradera.com/item/runtime-refresh',
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/runtime-refresh' },
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
          playwrightListingScript: 'export default async function run() { return null; }',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toThrow('ReferenceError: currentImageUploadSource is not defined');
    expect(runPlaywrightListingScriptMock).toHaveBeenCalledTimes(1);
    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('falls back to the managed default when the saved connection script is syntactically invalid', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-invalid-fallback',
      externalListingId: 'listing-invalid-fallback',
      listingUrl: 'https://www.tradera.com/item/invalid-fallback',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/invalid-fallback' },
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
        playwrightListingScript: `
          if (true) {
            return { ok: true };
        `,
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
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-invalid-fallback',
      listingUrl: 'https://www.tradera.com/item/invalid-fallback',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'invalid-connection-fallback',
        scriptValidationError: expect.stringContaining(
          'Invalid Playwright script syntax after function-body recovery:'
        ),
      },
    });
  });

  it('attaches run diagnostics when the scripted result is invalid', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-999',
      externalListingId: null,
      listingUrl: null,
      publishVerified: null,
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
      rawResult: { warning: 'missing external id' },
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
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    }).then(
      () => {
        throw new Error('Expected invalid scripted listing result to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('run run-999');
        expect((error as { meta?: unknown }).meta).toMatchObject({
          scriptMode: 'scripted',
          scriptSource: 'connection',
          requestedBrowserMode: 'headed',
          runId: 'run-999',
          rawResult: { warning: 'missing external id' },
          publishVerified: null,
        });
      }
    );
  });

  it('preserves script source diagnostics when the scripted runner fails before producing a result', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(new Error('Script execution failed'), {
        meta: {
          runId: 'run-failed-2',
          runStatus: 'failed',
        },
      })
    );

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
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    }).then(
      () => {
        throw new Error('Expected scripted runner failure to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Script execution failed');
        expect((error as { meta?: unknown }).meta).toMatchObject({
          runId: 'run-failed-2',
          runStatus: 'failed',
        });
      }
    );
  });

  it('preserves off-domain navigation diagnostics when the scripted flow leaves Tradera', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to https://www.facebook.com/Tradera during image input resolution.'
        ),
        {
          meta: {
            runId: 'run-off-domain',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.facebook.com/Tradera',
            failureArtifacts: [
              {
                name: 'unexpected-navigation',
                path: 'run-off-domain/unexpected-navigation.png',
              },
            ],
          },
        }
      )
    );

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
    }).then(
      () => {
        throw new Error('Expected off-domain navigation failure to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Unexpected navigation away from Tradera to https://www.facebook.com/Tradera'
        );
        expect((error as { meta?: unknown }).meta).toMatchObject({
          runId: 'run-off-domain',
          runStatus: 'failed',
          latestStage: 'draft_cleared',
          latestStageUrl: 'https://www.facebook.com/Tradera',
          failureArtifacts: [
            expect.objectContaining({
              name: 'unexpected-navigation',
            }),
          ],
        });
      }
    );
  });

  it('preserves homepage fallback diagnostics when the image step loses the listing editor', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during image upload dispatch. Entry point: homepage. Current URL: https://www.tradera.com/en'
        ),
        {
          meta: {
            runId: 'run-image-homepage',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.tradera.com/en',
            logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
            failureArtifacts: [
              {
                name: 'listing-page-missing',
                path: 'run-image-homepage/listing-page-missing.png',
              },
            ],
          },
        }
      )
    );

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
    }).then(
      () => {
        throw new Error('Expected homepage fallback failure to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Tradera listing editor was lost during image upload dispatch. Entry point: homepage.'
        );
        expect((error as { meta?: unknown }).meta).toMatchObject({
          runId: 'run-image-homepage',
          runStatus: 'failed',
          latestStage: 'draft_cleared',
          latestStageUrl: 'https://www.tradera.com/en',
          logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
          failureArtifacts: [
            expect.objectContaining({
              name: 'listing-page-missing',
            }),
          ],
        });
      }
    );
  });

  it('preserves relist homepage cleanup diagnostics when a stale managed script is refreshed before failure', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during draft image cleanup complete. Entry point: homepage. Current URL: https://www.tradera.com/en'
        ),
        {
          meta: {
            runId: 'run-relist-homepage-cleanup',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.tradera.com/en',
            logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
            failureArtifacts: [
              {
                name: 'listing-page-missing',
                path: 'run-relist-homepage-cleanup/listing-page-missing.png',
              },
            ],
          },
        }
      )
    );

    const staleManagedDefaultScript = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      'tradera-quicklist-default:v129',
      'tradera-quicklist-default:v89'
    );

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-relist-homepage-cleanup',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: staleManagedDefaultScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'relist',
      browserMode: 'headed',
    }).then(
      () => {
        throw new Error('Expected relist homepage cleanup failure to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Tradera listing editor was lost during draft image cleanup complete. Entry point: homepage.'
        );
        expect((error as { meta?: unknown }).meta).toMatchObject({
          runId: 'run-relist-homepage-cleanup',
          runStatus: 'failed',
          latestStage: 'draft_cleared',
          latestStageUrl: 'https://www.tradera.com/en',
          logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
          failureArtifacts: [
            expect.objectContaining({
              name: 'listing-page-missing',
            }),
          ],
        });
      }
    );

    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('parses image settle state diagnostics from scripted upload timeout failures', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ' +
            JSON.stringify({
              selectedImageFileCount: 1,
              draftImageRemoveControls: 0,
              imageUploadPromptVisible: true,
              imageUploadPending: false,
              continueButtonVisible: true,
              continueButtonDisabled: true,
            })
        ),
        {
          meta: {
            runId: 'run-image-timeout',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl:
              'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9',
            logTail: ['[user] tradera.quicklist.image.settle_timeout'],
          },
        }
      )
    );

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
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    }).then(
      () => {
        throw new Error('Expected image timeout failure to throw');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish.'
        );
        expect((error as { meta?: unknown }).meta).toMatchObject({
          runId: 'run-image-timeout',
          runStatus: 'failed',
          latestStage: 'draft_cleared',
          latestStageUrl:
            'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9',
          logTail: ['[user] tradera.quicklist.image.settle_timeout'],
        });
      }
    );
  });

  it('uses the scripted Tradera path when a manual relist requests a browser-mode override', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-headed-recovery',
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
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
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
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
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      metadata: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v129',
        scriptStoredOnConnection: false,
        runId: 'run-headed-recovery',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
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
    expect((result.metadata as { executionSteps?: unknown[] }).executionSteps).toHaveLength(9);
  });

  });
});
