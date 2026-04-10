import 'server-only';

import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import { internalError } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  buildPlaywrightEngineRunFailureMeta,
  createProgrammableImportPlaywrightInstance,
  createProgrammableListingPlaywrightInstance,
  enqueuePlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
} from '@/features/playwright/server';
import {
  buildPlaywrightConnectionEngineLaunchOptions,
  buildPlaywrightConnectionSettingsOverrides,
  resolvePlaywrightConnectionRuntime,
} from '@/features/playwright/server/connection-runtime';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';

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
  const runtime = await resolvePlaywrightConnectionRuntime(connection);
  const runtimeSettings = {
    ...runtime.settings,
    ...(runtimeSettingsOverrides ?? {}),
  };
  const effectiveHeadless =
    browserMode === 'headless' ? true : browserMode === 'headed' ? false : runtimeSettings.headless;
  const effectiveSettings = {
    ...runtimeSettings,
    headless: effectiveHeadless,
  };
  const startUrl = disableStartUrlBootstrap ? undefined : resolveListingRunStartUrl(input);
  const launchOptions = buildPlaywrightConnectionEngineLaunchOptions({
    browserPreference: effectiveSettings.browser,
  });
  const listingId = extractTrimmedString(input['listingId']);

  const run = await enqueuePlaywrightEngineRun({
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
      browserEngine: 'chromium',
      ...(startUrl ? { startUrl } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(runtime.personaId ? { personaId: runtime.personaId } : {}),
      ...(runtime.storageState ? { contextOptions: { storageState: runtime.storageState } } : {}),
      ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
      settingsOverrides: buildPlaywrightConnectionSettingsOverrides(effectiveSettings),
    },
    waitForResult: true,
    instance: createProgrammableListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId,
    }),
  });

  if (run.status === 'failed') {
    throw internalError(run.error ?? 'Playwright listing script failed.', {
      ...buildPlaywrightEngineRunFailureMeta(run, {
        includeRawResult: true,
      }),
      logs: Array.isArray(run.logs) ? run.logs : [],
    });
  }

  const { resultValue } = resolvePlaywrightEngineRunOutputs(run.result);

  return {
    runId: run.runId,
    externalListingId: extractStringField(resultValue, 'externalListingId'),
    listingUrl: extractStringField(resultValue, 'listingUrl'),
    expiresAt: extractStringField(resultValue, 'expiresAt'),
    publishVerified: extractBooleanField(resultValue, 'publishVerified'),
    effectiveBrowserMode: effectiveHeadless ? 'headless' : 'headed',
    personaId: runtime.personaId ?? null,
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
  const runtime = await resolvePlaywrightConnectionRuntime(connection);

  const run = await enqueuePlaywrightEngineRun({
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(runtime.personaId ? { personaId: runtime.personaId } : {}),
      ...(runtime.storageState ? { contextOptions: { storageState: runtime.storageState } } : {}),
      settingsOverrides: buildPlaywrightConnectionSettingsOverrides(runtime.settings),
    },
    waitForResult: true,
    instance: createProgrammableImportPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
    }),
  });

  if (run.status === 'failed') {
    throw internalError(run.error ?? 'Playwright import script failed.', {
      runId: run.runId,
      runStatus: run.status,
    });
  }

  const resultPayload = run.result;
  const { outputs } = resolvePlaywrightEngineRunOutputs(resultPayload);

  const resultValue = outputs['result'] ?? outputs;
  const products = Array.isArray(resultValue)
    ? resultValue.filter((item): item is Record<string, unknown> => isObjectRecord(item))
    : [];

  return {
    products,
    rawResult: isObjectRecord(outputs) ? outputs : {},
  };
};
