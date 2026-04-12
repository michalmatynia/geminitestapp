import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
  runPlaywrightEngineTaskMock,
  startPlaywrightEngineTaskMock,
} = vi.hoisted(() => ({
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
  startPlaywrightEngineTaskMock: vi.fn(),
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

import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionEngineRequestOptions,
  buildPlaywrightConnectionEngineLaunchOptions,
  buildPlaywrightConnectionLaunchOptions,
  buildPlaywrightConnectionSettingsOverrides,
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
    });

    expect(contextOptions).toEqual({
      locale: 'en-US',
      storageState: {
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      },
      timezoneId: 'Europe/Warsaw',
      viewport: { width: 1280, height: 720 },
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
});
