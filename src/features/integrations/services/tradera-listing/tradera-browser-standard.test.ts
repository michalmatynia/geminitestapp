import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  chromiumLaunchMock,
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
  encryptSecretMock,
  getProductByIdMock,
  resolveTraderaListingPriceForProductMock,
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
  ensureLoggedInMock: vi.fn(),
  readTraderaAuthStateMock: vi.fn(),
  findVisibleLocatorMock: vi.fn(),
  buildCanonicalTraderaListingUrlMock: vi.fn(),
  extractExternalListingIdMock: vi.fn(),
  captureTraderaListingDebugArtifactsMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => chromiumLaunchMock(...args),
  },
  devices: {},
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
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
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        completedAt: expect.any(String),
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
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        listingCurrencyCode: 'PLN',
        targetCurrencyCode: 'EUR',
        priceResolutionReason: 'target_currency_unresolved',
      }),
    });
    expect(findVisibleLocatorMock).not.toHaveBeenCalled();
    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });
});
