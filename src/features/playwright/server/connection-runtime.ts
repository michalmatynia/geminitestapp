import 'server-only';

import { devices, type BrowserContextOptions, type LaunchOptions } from 'playwright';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
  type PersistedStorageState,
  type TraderaPlaywrightRuntimeSettings,
} from './settings';
import {
  runPlaywrightEngineTask,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunInstance,
  type PlaywrightEngineRunRecord,
  type PlaywrightEngineRunRequest,
} from './runtime';
import { normalizeIntegrationConnectionPlaywrightPersonaId } from './connection-settings-shared';
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

export type PlaywrightConnectionSettingsOverridesInput = Pick<
  TraderaPlaywrightRuntimeSettings,
  | 'headless'
  | 'identityProfile'
  | 'slowMo'
  | 'timeout'
  | 'navigationTimeout'
  | 'locale'
  | 'timezoneId'
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
  | 'proxySessionAffinity'
  | 'proxySessionMode'
  | 'proxyProviderPreset'
  | 'emulateDevice'
  | 'deviceName'
>;

export type PlaywrightConnectionEngineRequestOptions = {
  personaId?: string;
  contextOptions?: { storageState: PersistedStorageState };
  settingsOverrides: Record<string, unknown>;
  launchOptions?: Record<string, unknown>;
};

export type PlaywrightConnectionBaseEngineRunRequest = Omit<
  PlaywrightEngineRunRequest,
  'personaId' | 'contextOptions' | 'settingsOverrides' | 'launchOptions'
>;

export type PlaywrightConnectionEngineRequestConfig = {
  settings: PlaywrightConnectionSettingsOverridesInput;
  browserPreference?: PlaywrightBrowserPreference | null;
};

export type PlaywrightConnectionEngineTaskInput = {
  connection: IntegrationConnectionRecord;
  request: PlaywrightConnectionBaseEngineRunRequest;
  ownerUserId?: string | null;
  instance?: PlaywrightEngineRunInstance | null;
  resolveEngineRequestConfig?: (
    runtime: ResolvedPlaywrightConnectionRuntime
  ) => PlaywrightConnectionEngineRequestConfig;
};

export type PlaywrightConnectionEngineTaskResult = {
  runtime: ResolvedPlaywrightConnectionRuntime;
  settings: PlaywrightConnectionSettingsOverridesInput;
  browserPreference: PlaywrightBrowserPreference | null;
  run: PlaywrightEngineRunRecord;
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
    | 'proxySessionAffinity'
    | 'proxySessionMode'
    | 'proxyProviderPreset'
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
    'deviceContextOptions' | 'deviceProfileName' | 'storageState' | 'settings'
  >;
  viewport?: NonNullable<BrowserContextOptions['viewport']>;
}): BrowserContextOptions => ({
  ...input.runtime.deviceContextOptions,
  ...(input.runtime.storageState ? { storageState: input.runtime.storageState } : {}),
  ...(input.runtime.settings.locale ? { locale: input.runtime.settings.locale } : {}),
  ...(input.runtime.settings.timezoneId
    ? { timezoneId: input.runtime.settings.timezoneId }
    : {}),
  ...(!input.runtime.deviceProfileName && input.viewport
    ? { viewport: input.viewport }
    : {}),
});

export const buildPlaywrightConnectionSettingsOverrides = (
  settings: PlaywrightConnectionSettingsOverridesInput
): Record<string, unknown> => ({
  identityProfile: settings.identityProfile,
  headless: settings.headless,
  slowMo: settings.slowMo,
  timeout: settings.timeout,
  navigationTimeout: settings.navigationTimeout,
  locale: settings.locale,
  timezoneId: settings.timezoneId,
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
  proxySessionAffinity: settings.proxySessionAffinity,
  proxySessionMode: settings.proxySessionMode,
  proxyProviderPreset: settings.proxyProviderPreset,
  emulateDevice: settings.emulateDevice,
  deviceName: settings.deviceName,
});

export const buildPlaywrightConnectionEngineLaunchOptions = (input: {
  browserPreference: PlaywrightBrowserPreference;
}): Record<string, unknown> => ({
  ...resolvePlaywrightBrowserLaunchOptions(input.browserPreference),
});

export const buildPlaywrightConnectionEngineRequestOptions = (input: {
  runtime: Pick<ResolvedPlaywrightConnectionRuntime, 'personaId' | 'storageState'>;
  settings: PlaywrightConnectionSettingsOverridesInput;
  browserPreference?: PlaywrightBrowserPreference | null;
}): PlaywrightConnectionEngineRequestOptions => {
  const launchOptions =
    input.browserPreference
      ? buildPlaywrightConnectionEngineLaunchOptions({
          browserPreference: input.browserPreference,
        })
      : {};

  return {
    ...(input.runtime.personaId ? { personaId: input.runtime.personaId } : {}),
    ...(input.runtime.storageState
      ? { contextOptions: { storageState: input.runtime.storageState } }
      : {}),
    settingsOverrides: buildPlaywrightConnectionSettingsOverrides(input.settings),
    ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
  };
};

const resolvePlaywrightConnectionEngineRequestConfig = (
  runtime: ResolvedPlaywrightConnectionRuntime,
  resolver?: (
    runtime: ResolvedPlaywrightConnectionRuntime
  ) => PlaywrightConnectionEngineRequestConfig
): PlaywrightConnectionEngineRequestConfig => {
  if (resolver) {
    return resolver(runtime);
  }

  return {
    settings: runtime.settings,
    browserPreference: runtime.browserPreference,
  };
};

const buildPlaywrightConnectionEngineRunRequest = (input: {
  request: PlaywrightConnectionBaseEngineRunRequest;
  runtime: ResolvedPlaywrightConnectionRuntime;
  settings: PlaywrightConnectionSettingsOverridesInput;
  browserPreference?: PlaywrightBrowserPreference | null;
}): PlaywrightEngineRunRequest => ({
  ...input.request,
  ...buildPlaywrightConnectionEngineRequestOptions({
    runtime: input.runtime,
    settings: input.settings,
    browserPreference: input.browserPreference,
  }),
});

const executePlaywrightConnectionEngineTask = async (
  input: PlaywrightConnectionEngineTaskInput,
  mode: 'run' | 'start'
): Promise<PlaywrightConnectionEngineTaskResult> => {
  const runtime = await resolvePlaywrightConnectionRuntime(input.connection);
  const config = resolvePlaywrightConnectionEngineRequestConfig(
    runtime,
    input.resolveEngineRequestConfig
  );
  const browserPreference = config.browserPreference ?? runtime.browserPreference;
  const request = buildPlaywrightConnectionEngineRunRequest({
    request: input.request,
    runtime,
    settings: config.settings,
    browserPreference,
  });

  const run =
    mode === 'start'
      ? await startPlaywrightEngineTask({
          request,
          ownerUserId: input.ownerUserId,
          instance: input.instance,
        })
      : await runPlaywrightEngineTask({
          request,
          ownerUserId: input.ownerUserId,
          instance: input.instance,
        });

  return {
    runtime,
    settings: config.settings,
    browserPreference,
    run,
  };
};

export const runPlaywrightConnectionEngineTask = async (
  input: PlaywrightConnectionEngineTaskInput
): Promise<PlaywrightConnectionEngineTaskResult> =>
  executePlaywrightConnectionEngineTask(input, 'run');

export const startPlaywrightConnectionEngineTask = async (
  input: PlaywrightConnectionEngineTaskInput
): Promise<PlaywrightConnectionEngineTaskResult> =>
  executePlaywrightConnectionEngineTask(input, 'start');
