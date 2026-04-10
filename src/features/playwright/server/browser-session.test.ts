import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolvePlaywrightConnectionRuntimeMock,
  launchPlaywrightBrowserMock,
} = vi.hoisted(() => ({
  resolvePlaywrightConnectionRuntimeMock: vi.fn(),
  launchPlaywrightBrowserMock: vi.fn(),
}));

vi.mock('./connection-runtime', () => ({
  resolvePlaywrightConnectionRuntime: (...args: unknown[]) =>
    resolvePlaywrightConnectionRuntimeMock(...args),
  buildPlaywrightConnectionLaunchOptions: (...args: unknown[]) =>
    ({
      fromHelper: true,
      ...(args[0] as Record<string, unknown>),
    }),
  buildPlaywrightConnectionContextOptions: (...args: unknown[]) =>
    ({
      fromHelper: true,
      ...(args[0] as Record<string, unknown>),
    }),
}));

vi.mock('@/shared/lib/playwright/browser-launch', () => ({
  launchPlaywrightBrowser: (...args: unknown[]) => launchPlaywrightBrowserMock(...args),
}));

import {
  buildPlaywrightConnectionSessionMetadata,
  buildPlaywrightNativeTaskMetadata,
  openPlaywrightConnectionNativeTaskSession,
  openPlaywrightConnectionPageSession,
  resolvePlaywrightBrowserPreferenceFromLabel,
  resolvePlaywrightEffectiveBrowserMode,
} from './browser-session';

describe('openPlaywrightConnectionPageSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a configured browser page session with unified runtime settings', async () => {
    const setDefaultTimeoutMock = vi.fn();
    const setDefaultNavigationTimeoutMock = vi.fn();
    const newPageMock = vi.fn().mockResolvedValue({ id: 'page-1' });
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'auto',
      deviceProfileName: null,
      settings: {
        headless: true,
        timeout: 31_000,
        navigationTimeout: 32_000,
      },
      storageState: null,
      personaId: 'persona-1',
    });
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: vi.fn().mockResolvedValue({
          setDefaultTimeout: setDefaultTimeoutMock,
          setDefaultNavigationTimeout: setDefaultNavigationTimeoutMock,
          newPage: newPageMock,
          close: contextCloseMock,
        }),
        close: browserCloseMock,
      },
      label: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
    });

    const result = await openPlaywrightConnectionPageSession({
      connection: { id: 'connection-1' } as never,
      instance: {
        kind: 'vinted_browser_listing',
        family: 'listing',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      },
      browserPreference: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 720 },
    });

    expect(resolvePlaywrightConnectionRuntimeMock).toHaveBeenCalledWith({
      id: 'connection-1',
    });
    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith('chrome', {
      fromHelper: true,
      settings: {
        headless: true,
        timeout: 31_000,
        navigationTimeout: 32_000,
      },
      headless: false,
    });
    expect(setDefaultTimeoutMock).toHaveBeenCalledWith(31_000);
    expect(setDefaultNavigationTimeoutMock).toHaveBeenCalledWith(32_000);
    expect(result).toMatchObject({
      runtime: {
        personaId: 'persona-1',
      },
      instance: {
        kind: 'vinted_browser_listing',
        family: 'listing',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      },
      launchLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      page: { id: 'page-1' },
    });

    await result.close();

    expect(contextCloseMock).toHaveBeenCalled();
    expect(browserCloseMock).toHaveBeenCalled();
  });

  it('uses the resolved browser preference when no override is provided', async () => {
    const newContextMock = vi.fn().mockResolvedValue({
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      newPage: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    });

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'brave',
      deviceProfileName: 'Desktop Chrome',
      settings: {
        headless: false,
        timeout: 30_000,
        navigationTimeout: 30_000,
      },
      storageState: { cookies: [], origins: [] },
      personaId: undefined,
    });
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: newContextMock,
        close: vi.fn().mockResolvedValue(undefined),
      },
      label: 'Brave',
      fallbackMessages: [],
    });

    await openPlaywrightConnectionPageSession({
      connection: {} as never,
    });

    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith('brave', {
      fromHelper: true,
      settings: {
        headless: false,
        timeout: 30_000,
        navigationTimeout: 30_000,
      },
      headless: false,
    });
    expect(newContextMock).toHaveBeenCalledWith({
      fromHelper: true,
      runtime: {
        browserPreference: 'brave',
        deviceProfileName: 'Desktop Chrome',
        settings: {
          headless: false,
          timeout: 30_000,
          navigationTimeout: 30_000,
        },
        storageState: { cookies: [], origins: [] },
        personaId: undefined,
      },
      viewport: undefined,
    });
  });

  it('builds standardized native session metadata with instance identity', () => {
    expect(
      buildPlaywrightConnectionSessionMetadata({
        instance: {
          kind: 'tradera_standard_listing',
          family: 'listing',
          connectionId: 'connection-1',
          integrationId: 'integration-1',
          listingId: 'listing-1',
        },
        runtime: {
          browserPreference: 'chrome',
          deviceProfileName: 'Desktop Chrome',
          settings: {
            headless: false,
            timeout: 30_000,
            navigationTimeout: 30_000,
          },
          storageState: null,
          personaId: 'persona-1',
        },
        launchLabel: 'Chrome',
        fallbackMessages: ['Brave unavailable'],
      } as never)
    ).toEqual({
      instance: {
        kind: 'tradera_standard_listing',
        family: 'listing',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      },
      browserLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      resolvedBrowserPreference: 'chrome',
      personaId: 'persona-1',
      deviceProfileName: 'Desktop Chrome',
    });
  });

  it('opens a native task session with requested browser settings and derived effective values', async () => {
    const newPageMock = vi.fn().mockResolvedValue({ id: 'page-1' });

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'auto',
      deviceProfileName: 'Desktop Chrome',
      settings: {
        headless: true,
        timeout: 31_000,
        navigationTimeout: 32_000,
      },
      storageState: null,
      personaId: 'persona-1',
    });
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: vi.fn().mockResolvedValue({
          setDefaultTimeout: vi.fn(),
          setDefaultNavigationTimeout: vi.fn(),
          newPage: newPageMock,
          close: vi.fn().mockResolvedValue(undefined),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      },
      label: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
    });

    const result = await openPlaywrightConnectionNativeTaskSession({
      connection: { id: 'connection-1' } as never,
      instance: {
        kind: 'vinted_browser_listing',
        family: 'listing',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      },
      requestedBrowserMode: 'headed',
      requestedBrowserPreference: 'chrome',
      viewport: { width: 1280, height: 720 },
    });

    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith('chrome', {
      fromHelper: true,
      settings: {
        headless: true,
        timeout: 31_000,
        navigationTimeout: 32_000,
      },
      headless: false,
    });
    expect(result.effectiveBrowserMode).toBe('headed');
    expect(result.effectiveBrowserPreference).toBe('chrome');
    expect(result.requestedBrowserMode).toBe('headed');
    expect(result.requestedBrowserPreference).toBe('chrome');
    expect(result.sessionMetadata).toEqual(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'vinted_browser_listing',
        }),
        browserLabel: 'Chrome',
        fallbackMessages: ['Brave unavailable'],
        resolvedBrowserPreference: 'auto',
      })
    );
  });

  it('resolves effective browser values for native tasks', () => {
    expect(
      resolvePlaywrightEffectiveBrowserMode({
        requestedBrowserMode: 'connection_default',
        connectionHeadless: true,
      })
    ).toBe('headless');
    expect(
      resolvePlaywrightEffectiveBrowserMode({
        requestedBrowserMode: 'headed',
        connectionHeadless: true,
      })
    ).toBe('headed');
    expect(
      resolvePlaywrightBrowserPreferenceFromLabel({
        launchLabel: 'Brave',
        requestedBrowserPreference: 'chrome',
      })
    ).toBe('brave');
  });

  it('builds shared native task metadata from the native session envelope', () => {
    expect(
      buildPlaywrightNativeTaskMetadata({
        session: {
          sessionMetadata: {
            instance: {
              kind: 'tradera_standard_listing',
              family: 'listing',
              connectionId: 'connection-1',
              integrationId: 'integration-1',
              listingId: 'listing-1',
            },
            browserLabel: 'Chrome',
            fallbackMessages: ['Brave unavailable'],
            resolvedBrowserPreference: 'auto',
            personaId: 'persona-1',
            deviceProfileName: 'Desktop Chrome',
          },
          effectiveBrowserMode: 'headed',
          effectiveBrowserPreference: 'chrome',
          requestedBrowserMode: 'connection_default',
          requestedBrowserPreference: null,
        },
        additional: {
          mode: 'standard',
          listingFormUrl: 'https://example.com/sell',
        },
      })
    ).toEqual({
      browserMode: 'headed',
      requestedBrowserMode: 'connection_default',
      browserPreference: 'chrome',
      browserLabel: 'Chrome',
      fallbackMessages: ['Brave unavailable'],
      playwright: {
        instance: {
          kind: 'tradera_standard_listing',
          family: 'listing',
          connectionId: 'connection-1',
          integrationId: 'integration-1',
          listingId: 'listing-1',
        },
        browserLabel: 'Chrome',
        fallbackMessages: ['Brave unavailable'],
        resolvedBrowserPreference: 'auto',
        personaId: 'persona-1',
        deviceProfileName: 'Desktop Chrome',
      },
      mode: 'standard',
      listingFormUrl: 'https://example.com/sell',
    });
  });
});
