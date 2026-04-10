import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
} = vi.hoisted(() => ({
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
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

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionEngineLaunchOptions,
  buildPlaywrightConnectionLaunchOptions,
  buildPlaywrightConnectionSettingsOverrides,
  resolvePlaywrightConnectionRuntime,
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
      headless: true,
      slowMo: 75,
      timeout: 30_000,
      navigationTimeout: 25_000,
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
      emulateDevice: true,
      deviceName: 'Pixel 7',
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
      },
      viewport: { width: 1280, height: 720 },
    });

    expect(contextOptions).toEqual({
      storageState: {
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      },
      viewport: { width: 1280, height: 720 },
    });
  });

  it('builds engine-ready launch options and settings overrides from the same runtime settings', () => {
    const settingsOverrides = buildPlaywrightConnectionSettingsOverrides({
      headless: false,
      slowMo: 33,
      timeout: 31_000,
      navigationTimeout: 32_000,
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
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });

    expect(settingsOverrides).toMatchObject({
      headless: false,
      navigationTimeout: 32_000,
      humanizeMouse: false,
      mouseJitter: 4,
      actionDelayMax: 89,
      deviceName: 'Desktop Chrome',
    });

    const launchOptions = buildPlaywrightConnectionEngineLaunchOptions({
      browserPreference: 'chrome',
    });

    expect(launchOptions).toEqual({
      channel: 'chrome',
    });
  });
});
