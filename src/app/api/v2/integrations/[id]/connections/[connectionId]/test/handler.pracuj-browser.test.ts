import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  decryptSecretMock,
  findVisibleLocatorMock,
  resolvePlaywrightConnectionTestRuntimeMock,
  openPlaywrightConnectionTestSessionMock,
  persistPlaywrightConnectionTestSessionMock,
  closeSessionMock,
} = vi.hoisted(() => ({
  decryptSecretMock: vi.fn(),
  findVisibleLocatorMock: vi.fn(),
  resolvePlaywrightConnectionTestRuntimeMock: vi.fn(),
  openPlaywrightConnectionTestSessionMock: vi.fn(),
  persistPlaywrightConnectionTestSessionMock: vi.fn(),
  closeSessionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-listing/utils', () => ({
  findVisibleLocator: (...args: unknown[]) => findVisibleLocatorMock(...args),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    resolvePlaywrightConnectionTestRuntime: (...args: unknown[]) =>
      resolvePlaywrightConnectionTestRuntimeMock(...args),
    openPlaywrightConnectionTestSession: (...args: unknown[]) =>
      openPlaywrightConnectionTestSessionMock(...args),
    persistPlaywrightConnectionTestSession: (...args: unknown[]) =>
      persistPlaywrightConnectionTestSessionMock(...args),
  };
});

import type {
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';

import { handlePracujBrowserTest } from './handler.pracuj-browser';

type PageState = {
  currentUrl: string;
  bodyText: string;
  showEmail: boolean;
  showPassword: boolean;
};

let mockNow = 0;

const createLocator = (visible: boolean) => ({
  count: vi.fn(async () => (visible ? 1 : 0)),
  isVisible: vi.fn(async () => visible),
  click: vi.fn(async () => undefined),
  fill: vi.fn(async () => undefined),
});

const buildPage = (state: PageState) => ({
  goto: vi.fn(async (url: string) => {
    state.currentUrl = url;
  }),
  waitForLoadState: vi.fn(async () => undefined),
  waitForNavigation: vi.fn(async () => undefined),
  waitForTimeout: vi.fn(async (timeoutMs: number) => {
    mockNow += timeoutMs;
  }),
  url: vi.fn(() => state.currentUrl),
  locator: vi.fn((selector: string) => {
    const locator = {
      first: () => locator,
      textContent: vi.fn(async () => (selector === 'body' ? state.bodyText : '')),
    };
    return locator;
  }),
  context: vi.fn(() => ({
    storageState: vi.fn(async () => ({
      cookies: [{ name: 'pracuj-session', value: 'ok' }],
      origins: [],
    })),
  })),
});

const createCtx = (
  overrides: Partial<Parameters<typeof handlePracujBrowserTest>[0]> = {}
): Parameters<typeof handlePracujBrowserTest>[0] => {
  const steps: Array<{ step: string; status: 'pending' | 'ok' | 'failed'; detail: string }> = [];
  return {
    connection: {
      id: 'connection-pracuj-1',
      integrationId: 'integration-pracuj-1',
      name: 'Pracuj.pl Profile',
      username: '',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    } as IntegrationConnectionRecord,
    repo: {
      updateConnection: vi.fn(),
      getIntegrationById: vi.fn(),
      getConnectionByIdAndIntegration: vi.fn(),
    } as unknown as IntegrationRepository,
    manualMode: false,
    quicklistPreflightMode: false,
    manualLoginTimeoutMs: 5000,
    steps,
    pushStep: (step, status, detail) => {
      steps.push({ step, status, detail });
    },
    fail: async (step, detail, status = 400): Promise<never> => {
      steps.push({ step, status: 'failed', detail });
      throw new Error(`${status}:${detail}`);
    },
    ...overrides,
  };
};

describe('handlePracujBrowserTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNow = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);
    decryptSecretMock.mockImplementation((value: string) => `decrypted:${value}`);
    resolvePlaywrightConnectionTestRuntimeMock.mockResolvedValue({
      settings: {
        browser: 'chromium',
        headless: true,
        slowMo: 0,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
      },
      storageState: { cookies: [], origins: [] },
    });
    closeSessionMock.mockResolvedValue(undefined);
    persistPlaywrightConnectionTestSessionMock.mockImplementation(
      async ({ pushStep }: { pushStep: (step: string, status: 'ok', detail: string) => void }) => {
        pushStep('Saving session', 'ok', 'Pracuj.pl browser session saved');
        return true;
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts an active stored Pracuj.pl session during preflight', async () => {
    const state: PageState = {
      currentUrl: 'about:blank',
      bodyText: 'Moje aplikacje',
      showEmail: false,
      showPassword: false,
    };
    const page = buildPage(state);
    findVisibleLocatorMock.mockResolvedValue(null);
    openPlaywrightConnectionTestSessionMock.mockResolvedValue({
      page,
      close: closeSessionMock,
    });

    const response = await handlePracujBrowserTest(
      createCtx({ quicklistPreflightMode: true })
    );

    expect(await response.json()).toMatchObject({
      ok: true,
      sessionReady: true,
      message: 'Pracuj.pl session is active.',
    });
    expect(persistPlaywrightConnectionTestSessionMock).not.toHaveBeenCalled();
    expect(closeSessionMock).toHaveBeenCalledTimes(1);
  });

  it('waits for manual Pracuj.pl login and persists the browser session', async () => {
    const state: PageState = {
      currentUrl: 'about:blank',
      bodyText: 'Podaj adres e-mail',
      showEmail: true,
      showPassword: false,
    };
    const page = buildPage(state);
    page.waitForTimeout.mockImplementation(async (timeoutMs: number) => {
      mockNow += timeoutMs;
      state.currentUrl = 'https://www.pracuj.pl/moje-aplikacje';
      state.bodyText = 'Moje aplikacje';
      state.showEmail = false;
    });
    findVisibleLocatorMock.mockImplementation((_: unknown, selectors: readonly string[]) => {
      if (selectors.some((selector) => selector.includes('email'))) {
        return Promise.resolve(state.showEmail ? createLocator(true) : null);
      }
      if (selectors.some((selector) => selector.includes('password'))) {
        return Promise.resolve(state.showPassword ? createLocator(true) : null);
      }
      return Promise.resolve(null);
    });
    resolvePlaywrightConnectionTestRuntimeMock.mockResolvedValueOnce({
      settings: {
        browser: 'chromium',
        headless: true,
        slowMo: 0,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
      },
      storageState: null,
    });
    openPlaywrightConnectionTestSessionMock.mockResolvedValue({
      page,
      close: closeSessionMock,
    });

    const response = await handlePracujBrowserTest(createCtx({ manualMode: true }));

    expect(await response.json()).toMatchObject({
      ok: true,
      sessionReady: true,
      message: 'Pracuj.pl session refreshed successfully.',
    });
    expect(persistPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-pracuj-1',
        page,
      })
    );
    expect(closeSessionMock).toHaveBeenCalledTimes(1);
  });
});
