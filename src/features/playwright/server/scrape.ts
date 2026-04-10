import 'server-only';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';

import type { PlaywrightConnectionBaseEngineRunRequest } from './connection-runtime';
import {
  buildPlaywrightExecutionSettingsSummary,
  type PlaywrightExecutionSettingsSummary,
} from './execution-settings';
import type { PlaywrightEngineRunInstance, PlaywrightEngineRunRecord } from './runtime';
import { runPlaywrightConnectionScriptTask } from './script-task';

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
  startUrl,
  capture,
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
  startUrl?: string;
  capture?: PlaywrightConnectionBaseEngineRunRequest['capture'];
}): Promise<PlaywrightScrapeResult> => {
  const resolvedStartUrl = resolveScriptRunStartUrl(input, startUrl);

  const { run, runtime, settings: effectiveSettings, outputs, resultValue, finalUrl } =
    await runPlaywrightConnectionScriptTask({
      connection,
      request: {
        script,
        input,
        timeoutMs,
        preventNewPages: true,
        ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
        browserEngine: 'chromium',
        ...(resolvedStartUrl ? { startUrl: resolvedStartUrl } : {}),
        ...(capture ? { capture } : {}),
        ...(contextRegistry ? { contextRegistry } : {}),
      },
      instance,
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
    });

  return {
    runId: run.runId,
    run,
    finalUrl,
    effectiveBrowserMode: effectiveSettings.headless ? 'headless' : 'headed',
    personaId: runtime.personaId ?? null,
    executionSettings: buildPlaywrightExecutionSettingsSummary(effectiveSettings),
    rawResult: resultValue,
    outputs,
    logs: Array.isArray(run.logs) ? run.logs : [],
  };
};
