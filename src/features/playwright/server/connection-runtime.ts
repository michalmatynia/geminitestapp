import 'server-only';

import { devices, type BrowserContextOptions, type LaunchOptions } from 'playwright';
import type {
  PlaywrightActionBlockConfig,
  PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  resolvePlaywrightActionDefinitionById,
  resolveRuntimeActionDefinition,
} from '@/shared/lib/browser-execution/runtime-action-resolver.server';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
  type ResolveConnectionPlaywrightSettingsOptions,
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
  | 'browser'
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
  contextOptions?: BrowserContextOptions;
  settingsOverrides: Record<string, unknown>;
  launchOptions?: Record<string, unknown>;
};

export type PlaywrightConnectionBaseEngineRunRequest =
  | Omit<
      Extract<PlaywrightEngineRunRequest, { runtimeKey: string }>,
      'personaId' | 'contextOptions' | 'settingsOverrides' | 'launchOptions'
    >
  | Omit<
      Extract<PlaywrightEngineRunRequest, { script: string }>,
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
  actionId?: string | null;
  runtimeActionKey?: ActionSequenceKey;
  browserBehaviorOwner?: 'action' | 'connection';
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

export type PlaywrightContextEnvironmentOverrides = {
  viewport?: NonNullable<BrowserContextOptions['viewport']> | null;
  locale?: string | null;
  timezoneId?: string | null;
  userAgent?: string | null;
  colorScheme?: BrowserContextOptions['colorScheme'] | null;
  reducedMotion?: BrowserContextOptions['reducedMotion'] | null;
  geolocation?: BrowserContextOptions['geolocation'] | null;
  permissions?: string[] | null;
};

const applyPlaywrightActionExecutionSettingsToRuntime = ({
  runtime,
  executionSettings,
}: {
  runtime: ResolvedPlaywrightConnectionRuntime;
  executionSettings: PlaywrightActionExecutionSettings | null;
}): ResolvedPlaywrightConnectionRuntime => {
  if (executionSettings === null) {
    return runtime;
  }

  const settings = { ...runtime.settings };
  const applySetting = <TKey extends keyof typeof settings>(
    key: TKey,
    value: (typeof settings)[TKey] | null
  ): void => {
    if (value !== null) {
      settings[key] = value;
    }
  };

  applySetting('headless', executionSettings.headless);
  applySetting('identityProfile', executionSettings.identityProfile);
  applySetting('slowMo', executionSettings.slowMo);
  applySetting('timeout', executionSettings.timeout);
  applySetting('navigationTimeout', executionSettings.navigationTimeout);
  applySetting('locale', executionSettings.locale);
  applySetting('timezoneId', executionSettings.timezoneId);
  applySetting('humanizeMouse', executionSettings.humanizeMouse);
  applySetting('mouseJitter', executionSettings.mouseJitter);
  applySetting('clickDelayMin', executionSettings.clickDelayMin);
  applySetting('clickDelayMax', executionSettings.clickDelayMax);
  applySetting('inputDelayMin', executionSettings.inputDelayMin);
  applySetting('inputDelayMax', executionSettings.inputDelayMax);
  applySetting('actionDelayMin', executionSettings.actionDelayMin);
  applySetting('actionDelayMax', executionSettings.actionDelayMax);
  applySetting('proxyEnabled', executionSettings.proxyEnabled);
  applySetting('proxyServer', executionSettings.proxyServer);
  applySetting('proxyUsername', executionSettings.proxyUsername);
  applySetting('proxyPassword', executionSettings.proxyPassword);
  applySetting('proxySessionAffinity', executionSettings.proxySessionAffinity);
  applySetting('proxySessionMode', executionSettings.proxySessionMode);
  applySetting('proxyProviderPreset', executionSettings.proxyProviderPreset);
  applySetting('emulateDevice', executionSettings.emulateDevice);
  applySetting('deviceName', executionSettings.deviceName);
  const deviceContext = resolvePlaywrightRuntimeDeviceContext(settings);

  return {
    ...runtime,
    browserPreference: executionSettings.browserPreference ?? runtime.browserPreference,
    settings,
    deviceProfileName: deviceContext.deviceProfileName,
    deviceContextOptions: deviceContext.deviceContextOptions,
  };
};

const resolveBrowserPreparationContextOverrides = (
  config: PlaywrightActionBlockConfig | null
): PlaywrightContextEnvironmentOverrides => {
  if (config === null) {
    return {};
  }

  const viewport =
    config.viewportWidth !== null && config.viewportHeight !== null
      ? { width: config.viewportWidth, height: config.viewportHeight }
      : null;
  const geolocation =
    config.geolocationLatitude !== null && config.geolocationLongitude !== null
      ? {
          latitude: config.geolocationLatitude,
          longitude: config.geolocationLongitude,
        }
      : null;

  return {
    viewport,
    locale: config.locale,
    timezoneId: config.timezoneId,
    userAgent: config.userAgent,
    colorScheme: config.colorScheme,
    reducedMotion: config.reducedMotion,
    geolocation,
    permissions: config.permissions,
  };
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

export const resolvePlaywrightRuntimeDeviceContext = (
  settings: Pick<TraderaPlaywrightRuntimeSettings, 'emulateDevice' | 'deviceName'>
): Pick<ResolvedPlaywrightConnectionRuntime, 'deviceProfileName' | 'deviceContextOptions'> => {
  const configuredDeviceName = settings.deviceName?.trim() || null;
  const deviceProfile =
    settings.emulateDevice && configuredDeviceName && devices[configuredDeviceName]
      ? devices[configuredDeviceName]
      : null;

  return {
    deviceProfileName: deviceProfile ? configuredDeviceName : null,
    deviceContextOptions: toDeviceContextOptions(deviceProfile),
  };
};

export const resolvePlaywrightConnectionRuntime = async (
  connection: IntegrationConnectionRecord,
  options?: ResolveConnectionPlaywrightSettingsOptions
): Promise<ResolvedPlaywrightConnectionRuntime> => {
  const settings = await resolveConnectionPlaywrightSettings(connection, options);
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const personaId =
    normalizeIntegrationConnectionPlaywrightPersonaId(options?.personaId) ??
    undefined;
  const deviceContext = resolvePlaywrightRuntimeDeviceContext(settings);

  return {
    settings,
    storageState,
    personaId,
    browserPreference: settings.browser,
    deviceProfileName: deviceContext.deviceProfileName,
    deviceContextOptions: deviceContext.deviceContextOptions,
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
  environmentOverrides?: PlaywrightContextEnvironmentOverrides;
}): BrowserContextOptions => {
  const locale =
    input.environmentOverrides?.locale?.trim() || input.runtime.settings.locale || undefined;
  const timezoneId =
    input.environmentOverrides?.timezoneId?.trim() ||
    input.runtime.settings.timezoneId ||
    undefined;
  const viewport =
    input.environmentOverrides?.viewport ??
    (!input.runtime.deviceProfileName ? input.viewport : undefined);
  const userAgent =
    input.environmentOverrides?.userAgent?.trim() ||
    input.runtime.deviceContextOptions.userAgent ||
    undefined;
  const permissions =
    input.environmentOverrides?.permissions?.filter((permission) => permission.trim().length > 0) ??
    undefined;

  return {
    ...input.runtime.deviceContextOptions,
    ...(input.runtime.storageState ? { storageState: input.runtime.storageState } : {}),
    ...(locale ? { locale } : {}),
    ...(timezoneId ? { timezoneId } : {}),
    ...(!input.runtime.deviceProfileName && viewport ? { viewport } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(input.environmentOverrides?.colorScheme
      ? { colorScheme: input.environmentOverrides.colorScheme }
      : {}),
    ...(input.environmentOverrides?.reducedMotion
      ? { reducedMotion: input.environmentOverrides.reducedMotion }
      : {}),
    ...(input.environmentOverrides?.geolocation
      ? { geolocation: input.environmentOverrides.geolocation }
      : {}),
    ...(permissions && permissions.length > 0 ? { permissions } : {}),
  };
};

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
  environmentOverrides?: PlaywrightContextEnvironmentOverrides;
  browserPreference?: PlaywrightBrowserPreference | null;
}): PlaywrightConnectionEngineRequestOptions => {
  const launchOptions =
    input.browserPreference
      ? buildPlaywrightConnectionEngineLaunchOptions({
          browserPreference: input.browserPreference,
        })
      : {};
  const contextOptions: BrowserContextOptions = {
    ...(input.runtime.storageState ? { storageState: input.runtime.storageState } : {}),
    ...(input.environmentOverrides?.viewport ? { viewport: input.environmentOverrides.viewport } : {}),
    ...(input.environmentOverrides?.locale?.trim()
      ? { locale: input.environmentOverrides.locale.trim() }
      : {}),
    ...(input.environmentOverrides?.timezoneId?.trim()
      ? { timezoneId: input.environmentOverrides.timezoneId.trim() }
      : {}),
    ...(input.environmentOverrides?.userAgent?.trim()
      ? { userAgent: input.environmentOverrides.userAgent.trim() }
      : {}),
    ...(input.environmentOverrides?.colorScheme
      ? { colorScheme: input.environmentOverrides.colorScheme }
      : {}),
    ...(input.environmentOverrides?.reducedMotion
      ? { reducedMotion: input.environmentOverrides.reducedMotion }
      : {}),
    ...(input.environmentOverrides?.geolocation
      ? { geolocation: input.environmentOverrides.geolocation }
      : {}),
    ...(input.environmentOverrides?.permissions &&
    input.environmentOverrides.permissions.length > 0
      ? { permissions: input.environmentOverrides.permissions }
      : {}),
  };

  return {
    ...(input.runtime.personaId ? { personaId: input.runtime.personaId } : {}),
    ...(Object.keys(contextOptions).length > 0 ? { contextOptions } : {}),
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
  environmentOverrides?: PlaywrightContextEnvironmentOverrides;
  browserPreference?: PlaywrightBrowserPreference | null;
}): PlaywrightEngineRunRequest => {
  const requestOptions = buildPlaywrightConnectionEngineRequestOptions({
    runtime: input.runtime,
    settings: input.settings,
    environmentOverrides: input.environmentOverrides,
    browserPreference: input.browserPreference,
  });

  if (
    'runtimeKey' in input.request &&
    typeof input.request.runtimeKey === 'string'
  ) {
    return {
      ...input.request,
      ...requestOptions,
    };
  }

  return {
    ...input.request,
    ...requestOptions,
  };
};

const executePlaywrightConnectionEngineTask = async (
  input: PlaywrightConnectionEngineTaskInput,
  mode: 'run' | 'start'
): Promise<PlaywrightConnectionEngineTaskResult> => {
  const actionDefinition =
    typeof input.actionId === 'string' && input.actionId.trim().length > 0
      ? await resolvePlaywrightActionDefinitionById(input.actionId)
      : input.runtimeActionKey === undefined
        ? null
        : await resolveRuntimeActionDefinition(input.runtimeActionKey);
  const runtime = applyPlaywrightActionExecutionSettingsToRuntime({
    runtime: await resolvePlaywrightConnectionRuntime(
      input.connection,
      input.browserBehaviorOwner === 'action'
        ? {
            includeConnectionBrowserBehavior: false,
            personaId: actionDefinition?.personaId ?? null,
          }
        : undefined
    ),
    executionSettings: actionDefinition?.executionSettings ?? null,
  });
  const contextEnvironmentOverrides =
    actionDefinition !== null
      ? resolveBrowserPreparationContextOverrides(
          actionDefinition.blocks.find(
            (block) =>
              block.kind === 'runtime_step' &&
              block.enabled !== false &&
              block.refId === 'browser_preparation'
          )?.config ?? null
        )
      : {};
  const config = resolvePlaywrightConnectionEngineRequestConfig(
    runtime,
    input.resolveEngineRequestConfig
  );
  const browserPreference = config.browserPreference ?? runtime.browserPreference;
  const deviceContext = resolvePlaywrightRuntimeDeviceContext(config.settings);
  const effectiveRuntime: ResolvedPlaywrightConnectionRuntime = {
    ...runtime,
    browserPreference,
    settings: {
      ...config.settings,
    },
    deviceProfileName: deviceContext.deviceProfileName,
    deviceContextOptions: deviceContext.deviceContextOptions,
  };
  const request = buildPlaywrightConnectionEngineRunRequest({
    request: input.request,
    runtime: effectiveRuntime,
    settings: config.settings,
    environmentOverrides: contextEnvironmentOverrides,
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
    runtime: effectiveRuntime,
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
