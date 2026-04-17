import 'server-only';

import type { Browser, BrowserContext, Page } from 'playwright';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type {
  PlaywrightActionBlockConfig,
  PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  resolveRuntimeActionDefinition,
} from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import {
  buildChromiumAntiDetectionContextOptions,
  buildChromiumAntiDetectionLaunchOptions,
  installChromiumAntiDetectionInitScript,
} from '@/shared/lib/playwright/anti-detection';
import { applyPlaywrightProxySessionAffinity } from '@/shared/lib/playwright/proxy-affinity';
import {
  launchPlaywrightBrowser,
  type PlaywrightBrowserPreference,
} from '@/shared/lib/playwright/browser-launch';
import {
  buildPlaywrightConnectionContextOptions,
  buildPlaywrightConnectionLaunchOptions,
  resolvePlaywrightConnectionRuntime,
  resolvePlaywrightRuntimeDeviceContext,
  type PlaywrightContextEnvironmentOverrides,
  type ResolvedPlaywrightConnectionRuntime,
} from './connection-runtime';
import type { TraderaPlaywrightRuntimeSettings } from './settings';
import type { PlaywrightEngineRunInstance } from './runtime';

type OpenPlaywrightConnectionPageSessionLaunchSettingsOverrides = Partial<
  Pick<
    TraderaPlaywrightRuntimeSettings,
    | 'slowMo'
    | 'proxyEnabled'
    | 'proxyServer'
    | 'proxyUsername'
    | 'proxyPassword'
    | 'proxySessionAffinity'
    | 'proxySessionMode'
    | 'proxyProviderPreset'
  >
>;

export type OpenPlaywrightConnectionPageSessionInput = {
  connection: IntegrationConnectionRecord;
  instance?: PlaywrightEngineRunInstance | null;
  runtime?: ResolvedPlaywrightConnectionRuntime;
  runtimeActionKey?: ActionSequenceKey;
  browserPreference?: PlaywrightBrowserPreference;
  headless?: boolean;
  launchSettingsOverrides?: OpenPlaywrightConnectionPageSessionLaunchSettingsOverrides;
  viewport?: { width: number; height: number };
};

export type PlaywrightConnectionSessionMetadata = {
  instance: PlaywrightEngineRunInstance | null;
  browserLabel: string;
  fallbackMessages: string[];
  resolvedBrowserPreference: PlaywrightBrowserPreference;
  personaId: string | null;
  deviceProfileName: string | null;
};

export type OpenPlaywrightConnectionPageSessionResult = {
  runtime: ResolvedPlaywrightConnectionRuntime;
  instance: PlaywrightEngineRunInstance | null;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  launchLabel: string;
  fallbackMessages: string[];
  close: () => Promise<void>;
};

export type OpenPlaywrightConnectionNativeTaskSessionInput = Omit<
  OpenPlaywrightConnectionPageSessionInput,
  'browserPreference' | 'headless'
> & {
  requestedBrowserMode?: PlaywrightRelistBrowserMode;
  requestedBrowserPreference?: PlaywrightBrowserPreference;
};

export type OpenPlaywrightConnectionNativeTaskSessionResult =
  OpenPlaywrightConnectionPageSessionResult & {
    sessionMetadata: PlaywrightConnectionSessionMetadata;
    requestedBrowserMode: PlaywrightRelistBrowserMode | null;
    requestedBrowserPreference: PlaywrightBrowserPreference | null;
    effectiveBrowserMode: 'headed' | 'headless';
    effectiveBrowserPreference: PlaywrightBrowserPreference;
  };

const resolveRequestedHeadlessForBrowserMode = (
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined
): boolean | undefined => {
  if (requestedBrowserMode === 'headless') {
    return true;
  }

  if (requestedBrowserMode === 'headed') {
    return false;
  }

  return undefined;
};

export const resolvePlaywrightEffectiveBrowserMode = ({
  requestedBrowserMode,
  defaultHeadless,
}: {
  requestedBrowserMode: PlaywrightRelistBrowserMode | undefined;
  defaultHeadless: boolean;
}): 'headed' | 'headless' => {
  if (requestedBrowserMode === 'headed') {
    return 'headed';
  }

  if (requestedBrowserMode === 'headless') {
    return 'headless';
  }

  return defaultHeadless ? 'headless' : 'headed';
};

const applyRuntimeActionExecutionSettings = ({
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

const resolvePlaywrightPageSessionRuntime = async (
  input: OpenPlaywrightConnectionPageSessionInput
): Promise<ResolvedPlaywrightConnectionRuntime> => {
  const runtimeAction =
    input.runtimeActionKey === undefined
      ? null
      : await resolveRuntimeActionDefinition(input.runtimeActionKey);
  const runtime =
    input.runtime ??
    (await resolvePlaywrightConnectionRuntime(
      input.connection,
      runtimeAction === null
        ? undefined
        : {
            includeConnectionBrowserBehavior: false,
            personaId: runtimeAction.personaId ?? null,
          }
    ));

  return applyRuntimeActionExecutionSettings({
    runtime,
    executionSettings: runtimeAction?.executionSettings ?? null,
  });
};

const resolvePlaywrightPageSessionContextOverrides = async (
  input: Pick<OpenPlaywrightConnectionPageSessionInput, 'runtimeActionKey'>
): Promise<PlaywrightContextEnvironmentOverrides> => {
  if (input.runtimeActionKey === undefined) {
    return {};
  }

  const action = await resolveRuntimeActionDefinition(input.runtimeActionKey);
  const browserPreparationBlock = action.blocks.find(
    (block) =>
      block.kind === 'runtime_step' &&
      block.enabled !== false &&
      block.refId === 'browser_preparation'
  ) ?? null;

  return resolveBrowserPreparationContextOverrides(browserPreparationBlock?.config ?? null);
};

export const resolvePlaywrightBrowserPreferenceFromLabel = ({
  launchLabel,
  requestedBrowserPreference,
}: {
  launchLabel: string;
  requestedBrowserPreference: PlaywrightBrowserPreference;
}): PlaywrightBrowserPreference => {
  const normalizedLabel = launchLabel.trim().toLowerCase();
  if (normalizedLabel.includes('brave')) return 'brave';
  if (normalizedLabel.includes('chrome')) return 'chrome';
  if (normalizedLabel.includes('chromium')) return 'chromium';
  return requestedBrowserPreference;
};

export const buildPlaywrightNativeTaskMetadata = <
  TAdditional extends Record<string, unknown> = Record<string, unknown>,
>(
  input: {
    session: Pick<
      OpenPlaywrightConnectionNativeTaskSessionResult,
      | 'sessionMetadata'
      | 'effectiveBrowserMode'
      | 'effectiveBrowserPreference'
      | 'requestedBrowserMode'
      | 'requestedBrowserPreference'
    >;
    additional?: TAdditional;
  }
): {
  browserMode: 'headed' | 'headless';
  browserPreference: PlaywrightBrowserPreference;
  browserLabel: string;
  fallbackMessages: string[];
  playwright: PlaywrightConnectionSessionMetadata;
} & Partial<{
  requestedBrowserMode: PlaywrightRelistBrowserMode;
  requestedBrowserPreference: PlaywrightBrowserPreference;
}> &
  TAdditional => {
  const metadata = {
    browserMode: input.session.effectiveBrowserMode,
    ...(input.session.requestedBrowserMode !== null
      ? { requestedBrowserMode: input.session.requestedBrowserMode }
      : {}),
    browserPreference: input.session.effectiveBrowserPreference,
    ...(input.session.requestedBrowserPreference !== null
      ? { requestedBrowserPreference: input.session.requestedBrowserPreference }
      : {}),
    browserLabel: input.session.sessionMetadata.browserLabel,
    fallbackMessages: input.session.sessionMetadata.fallbackMessages,
    playwright: input.session.sessionMetadata,
    ...(input.additional ?? {}),
  };

  return metadata as {
    browserMode: 'headed' | 'headless';
    browserPreference: PlaywrightBrowserPreference;
    browserLabel: string;
    fallbackMessages: string[];
    playwright: PlaywrightConnectionSessionMetadata;
  } & Partial<{
    requestedBrowserMode: PlaywrightRelistBrowserMode;
    requestedBrowserPreference: PlaywrightBrowserPreference;
  }> &
    TAdditional;
};

export const openPlaywrightConnectionPageSession = async (
  input: OpenPlaywrightConnectionPageSessionInput
): Promise<OpenPlaywrightConnectionPageSessionResult> => {
  const resolvedRuntime = await resolvePlaywrightPageSessionRuntime(input);
  const contextEnvironmentOverrides =
    await resolvePlaywrightPageSessionContextOverrides(input);
  const browserPreference = input.browserPreference ?? resolvedRuntime.browserPreference;
  const headless =
    typeof input.headless === 'boolean' ? input.headless : resolvedRuntime.settings.headless;
  const launchSettings = {
    ...resolvedRuntime.settings,
    ...(input.launchSettingsOverrides ?? {}),
  };
  const launchOptionsWithProxyAffinity = applyPlaywrightProxySessionAffinity({
    enabled: launchSettings.proxySessionAffinity,
    mode: launchSettings.proxySessionMode,
    providerPreset: launchSettings.proxyProviderPreset,
    launchOptions: buildPlaywrightConnectionLaunchOptions({
      settings: launchSettings,
      headless,
    }),
    identityProfile: resolvedRuntime.settings.identityProfile,
    connectionId: input.connection.id,
    integrationId: input.connection.integrationId,
    personaId: resolvedRuntime.personaId,
  }).launchOptions;

  const launchResult = await launchPlaywrightBrowser(
    browserPreference,
    buildChromiumAntiDetectionLaunchOptions(launchOptionsWithProxyAffinity)
  );

  const contextOptions = buildChromiumAntiDetectionContextOptions(
    buildPlaywrightConnectionContextOptions({
      runtime: resolvedRuntime,
      viewport: input.viewport,
      environmentOverrides: contextEnvironmentOverrides,
    }),
    resolvedRuntime.settings.identityProfile
  );
  const context = await launchResult.browser.newContext(contextOptions);
  context.setDefaultTimeout(resolvedRuntime.settings.timeout);
  context.setDefaultNavigationTimeout(resolvedRuntime.settings.navigationTimeout);
  await installChromiumAntiDetectionInitScript(context, {
    locale: contextOptions.locale,
    userAgent: contextOptions.userAgent,
  });

  const page = await context.newPage();

  return {
    runtime: resolvedRuntime,
    instance: input.instance ?? null,
    browser: launchResult.browser,
    context,
    page,
    launchLabel: launchResult.label,
    fallbackMessages: launchResult.fallbackMessages,
    close: async () => {
      await context.close().catch(() => undefined);
      await launchResult.browser.close();
    },
  };
};

export const buildPlaywrightConnectionSessionMetadata = (
  session: Pick<
    OpenPlaywrightConnectionPageSessionResult,
    'instance' | 'runtime' | 'launchLabel' | 'fallbackMessages'
  >
): PlaywrightConnectionSessionMetadata => ({
  instance: session.instance ?? null,
  browserLabel: session.launchLabel,
  fallbackMessages: [...session.fallbackMessages],
  resolvedBrowserPreference: session.runtime.browserPreference,
  personaId: session.runtime.personaId ?? null,
  deviceProfileName: session.runtime.deviceProfileName ?? null,
});

export const openPlaywrightConnectionNativeTaskSession = async (
  input: OpenPlaywrightConnectionNativeTaskSessionInput
): Promise<OpenPlaywrightConnectionNativeTaskSessionResult> => {
  const session = await openPlaywrightConnectionPageSession({
    connection: input.connection,
    instance: input.instance,
    runtimeActionKey: input.runtimeActionKey,
    browserPreference: input.requestedBrowserPreference,
    headless: resolveRequestedHeadlessForBrowserMode(input.requestedBrowserMode),
    viewport: input.viewport,
  });
  const sessionMetadata = buildPlaywrightConnectionSessionMetadata(session);
  const requestedBrowserPreference =
    input.requestedBrowserPreference ?? sessionMetadata.resolvedBrowserPreference;

  return {
    ...session,
    sessionMetadata,
    requestedBrowserMode: input.requestedBrowserMode ?? null,
    requestedBrowserPreference: input.requestedBrowserPreference ?? null,
    effectiveBrowserMode: resolvePlaywrightEffectiveBrowserMode({
      requestedBrowserMode: input.requestedBrowserMode,
      defaultHeadless: session.runtime.settings.headless,
    }),
    effectiveBrowserPreference: resolvePlaywrightBrowserPreferenceFromLabel({
      launchLabel: session.launchLabel,
      requestedBrowserPreference,
    }),
  };
};
