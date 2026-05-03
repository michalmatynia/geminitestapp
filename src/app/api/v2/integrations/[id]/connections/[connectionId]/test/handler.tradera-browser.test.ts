import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  decryptSecretMock,
  openPlaywrightConnectionTestSessionMock,
  persistPlaywrightConnectionTestSessionMock,
  resolvePlaywrightConnectionTestRuntimeMock,
  resolveTraderaEmailVerificationCodeMock,
} = vi.hoisted(() => ({
  decryptSecretMock: vi.fn(),
  openPlaywrightConnectionTestSessionMock: vi.fn(),
  persistPlaywrightConnectionTestSessionMock: vi.fn(),
  resolvePlaywrightConnectionTestRuntimeMock: vi.fn(),
  resolveTraderaEmailVerificationCodeMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    openPlaywrightConnectionTestSession: (...args: unknown[]) =>
      openPlaywrightConnectionTestSessionMock(...args),
    persistPlaywrightConnectionTestSession: (...args: unknown[]) =>
      persistPlaywrightConnectionTestSessionMock(...args),
    resolvePlaywrightConnectionTestRuntime: (...args: unknown[]) =>
      resolvePlaywrightConnectionTestRuntimeMock(...args),
  };
});

vi.mock('@/features/integrations/services/tradera-listing/tradera-auth-email-code', () => ({
  resolveTraderaEmailVerificationCode: (...args: unknown[]) =>
    resolveTraderaEmailVerificationCodeMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: vi.fn(),
  }),
}));

import { handleTraderaBrowserTest } from './handler.tradera-browser';

const buildTraderaPageHarness = () => {
  let phase: 'blank' | 'login' | 'send-code' | 'code-entry' | 'authenticated' = 'blank';
  let currentUrl = 'about:blank';

  const selectorVisible = (selector: string): boolean => {
    if (
      selector === 'a[href*="logout"]' ||
      selector === 'a:has-text("Logga ut")' ||
      selector === 'a:has-text("Logout")' ||
      selector === 'a:has-text("Mina sidor")' ||
      selector === 'a:has-text("My pages")' ||
      selector === 'button[aria-label*="Account"]' ||
      selector === 'button[aria-label*="Profile"]' ||
      selector === 'a[href*="/profile"]' ||
      selector === 'a[href*="/my"]'
    ) {
      return phase === 'authenticated';
    }

    if (
      selector === '#sign-in-form' ||
      selector === 'form[data-sign-in-form="true"]' ||
      selector === 'form[action*="login"]'
    ) {
      return phase === 'login';
    }

    if (
      selector === '#email' ||
      selector === 'input[name="email"]' ||
      selector === 'input[type="email"]' ||
      selector === '#password' ||
      selector === 'input[name="password"]' ||
      selector === 'input[type="password"]' ||
      selector === 'button[data-login-submit="true"]' ||
      selector === '#sign-in-form button[type="submit"]' ||
      selector === 'button:has-text("Sign in")' ||
      selector === 'button:has-text("Logga in")'
    ) {
      return phase === 'login';
    }

    if (selector === 'button:has-text("Skicka kod")') {
      return phase === 'send-code';
    }

    if (
      selector === 'input[autocomplete="one-time-code"]' ||
      selector.includes('input[autocomplete="one-time-code"]')
    ) {
      return phase === 'code-entry';
    }

    if (selector === 'button:has-text("Verify")') {
      return phase === 'code-entry';
    }

    if (
      selector === 'input[name="shortDescription"]' ||
      selector === '#shortDescription' ||
      selector === 'input[name="title"]' ||
      selector === '#title'
    ) {
      return phase === 'authenticated' && currentUrl.includes('/selling/new');
    }

    return false;
  };

  const locator = (selector: string) => {
    const currentLocator = {
      first: () => currentLocator,
      count: vi.fn(async () => (selectorVisible(selector) ? 1 : 0)),
      isVisible: vi.fn(async () => selectorVisible(selector)),
      waitFor: vi.fn(async () => undefined),
      innerText: vi.fn(async () => ''),
      fill: vi.fn(async () => undefined),
      click: vi.fn(async () => {
        if (
          selector === 'button[data-login-submit="true"]' ||
          selector === '#sign-in-form button[type="submit"]' ||
          selector === 'button:has-text("Sign in")' ||
          selector === 'button:has-text("Logga in")'
        ) {
          phase = 'send-code';
          currentUrl = 'https://www.tradera.com/en/multifactorauthentication';
          return;
        }

        if (selector === 'button:has-text("Skicka kod")') {
          phase = 'code-entry';
          currentUrl = 'https://www.tradera.com/en/verification';
          return;
        }

        if (selector === 'button:has-text("Verify")') {
          phase = 'authenticated';
          currentUrl = 'https://www.tradera.com/en/my/listings?tab=active';
        }
      }),
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
    };

    return currentLocator;
  };

  const page = {
    goto: vi.fn(async (url: string) => {
      currentUrl = url;
      if (url.includes('/login')) {
        phase = 'login';
        currentUrl = 'https://www.tradera.com/en/login';
      }
    }),
    locator: vi.fn((selector: string) => locator(selector)),
    url: vi.fn(() => currentUrl),
    waitForNavigation: vi.fn(async () => undefined),
    waitForSelector: vi.fn(async () => undefined),
    waitForTimeout: vi.fn(async () => undefined),
    keyboard: {
      press: vi.fn(async () => undefined),
    },
    close: vi.fn(async () => undefined),
  };

  return {
    page,
    close: vi.fn(async () => undefined),
  };
};

describe('handleTraderaBrowserTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decryptSecretMock.mockImplementation((value: string) => `decrypted:${value}`);
    persistPlaywrightConnectionTestSessionMock.mockResolvedValue(undefined);
    resolvePlaywrightConnectionTestRuntimeMock.mockResolvedValue({
      settings: {
        headless: true,
        slowMo: 0,
        humanizeMouse: false,
        mouseJitter: 0,
        clickDelayMin: 0,
        clickDelayMax: 0,
        inputDelayMin: 0,
        inputDelayMax: 0,
        actionDelayMin: 0,
        actionDelayMax: 0,
      },
      storageState: null,
    });
    resolveTraderaEmailVerificationCodeMock.mockResolvedValue({
      code: '343079',
      accountId: 'mail-account-1',
      messageId: 'mail-message-1',
      receivedAt: '2026-04-24T10:00:00.000Z',
    });
  });

  it('requests and submits the Tradera email verification code during connection auth', async () => {
    const session = buildTraderaPageHarness();
    openPlaywrightConnectionTestSessionMock.mockResolvedValue(session);
    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handleTraderaBrowserTest({
      connection: {
        id: 'connection-tradera',
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: null,
      } as never,
      repo: {
        updateConnection: vi.fn(),
      } as never,
      manualMode: false,
      manualSessionRefreshMode: false,
      quicklistPreflightMode: false,
      manualLoginTimeoutMs: 60_000,
      steps: steps as never,
      pushStep,
      fail,
    });

    const payload = (await response.json()) as { ok: boolean; sessionReady?: boolean };
    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(resolveTraderaEmailVerificationCodeMock).toHaveBeenCalledWith({
      emailAddress: 'user@example.com',
      requestedAfter: expect.any(String),
      timeoutMs: 60_000,
    });
    expect(
      steps.some(
        (step) =>
          step.step === 'Authentication' &&
          step.detail === 'Requesting Tradera verification code by email.'
      )
    ).toBe(true);
    expect(persistPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-tradera',
        page: session.page,
      })
    );
    expect(session.close).toHaveBeenCalled();
    expect(session.page.close).toHaveBeenCalled();
  });

  it('requests and submits the email code during manual session refresh autofill', async () => {
    const session = buildTraderaPageHarness();
    openPlaywrightConnectionTestSessionMock.mockResolvedValue(session);
    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handleTraderaBrowserTest({
      connection: {
        id: 'connection-tradera',
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: 'stored-state',
      } as never,
      repo: {
        updateConnection: vi.fn(),
      } as never,
      manualMode: false,
      manualSessionRefreshMode: true,
      quicklistPreflightMode: false,
      manualLoginTimeoutMs: 60_000,
      steps: steps as never,
      pushStep,
      fail,
    });

    const payload = (await response.json()) as {
      message?: string;
      ok: boolean;
      sessionReady?: boolean;
    };
    expect(payload.ok).toBe(true);
    expect(payload.sessionReady).toBe(true);
    expect(payload.message).toBe('Tradera session refreshed successfully.');
    expect(openPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
      })
    );
    expect(resolveTraderaEmailVerificationCodeMock).toHaveBeenCalledWith({
      emailAddress: 'user@example.com',
      requestedAfter: expect.any(String),
      timeoutMs: 60_000,
    });
    expect(
      steps.some(
        (step) =>
          step.step === 'Session refresh' &&
          step.detail === 'Requesting Tradera verification code by email.'
      )
    ).toBe(true);
    expect(
      steps.some(
        (step) => step.step === 'Session refresh' && step.status === 'ok'
      )
    ).toBe(true);
    expect(persistPlaywrightConnectionTestSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-tradera',
        page: session.page,
      })
    );
  });

  it('does not persist the session when the Tradera email code is unavailable', async () => {
    resolveTraderaEmailVerificationCodeMock.mockResolvedValue(null);
    const session = buildTraderaPageHarness();
    openPlaywrightConnectionTestSessionMock.mockResolvedValue(session);
    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handleTraderaBrowserTest({
      connection: {
        id: 'connection-tradera',
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: null,
      } as never,
      repo: {
        updateConnection: vi.fn(),
      } as never,
      manualMode: false,
      manualSessionRefreshMode: false,
      quicklistPreflightMode: false,
      manualLoginTimeoutMs: 60_000,
      steps: steps as never,
      pushStep,
      fail,
    });

    const payload = (await response.json()) as {
      message?: string;
      ok: boolean;
      sessionReady?: boolean;
    };
    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.message).toBe(
      'AUTH_REQUIRED: Tradera requires manual verification. Please use manual login mode.'
    );
    expect(resolveTraderaEmailVerificationCodeMock).toHaveBeenCalledWith({
      emailAddress: 'user@example.com',
      requestedAfter: expect.any(String),
      timeoutMs: 60_000,
    });
    expect(
      steps.some(
        (step) =>
          step.step === 'Authentication' &&
          step.detail === 'Tradera verification code was not found in email; waiting for manual entry.'
      )
    ).toBe(true);
    expect(persistPlaywrightConnectionTestSessionMock).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalled();
    expect(session.page.close).toHaveBeenCalled();
  });
});
