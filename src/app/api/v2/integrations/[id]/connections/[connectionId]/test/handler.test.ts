import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getConnectionByIdAndIntegrationMock,
  getIntegrationByIdMock,
  updateConnectionMock,
  decryptSecretMock,
  encryptSecretMock,
  resolveConnectionPlaywrightSettingsMock,
  chromiumLaunchMock,
  browserNewContextMock,
  contextSetDefaultTimeoutMock,
  contextSetDefaultNavigationTimeoutMock,
  contextNewPageMock,
  contextCloseMock,
  browserCloseMock,
  safeGotoMock,
  safeWaitForLoadStateMock,
  safeIsVisibleMock,
  pageLocatorMock,
  pageContextStorageStateMock,
  pageWaitForURLMock,
  pageCloseMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  chromiumLaunchMock: vi.fn(),
  browserNewContextMock: vi.fn(),
  contextSetDefaultTimeoutMock: vi.fn(),
  contextSetDefaultNavigationTimeoutMock: vi.fn(),
  contextNewPageMock: vi.fn(),
  contextCloseMock: vi.fn(),
  browserCloseMock: vi.fn(),
  safeGotoMock: vi.fn(),
  safeWaitForLoadStateMock: vi.fn(),
  safeIsVisibleMock: vi.fn(),
  pageLocatorMock: vi.fn(),
  pageContextStorageStateMock: vi.fn(),
  pageWaitForURLMock: vi.fn(),
  pageCloseMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => chromiumLaunchMock(...args),
  },
  devices: {
    'Desktop Chrome': {
      defaultBrowserType: 'chromium',
      viewport: { width: 1280, height: 720 },
      userAgent: 'persona-user-agent',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
    },
  },
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

vi.mock('@/features/integrations/services/tradera-api-client', () => ({
  getTraderaUserInfo: vi.fn(),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-browser-test-utils', () => ({
  createTraderaBrowserTestUtils: () => ({
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
  }),
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

    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 77,
      timeout: 11_111,
      navigationTimeout: 22_222,
      proxyEnabled: true,
      proxyServer: 'http://persona-proxy.example:8080',
      proxyUsername: 'persona-user',
      proxyPassword: 'persona-pass',
      emulateDevice: true,
      deviceName: 'Desktop Chrome',
    });

    let currentUrl = 'https://www.tradera.com/en/my/listings?tab=active';
    safeGotoMock.mockImplementation(async (url: string) => {
      currentUrl = url.includes('/selling')
        ? 'https://www.tradera.com/en/selling/new'
        : url;
    });
    pageWaitForURLMock.mockImplementation(async () => {
      currentUrl = 'https://www.tradera.com/en/selling/new';
    });

    const page = {
      locator: (...args: unknown[]) => pageLocatorMock(...args),
      url: () => currentUrl,
      context: () => ({
        storageState: (...args: unknown[]) => pageContextStorageStateMock(...args),
      }),
      waitForURL: (...args: unknown[]) => pageWaitForURLMock(...args),
      close: (...args: unknown[]) => pageCloseMock(...args),
    };

    const context = {
      newPage: (...args: unknown[]) => contextNewPageMock(...args),
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
    expect(resolveConnectionPlaywrightSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'connection-1',
        playwrightPersonaId: 'persona-1',
      })
    );
    expect(chromiumLaunchMock).toHaveBeenCalledWith({
      headless: false,
      slowMo: 77,
      proxy: {
        server: 'http://persona-proxy.example:8080',
        username: 'persona-user',
        password: 'persona-pass',
      },
    });
    expect(browserNewContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: { cookies: [], origins: [] },
        viewport: { width: 1280, height: 720 },
        userAgent: 'persona-user-agent',
      })
    );
    expect(contextSetDefaultTimeoutMock).toHaveBeenCalledWith(11_111);
    expect(contextSetDefaultNavigationTimeoutMock).toHaveBeenCalledWith(22_222);
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
    expect(chromiumLaunchMock).toHaveBeenCalledWith({
      headless: true,
      slowMo: 0,
      proxy: {
        server: 'http://persona-proxy.example:8080',
        username: 'persona-user',
        password: 'persona-pass',
      },
    });
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
});
