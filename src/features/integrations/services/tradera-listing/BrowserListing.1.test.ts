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
  listCategoryMappingsByInternalCategoryMock,
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
  listCategoryMappingsByInternalCategoryMock: vi.fn(),
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
    listByInternalCategory: listCategoryMappingsByInternalCategoryMock,
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

describe('runTraderaBrowserListing scripted mode', () => {
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
    listCategoryMappingsByInternalCategoryMock.mockResolvedValue([]);
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

  it('returns scripted run metadata on success', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-123',
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
    });

    const result = await runTraderaBrowserListing({
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
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: 'export default async function run() {}',
        timeoutMs: 240_000,
        browserMode: 'headed',
        disableStartUrlBootstrap: true,
        failureHoldOpenMs: 30_000,
        instance: expect.objectContaining({
          kind: 'tradera_scripted_listing',
          family: 'listing',
          listingId: 'listing-1',
        }),
        input: expect.objectContaining({
          listingAction: 'list',
          existingExternalListingId: null,
          baseProductId: 'BASE-1',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
          rawDescriptionEn: 'Example description',
          sku: 'SKU-1',
          title: 'Example title',
          description: 'Example description | Product ID: BASE-1 | SKU: SKU-1',
          price: 55,
          localImagePaths: expect.arrayContaining([expect.stringContaining('BASE-1_01.png')]),
          imageUrls: ['https://cdn.example.com/a.jpg'],
          traderaImageOrder: expect.objectContaining({
            strategy: 'local-complete',
            imageCount: 1,
            localImageCoverageCount: 1,
          }),
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling/new',
          },
          traderaCategory: {
            externalId: '101',
            name: 'Pins',
            path: 'Collectibles > Pins',
            segments: ['Collectibles', 'Pins'],
            internalCategoryId: 'internal-category-1',
            catalogId: 'catalog-1',
          },
          traderaCategoryMapping: expect.objectContaining({
            reason: 'mapped',
            matchScope: 'catalog_match',
            internalCategoryId: 'internal-category-1',
            productCatalogIds: ['catalog-1'],
            matchingMappingCount: 1,
            validMappingCount: 1,
            catalogMatchedMappingCount: 1,
          }),
          traderaPricing: {
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
          },
          traderaShipping: {
            shippingGroupId: 'shipping-group-1',
            shippingGroupName: 'Small parcel',
            shippingGroupCatalogId: 'catalog-1',
            shippingGroupSource: 'manual',
            shippingCondition: 'Buyer pays shipping',
            shippingPriceEur: 5,
            reason: 'mapped',
            matchedCategoryRuleIds: [],
            matchingShippingGroupIds: ['shipping-group-1'],
          },
        }),
      })
    );
    expect(listParametersMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      metadata: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        runId: 'run-123',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        playwrightPersonaId: null,
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        categoryFallbackUsed: false,
        categoryName: 'Pins',
        imageInputSource: 'local',
        imageUploadFallbackUsed: false,
        imagePreviewMismatch: false,
        imageUploadSource: null,
        plannedImageCount: null,
        observedImagePreviewCount: null,
        observedImagePreviewDelta: null,
        observedImagePreviewDescriptors: [],
        localImagePathCount: 1,
        imageUrlCount: 1,
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

  it('does not inject resolved Tradera extra field selections into the scripted listing input', async () => {
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
      runId: 'run-parameter-mapper',
      externalListingId: 'listing-parameter-mapper',
      listingUrl: 'https://www.tradera.com/item/parameter-mapper',
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/parameter-mapper' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-parameter-mapper',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
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

    expect(listParametersMock).not.toHaveBeenCalled();
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
    expect(runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input).not.toHaveProperty(
      'traderaExtraFieldSelections'
    );
  });

  it('falls back to the localized title in Tradera duplicate search input when English is missing', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: null,
      name_pl: 'Polski tytul',
      description_en: null,
      description_pl: 'Opis produktu',
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
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-polish-name',
      externalListingId: 'listing-polish-name',
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

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-polish-name',
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
          title: 'Polski tytul',
          duplicateSearchTitle: 'Polski tytul',
          duplicateSearchTerms: ['Polski tytul'],
        }),
      })
    );
  });

  it('passes the persisted Tradera listing url into scripted sync input', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-123',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
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
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
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
      action: 'sync',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          existingExternalListingId: 'external-existing',
          existingListingUrl: 'https://www.tradera.com/item/external-existing',
        }),
      })
    );
  });

  it('sets syncSkipImages=true in script input when syncSkipImages is passed for a sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-skip-images',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
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
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
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
      action: 'sync',
      browserMode: 'headed',
      syncSkipImages: true,
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          syncSkipImages: true,
        }),
      })
    );
  });

  it('sets syncSkipImages=false in script input when syncSkipImages is not set for a sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-with-images',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
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
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
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
      action: 'sync',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          syncSkipImages: false,
        }),
      })
    );
  });

  it('persists sync target metadata from the sequencer-backed sync result', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-metadata',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
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
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
        syncTargetMatchStrategy: 'direct_listing_url',
        syncTargetListingId: 'external-existing',
        syncTargetListingUrl: 'https://www.tradera.com/item/external-existing',
        syncImageMode: 'fields_only',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
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
      action: 'sync',
      browserMode: 'headed',
      syncSkipImages: true,
    });

    expect(result.metadata).toMatchObject({
      scriptMode: 'scripted',
      syncTargetMatchStrategy: 'direct_listing_url',
      syncTargetListingId: 'external-existing',
      syncTargetListingUrl: 'https://www.tradera.com/item/external-existing',
      syncImageMode: 'fields_only',
      syncFieldsOnly: true,
    });
  });

  it('forces syncSkipImages=false in script input when syncSkipImages=true is passed for a non-sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-list-no-skip',
      externalListingId: 'new-listing-id',
      listingUrl: 'https://www.tradera.com/item/new-listing-id',
      publishVerified: true,
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
      rawResult: { listingUrl: 'https://www.tradera.com/item/new-listing-id' },
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
      syncSkipImages: true,
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'list',
          syncSkipImages: false,
        }),
      })
    );
  });

  it('passes an inherited mapped category into quicklist input when only a parent category is mapped', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'anime-pins',
      catalogId: 'catalog-primary',
      catalogs: [{ catalogId: 'catalog-primary' }, { catalogId: 'catalog-jewellery' }],
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
        id: 'mapping-parent',
        connectionId: 'connection-1',
        externalCategoryId: '101',
        internalCategoryId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        externalCategory: {
          id: 'external-category-101',
          connectionId: 'connection-1',
          externalId: '101',
          name: 'Pins & Needles',
          parentExternalId: '100',
          path: 'Collectibles > Pins & Needles',
          depth: 1,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-02T10:00:00.000Z',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
        internalCategory: {
          id: 'jewellery-pins',
          name: 'Pins',
          description: null,
          color: null,
          parentId: 'jewellery',
          catalogId: 'catalog-jewellery',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'anime-pins',
      name: 'Anime Pins',
      description: null,
      color: null,
      parentId: 'jewellery-pins',
      catalogId: 'catalog-jewellery',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'jewellery',
        name: 'Jewellery',
        description: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'jewellery-pins',
        name: 'Pins',
        description: null,
        color: null,
        parentId: 'jewellery',
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'anime-pins',
        name: 'Anime Pins',
        description: null,
        color: null,
        parentId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-parent-mapped',
      externalListingId: 'listing-parent-mapped',
      listingUrl: 'https://www.tradera.com/item/parent-mapped',
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
        listingUrl: 'https://www.tradera.com/item/parent-mapped',
        categoryPath: 'Collectibles > Pins & Needles',
        categorySource: 'categoryMapper',
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

    expect(getCategoryByIdMock).toHaveBeenCalledWith('anime-pins');
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-jewellery' });
    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaCategory: {
            externalId: '101',
            name: 'Pins & Needles',
            path: 'Collectibles > Pins & Needles',
            segments: ['Collectibles', 'Pins & Needles'],
            internalCategoryId: 'jewellery-pins',
            catalogId: 'catalog-jewellery',
          },
          traderaCategoryMapping: expect.objectContaining({
            reason: 'mapped_via_parent',
            matchScope: 'catalog_match',
            internalCategoryId: 'anime-pins',
            productCatalogIds: ['catalog-primary', 'catalog-jewellery'],
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      externalListingId: 'listing-parent-mapped',
      listingUrl: 'https://www.tradera.com/item/parent-mapped',
      metadata: {
        categoryMappingReason: 'mapped_via_parent',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'anime-pins',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins & Needles',
        categorySource: 'categoryMapper',
      },
    });
  });

  it('injects a recovered Tradera mapped category when only another connection carries the mapping', async () => {
    listCategoryMappingsMock.mockResolvedValue([]);
    listCategoryMappingsByInternalCategoryMock.mockResolvedValue([
      {
        id: 'legacy-mapping-1',
        connectionId: 'legacy-connection-1',
        externalCategoryId: '3343738',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        externalCategory: {
          id: 'legacy-external-category-1',
          connectionId: 'legacy-connection-1',
          externalId: '3343738',
          name: 'Gaming Wallets',
          parentExternalId: '3343737',
          path: 'Gadget Accessories > Wallets > Gaming Wallets',
          depth: 2,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-10T10:00:00.000Z',
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
        },
        internalCategory: {
          id: 'internal-category-1',
          name: 'Wallets',
          description: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'internal-category-1',
      name: 'Wallets',
      description: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-1',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'internal-category-1',
        name: 'Wallets',
        description: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-recovered-category',
      externalListingId: 'listing-recovered-category',
      listingUrl: 'https://www.tradera.com/item/recovered-category',
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
        listingUrl: 'https://www.tradera.com/item/recovered-category',
        categoryPath: 'Gadget Accessories > Wallets > Gaming Wallets',
        categorySource: 'categoryMapper',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-recovered-category',
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

    expect(listCategoryMappingsByInternalCategoryMock).toHaveBeenCalledWith(
      'internal-category-1',
      'catalog-1'
    );
    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaCategory: {
            externalId: '3343738',
            name: 'Gaming Wallets',
            path: 'Gadget Accessories > Wallets > Gaming Wallets',
            segments: ['Gadget Accessories', 'Wallets', 'Gaming Wallets'],
            internalCategoryId: 'internal-category-1',
            catalogId: 'catalog-1',
          },
          traderaCategoryMapping: expect.objectContaining({
            reason: 'mapped',
            recoveredFromDifferentConnection: true,
            sourceConnectionId: 'legacy-connection-1',
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      metadata: expect.objectContaining({
        categoryId: '3343738',
        categoryPath: 'Gadget Accessories > Wallets > Gaming Wallets',
        categorySource: 'categoryMapper',
        categoryMappingReason: 'mapped',
        categoryMappingRecoveredFromAnotherConnection: true,
        categoryMappingSourceConnectionId: 'legacy-connection-1',
      }),
    });
  });

  it('derives the external listing id from modern Tradera item urls when the runner omits it', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-modern-url',
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
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-modern-url',
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
        runId: 'run-modern-url',
        publishVerified: true,
      }),
    });
  });

  it('returns duplicate-linked success metadata when quicklist links an existing Tradera listing', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-duplicate-linked',
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      publishVerified: false,
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
        stage: 'duplicate_linked',
        currentUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
        externalListingId: '725447805',
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
        duplicateLinked: true,
        duplicateMatchStrategy: 'title+product-id',
        duplicateMatchedProductId: 'BASE-1',
        duplicateCandidateCount: 2,
        duplicateSearchTitle: 'Example title',
        duplicateIgnoredNonExactCandidateCount: 3,
        duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
        categorySource: null,
        categoryPath: null,
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-duplicate-linked',
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

    expect(result.externalListingId).toBe('725447805');
    expect(result.listingUrl).toBe(
      'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars'
    );
    expect(result.metadata).toMatchObject({
      runId: 'run-duplicate-linked',
      publishVerified: false,
      latestStage: 'duplicate_linked',
      latestStageUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      duplicateLinked: true,
      duplicateMatchStrategy: 'title+product-id',
      duplicateMatchedProductId: 'BASE-1',
      duplicateCandidateCount: 2,
      duplicateSearchTitle: 'Example title',
      duplicateIgnoredNonExactCandidateCount: 3,
      duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
      categoryId: '101',
      categoryPath: 'Collectibles > Pins',
      categorySource: null,
      rawResult: {
        duplicateLinked: true,
        duplicateMatchStrategy: 'title+product-id',
        duplicateMatchedProductId: 'BASE-1',
        duplicateCandidateCount: 2,
        duplicateSearchTitle: 'Example title',
        duplicateIgnoredNonExactCandidateCount: 3,
        duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
      },
    });
  });
});
