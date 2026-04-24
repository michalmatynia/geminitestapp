import { beforeEach, describe, expect, it, vi } from 'vitest';
import { internalError } from '@/shared/errors/app-error';

const {
  chromiumLaunchMock,
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
  encryptSecretMock,
  getProductByIdMock,
  resolveTraderaListingPriceForProductMock,
  resolveTraderaCategoryMappingResolutionForProductMock,
  ensureLoggedInMock,
  readTraderaAuthStateMock,
  findVisibleLocatorMock,
  buildCanonicalTraderaListingUrlMock,
  extractExternalListingIdMock,
  captureTraderaListingDebugArtifactsMock,
  updateConnectionMock,
} = vi.hoisted(() => ({
  chromiumLaunchMock: vi.fn(),
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  resolveTraderaListingPriceForProductMock: vi.fn(),
  resolveTraderaCategoryMappingResolutionForProductMock: vi.fn(),
  ensureLoggedInMock: vi.fn(),
  readTraderaAuthStateMock: vi.fn(),
  findVisibleLocatorMock: vi.fn(),
  buildCanonicalTraderaListingUrlMock: vi.fn(),
  extractExternalListingIdMock: vi.fn(),
  captureTraderaListingDebugArtifactsMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('@/shared/lib/playwright/runtime', () => ({
  getPlaywrightRuntime: () => ({
    chromium: {
      launch: (...args: unknown[]) => chromiumLaunchMock(...args),
    },
  }),
  getPlaywrightDevicesCatalog: () => ({}),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: async () => ({
    updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
  }),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: (...args: unknown[]) => getProductByIdMock(...args),
  }),
}));

vi.mock('./price', () => ({
  resolveTraderaListingPriceForProduct: (...args: unknown[]) =>
    resolveTraderaListingPriceForProductMock(...args),
}));

vi.mock('./category-mapping', () => ({
  resolveTraderaCategoryMappingResolutionForProduct: (...args: unknown[]) =>
    resolveTraderaCategoryMappingResolutionForProductMock(...args),
}));

vi.mock('./tradera-browser-auth', () => ({
  ensureLoggedIn: (...args: unknown[]) => ensureLoggedInMock(...args),
  readTraderaAuthState: (...args: unknown[]) => readTraderaAuthStateMock(...args),
}));

vi.mock('./utils', () => ({
  findVisibleLocator: (...args: unknown[]) => findVisibleLocatorMock(...args),
  buildCanonicalTraderaListingUrl: (...args: unknown[]) =>
    buildCanonicalTraderaListingUrlMock(...args),
  extractExternalListingId: (...args: unknown[]) => extractExternalListingIdMock(...args),
  captureTraderaListingDebugArtifacts: (...args: unknown[]) =>
    captureTraderaListingDebugArtifactsMock(...args),
}));

import { runTraderaBrowserListingStandard } from './tradera-browser-standard';

describe('runTraderaBrowserListingStandard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parsePersistedStorageStateMock.mockReturnValue(null);
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      browser: 'chromium',
      headless: true,
      slowMo: 0,
      timeout: 30_000,
      navigationTimeout: 30_000,
      emulateDevice: false,
      deviceName: null,
      proxyEnabled: false,
      proxyServer: null,
      proxyUsername: null,
      proxyPassword: null,
    });
    encryptSecretMock.mockImplementation((value: string) => `encrypted:${value}`);
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'KEYCHA1266',
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      defaultPriceGroupId: 'price-group-pln',
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
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValue({
      mapping: {
        externalCategoryId: '292904',
        externalCategoryName: 'Other pins & needles',
        externalCategoryPath: 'Collectibles > Pins & needles > Other pins & needles',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-1',
        pathSegments: ['Collectibles', 'Pins & needles', 'Other pins & needles'],
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-1'],
      matchingMappingCount: 1,
      validMappingCount: 1,
      catalogMatchedMappingCount: 1,
    });
    readTraderaAuthStateMock.mockResolvedValue({
      currentUrl: 'https://www.tradera.com/en/selling/new',
      loggedIn: true,
    });
    buildCanonicalTraderaListingUrlMock.mockImplementation(
      (externalListingId: string) => `https://www.tradera.com/item/${externalListingId}`
    );
    captureTraderaListingDebugArtifactsMock.mockResolvedValue({
      screenshot: '/tmp/failure.png',
    });
  });

  it('fills the standard Tradera form with the resolved EUR price and returns pricing metadata', async () => {
    let currentUrl = 'https://www.tradera.com/en/selling/new';
    const titleFillMock = vi.fn().mockResolvedValue(undefined);
    const descriptionFillMock = vi.fn().mockResolvedValue(undefined);
    const priceFillMock = vi.fn().mockResolvedValue(undefined);
    const submitClickMock = vi.fn().mockImplementation(async () => {
      currentUrl = 'https://www.tradera.com/item/987654';
    });
    const storageStateMock = vi.fn().mockResolvedValue({ cookies: [], origins: [] });
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);

    findVisibleLocatorMock
      .mockResolvedValueOnce({ fill: titleFillMock })
      .mockResolvedValueOnce({ fill: descriptionFillMock })
      .mockResolvedValueOnce({ fill: priceFillMock })
      .mockResolvedValueOnce({ click: submitClickMock });

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        addInitScript: vi.fn().mockResolvedValue(undefined),
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          url: () => currentUrl,
          waitForNavigation: vi.fn().mockResolvedValue(undefined),
        }),
        storageState: storageStateMock,
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });
    extractExternalListingIdMock.mockImplementation((url: string) =>
      url.endsWith('/987654') ? '987654' : null
    );

    const result = await runTraderaBrowserListingStandard({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
      } as never,
      connection: {
        id: 'connection-1',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
    });

    expect(getProductByIdMock).toHaveBeenCalledWith('product-1');
    expect(ensureLoggedInMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'connection-1' }),
      'https://www.tradera.com/en/selling/new?categoryId=292904',
      expect.anything()
    );
    expect(resolveTraderaCategoryMappingResolutionForProductMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      product: expect.objectContaining({ id: 'product-1' }),
    });
    expect(resolveTraderaListingPriceForProductMock).toHaveBeenCalledWith({
      product: expect.objectContaining({ id: 'product-1' }),
      targetCurrencyCode: 'EUR',
    });
    expect(descriptionFillMock).toHaveBeenCalledWith(
      'Example description | Product ID: product-1 | SKU: KEYCHA1266'
    );
    expect(priceFillMock).toHaveBeenCalledWith('55');
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightStorageState: 'encrypted:{"cookies":[],"origins":[]}',
      playwrightStorageStateUpdatedAt: expect.any(String),
    });
    expect(result).toMatchObject({
      externalListingId: '987654',
      listingUrl: 'https://www.tradera.com/item/987654',
      completedAt: expect.any(String),
      metadata: expect.objectContaining({
        mode: 'standard',
        browserMode: 'headless',
        requestedBrowserMode: 'connection_default',
        listingFormUrl: 'https://www.tradera.com/en/selling/new?categoryId=292904',
        categoryId: '292904',
        categoryPath: 'Collectibles > Pins & needles > Other pins & needles',
        categorySource: 'categoryMapper',
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        completedAt: expect.any(String),
        playwright: expect.objectContaining({
          instance: expect.objectContaining({
            kind: 'tradera_standard_listing',
            family: 'listing',
            listingId: 'listing-1',
          }),
        }),
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
      }),
    });
    expect((result.metadata as { executionSteps?: Array<{ id: string; status: string }> }).executionSteps)
      .toEqual([
        expect.objectContaining({ id: 'browser_preparation', status: 'success' }),
        expect.objectContaining({ id: 'browser_open', status: 'success' }),
        expect.objectContaining({ id: 'cookie_accept', status: 'success' }),
        expect.objectContaining({ id: 'auth_check', status: 'success' }),
        expect.objectContaining({ id: 'auth_login', status: 'skipped' }),
        expect.objectContaining({ id: 'auth_manual', status: 'skipped' }),
        expect.objectContaining({ id: 'sell_page_open', status: 'success' }),
        expect.objectContaining({ id: 'load_product', status: 'success' }),
        expect.objectContaining({ id: 'resolve_price', status: 'success' }),
        expect.objectContaining({ id: 'title_fill', status: 'success' }),
        expect.objectContaining({ id: 'description_fill', status: 'success' }),
        expect.objectContaining({ id: 'price_set', status: 'success' }),
        expect.objectContaining({ id: 'publish', status: 'success' }),
        expect.objectContaining({ id: 'publish_verify', status: 'success' }),
        expect.objectContaining({ id: 'browser_close', status: 'success' }),
      ]);
    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });

  it('normalizes pricing metadata identifiers before returning standard-mode results', async () => {
    let currentUrl = 'https://www.tradera.com/en/selling/new';
    const titleFillMock = vi.fn().mockResolvedValue(undefined);
    const descriptionFillMock = vi.fn().mockResolvedValue(undefined);
    const priceFillMock = vi.fn().mockResolvedValue(undefined);
    const submitClickMock = vi.fn().mockImplementation(async () => {
      currentUrl = 'https://www.tradera.com/item/987655';
    });
    const storageStateMock = vi.fn().mockResolvedValue({ cookies: [], origins: [] });
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);

    findVisibleLocatorMock
      .mockResolvedValueOnce({ fill: titleFillMock })
      .mockResolvedValueOnce({ fill: descriptionFillMock })
      .mockResolvedValueOnce({ fill: priceFillMock })
      .mockResolvedValueOnce({ click: submitClickMock });

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        addInitScript: vi.fn().mockResolvedValue(undefined),
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          url: () => currentUrl,
          waitForNavigation: vi.fn().mockResolvedValue(undefined),
        }),
        storageState: storageStateMock,
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });
    extractExternalListingIdMock.mockImplementation((url: string) =>
      url.endsWith('/987655') ? '987655' : null
    );
    resolveTraderaListingPriceForProductMock.mockResolvedValueOnce({
      listingPrice: 55,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: '  price-group-pln  ',
      catalogDefaultPriceGroupId: '  price-group-pln  ',
      catalogId: '  catalog-1  ',
      catalogPriceGroupIds: ['  price-group-pln  ', 'price-group-eur', '', 'price-group-eur'],
      loadedPriceGroupIds: [' price-group-pln ', 'price-group-eur', '  ', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['  price-group-eur ', 'price-group-eur', ''],
    });

    const result = await runTraderaBrowserListingStandard({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
      } as never,
      connection: {
        id: 'connection-1',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
    });

    expect(result.metadata).toEqual(
      expect.objectContaining({
        defaultPriceGroupId: 'price-group-pln',
        catalogDefaultPriceGroupId: 'price-group-pln',
        pricingCatalogId: 'catalog-1',
        catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
        loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
        matchedTargetPriceGroupIds: ['price-group-eur'],
      })
    );
    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });

  it('fails with persisted metadata when the standard path cannot resolve EUR pricing', async () => {
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        addInitScript: vi.fn().mockResolvedValue(undefined),
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          url: () => 'https://www.tradera.com/en/selling/new',
        }),
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });

    resolveTraderaListingPriceForProductMock.mockResolvedValueOnce({
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
      runTraderaBrowserListingStandard({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
        } as never,
        connection: {
          id: 'connection-1',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
      })
    ).rejects.toMatchObject({
      message: 'FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.',
      meta: expect.objectContaining({
        mode: 'standard',
        browserMode: 'headless',
        requestedBrowserMode: 'connection_default',
        listingFormUrl: 'https://www.tradera.com/en/selling/new?categoryId=292904',
        listingCurrencyCode: 'PLN',
        targetCurrencyCode: 'EUR',
        priceResolutionReason: 'target_currency_unresolved',
      }),
    });
    expect(findVisibleLocatorMock).not.toHaveBeenCalled();
    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });

  it('attaches auth diagnostics when Tradera session validation does not resolve', async () => {
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        addInitScript: vi.fn().mockResolvedValue(undefined),
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          url: () => 'https://www.tradera.com/en/my/',
        }),
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });

    ensureLoggedInMock.mockRejectedValue(
      internalError('AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.', {
        phase: 'session_check',
        hasStoredSession: true,
        currentUrl: 'https://www.tradera.com/en/my/',
        resolution: 'unknown',
      })
    );
    readTraderaAuthStateMock.mockResolvedValue({
      currentUrl: 'https://www.tradera.com/en/my/',
      loggedIn: false,
      successVisible: false,
      loginFormVisible: false,
      errorText: '',
      captchaDetected: false,
      manualVerificationDetected: false,
      cookieConsentVisible: false,
      knownAuthenticatedUrl: false,
      resolution: 'unknown',
      matchedSignals: [],
    });

    await expect(
      runTraderaBrowserListingStandard({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
        } as never,
        connection: {
          id: 'connection-1',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
      })
    ).rejects.toMatchObject({
      message: 'AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.',
      meta: expect.objectContaining({
        mode: 'standard',
        listingFormUrl: 'https://www.tradera.com/en/selling/new?categoryId=292904',
        authState: expect.objectContaining({
          currentUrl: 'https://www.tradera.com/en/my/',
          resolution: 'unknown',
        }),
        authFailureMeta: expect.objectContaining({
          phase: 'session_check',
          hasStoredSession: true,
        }),
      }),
    });

    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });

  it('rejects mapper-mode standard listings when no active Tradera mapping exists', async () => {
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);

    chromiumLaunchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        addInitScript: vi.fn().mockResolvedValue(undefined),
        setDefaultTimeout: vi.fn(),
        setDefaultNavigationTimeout: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          url: () => 'https://www.tradera.com/en/selling/new',
        }),
        close: contextCloseMock,
      }),
      close: browserCloseMock,
    });
    resolveTraderaCategoryMappingResolutionForProductMock.mockResolvedValueOnce({
      mapping: null,
      reason: 'no_active_mapping',
      matchScope: 'none',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-1'],
      matchingMappingCount: 0,
      validMappingCount: 0,
      catalogMatchedMappingCount: 0,
    });

    await expect(
      runTraderaBrowserListingStandard({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
        } as never,
        connection: {
          id: 'connection-1',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
      })
    ).rejects.toMatchObject({
      message:
        'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
      meta: expect.objectContaining({
        mode: 'standard',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        categoryMappingReason: 'no_active_mapping',
        categoryMatchScope: 'none',
        categoryInternalCategoryId: 'internal-category-1',
      }),
    });

    expect(ensureLoggedInMock).not.toHaveBeenCalled();
    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });
});
