import 'server-only';

import { devices, type BrowserContextOptions, type LaunchOptions } from 'playwright';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
  type PersistedStorageState,
  type TraderaPlaywrightRuntimeSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { normalizeIntegrationConnectionPlaywrightPersonaId } from '@/features/integrations/utils/playwright-connection-settings';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import {
  resolvePlaywrightBrowserLaunchOptions,
  type PlaywrightBrowserPreference,
} from '@/shared/lib/playwright/browser-launch';

type DeviceDescriptor = (typeof devices)[string];

export type ResolvedPlaywrightConnectionRuntime = {
  settings: TraderaPlaywrightRuntimeSettings;
  storageState: PersistedStorageState | null;
  personaId: string | undefined;
  browserPreference: PlaywrightBrowserPreference;
  deviceProfileName: string | null;
  deviceContextOptions: BrowserContextOptions;
};

const toDeviceContextOptions = (
  deviceProfile: DeviceDescriptor | null
): BrowserContextOptions => {
  if (!deviceProfile) {
    return {};
  }

  const { defaultBrowserType: _ignore, ...rest } = deviceProfile;
  return rest;
};

export const resolvePlaywrightConnectionRuntime = async (
  connection: IntegrationConnectionRecord
): Promise<ResolvedPlaywrightConnectionRuntime> => {
  const settings = await resolveConnectionPlaywrightSettings(connection);
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const personaId =
    normalizeIntegrationConnectionPlaywrightPersonaId(connection.playwrightPersonaId) ?? undefined;
  const configuredDeviceName = settings.deviceName?.trim() || null;
  const deviceProfile =
    settings.emulateDevice && configuredDeviceName && devices[configuredDeviceName]
      ? devices[configuredDeviceName]
      : null;

  return {
    settings,
    storageState,
    personaId,
    browserPreference: settings.browser,
    deviceProfileName: deviceProfile ? configuredDeviceName : null,
    deviceContextOptions: toDeviceContextOptions(deviceProfile),
  };
};

export const buildPlaywrightConnectionLaunchOptions = (input: {
  settings: Pick<
    TraderaPlaywrightRuntimeSettings,
    | 'slowMo'
    | 'proxyEnabled'
    | 'proxyServer'
    | 'proxyUsername'
    | 'proxyPassword'
  >;
  headless: boolean;
}): LaunchOptions => ({
  headless: input.headless,
  slowMo: input.settings.slowMo,
  ...(input.settings.proxyEnabled && input.settings.proxyServer
    ? {
        proxy: {
          server: input.settings.proxyServer,
          ...(input.settings.proxyUsername
            ? { username: input.settings.proxyUsername }
            : {}),
          ...(input.settings.proxyPassword
            ? { password: input.settings.proxyPassword }
            : {}),
        },
      }
    : {}),
});

export const buildPlaywrightConnectionContextOptions = (input: {
  runtime: Pick<
    ResolvedPlaywrightConnectionRuntime,
    'deviceContextOptions' | 'deviceProfileName' | 'storageState'
  >;
  viewport?: NonNullable<BrowserContextOptions['viewport']>;
}): BrowserContextOptions => ({
  ...input.runtime.deviceContextOptions,
  ...(input.runtime.storageState ? { storageState: input.runtime.storageState } : {}),
  ...(!input.runtime.deviceProfileName && input.viewport
    ? { viewport: input.viewport }
    : {}),
});

export const buildPlaywrightConnectionSettingsOverrides = (
  settings: Pick<
    TraderaPlaywrightRuntimeSettings,
    | 'headless'
    | 'slowMo'
    | 'timeout'
    | 'navigationTimeout'
    | 'humanizeMouse'
    | 'mouseJitter'
    | 'clickDelayMin'
    | 'clickDelayMax'
    | 'inputDelayMin'
    | 'inputDelayMax'
    | 'actionDelayMin'
    | 'actionDelayMax'
    | 'proxyEnabled'
    | 'proxyServer'
    | 'proxyUsername'
    | 'proxyPassword'
    | 'emulateDevice'
    | 'deviceName'
  >
): Record<string, unknown> => ({
  headless: settings.headless,
  slowMo: settings.slowMo,
  timeout: settings.timeout,
  navigationTimeout: settings.navigationTimeout,
  humanizeMouse: settings.humanizeMouse,
  mouseJitter: settings.mouseJitter,
  clickDelayMin: settings.clickDelayMin,
  clickDelayMax: settings.clickDelayMax,
  inputDelayMin: settings.inputDelayMin,
  inputDelayMax: settings.inputDelayMax,
  actionDelayMin: settings.actionDelayMin,
  actionDelayMax: settings.actionDelayMax,
  proxyEnabled: settings.proxyEnabled,
  proxyServer: settings.proxyServer,
  proxyUsername: settings.proxyUsername,
  proxyPassword: settings.proxyPassword,
  emulateDevice: settings.emulateDevice,
  deviceName: settings.deviceName,
});

export const buildPlaywrightConnectionEngineLaunchOptions = (input: {
  browserPreference: PlaywrightBrowserPreference;
}): Record<string, unknown> => ({
  ...resolvePlaywrightBrowserLaunchOptions(input.browserPreference),
});
