import 'server-only';

import { enqueuePlaywrightNodeRun } from '@/features/ai/ai-paths/services/playwright-node-runner';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { resolveConnectionPlaywrightSettings } from '../tradera-playwright-settings';

export type PlaywrightListingResult = {
  externalListingId: string | null;
  listingUrl: string | null;
  expiresAt: string | null;
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
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
}): Promise<PlaywrightListingResult> => {
  const settings = await resolveConnectionPlaywrightSettings(connection);
  const personaId = connection.playwrightPersonaId?.trim() || undefined;

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script,
      input,
      timeoutMs,
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
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
    throw new Error(run.error ?? 'Playwright listing script failed.');
  }

  const resultPayload = run.result;
  const outputs = isObjectRecord(resultPayload)
    ? (isObjectRecord(resultPayload['outputs']) ? resultPayload['outputs'] : resultPayload)
    : {};

  const resultValue = isObjectRecord(outputs['result']) ? outputs['result'] : isObjectRecord(outputs) ? outputs : {};

  return {
    externalListingId: extractStringField(resultValue, 'externalListingId'),
    listingUrl: extractStringField(resultValue, 'listingUrl'),
    expiresAt: extractStringField(resultValue, 'expiresAt'),
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

  const run = await enqueuePlaywrightNodeRun({
    request: {
      script,
      input,
      timeoutMs,
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
      ...(personaId ? { personaId } : {}),
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
    throw new Error(run.error ?? 'Playwright import script failed.');
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
