import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolvePlaywrightConnectionTestRuntimeMock,
  openPlaywrightConnectionTestSessionMock,
  persistPlaywrightConnectionTestSessionMock,
} = vi.hoisted(() => ({
  resolvePlaywrightConnectionTestRuntimeMock: vi.fn(),
  openPlaywrightConnectionTestSessionMock: vi.fn(),
  persistPlaywrightConnectionTestSessionMock: vi.fn(),
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

import { handle1688BrowserTest } from './handler.1688-browser';

type HarnessOptions = {
  initialBarrier: boolean;
  clearBarrierAfterWaits?: number | null;
  currentUrl?: string;
};

const build1688PageHarness = ({
  initialBarrier,
  clearBarrierAfterWaits = null,
  currentUrl = 'https://www.1688.com/',
}: HarnessOptions) => {
  let blocked = initialBarrier;
  let waitCount = 0;
  let pageUrl = currentUrl;

  const selectorHasBarrier = (selector: string): boolean => {
    if (!blocked) {
      return false;
    }

    return (
      selector === 'input[type="password"]' ||
      selector === 'iframe[src*="captcha"]' ||
      selector === '[id*="nc_"]' ||
      selector === '[class*="captcha"]' ||
      selector === '[class*="login"] input'
    );
  };

  const locatorFactory = (selector: string) => {
    const locator = {
      first: () => locator,
      count: vi.fn(async () => (selectorHasBarrier(selector) ? 1 : 0)),
      textContent: vi.fn(async () => (selector === 'body' && blocked ? '请登录' : '1688 home')),
    };

    return locator;
  };

  const page = {
    goto: vi.fn(async (url: string) => {
      pageUrl = url;
    }),
    waitForLoadState: vi.fn(async () => undefined),
    waitForTimeout: vi.fn(async () => {
      waitCount += 1;
      if (clearBarrierAfterWaits !== null && waitCount >= clearBarrierAfterWaits) {
        blocked = false;
      }
    }),
    locator: vi.fn((selector: string) => locatorFactory(selector)),
    url: vi.fn(() => pageUrl),
  };

  return {
    page,
    close: vi.fn(async () => undefined),
  };
};

describe('handle1688BrowserTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePlaywrightConnectionTestRuntimeMock.mockResolvedValue({
      settings: {
        browser: 'auto',
        headless: true,
        slowMo: 0,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
      },
      storageState: { cookies: [], origins: [] },
    });
    persistPlaywrightConnectionTestSessionMock.mockResolvedValue(true);
  });

  it('passes quicklist preflight when the stored 1688 session is active', async () => {
    const session = build1688PageHarness({ initialBarrier: false });
    openPlaywrightConnectionTestSessionMock.mockResolvedValue(session);

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handle1688BrowserTest(
      {
        id: 'connection-1688',
        scanner1688StartUrl: 'https://detail.1688.com/',
        playwrightStorageState: 'state-secret',
      } as never,
      {
        updateConnection: vi.fn(),
      },
      false,
      false,
      true,
      60_000,
      steps as never,
      pushStep,
      fail
    );

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean; message?: string };
    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(payload.message).toBe('1688 session is active.');
    expect(openPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true,
      })
    );
    expect(persistPlaywrightConnectionTestSessionMock).not.toHaveBeenCalled();
    expect(session.page.goto).toHaveBeenCalledWith('https://detail.1688.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  });

  it('waits for manual 1688 login, then persists the refreshed session', async () => {
    const session = build1688PageHarness({
      initialBarrier: true,
      clearBarrierAfterWaits: 2,
    });
    openPlaywrightConnectionTestSessionMock.mockResolvedValue(session);

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handle1688BrowserTest(
      {
        id: 'connection-1688',
        scanner1688StartUrl: 'https://www.1688.com/',
        playwrightStorageState: null,
      } as never,
      {
        updateConnection: vi.fn(),
      },
      true,
      false,
      false,
      5_000,
      steps as never,
      pushStep,
      fail
    );

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean; message?: string };
    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(payload.message).toBe('1688 session refreshed successfully.');
    expect(openPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
      })
    );
    expect(session.page.waitForTimeout).toHaveBeenCalledTimes(2);
    expect(
      steps.some(
        (step) => step.step === 'Manual login' && step.status === 'ok'
      )
    ).toBe(true);
    expect(persistPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1688',
        page: session.page,
      })
    );
    expect(session.close).toHaveBeenCalled();
  });
});
