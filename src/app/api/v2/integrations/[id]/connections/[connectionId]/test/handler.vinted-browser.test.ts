import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  chromiumLaunchMock,
  decryptSecretMock,
  encryptSecretMock,
  resolveConnectionPlaywrightSettingsMock,
  updateConnectionMock,
} = vi.hoisted(() => ({
  chromiumLaunchMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: (...args: unknown[]) => chromiumLaunchMock(...args),
  },
  devices: {
    'Desktop Chrome': {
      defaultBrowserType: 'chromium',
      viewport: { width: 1280, height: 720 },
      userAgent: 'desktop-chrome-ua',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
    },
  },
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

import { VINTED_LISTING_FORM_URL } from '@/features/integrations/services/vinted-listing/config';

import { handleVintedBrowserTest } from './handler.vinted-browser';

const AUTH_REDIRECT_URL =
  'https://www.vinted.pl/member/signup/select_type?ref_url=%2Fitems%2Fnew';
const GOOGLE_BLOCKED_URL = 'https://accounts.google.com/v3/signin/challenge/pwd';
const GOOGLE_BLOCKED_TEXT =
  'This browser or app may not be secure. Learn more Try using a different browser. If you’re already using a supported browser, you can try again to sign in.';

type HarnessOptions = {
  initialPhase: 'auth' | 'logged_in' | 'google_blocked';
  transitionAfterWaits?: number | null;
  authRouteShowsProfileControl?: boolean;
};

let mockNow = 0;

const buildHarness = ({
  initialPhase,
  transitionAfterWaits = null,
  authRouteShowsProfileControl = false,
}: HarnessOptions) => {
  let phase = initialPhase;
  let currentUrl = 'about:blank';
  let waitCount = 0;

  const selectorVisible = (selector: string): boolean => {
    if (
      selector.includes('button[aria-label*="Profil"]') ||
      selector.includes('button[aria-label*="Profile"]') ||
      selector.includes('.c-header__item--user') ||
      selector.includes('button:has-text("Wyloguj")') ||
      selector.includes('button:has-text("Log out")')
    ) {
      return (
        (phase === 'logged_in' && currentUrl.includes('/settings')) ||
        (authRouteShowsProfileControl && phase === 'auth' && currentUrl.includes('/member/signup'))
      );
    }
    if (
      selector.includes('input[name="title"]') &&
      selector.includes('input[type="file"]') &&
      selector.includes('button[type="submit"]')
    ) {
      return phase === 'logged_in' && currentUrl.includes('/items/new');
    }
    return false;
  };

  const page = {
    goto: vi.fn(async (url: string) => {
      if (url === VINTED_LISTING_FORM_URL) {
        currentUrl =
          phase === 'logged_in'
            ? VINTED_LISTING_FORM_URL
            : phase === 'google_blocked'
              ? GOOGLE_BLOCKED_URL
              : AUTH_REDIRECT_URL;
        return null;
      }
      currentUrl = url;
      return null;
    }),
    waitForTimeout: vi.fn(async (timeoutMs: number) => {
      mockNow += timeoutMs;
      waitCount += 1;
      if (transitionAfterWaits !== null && waitCount >= transitionAfterWaits) {
        phase = 'logged_in';
        currentUrl = VINTED_LISTING_FORM_URL;
      }
    }),
    locator: vi.fn((selector: string) => {
      const locator = {
        first: () => locator,
        click: vi.fn(async () => undefined),
        innerText: vi.fn(async () => (selector === 'body' ? GOOGLE_BLOCKED_TEXT : '')),
        isVisible: vi.fn(async () => selectorVisible(selector)),
      };
      return locator;
    }),
    url: vi.fn(() => currentUrl),
    context: vi.fn(() => ({
      storageState: vi.fn(async () => ({
        cookies: [{ name: 'session', value: 'ok' }],
        origins: [],
      })),
    })),
    close: vi.fn(async () => undefined),
  };

  const context = {
    newPage: vi.fn(async () => page),
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    close: vi.fn(async () => undefined),
  };

  const browser = {
    newContext: vi.fn(async () => context),
    close: vi.fn(async () => undefined),
  };

  chromiumLaunchMock.mockResolvedValue(browser);

  return {
    browser,
    context,
    page,
  };
};

describe('handleVintedBrowserTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNow = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

    decryptSecretMock.mockImplementation((value: string) => {
      if (value === 'state-secret') {
        return JSON.stringify({ cookies: [], origins: [] });
      }
      return value;
    });
    encryptSecretMock.mockImplementation((value: string) => `encrypted:${value}`);
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 0,
      timeout: 15_000,
      navigationTimeout: 30_000,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
    updateConnectionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not treat the redirected signup route as an authenticated quicklist session', async () => {
    buildHarness({ initialPhase: 'auth' });

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    await expect(
      handleVintedBrowserTest(
        {
          id: 'connection-1',
          playwrightStorageState: 'state-secret',
        },
        {
          updateConnection: updateConnectionMock,
        },
        false,
        true,
        5_000,
        steps,
        pushStep,
        fail
      )
    ).rejects.toThrow('409:AUTH_REQUIRED: Vinted session expired or is missing.');

    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(
      steps.some(
        (step) => step.step === 'Reusing session' && step.status === 'failed'
      )
    ).toBe(true);
  });

  it('does not accept auth-route profile-like controls as a logged-in Vinted session', async () => {
    buildHarness({ initialPhase: 'auth', authRouteShowsProfileControl: true });

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    await expect(
      handleVintedBrowserTest(
        {
          id: 'connection-1',
          playwrightStorageState: 'state-secret',
        },
        {
          updateConnection: updateConnectionMock,
        },
        false,
        true,
        5_000,
        steps,
        pushStep,
        fail
      )
    ).rejects.toThrow('409:AUTH_REQUIRED: Vinted session expired or is missing.');

    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(
      steps.some(
        (step) => step.step === 'Reusing session' && step.status === 'failed'
      )
    ).toBe(true);
  });

  it('waits for a real authenticated sell-page state before saving the Vinted session', async () => {
    const harness = buildHarness({ initialPhase: 'auth', transitionAfterWaits: 1 });

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handleVintedBrowserTest(
      {
        id: 'connection-1',
      },
      {
        updateConnection: updateConnectionMock,
      },
      true,
      false,
      5_000,
      steps,
      pushStep,
      fail
    );

    expect((await response.json()) as { ok: boolean }).toEqual(
      expect.objectContaining({ ok: true })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith(
      'connection-1',
      expect.objectContaining({
        playwrightStorageState: expect.stringContaining('encrypted:'),
      })
    );
    expect(
      steps.some(
        (step) => step.step === 'Manual login' && step.status === 'ok'
      )
    ).toBe(true);
    expect(
      steps.some(
        (step) => step.step === 'Verifying session' && step.status === 'ok'
      )
    ).toBe(true);
    expect(
      steps.some(
        (step) => step.step === 'Saving session' && step.status === 'ok'
      )
    ).toBe(true);
    expect(chromiumLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'chrome',
        headless: false,
      })
    );
    expect(harness.browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: 'desktop-chrome-ua',
        viewport: { width: 1280, height: 720 },
      })
    );
  });

  it('fails manual login without saving a session when the page never leaves auth state', async () => {
    buildHarness({ initialPhase: 'auth', transitionAfterWaits: null });

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    await expect(
      handleVintedBrowserTest(
        {
          id: 'connection-1',
        },
        {
          updateConnection: updateConnectionMock,
        },
        true,
        false,
        2_000,
        steps,
        pushStep,
        fail
      )
    ).rejects.toThrow('400:Manual login timed out after 2s.');

    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(
      steps.some(
        (step) => step.step === 'Manual login' && step.status === 'failed'
      )
    ).toBe(true);
  });

  it('fails early with Google-specific guidance when Google blocks sign-in in the automated browser', async () => {
    buildHarness({ initialPhase: 'google_blocked', transitionAfterWaits: null });

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    await expect(
      handleVintedBrowserTest(
        {
          id: 'connection-1',
        },
        {
          updateConnection: updateConnectionMock,
        },
        true,
        false,
        5_000,
        steps,
        pushStep,
        fail
      )
    ).rejects.toThrow(
      '409:AUTH_REQUIRED: Google sign-in is blocked in this automated browser. Use Vinted.pl email/password login instead of Continue with Google.'
    );

    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(
      steps.some(
        (step) => step.step === 'Manual login' && step.status === 'failed'
      )
    ).toBe(true);
  });

  it('falls back to Playwright Chromium when the Chrome channel is unavailable', async () => {
    const harness = buildHarness({ initialPhase: 'auth', transitionAfterWaits: 1 });
    chromiumLaunchMock
      .mockRejectedValueOnce(new Error('Chrome channel missing'))
      .mockResolvedValue(harness.browser);

    const steps: Array<{ step: string; status: string; detail: string }> = [];
    const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
      steps.push({ step, status, detail });
    };
    const fail = async (step: string, detail: string, status = 400): Promise<never> => {
      pushStep(step, 'failed', detail);
      throw new Error(`${status}:${detail}`);
    };

    const response = await handleVintedBrowserTest(
      {
        id: 'connection-1',
      },
      {
        updateConnection: updateConnectionMock,
      },
      true,
      false,
      5_000,
      steps,
      pushStep,
      fail
    );

    expect((await response.json()) as { ok: boolean }).toEqual(
      expect.objectContaining({ ok: true })
    );
    expect(chromiumLaunchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        channel: 'chrome',
      })
    );
    expect(chromiumLaunchMock).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        channel: expect.anything(),
      })
    );
    expect(
      steps.some(
        (step) =>
          step.step === 'Manual browser profile' &&
          step.status === 'ok' &&
          step.detail.includes('Falling back to Playwright Chromium')
      )
    ).toBe(true);
  });
});
