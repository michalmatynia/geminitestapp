import 'server-only';

import { enqueuePlaywrightNodeRun } from '@/features/ai/server';
import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type {
  IntegrationConnectionRecord,
  PlaywrightRelistBrowserMode,
} from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '../tradera-playwright-settings';

export type PlaywrightListingResult = {
  runId: string;
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: string | null;
  publishVerified: boolean | null;
  effectiveBrowserMode: 'headless' | 'headed';
  rawResult: Record<string, unknown>;
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
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
  browserMode?: PlaywrightRelistBrowserMode;
}): Promise<PlaywrightListingResult> => {
  const settings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const effectiveHeadless =
    browserMode === 'headless' ? true : browserMode === 'headed' ? false : settings.headless;
  const startUrl = resolveListingRunStartUrl(input);

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script,
      input,
      timeoutMs,
      browserEngine: 'chromium',
      ...(startUrl ? { startUrl } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
      ...(storageState ? { contextOptions: { storageState } } : {}),
      settingsOverrides: {
        headless: effectiveHeadless,
        slowMo: settings.slowMo,
        timeout: settings.timeout,
        navigationTimeout: settings.navigationTimeout,
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
    throw internalError(run.error ?? 'Playwright listing script failed.', {
      runId: run.runId,
      runStatus: run.status,
    });
  }

  const resultPayload = run.result;
  const outputs = isObjectRecord(resultPayload)
    ? (isObjectRecord(resultPayload['outputs']) ? resultPayload['outputs'] : resultPayload)
    : {};

  const resultValue = isObjectRecord(outputs['result']) ? outputs['result'] : isObjectRecord(outputs) ? outputs : {};

  return {
    runId: run.runId,
    externalListingId: extractStringField(resultValue, 'externalListingId'),
    listingUrl: extractStringField(resultValue, 'listingUrl'),
    expiresAt: extractStringField(resultValue, 'expiresAt'),
    publishVerified: extractBooleanField(resultValue, 'publishVerified'),
    effectiveBrowserMode: effectiveHeadless ? 'headless' : 'headed',
    rawResult: resultValue,
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
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
      ...(storageState ? { contextOptions: { storageState } } : {}),
      settingsOverrides: {
        headless: settings.headless,
        slowMo: settings.slowMo,
        timeout: settings.timeout,
        navigationTimeout: settings.navigationTimeout,
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
