import 'server-only';

import { existsSync } from 'fs';

import { enqueuePlaywrightNodeRun } from '@/features/ai/server';
import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import { internalError } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '../tradera-playwright-settings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { PlaywrightBrowserPreference } from '@/shared/lib/playwright/browser-launch';

export type PlaywrightExecutionSettingsSummary = Pick<
  PlaywrightSettings,
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
  | 'emulateDevice'
  | 'deviceName'
> & {
  proxyEnabled: boolean;
};

export type PlaywrightListingResult = {
  runId: string;
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: string | null;
  publishVerified: boolean | null;
  effectiveBrowserMode: 'headless' | 'headed';
  personaId: string | null;
  executionSettings: PlaywrightExecutionSettingsSummary;
  rawResult: Record<string, unknown>;
  logs?: string[];
};

export type PlaywrightImportResult = {
  products: Array<Record<string, unknown>>;
  rawResult: Record<string, unknown>;
};

const BRAVE_PATHS: Record<string, string> = {
  darwin: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  win32: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  linux: '/usr/bin/brave-browser',
};

const extractStringField = (obj: Record<string, unknown>, key: string): string | null => {
  const value = obj[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const extractBooleanField = (obj: Record<string, unknown>, key: string): boolean | null => {
  const value = obj[key];
  return typeof value === 'boolean' ? value : null;
};

const extractTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const getBraveExecutablePath = (): string | null => {
  const bravePath = BRAVE_PATHS[process.platform];
  return bravePath && existsSync(bravePath) ? bravePath : null;
};

const resolveBrowserLaunchOptions = (
  browserPreference: PlaywrightBrowserPreference
): Record<string, unknown> => {
  switch (browserPreference) {
    case 'brave': {
      const braveExecutablePath = getBraveExecutablePath();
      if (!braveExecutablePath) {
        throw internalError(
          `Brave browser not found at expected path (${BRAVE_PATHS[process.platform] ?? 'unsupported platform'}). Install Brave or switch the connection browser setting to Chrome or Auto.`
        );
      }
      return {
        executablePath: braveExecutablePath,
      };
    }
    case 'chrome':
      return {
        channel: 'chrome',
      };
    case 'auto': {
      const braveExecutablePath = getBraveExecutablePath();
      return braveExecutablePath
        ? {
            executablePath: braveExecutablePath,
          }
        : {
            channel: 'chrome',
          };
    }
    case 'chromium':
    default:
      return {};
  }
};

const resolveListingRunStartUrl = (input: Record<string, unknown>): string | undefined => {
  const directStartUrl = extractTrimmedString(input['startUrl']);
  if (directStartUrl) {
    return directStartUrl;
  }

  const traderaConfig = input['traderaConfig'];
  if (isObjectRecord(traderaConfig)) {
    const listingFormUrl = extractTrimmedString(traderaConfig['listingFormUrl']);
    if (listingFormUrl) {
      return normalizeTraderaListingFormUrl(listingFormUrl);
    }
  }

  return undefined;
};

const resolveRunnerOutputs = (
  resultPayload: unknown
): {
  outputs: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
} => {
  const payloadRecord = isObjectRecord(resultPayload) ? resultPayload : {};
  const outputs = isObjectRecord(payloadRecord['outputs']) ? payloadRecord['outputs'] : payloadRecord;
  const resultValue = isObjectRecord(outputs['result'])
    ? outputs['result']
    : isObjectRecord(outputs)
      ? outputs
      : {};

  return {
    outputs,
    resultValue,
    finalUrl: extractStringField(payloadRecord, 'finalUrl'),
  };
};

const buildExecutionSettingsSummary = (
  settings: PlaywrightSettings
): PlaywrightExecutionSettingsSummary => ({
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
  emulateDevice: settings.emulateDevice,
  deviceName: settings.deviceName,
});

/**
 * Executes a Playwright listing script against the product data and returns
 * a parsed result. The script must emit('result', { listingUrl, externalListingId, expiresAt? }).
 */
export const runPlaywrightListingScript = async ({
  script,
  input,
  connection,
  contextRegistry,
  timeoutMs = 120_000,
  browserMode = 'connection_default',
  disableStartUrlBootstrap = false,
  failureHoldOpenMs,
  runtimeSettingsOverrides,
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
  browserMode?: PlaywrightRelistBrowserMode;
  disableStartUrlBootstrap?: boolean;
  failureHoldOpenMs?: number;
  runtimeSettingsOverrides?: Partial<PlaywrightSettings>;
}): Promise<PlaywrightListingResult> => {
  const settings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const runtimeSettings = {
    ...settings,
    ...(runtimeSettingsOverrides ?? {}),
  };
  const effectiveHeadless =
    browserMode === 'headless' ? true : browserMode === 'headed' ? false : runtimeSettings.headless;
  const effectiveSettings: PlaywrightSettings = {
    ...runtimeSettings,
    headless: effectiveHeadless,
  };
  const startUrl = disableStartUrlBootstrap ? undefined : resolveListingRunStartUrl(input);
  const launchOptions = resolveBrowserLaunchOptions(runtimeSettings.browser);

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
      browserEngine: 'chromium',
      ...(startUrl ? { startUrl } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
      ...(storageState ? { contextOptions: { storageState } } : {}),
      ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
      settingsOverrides: {
        headless: effectiveSettings.headless,
        slowMo: effectiveSettings.slowMo,
        timeout: effectiveSettings.timeout,
        navigationTimeout: effectiveSettings.navigationTimeout,
        humanizeMouse: effectiveSettings.humanizeMouse,
        mouseJitter: effectiveSettings.mouseJitter,
        clickDelayMin: effectiveSettings.clickDelayMin,
        clickDelayMax: effectiveSettings.clickDelayMax,
        inputDelayMin: effectiveSettings.inputDelayMin,
        inputDelayMax: effectiveSettings.inputDelayMax,
        actionDelayMin: effectiveSettings.actionDelayMin,
        actionDelayMax: effectiveSettings.actionDelayMax,
        proxyEnabled: effectiveSettings.proxyEnabled,
        proxyServer: effectiveSettings.proxyServer,
        proxyUsername: effectiveSettings.proxyUsername,
        proxyPassword: effectiveSettings.proxyPassword,
        emulateDevice: effectiveSettings.emulateDevice,
        deviceName: effectiveSettings.deviceName,
      },
    },
    waitForResult: true,
  });

  if (run.status === 'failed') {
    const { resultValue, finalUrl } = resolveRunnerOutputs(run.result);
    throw internalError(run.error ?? 'Playwright listing script failed.', {
      runId: run.runId,
      runStatus: run.status,
      rawResult: Object.keys(resultValue).length > 0 ? resultValue : null,
      latestStage: extractStringField(resultValue, 'stage'),
      latestStageUrl: extractStringField(resultValue, 'currentUrl') ?? finalUrl,
      logs: Array.isArray(run.logs) ? run.logs : [],
      failureArtifacts: (Array.isArray(run.artifacts) ? run.artifacts : []).map((artifact) => ({
        name: artifact.name,
        path: artifact.path,
        kind: artifact.kind ?? null,
        mimeType: artifact.mimeType ?? null,
      })),
      logTail: (Array.isArray(run.logs) ? run.logs : []).slice(-12),
    });
  }

  const { resultValue } = resolveRunnerOutputs(run.result);

  return {
    runId: run.runId,
    externalListingId: extractStringField(resultValue, 'externalListingId'),
    listingUrl: extractStringField(resultValue, 'listingUrl'),
    expiresAt: extractStringField(resultValue, 'expiresAt'),
    publishVerified: extractBooleanField(resultValue, 'publishVerified'),
    effectiveBrowserMode: effectiveHeadless ? 'headless' : 'headed',
    personaId: personaId ?? null,
    executionSettings: buildExecutionSettingsSummary(effectiveSettings),
    rawResult: resultValue,
    logs: Array.isArray(run.logs) ? run.logs : [],
  };
};

/**
 * Executes a Playwright import script and returns an array of raw product objects.
 * The script must emit('result', products[]) where products is an array of objects.
 */
export const runPlaywrightImportScript = async ({
  script,
  input,
  connection,
  contextRegistry,
  timeoutMs = 240_000,
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
}): Promise<PlaywrightImportResult> => {
  const settings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
      ...(storageState ? { contextOptions: { storageState } } : {}),
      settingsOverrides: {
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
      },
    },
    waitForResult: true,
  });

  if (run.status === 'failed') {
    throw internalError(run.error ?? 'Playwright import script failed.', {
      runId: run.runId,
      runStatus: run.status,
    });
  }

  const resultPayload = run.result;
  const outputs = isObjectRecord(resultPayload)
    ? (isObjectRecord(resultPayload['outputs']) ? resultPayload['outputs'] : resultPayload)
    : {};

  const resultValue = outputs['result'] ?? outputs;
  const products = Array.isArray(resultValue)
    ? resultValue.filter((item): item is Record<string, unknown> => isObjectRecord(item))
    : [];

  return {
    products,
    rawResult: isObjectRecord(outputs) ? outputs : {},
  };
};
