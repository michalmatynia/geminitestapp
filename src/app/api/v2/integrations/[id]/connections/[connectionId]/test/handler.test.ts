import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getConnectionByIdAndIntegrationMock,
  getIntegrationByIdMock,
  getProductByIdMock,
  updateConnectionMock,
  decryptSecretMock,
  encryptSecretMock,
  resolvePlaywrightConnectionRuntimeMock,
  createTraderaBrowserTestUtilsMock,
  validateTraderaQuickListProductConfigMock,
  chromiumLaunchMock,
  browserNewContextMock,
  contextSetDefaultTimeoutMock,
  contextSetDefaultNavigationTimeoutMock,
  contextNewPageMock,
  contextAddInitScriptMock,
  contextRouteMock,
  contextCloseMock,
  browserCloseMock,
  safeGotoMock,
  safeWaitForLoadStateMock,
  safeIsVisibleMock,
  pageLocatorMock,
  pageGotoMock,
  pageContextStorageStateMock,
  pageState,
  pageWaitForTimeoutMock,
  pageWaitForURLMock,
  pageCloseMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  resolvePlaywrightConnectionRuntimeMock: vi.fn(),
  createTraderaBrowserTestUtilsMock: vi.fn(),
  validateTraderaQuickListProductConfigMock: vi.fn(),
  chromiumLaunchMock: vi.fn(),
  browserNewContextMock: vi.fn(),
  contextSetDefaultTimeoutMock: vi.fn(),
  contextSetDefaultNavigationTimeoutMock: vi.fn(),
  contextNewPageMock: vi.fn(),
  contextAddInitScriptMock: vi.fn(),
  contextRouteMock: vi.fn(),
  contextCloseMock: vi.fn(),
  browserCloseMock: vi.fn(),
  safeGotoMock: vi.fn(),
  safeWaitForLoadStateMock: vi.fn(),
  safeIsVisibleMock: vi.fn(),
  pageLocatorMock: vi.fn(),
  pageGotoMock: vi.fn(),
  pageContextStorageStateMock: vi.fn(),
  pageState: { currentUrl: 'about:blank' as string },
  pageWaitForTimeoutMock: vi.fn(),
  pageWaitForURLMock: vi.fn(),
  pageCloseMock: vi.fn(),
}));

vi.mock('@/shared/lib/playwright/runtime', () => ({
  getPlaywrightRuntime: () => ({
    chromium: {
      launch: (...args: unknown[]) => chromiumLaunchMock(...args),
    },
  }),
  getPlaywrightDevicesCatalog: () => ({
    'Desktop Chrome': {
      defaultBrowserType: 'chromium',
      viewport: { width: 1280, height: 720 },
      userAgent: 'persona-user-agent',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
    },
  }),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
  getIntegrationRepository: async () => ({
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      getConnectionByIdAndIntegrationMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
  }),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: (...args: unknown[]) => getProductByIdMock(...args),
  }),
}));

vi.mock('@/features/integrations/services/tradera-api-client', () => ({
  getTraderaUserInfo: vi.fn(),
}));

vi.mock('@/features/integrations/services/tradera-listing/preflight', () => ({
  validateTraderaQuickListProductConfig: (...args: unknown[]) =>
    validateTraderaQuickListProductConfigMock(...args),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    resolvePlaywrightConnectionRuntime: (...args: unknown[]) =>
      resolvePlaywrightConnectionRuntimeMock(...args) as Promise<unknown>,
    resolvePlaywrightConnectionTestRuntime: async (
      input: { connection: unknown }
    ) => resolvePlaywrightConnectionRuntimeMock(input.connection),
  };
});

vi.mock('@/features/integrations/services/tradera-browser-test-utils', () => ({
  createTraderaBrowserTestUtils: (...args: unknown[]) => createTraderaBrowserTestUtilsMock(...args),
}));

import { postTestConnectionHandler } from './handler';

describe('integration connection test handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'manual',
      },
    });

    getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      username: 'user@example.com',
      password: 'password-secret',
      playwrightStorageState: 'state-secret',
      playwrightProxyPassword: 'raw-proxy-secret',
      playwrightHumanizeMouse: false,
      playwrightMouseJitter: 0,
      playwrightClickDelayMin: 0,
      playwrightClickDelayMax: 0,
      playwrightInputDelayMin: 0,
      playwrightInputDelayMax: 0,
      playwrightActionDelayMin: 0,
      playwrightActionDelayMax: 0,
      playwrightPersonaId: 'persona-1',
    });

    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
      name: 'Tradera',
    });

    updateConnectionMock.mockResolvedValue(undefined);
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
    });
    validateTraderaQuickListProductConfigMock.mockResolvedValue({
      categoryMapping: { reason: 'mapped', mapping: {} },
      shippingGroupResolution: { reason: 'mapped', shippingPriceEur: 5 },
    });

    decryptSecretMock.mockImplementation((value: string) => {
      if (value === 'state-secret') {
        return JSON.stringify({ cookies: [], origins: [] });
      }
      if (value === 'password-secret') {
        return 'decrypted-password';
      }
      return `decrypted:${value}`;
    });

    encryptSecretMock.mockImplementation((value: string) => `encrypted:${value}`);
    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      settings: {
        browser: 'chromium',
        headless: true,
        slowMo: 77,
        timeout: 11_111,
        navigationTimeout: 22_222,
        humanizeMouse: true,
        mouseJitter: 11,
        clickDelayMin: 40,
        clickDelayMax: 160,
        inputDelayMin: 35,
        inputDelayMax: 140,
        actionDelayMin: 300,
        actionDelayMax: 1_100,
        proxyEnabled: true,
        proxyServer: 'http://persona-proxy.example:8080',
        proxyUsername: 'persona-user',
        proxyPassword: 'persona-pass',
        emulateDevice: true,
        deviceName: 'Desktop Chrome',
      },
      storageState: { cookies: [], origins: [] },
      personaId: 'persona-1',
      browserPreference: 'chromium',
      deviceProfileName: 'Desktop Chrome',
      deviceContextOptions: {
        viewport: { width: 1280, height: 720 },
        userAgent: 'persona-user-agent',
      },
    });
    createTraderaBrowserTestUtilsMock.mockReturnValue({
      safeWaitForSelector: vi.fn(),
      safeWaitFor: vi.fn(),
      safeCount: vi.fn().mockResolvedValue(0),
      safeIsVisible: (...args: unknown[]) => safeIsVisibleMock(...args),
      safeInnerText: vi.fn().mockResolvedValue(''),
      safeGoto: (...args: unknown[]) => safeGotoMock(...args),
      safeWaitForLoadState: (...args: unknown[]) => safeWaitForLoadStateMock(...args),
      failWithDebug: async (_step: string, detail: string) => {
        throw new Error(detail);
      },
      humanizedPause: vi.fn(),
      humanizedClick: vi.fn(),
      humanizedFill: vi.fn(),
      acceptCookieConsent: vi.fn().mockResolvedValue(false),
      successSelector: '[data-tradera-success]',
      errorSelector: '[data-tradera-error]',
    });

    pageState.currentUrl = 'https://www.tradera.com/en/my/listings?tab=active';
    safeGotoMock.mockImplementation(async (url: string) => {
      pageState.currentUrl = url.includes('/selling')
        ? 'https://www.tradera.com/en/selling/new'
        : url;
    });
    pageWaitForURLMock.mockImplementation(async () => {
      pageState.currentUrl = 'https://www.tradera.com/en/selling/new';
    });
    pageGotoMock.mockImplementation(async (url: string) => {
      pageState.currentUrl = url;
    });
    pageWaitForTimeoutMock.mockResolvedValue(undefined);

    const page = {
      locator: (...args: unknown[]) => pageLocatorMock(...args),
      goto: (...args: unknown[]) => pageGotoMock(...args),
      url: () => pageState.currentUrl,
      context: () => ({
        storageState: (...args: unknown[]) => pageContextStorageStateMock(...args),
      }),
      waitForTimeout: (...args: unknown[]) => pageWaitForTimeoutMock(...args),
      waitForURL: (...args: unknown[]) => pageWaitForURLMock(...args),
      close: (...args: unknown[]) => pageCloseMock(...args),
    };

    const context = {
      newPage: (...args: unknown[]) => contextNewPageMock(...args),
      addInitScript: (...args: unknown[]) => contextAddInitScriptMock(...args),
      route: (...args: unknown[]) => contextRouteMock(...args),
      setDefaultTimeout: (...args: unknown[]) => contextSetDefaultTimeoutMock(...args),
      setDefaultNavigationTimeout: (...args: unknown[]) =>
        contextSetDefaultNavigationTimeoutMock(...args),
      close: (...args: unknown[]) => contextCloseMock(...args),
    };

    const browser = {
      newContext: (...args: unknown[]) => browserNewContextMock(...args),
      close: (...args: unknown[]) => browserCloseMock(...args),
    };

    chromiumLaunchMock.mockResolvedValue(browser);
    browserNewContextMock.mockResolvedValue(context);
    contextNewPageMock.mockResolvedValue(page);
    pageContextStorageStateMock.mockResolvedValue({ cookies: [], origins: [] });
    pageCloseMock.mockResolvedValue(undefined);
    contextCloseMock.mockResolvedValue(undefined);
    browserCloseMock.mockResolvedValue(undefined);
    safeWaitForLoadStateMock.mockResolvedValue(undefined);
    safeIsVisibleMock.mockResolvedValue(false);
    safeIsVisibleMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    pageLocatorMock.mockReturnValue({
      first: () => ({}),
    });
  });

  it('reuses persona-resolved browser settings for manual login session checks', async () => {
    const response = await postTestConnectionHandler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
        { method: 'POST' }
      ),
      {} as never,
      { id: 'integration-1', connectionId: 'connection-1' }
    );

    const payload = (await response.json()) as { ok: boolean };

    expect(payload.ok).toBe(true);
    expect(resolvePlaywrightConnectionRuntimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'connection-1',
        playwrightPersonaId: 'persona-1',
      })
    );
    expect(chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
        slowMo: 77,
      })
    );
    expect(browserNewContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: { cookies: [], origins: [] },
        viewport: { width: 1280, height: 720 },
        userAgent: 'persona-user-agent',
      })
    );
    expect(contextSetDefaultTimeoutMock).toHaveBeenCalledWith(11_111);
    expect(contextSetDefaultNavigationTimeoutMock).toHaveBeenCalledWith(22_222);
    expect(createTraderaBrowserTestUtilsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        humanizeMouse: true,
        mouseJitter: 11,
        clickDelayMin: 40,
        clickDelayMax: 160,
        inputDelayMin: 35,
        inputDelayMax: 140,
        actionDelayMin: 300,
        actionDelayMax: 1_100,
      })
    );
    expect(safeGotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
      'Session check'
    );
    expect(safeGotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
      'Sell page check'
    );
    expect(browserNewContextMock).toHaveBeenCalled();
    expect(pageWaitForURLMock).not.toHaveBeenCalled();
    expect(decryptSecretMock).not.toHaveBeenCalledWith('raw-proxy-secret');
  });

  it('forces manual_session_refresh through the Tradera login page and ignores unauthenticated /my redirects until account markers appear', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'manual_session_refresh',
      },
    });

    let currentPhase: 'login' | 'redirected_my' | 'authenticated' = 'login';
    pageGotoMock.mockImplementation(async (url: string) => {
      pageState.currentUrl = url;
      currentPhase = 'login';
    });
    pageWaitForTimeoutMock.mockImplementation(async () => {
      if (currentPhase === 'login') {
        pageState.currentUrl = 'https://www.tradera.com/en/my/';
        currentPhase = 'redirected_my';
        return;
      }
      pageState.currentUrl = 'https://www.tradera.com/en/my/';
      currentPhase = 'authenticated';
    });
    pageLocatorMock.mockImplementation((selector: string) => ({
      first: () => ({
        count: async () => 1,
        isVisible: async () => {
          if (selector.includes('a[href*="logout"]')) {
            return currentPhase === 'authenticated';
          }
          if (selector.includes('#sign-in-form') || selector.includes('form[action*="login"]')) {
            return currentPhase === 'login';
          }
          return false;
        },
      }),
    }));

    const response = await postTestConnectionHandler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
        { method: 'POST' }
      ),
      {} as never,
      { id: 'integration-1', connectionId: 'connection-1' }
    );

    const payload = (await response.json()) as { ok: boolean; message: string };

    expect(payload.ok).toBe(true);
    expect(payload.message).toBe('Tradera session refreshed successfully.');
    expect(pageGotoMock).toHaveBeenCalledWith('https://www.tradera.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(pageWaitForTimeoutMock).toHaveBeenCalledTimes(3);
    expect(safeGotoMock).not.toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.anything(),
      expect.anything()
    );
    expect(updateConnectionMock).toHaveBeenCalledWith(
      'connection-1',
      expect.objectContaining({
        playwrightStorageState: expect.any(String),
        playwrightStorageStateUpdatedAt: expect.any(String),
      })
    );
  });

  it('supports fast quicklist preflight without opening the sell page or saving session again', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'quicklist_preflight',
      },
    });

    const response = await postTestConnectionHandler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
        { method: 'POST' }
      ),
      {} as never,
      { id: 'integration-1', connectionId: 'connection-1' }
    );

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean };

    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true,
        slowMo: 0,
      })
    );
    expect(safeGotoMock).toHaveBeenCalledTimes(1);
    expect(safeGotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }),
      'Session check'
    );
    expect(safeGotoMock).not.toHaveBeenCalledWith(
      'https://www.tradera.com/en/selling/new',
      expect.anything(),
      expect.anything()
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(pageWaitForURLMock).not.toHaveBeenCalled();
  });

  it('forces quicklist preflight to stay headless even when the connection default is headed', async () => {
    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      settings: {
        browser: 'chromium',
        headless: false,
        slowMo: 77,
        timeout: 11_111,
        navigationTimeout: 22_222,
        proxyEnabled: true,
        proxyServer: 'http://persona-proxy.example:8080',
        proxyUsername: 'persona-user',
        proxyPassword: 'persona-pass',
        emulateDevice: true,
        deviceName: 'Desktop Chrome',
      },
      storageState: { cookies: [], origins: [] },
      personaId: 'persona-1',
      browserPreference: 'chromium',
      deviceProfileName: 'Desktop Chrome',
      deviceContextOptions: {
        viewport: { width: 1280, height: 720 },
        userAgent: 'persona-user-agent',
      },
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'quicklist_preflight',
      },
    });

    const response = await postTestConnectionHandler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
        { method: 'POST' }
      ),
      {} as never,
      { id: 'integration-1', connectionId: 'connection-1' }
    );

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean };

    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true,
        slowMo: 0,
      })
    );
  });

  it('validates product configuration during quicklist preflight when a product id is supplied', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'quicklist_preflight',
        productId: 'product-1',
      },
    });

    const response = await postTestConnectionHandler(
      new NextRequest(
        'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
        { method: 'POST' }
      ),
      {} as never,
      { id: 'integration-1', connectionId: 'connection-1' }
    );

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean };

    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(getProductByIdMock).toHaveBeenCalledWith('product-1');
    expect(validateTraderaQuickListProductConfigMock).toHaveBeenCalledWith({
      product: expect.objectContaining({ id: 'product-1' }),
      connection: expect.objectContaining({ id: 'connection-1' }),
    });
  });

  it('fails quicklist preflight before browser launch when product configuration is invalid', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        mode: 'quicklist_preflight',
        productId: 'product-1',
      },
    });
    validateTraderaQuickListProductConfigMock.mockRejectedValue(
      new Error(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    await expect(
      postTestConnectionHandler(
        new NextRequest(
          'http://localhost:3000/api/v2/integrations/integration-1/connections/connection-1/test',
          { method: 'POST' }
        ),
        {} as never,
        { id: 'integration-1', connectionId: 'connection-1' }
      )
    ).rejects.toThrow(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );
    expect(chromiumLaunchMock).not.toHaveBeenCalled();
  });
});
