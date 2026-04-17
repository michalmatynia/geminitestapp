import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
  runPlaywrightEngineTaskMock,
  startPlaywrightEngineTaskMock,
  resolveRuntimeActionDefinitionMock,
  resolvePlaywrightActionDefinitionByIdMock,
} = vi.hoisted(() => ({
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
  startPlaywrightEngineTaskMock: vi.fn(),
  resolveRuntimeActionDefinitionMock: vi.fn(),
  resolvePlaywrightActionDefinitionByIdMock: vi.fn(),
}));

vi.mock('playwright', () => ({
  devices: {
    'Pixel 7': {
      defaultBrowserType: 'chromium',
      viewport: { width: 412, height: 915 },
      userAgent: 'pixel-ua',
    },
  },
}));

vi.mock('./settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

vi.mock('./runtime', () => ({
  runPlaywrightEngineTask: (...args: unknown[]) => runPlaywrightEngineTaskMock(...args),
  startPlaywrightEngineTask: (...args: unknown[]) => startPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  resolvePlaywrightActionDefinitionById: (...args: unknown[]) =>
    resolvePlaywrightActionDefinitionByIdMock(...args),
  resolveRuntimeActionDefinition: (...args: unknown[]) =>
    resolveRuntimeActionDefinitionMock(...args),
}));

import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionEngineRequestOptions,
  buildPlaywrightConnectionEngineLaunchOptions,
  buildPlaywrightConnectionLaunchOptions,
  buildPlaywrightConnectionSettingsOverrides,
  resolvePlaywrightRuntimeDeviceContext,
  resolvePlaywrightConnectionRuntime,
  runPlaywrightConnectionEngineTask,
  startPlaywrightConnectionEngineTask,
} from './connection-runtime';

describe('playwright connection runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parsePersistedStorageStateMock.mockReturnValue({
      cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
      origins: [],
    });
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      browser: 'chrome',
      identityProfile: 'marketplace',
      headless: true,
      slowMo: 75,
      timeout: 30_000,
      navigationTimeout: 25_000,
      locale: 'en-US',
      timezoneId: 'Europe/Warsaw',
      humanizeMouse: true,
      mouseJitter: 5,
      clickDelayMin: 20,
      clickDelayMax: 80,
      inputDelayMin: 10,
      inputDelayMax: 50,
      actionDelayMin: 100,
      actionDelayMax: 400,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      proxySessionAffinity: false,
      proxySessionMode: 'sticky',
      proxyProviderPreset: 'custom',
      emulateDevice: true,
      deviceName: 'Pixel 7',
    });
    runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
    });
    startPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-queued',
      status: 'queued',
    });
    resolveRuntimeActionDefinitionMock.mockResolvedValue({
      id: 'runtime_action__playwright_programmable_listing',
      name: 'Programmable Listing Session',
      description: null,
      runtimeKey: 'playwright_programmable_listing',
      blocks: [],
      stepSetIds: [],
      personaId: 'action-persona',
      executionSettings: {
        identityProfile: null,
        headless: null,
        browserPreference: null,
        emulateDevice: null,
        deviceName: null,
        slowMo: null,
        timeout: null,
        navigationTimeout: null,
        locale: null,
        timezoneId: null,
        humanizeMouse: null,
        mouseJitter: null,
        clickDelayMin: null,
        clickDelayMax: null,
        inputDelayMin: null,
        inputDelayMax: null,
        actionDelayMin: null,
        actionDelayMax: null,
        proxyEnabled: null,
        proxyServer: null,
        proxyUsername: null,
        proxyPassword: null,
        proxySessionAffinity: null,
        proxySessionMode: null,
        proxyProviderPreset: null,
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });
    resolvePlaywrightActionDefinitionByIdMock.mockResolvedValue(null);
  });

  it('resolves persona-aware runtime context once for browser consumers', async () => {
    const runtime = await resolvePlaywrightConnectionRuntime({
      playwrightPersonaId: ' persona-1 ',
      playwrightStorageState: 'encrypted-state',
    } as never);

    expect(parsePersistedStorageStateMock).toHaveBeenCalledWith('encrypted-state');
    expect(resolveConnectionPlaywrightSettingsMock).toHaveBeenCalled();
    expect(runtime).toMatchObject({
      personaId: 'persona-1',
      browserPreference: 'chrome',
      deviceProfileName: 'Pixel 7',
      storageState: {
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      },
      deviceContextOptions: {
        viewport: { width: 412, height: 915 },
        userAgent: 'pixel-ua',
      },
    });
    expect(runtime.deviceContextOptions).not.toHaveProperty('defaultBrowserType');
  });

  it('builds native browser launch and context options from the resolved runtime', () => {
    const launchOptions = buildPlaywrightConnectionLaunchOptions({
      settings: {
        slowMo: 90,
        proxyEnabled: true,
        proxyServer: 'http://proxy.internal',
        proxyUsername: 'proxy-user',
        proxyPassword: 'proxy-pass',
        proxySessionAffinity: true,
        proxySessionMode: 'rotate',
        proxyProviderPreset: 'brightdata',
      },
      headless: false,
    });

    expect(launchOptions).toEqual({
      headless: false,
      slowMo: 90,
      proxy: {
        server: 'http://proxy.internal',
        username: 'proxy-user',
        password: 'proxy-pass',
      },
    });

    const contextOptions = buildPlaywrightConnectionContextOptions({
      runtime: {
        deviceContextOptions: {},
        deviceProfileName: null,
        storageState: {
          cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
          origins: [],
        },
        settings: {
          locale: 'en-US',
          timezoneId: 'Europe/Warsaw',
        },
      },
      viewport: { width: 1280, height: 720 },
      environmentOverrides: {
        locale: 'pl-PL',
        timezoneId: 'Europe/Warsaw',
        userAgent: 'custom-ua',
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        geolocation: { latitude: 52.2297, longitude: 21.0122 },
        permissions: ['geolocation'],
      },
    });

    expect(contextOptions).toEqual({
      locale: 'pl-PL',
      storageState: {
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      },
      timezoneId: 'Europe/Warsaw',
      viewport: { width: 1280, height: 720 },
      userAgent: 'custom-ua',
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      geolocation: { latitude: 52.2297, longitude: 21.0122 },
      permissions: ['geolocation'],
    });
  });

  it('recomputes device context from action-owned emulation settings', () => {
    expect(
      resolvePlaywrightRuntimeDeviceContext({
        emulateDevice: true,
        deviceName: 'Pixel 7',
      })
    ).toEqual({
      deviceProfileName: 'Pixel 7',
      deviceContextOptions: {
        viewport: { width: 412, height: 915 },
        userAgent: 'pixel-ua',
      },
    });

    expect(
      resolvePlaywrightRuntimeDeviceContext({
        emulateDevice: false,
        deviceName: 'Pixel 7',
      })
    ).toEqual({
      deviceProfileName: null,
      deviceContextOptions: {},
    });
  });

  it('builds engine-ready launch options and settings overrides from the same runtime settings', () => {
    const settingsOverrides = buildPlaywrightConnectionSettingsOverrides({
      headless: false,
      slowMo: 33,
      identityProfile: 'search',
      timeout: 31_000,
      navigationTimeout: 32_000,
      locale: 'en-US',
      timezoneId: 'Europe/Warsaw',
      humanizeMouse: false,
      mouseJitter: 4,
      clickDelayMin: 11,
      clickDelayMax: 22,
      inputDelayMin: 6,
      inputDelayMax: 12,
      actionDelayMin: 55,
      actionDelayMax: 89,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      proxySessionAffinity: false,
      proxySessionMode: 'sticky',
      proxyProviderPreset: 'custom',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });

    expect(settingsOverrides).toMatchObject({
      headless: false,
      identityProfile: 'search',
      navigationTimeout: 32_000,
      locale: 'en-US',
      timezoneId: 'Europe/Warsaw',
      humanizeMouse: false,
      mouseJitter: 4,
      actionDelayMax: 89,
      proxySessionAffinity: false,
      proxySessionMode: 'sticky',
      proxyProviderPreset: 'custom',
      deviceName: 'Desktop Chrome',
    });

    const launchOptions = buildPlaywrightConnectionEngineLaunchOptions({
      browserPreference: 'chrome',
    });

    expect(launchOptions).toEqual({
      channel: 'chrome',
    });

    const requestOptions = buildPlaywrightConnectionEngineRequestOptions({
      runtime: {
        personaId: 'persona-1',
        storageState: {
          cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
          origins: [],
        },
      },
      settings: {
        headless: false,
        identityProfile: 'search',
        slowMo: 33,
        timeout: 31_000,
        navigationTimeout: 32_000,
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw',
        humanizeMouse: false,
        mouseJitter: 4,
        clickDelayMin: 11,
        clickDelayMax: 22,
        inputDelayMin: 6,
        inputDelayMax: 12,
        actionDelayMin: 55,
        actionDelayMax: 89,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      browserPreference: 'chrome',
    });

    expect(requestOptions).toEqual({
      personaId: 'persona-1',
      contextOptions: {
        storageState: {
          cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
          origins: [],
        },
      },
      settingsOverrides: expect.objectContaining({
        headless: false,
        identityProfile: 'search',
        slowMo: 33,
        navigationTimeout: 32_000,
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw',
        proxySessionAffinity: false,
        proxySessionMode: 'sticky',
        proxyProviderPreset: 'custom',
      }),
      launchOptions: {
        channel: 'chrome',
      },
    });
  });

  it('runs connection-backed engine tasks with resolved persona, storage, and launch options', async () => {
    const result = await runPlaywrightConnectionEngineTask({
      connection: {
        playwrightPersonaId: ' persona-1 ',
        playwrightStorageState: 'encrypted-state',
      } as never,
      request: {
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        browserEngine: 'chromium',
      },
      instance: {
        kind: 'programmable_listing',
      },
    });

    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith({
      request: {
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        browserEngine: 'chromium',
        personaId: 'persona-1',
        contextOptions: {
          storageState: {
            cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
            origins: [],
          },
        },
        settingsOverrides: expect.objectContaining({
          headless: true,
          slowMo: 75,
          navigationTimeout: 25_000,
        }),
        launchOptions: {
          channel: 'chrome',
        },
      },
      ownerUserId: undefined,
      instance: {
        kind: 'programmable_listing',
      },
    });
    expect(result).toMatchObject({
      runtime: {
        personaId: 'persona-1',
      },
      settings: expect.objectContaining({
        headless: true,
        slowMo: 75,
      }),
      browserPreference: 'chrome',
      run: {
        runId: 'run-123',
        status: 'completed',
      },
    });
  });

  it('starts connection-backed engine tasks with caller-provided settings overrides', async () => {
    await startPlaywrightConnectionEngineTask({
      connection: {
        playwrightPersonaId: null,
        playwrightStorageState: null,
      } as never,
      request: {
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        browserEngine: 'chromium',
      },
      resolveEngineRequestConfig: (runtime) => ({
        settings: {
          ...runtime.settings,
          headless: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        browserPreference: 'chrome',
      }),
      instance: {
        kind: 'social_capture_batch',
      },
    });

    expect(startPlaywrightEngineTaskMock).toHaveBeenCalledWith({
      request: {
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        browserEngine: 'chromium',
        contextOptions: {
          storageState: {
            cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
            origins: [],
          },
        },
        settingsOverrides: expect.objectContaining({
          identityProfile: 'marketplace',
          headless: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        }),
        launchOptions: {
          channel: 'chrome',
        },
      },
      ownerUserId: undefined,
      instance: {
        kind: 'social_capture_batch',
      },
    });
  });

  it('applies runtime action execution settings and browser_preparation overrides to engine tasks', async () => {
    resolveRuntimeActionDefinitionMock.mockResolvedValue({
      id: 'runtime_action__playwright_programmable_listing',
      name: 'Programmable Listing Session',
      description: null,
      runtimeKey: 'playwright_programmable_listing',
      blocks: [
        {
          id: 'runtime_action__playwright_programmable_listing__browser_preparation',
          kind: 'runtime_step',
          refId: 'browser_preparation',
          enabled: true,
          label: null,
          config: {
            viewportWidth: 1440,
            viewportHeight: 900,
            locale: 'en-GB',
            userAgent: 'custom-ua',
            permissions: ['geolocation'],
            geolocationLatitude: 52.2297,
            geolocationLongitude: 21.0122,
          },
        },
      ],
      stepSetIds: [],
      personaId: null,
      executionSettings: {
        headless: false,
        browserPreference: 'brave',
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
        slowMo: null,
        timeout: null,
        navigationTimeout: null,
        locale: 'pl-PL',
        timezoneId: 'Europe/Warsaw',
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });

    const result = await runPlaywrightConnectionEngineTask({
      connection: {
        playwrightPersonaId: ' persona-1 ',
        playwrightStorageState: 'encrypted-state',
      } as never,
      request: {
        script: 'export default async function run() {}',
        browserEngine: 'chromium',
      },
      runtimeActionKey: 'playwright_programmable_listing',
    });

    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        personaId: 'persona-1',
        contextOptions: expect.objectContaining({
          locale: 'en-GB',
          viewport: { width: 1440, height: 900 },
          userAgent: 'custom-ua',
          permissions: ['geolocation'],
          geolocation: { latitude: 52.2297, longitude: 21.0122 },
          storageState: {
            cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
            origins: [],
          },
        }),
        settingsOverrides: expect.objectContaining({
          headless: false,
          locale: 'pl-PL',
          timezoneId: 'Europe/Warsaw',
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        }),
        launchOptions: {
          executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        },
      }),
      ownerUserId: undefined,
      instance: undefined,
    });
    expect(result.runtime.browserPreference).toBe('brave');
    expect(result.runtime.settings.headless).toBe(false);
    expect(result.runtime.settings.locale).toBe('pl-PL');
  });

  it('prefers a selected action id over the default runtime key when building engine request options', async () => {
    resolvePlaywrightActionDefinitionByIdMock.mockResolvedValue({
      id: 'programmable-draft',
      name: 'Programmable Draft',
      description: null,
      runtimeKey: null,
      blocks: [
        {
          id: 'block_1',
          kind: 'runtime_step',
          refId: 'browser_preparation',
          enabled: true,
          label: null,
          config: {
            viewportWidth: 1600,
            viewportHeight: 1000,
            locale: 'sv-SE',
          },
        },
      ],
      stepSetIds: [],
      personaId: 'action-persona',
      executionSettings: {
        identityProfile: 'marketplace',
        headless: false,
        browserPreference: 'chromium',
        emulateDevice: null,
        deviceName: null,
        slowMo: 50,
        timeout: 40_000,
        navigationTimeout: 41_000,
        locale: 'sv-SE',
        timezoneId: 'Europe/Stockholm',
        humanizeMouse: false,
        mouseJitter: 8,
        clickDelayMin: 25,
        clickDelayMax: 90,
        inputDelayMin: 15,
        inputDelayMax: 45,
        actionDelayMin: 200,
        actionDelayMax: 700,
        proxyEnabled: true,
        proxyServer: 'http://proxy.internal:8080',
        proxyUsername: 'proxy-user',
        proxyPassword: 'proxy-pass',
        proxySessionAffinity: true,
        proxySessionMode: 'rotate',
        proxyProviderPreset: 'brightdata',
      },
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });

    await runPlaywrightConnectionEngineTask({
      connection: {
        playwrightPersonaId: ' persona-1 ',
        playwrightStorageState: 'encrypted-state',
      } as never,
      request: {
        script: 'export default async function run() {}',
        browserEngine: 'chromium',
      },
      actionId: 'programmable-draft',
      runtimeActionKey: 'playwright_programmable_listing',
      browserBehaviorOwner: 'action',
    });

    expect(resolvePlaywrightActionDefinitionByIdMock).toHaveBeenCalledWith('programmable-draft');
    expect(resolveConnectionPlaywrightSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        playwrightPersonaId: ' persona-1 ',
        playwrightStorageState: 'encrypted-state',
      }),
      {
        includeConnectionBrowserBehavior: false,
        personaId: 'action-persona',
      }
    );
    expect(runPlaywrightEngineTaskMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        personaId: 'action-persona',
        contextOptions: expect.objectContaining({
          viewport: { width: 1600, height: 1000 },
          locale: 'sv-SE',
        }),
        settingsOverrides: expect.objectContaining({
          identityProfile: 'marketplace',
          headless: false,
          slowMo: 50,
          timeout: 40_000,
          navigationTimeout: 41_000,
          locale: 'sv-SE',
          timezoneId: 'Europe/Stockholm',
          humanizeMouse: false,
          mouseJitter: 8,
          clickDelayMin: 25,
          clickDelayMax: 90,
          inputDelayMin: 15,
          inputDelayMax: 45,
          actionDelayMin: 200,
          actionDelayMax: 700,
          proxyEnabled: true,
          proxyServer: 'http://proxy.internal:8080',
          proxyUsername: 'proxy-user',
          proxyPassword: 'proxy-pass',
          proxySessionAffinity: true,
          proxySessionMode: 'rotate',
          proxyProviderPreset: 'brightdata',
        }),
      }),
      ownerUserId: undefined,
      instance: undefined,
    });
  });
});
