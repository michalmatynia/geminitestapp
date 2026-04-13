import 'server-only';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import { internalError } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  createProgrammableImportPlaywrightInstance,
  createProgrammableListingPlaywrightInstance,
} from './instances';
import {
  buildPlaywrightExecutionSettingsSummary,
  type PlaywrightExecutionSettingsSummary,
} from './execution-settings';
import {
  runPlaywrightConnectionEngineTask,
  startPlaywrightConnectionEngineTask,
  type PlaywrightConnectionEngineTaskResult,
} from './connection-runtime';
import { runPlaywrightImportTask } from './import-task';
import { runPlaywrightListingTask } from './listing-task';
import {
  buildPlaywrightEngineRunFailureMeta,
  resolvePlaywrightEngineRunOutputs,
} from './run-result';
import type { PlaywrightEngineRunInstance } from './runtime';
import { readPlaywrightEngineRun } from './runtime';
import { runPlaywrightConnectionScriptTask } from './script-task';

const TRADERA_DIRECT_LISTING_FORM_URL = 'https://www.tradera.com/en/selling/new';
const TRADERA_ALLOWED_HOSTS = new Set(['www.tradera.com', 'tradera.com']);
const TRADERA_NEW_LISTING_PATH_PATTERN =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?selling\/new\/?$/i;
const TRADERA_LEGACY_LISTING_PATH_PATTERN =
  /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?selling\/?$/i;

const normalizeTraderaListingFormUrl = (value: string | null | undefined): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return TRADERA_DIRECT_LISTING_FORM_URL;
  }

  try {
    const parsed = new URL(trimmed, TRADERA_DIRECT_LISTING_FORM_URL);
    const isAllowedHost = TRADERA_ALLOWED_HOSTS.has(parsed.host.toLowerCase());
    const isAllowedPath =
      TRADERA_NEW_LISTING_PATH_PATTERN.test(parsed.pathname) ||
      (TRADERA_LEGACY_LISTING_PATH_PATTERN.test(parsed.pathname) &&
        parsed.searchParams.has('redirectToNewIfNoDrafts'));
    if (!isAllowedHost || !isAllowedPath) {
      return TRADERA_DIRECT_LISTING_FORM_URL;
    }
  } catch {
    return TRADERA_DIRECT_LISTING_FORM_URL;
  }

  return TRADERA_DIRECT_LISTING_FORM_URL;
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

const ensureProgrammablePlaywrightListingScript = (
  connection: IntegrationConnectionRecord
): string => {
  const script = connection.playwrightListingScript?.trim();
  if (!script) {
    throw new Error('This connection does not have a Playwright listing script configured.');
  }
  return script;
};

const ensureProgrammablePlaywrightImportScript = (
  connection: IntegrationConnectionRecord
): string => {
  const script = connection.playwrightImportScript?.trim();
  if (!script) {
    throw new Error('This connection does not have a Playwright import script configured.');
  }
  return script;
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

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const waitForPlaywrightRunToFinish = async ({
  runId,
  initialStatus,
  timeoutMs,
}: {
  runId: string;
  initialStatus: string;
  timeoutMs: number;
}) => {
  const deadline = Date.now() + Math.max(timeoutMs, 60_000) + 30_000;
  let status = initialStatus;
  let currentRun = await readPlaywrightEngineRun(runId);

  while ((status === 'queued' || status === 'running') && Date.now() < deadline) {
    await sleep(1_000);
    const nextRun = await readPlaywrightEngineRun(runId);
    if (nextRun) {
      currentRun = nextRun;
      status = nextRun.status;
    }
  }

  if (!currentRun) {
    throw internalError(`Playwright listing run ${runId} could not be read after startup.`, {
      runId,
      runStatus: status,
    });
  }

  if (currentRun.status === 'queued' || currentRun.status === 'running') {
    throw internalError(`Playwright listing run ${runId} did not finish before the timeout window.`, {
      runId,
      runStatus: currentRun.status,
    });
  }

  return currentRun;
};

export const runPlaywrightListingScript = async ({
  script,
  input,
  connection,
  instance,
  contextRegistry,
  timeoutMs = 120_000,
  browserMode = 'connection_default',
  disableStartUrlBootstrap = false,
  failureHoldOpenMs,
  runtimeSettingsOverrides,
  onRunStarted,
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  instance?: PlaywrightEngineRunInstance;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
  browserMode?: PlaywrightRelistBrowserMode;
  disableStartUrlBootstrap?: boolean;
  failureHoldOpenMs?: number;
  runtimeSettingsOverrides?: Partial<PlaywrightSettings>;
  onRunStarted?: ((runId: string) => Promise<void> | void) | undefined;
}): Promise<PlaywrightListingResult> => {
  const startUrl = disableStartUrlBootstrap ? undefined : resolveListingRunStartUrl(input);
  const listingId = extractTrimmedString(input['listingId']);
  const sharedTaskInput = {
    connection,
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
      browserEngine: 'chromium' as const,
      ...(startUrl ? { startUrl } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
    },
    instance:
      instance ??
      createProgrammableListingPlaywrightInstance({
        connectionId: connection.id,
        integrationId: connection.integrationId,
        listingId,
      }),
    resolveEngineRequestConfig: (runtime) => {
      const runtimeSettings = {
        ...runtime.settings,
        ...(runtimeSettingsOverrides ?? {}),
      };
      const effectiveHeadless =
        browserMode === 'headless'
          ? true
          : browserMode === 'headed'
            ? false
            : runtimeSettings.headless;

      return {
        settings: {
          ...runtimeSettings,
          headless: effectiveHeadless,
        },
        browserPreference: runtimeSettings.browser,
      };
    },
  };
  const { run, runtime, settings: effectiveSettings, resultValue } = onRunStarted
    ? await (async (): Promise<PlaywrightConnectionEngineTaskResult & { resultValue: unknown }> => {
        const startedTask = await startPlaywrightConnectionEngineTask(sharedTaskInput);
        await Promise.resolve(onRunStarted(startedTask.run.runId));
        const run = await waitForPlaywrightRunToFinish({
          runId: startedTask.run.runId,
          initialStatus: startedTask.run.status,
          timeoutMs,
        });
        const { resultValue } = resolvePlaywrightEngineRunOutputs(run.result);
        return {
          run,
          runtime: startedTask.runtime,
          settings: startedTask.settings,
          browserPreference: startedTask.browserPreference,
          resultValue,
        };
      })()
    : await (async (): Promise<PlaywrightConnectionEngineTaskResult & { resultValue: unknown }> => {
        const result = await runPlaywrightConnectionEngineTask(sharedTaskInput);
        const { resultValue } = resolvePlaywrightEngineRunOutputs(result.run.result);
        return {
          ...result,
          resultValue,
        };
      })();

  if (run.status === 'failed') {
    throw internalError(run.error ?? 'Playwright listing script failed.', {
      ...buildPlaywrightEngineRunFailureMeta(run, {
        includeRawResult: true,
      }),
      logs: Array.isArray(run.logs) ? run.logs : [],
    });
  }

  return {
    runId: run.runId,
    externalListingId: extractStringField(resultValue, 'externalListingId'),
    listingUrl: extractStringField(resultValue, 'listingUrl'),
    expiresAt: extractStringField(resultValue, 'expiresAt'),
    publishVerified: extractBooleanField(resultValue, 'publishVerified'),
    effectiveBrowserMode: effectiveSettings.headless ? 'headless' : 'headed',
    personaId: runtime.personaId ?? null,
    executionSettings: buildPlaywrightExecutionSettingsSummary(effectiveSettings),
    rawResult: resultValue,
    logs: Array.isArray(run.logs) ? run.logs : [],
  };
};

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
  const { run, outputs } = await runPlaywrightConnectionScriptTask({
    connection,
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      browserEngine: 'chromium',
      ...(contextRegistry ? { contextRegistry } : {}),
    },
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

  const resultValue = outputs['result'] ?? outputs;
  const products = Array.isArray(resultValue)
    ? resultValue.filter((item): item is Record<string, unknown> => isObjectRecord(item))
    : [];

  return {
    products,
    rawResult: isObjectRecord(outputs) ? outputs : {},
  };
};

export const runPlaywrightProgrammableListingForConnection = async ({
  connection,
  input,
  browserMode = 'connection_default',
}: {
  connection: IntegrationConnectionRecord;
  input: Record<string, unknown>;
  browserMode?: PlaywrightRelistBrowserMode;
}): Promise<PlaywrightListingResult> => {
  const script = ensureProgrammablePlaywrightListingScript(connection);

  return runPlaywrightListingTask({
    execute: async () =>
      runPlaywrightListingScript({
        script,
        input,
        connection,
        browserMode,
      }),
    mapResult: async (result) => result,
  });
};

export const runPlaywrightProgrammableImportForConnection = async ({
  connection,
  input,
}: {
  connection: IntegrationConnectionRecord;
  input: Record<string, unknown>;
}): Promise<PlaywrightImportResult> => {
  const script = ensureProgrammablePlaywrightImportScript(connection);

  return runPlaywrightImportTask({
    execute: async () =>
      runPlaywrightImportScript({
        script,
        input,
        connection,
      }),
    mapResult: async (result) => result,
  });
};
