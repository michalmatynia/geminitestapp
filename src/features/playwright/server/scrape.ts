import 'server-only';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/playwright-listing-runtime';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';

import {
  startPlaywrightConnectionEngineTask,
  runPlaywrightConnectionEngineTask,
  type PlaywrightConnectionBaseEngineRunRequest,
  type PlaywrightConnectionEngineTaskResult,
  type ResolvedPlaywrightConnectionRuntime,
} from './connection-runtime';
import {
  buildPlaywrightExecutionSettingsSummary,
  type PlaywrightExecutionSettingsSummary,
} from './execution-settings';
import type { PlaywrightEngineRunInstance, PlaywrightEngineRunRecord } from './runtime';
import { readPlaywrightEngineRun } from './runtime';
import { resolvePlaywrightEngineRunOutputs } from './run-result';

const resolveScriptRunStartUrl = (
  input: Record<string, unknown>,
  explicitStartUrl?: string
): string | undefined => {
  if (typeof explicitStartUrl === 'string' && explicitStartUrl.trim().length > 0) {
    return explicitStartUrl.trim();
  }

  const directStartUrl = input['startUrl'];
  return typeof directStartUrl === 'string' && directStartUrl.trim().length > 0
    ? directStartUrl.trim()
    : undefined;
};

export type PlaywrightScrapeResult = {
  runId: string;
  run: PlaywrightEngineRunRecord;
  finalUrl: string | null;
  effectiveBrowserMode: 'headless' | 'headed';
  personaId: string | null;
  executionSettings: PlaywrightExecutionSettingsSummary;
  rawResult: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs?: string[];
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
    throw new Error(`Playwright scrape run ${runId} could not be read after startup.`);
  }

  if (currentRun.status === 'queued' || currentRun.status === 'running') {
    throw new Error(`Playwright scrape run ${runId} did not finish before the timeout window.`);
  }

  return currentRun;
};

export const runPlaywrightScrapeScript = async ({
  script,
  input,
  connection,
  instance,
  contextRegistry,
  timeoutMs = 120_000,
  browserMode = 'connection_default',
  failureHoldOpenMs,
  runtimeSettingsOverrides,
  runtimeActionKey,
  startUrl,
  capture,
  onRunStarted,
}: {
  script: string;
  input: Record<string, unknown>;
  connection: IntegrationConnectionRecord;
  instance?: PlaywrightEngineRunInstance;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  timeoutMs?: number;
  browserMode?: PlaywrightRelistBrowserMode;
  failureHoldOpenMs?: number;
  runtimeSettingsOverrides?: Partial<PlaywrightSettings>;
  runtimeActionKey?: ActionSequenceKey;
  startUrl?: string;
  capture?: PlaywrightConnectionBaseEngineRunRequest['capture'];
  onRunStarted?: ((runId: string) => Promise<void> | void) | undefined;
}): Promise<PlaywrightScrapeResult> => {
  const resolvedStartUrl = resolveScriptRunStartUrl(input, startUrl);
  const sharedTaskInput = {
    connection,
    request: {
      script,
      input,
      timeoutMs,
      preventNewPages: true,
      ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
      browserEngine: 'chromium' as const,
      ...(resolvedStartUrl ? { startUrl: resolvedStartUrl } : {}),
      ...(capture ? { capture } : {}),
      ...(contextRegistry ? { contextRegistry } : {}),
    },
    instance,
    ...(runtimeActionKey ? { runtimeActionKey } : {}),
    resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
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

  const { run, runtime, settings: effectiveSettings, outputs, resultValue, finalUrl } = onRunStarted
    ? await (async (): Promise<
        PlaywrightConnectionEngineTaskResult & {
          outputs: Record<string, unknown>;
          resultValue: unknown;
          finalUrl: string | null;
        }
      > => {
        const startedTask = await startPlaywrightConnectionEngineTask(sharedTaskInput);
        await Promise.resolve(onRunStarted(startedTask.run.runId));
        const run = await waitForPlaywrightRunToFinish({
          runId: startedTask.run.runId,
          initialStatus: startedTask.run.status,
          timeoutMs,
        });
        const { outputs, resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
        return {
          run,
          runtime: startedTask.runtime,
          settings: startedTask.settings,
          browserPreference: startedTask.browserPreference,
          outputs,
          resultValue,
          finalUrl,
        };
      })()
    : await (async (): Promise<
        PlaywrightConnectionEngineTaskResult & {
          outputs: Record<string, unknown>;
          resultValue: unknown;
          finalUrl: string | null;
        }
      > => {
        const result = await runPlaywrightConnectionEngineTask(sharedTaskInput);
        const { outputs, resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(
          result.run.result
        );
        return {
          ...result,
          outputs,
          resultValue,
          finalUrl,
        };
      })();

  return {
    runId: run.runId,
    run,
    finalUrl,
    effectiveBrowserMode: effectiveSettings.headless ? 'headless' : 'headed',
    personaId: runtime.personaId ?? null,
    executionSettings: buildPlaywrightExecutionSettingsSummary(effectiveSettings),
    rawResult: (resultValue ?? {}) as Record<string, unknown>,
    outputs,
    logs: Array.isArray(run.logs) ? run.logs : [],
  };
};
