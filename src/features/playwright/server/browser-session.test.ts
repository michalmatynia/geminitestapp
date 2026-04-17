import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolvePlaywrightConnectionRuntimeMock,
  launchPlaywrightBrowserMock,
  resolveRuntimeActionExecutionSettingsMock,
  resolveRuntimeActionDefinitionMock,
} = vi.hoisted(() => ({
  resolvePlaywrightConnectionRuntimeMock: vi.fn(),
  launchPlaywrightBrowserMock: vi.fn(),
  resolveRuntimeActionExecutionSettingsMock: vi.fn(),
  resolveRuntimeActionDefinitionMock: vi.fn(),
}));

vi.mock('./connection-runtime', () => ({
  resolvePlaywrightConnectionRuntime: (...args: unknown[]) =>
    resolvePlaywrightConnectionRuntimeMock(...args),
  resolvePlaywrightRuntimeDeviceContext: (settings: { emulateDevice?: boolean; deviceName?: string }) =>
    settings.emulateDevice && settings.deviceName === 'Pixel 7'
      ? {
          deviceProfileName: 'Pixel 7',
          deviceContextOptions: {
            viewport: { width: 412, height: 915 },
            userAgent: 'pixel-ua',
          },
        }
      : {
          deviceProfileName: null,
          deviceContextOptions: {},
        },
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

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  resolveRuntimeActionExecutionSettings: (...args: unknown[]) =>
    resolveRuntimeActionExecutionSettingsMock(...args),
  resolveRuntimeActionDefinition: (...args: unknown[]) =>
    resolveRuntimeActionDefinitionMock(...args),
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
    resolveRuntimeActionExecutionSettingsMock.mockResolvedValue(null);
    resolveRuntimeActionDefinitionMock.mockResolvedValue({
      id: 'runtime_action__tradera_standard_list',
      name: 'Tradera Standard List',
      description: null,
      runtimeKey: 'tradera_standard_list',
      blocks: [],
      stepSetIds: [],
      personaId: null,
      executionSettings: {
        headless: null,
        browserPreference: null,
        emulateDevice: null,
        deviceName: null,
        slowMo: null,
        timeout: null,
        navigationTimeout: null,
        locale: null,
        timezoneId: null,
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });
  });

  it('opens a configured browser page session with unified runtime settings', async () => {
    const setDefaultTimeoutMock = vi.fn();
    const setDefaultNavigationTimeoutMock = vi.fn();
    const addInitScriptMock = vi.fn().mockResolvedValue(undefined);
    const newPageMock = vi.fn().mockResolvedValue({ id: 'page-1' });
    const contextCloseMock = vi.fn().mockResolvedValue(undefined);
    const browserCloseMock = vi.fn().mockResolvedValue(undefined);

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'auto',
      deviceProfileName: null,
      settings: {
        identityProfile: 'default',
        headless: true,
        timeout: 31_000,
        navigationTimeout: 32_000,
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
      },
      storageState: null,
      personaId: 'persona-1',
    });
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: vi.fn().mockResolvedValue({
          setDefaultTimeout: setDefaultTimeoutMock,
          setDefaultNavigationTimeout: setDefaultNavigationTimeoutMock,
          addInitScript: addInitScriptMock,
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
    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith(
      'chrome',
      expect.objectContaining({
        fromHelper: true,
        settings: {
          identityProfile: 'default',
          headless: true,
          timeout: 31_000,
          navigationTimeout: 32_000,
          proxySessionAffinity: false,
          proxySessionMode: 'sticky',
          proxyProviderPreset: 'custom',
        },
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
      })
    );
    expect(setDefaultTimeoutMock).toHaveBeenCalledWith(31_000);
    expect(setDefaultNavigationTimeoutMock).toHaveBeenCalledWith(32_000);
    expect(addInitScriptMock).toHaveBeenCalledTimes(1);
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
    const addInitScriptMock = vi.fn().mockResolvedValue(undefined);
    const newContextMock = vi.fn().mockResolvedValue({
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      addInitScript: addInitScriptMock,
      newPage: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    });

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'brave',
      deviceProfileName: 'Desktop Chrome',
      settings: {
        identityProfile: 'marketplace',
        headless: false,
        timeout: 30_000,
        navigationTimeout: 30_000,
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
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

    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith(
      'brave',
      expect.objectContaining({
        fromHelper: true,
        settings: {
          identityProfile: 'marketplace',
          headless: false,
          timeout: 30_000,
          navigationTimeout: 30_000,
          proxySessionAffinity: false,
          proxySessionMode: 'sticky',
          proxyProviderPreset: 'custom',
        },
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
      })
    );
    expect(newContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fromHelper: true,
        runtime: {
          browserPreference: 'brave',
          deviceProfileName: 'Desktop Chrome',
          settings: {
            identityProfile: 'marketplace',
            headless: false,
            timeout: 30_000,
            navigationTimeout: 30_000,
            proxySessionAffinity: false,
            proxySessionMode: 'sticky',
            proxyProviderPreset: 'custom',
          },
          storageState: { cookies: [], origins: [] },
          personaId: undefined,
        },
        viewport: undefined,
        userAgent: expect.any(String),
      })
    );
    expect(addInitScriptMock).toHaveBeenCalledTimes(1);
  });

  it('applies action-owned execution settings before the browser session opens', async () => {
    const newContextMock = vi.fn().mockResolvedValue({
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    });

    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      browserPreference: 'auto',
      deviceProfileName: null,
      deviceContextOptions: {},
      settings: {
        identityProfile: 'default',
        headless: true,
        slowMo: 50,
        timeout: 15_000,
        navigationTimeout: 30_000,
        locale: '',
        timezoneId: '',
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
      },
      storageState: null,
      personaId: 'persona-1',
    });
    resolveRuntimeActionExecutionSettingsMock.mockResolvedValue({
      headless: false,
      browserPreference: 'chrome',
      emulateDevice: true,
      deviceName: 'Pixel 7',
      slowMo: 125,
      timeout: 45_000,
      navigationTimeout: 46_000,
      locale: 'en-US',
      timezoneId: 'Europe/Warsaw',
    });
    resolveRuntimeActionDefinitionMock.mockResolvedValue({
      id: 'custom_tradera_standard',
      name: 'Custom Tradera Standard',
      description: null,
      runtimeKey: 'tradera_standard_list',
      blocks: [
        {
          id: 'block_1',
          kind: 'runtime_step',
          refId: 'browser_preparation',
          enabled: true,
          label: null,
          config: {
            viewportWidth: 1440,
            viewportHeight: 900,
            settleDelayMs: 300,
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw',
            userAgent: 'custom-ua',
            colorScheme: 'dark',
            reducedMotion: 'reduce',
            geolocationLatitude: 52.2297,
            geolocationLongitude: 21.0122,
            permissions: ['geolocation'],
          },
        },
      ],
      stepSetIds: [],
      personaId: null,
      executionSettings: {
        headless: false,
        browserPreference: 'chrome',
        emulateDevice: true,
        deviceName: 'Pixel 7',
        slowMo: 125,
        timeout: 45_000,
        navigationTimeout: 46_000,
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw',
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });
    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: newContextMock,
        close: vi.fn().mockResolvedValue(undefined),
      },
      label: 'Chrome',
      fallbackMessages: [],
    });

    await openPlaywrightConnectionPageSession({
      connection: { id: 'connection-1' } as never,
      runtimeActionKey: 'tradera_standard_list',
    });

    expect(resolveRuntimeActionExecutionSettingsMock).toHaveBeenCalledWith('tradera_standard_list');
    expect(resolveRuntimeActionDefinitionMock).toHaveBeenCalledWith('tradera_standard_list');
    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith(
      'chrome',
      expect.objectContaining({
        settings: expect.objectContaining({
          emulateDevice: true,
          deviceName: 'Pixel 7',
          slowMo: 125,
          timeout: 45_000,
          navigationTimeout: 46_000,
          locale: 'en-US',
          timezoneId: 'Europe/Warsaw',
        }),
        headless: false,
      })
    );
    expect(newContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          deviceProfileName: 'Pixel 7',
          deviceContextOptions: {
            viewport: { width: 412, height: 915 },
            userAgent: 'pixel-ua',
          },
        }),
        environmentOverrides: {
          viewport: { width: 1440, height: 900 },
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
          userAgent: 'custom-ua',
          colorScheme: 'dark',
          reducedMotion: 'reduce',
          geolocation: {
            latitude: 52.2297,
            longitude: 21.0122,
          },
          permissions: ['geolocation'],
        },
      })
    );
  });

  it('reuses a provided runtime and applies launch setting overrides', async () => {
    const runtime = {
      browserPreference: 'chromium',
      deviceProfileName: null,
      settings: {
        identityProfile: 'search',
        headless: false,
        slowMo: 77,
        timeout: 30_000,
        navigationTimeout: 31_000,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
      },
      storageState: null,
      personaId: 'persona-1',
    };
    const newContextMock = vi.fn().mockResolvedValue({
      setDefaultTimeout: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    });

    launchPlaywrightBrowserMock.mockResolvedValue({
      browser: {
        newContext: newContextMock,
        close: vi.fn().mockResolvedValue(undefined),
      },
      label: 'Chromium',
      fallbackMessages: [],
    });

    await openPlaywrightConnectionPageSession({
      connection: { id: 'connection-1' } as never,
      runtime: runtime as never,
      headless: true,
      launchSettingsOverrides: {
        slowMo: 0,
      },
    });

    expect(resolvePlaywrightConnectionRuntimeMock).not.toHaveBeenCalled();
    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith(
      'chromium',
      expect.objectContaining({
        fromHelper: true,
        settings: {
          identityProfile: 'search',
          headless: false,
          slowMo: 0,
          timeout: 30_000,
          navigationTimeout: 31_000,
          proxyEnabled: false,
          proxyServer: '',
          proxyUsername: '',
          proxyPassword: '',
          proxySessionAffinity: false,
          proxySessionMode: 'sticky',
          proxyProviderPreset: 'custom',
        },
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
      })
    );
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
            identityProfile: 'default',
            headless: false,
            timeout: 30_000,
            navigationTimeout: 30_000,
            proxySessionAffinity: false,
            proxySessionMode: 'sticky',
            proxyProviderPreset: 'custom',
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
    const addInitScriptMock = vi.fn().mockResolvedValue(undefined);

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
          addInitScript: addInitScriptMock,
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

    expect(launchPlaywrightBrowserMock).toHaveBeenCalledWith(
      'chrome',
      expect.objectContaining({
        fromHelper: true,
        settings: {
          headless: true,
          timeout: 31_000,
          navigationTimeout: 32_000,
        },
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
      })
    );
    expect(addInitScriptMock).toHaveBeenCalledTimes(1);
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
