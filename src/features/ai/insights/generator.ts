import 'server-only';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type {
  AiInsightRecord,
  AiInsightSource,
  AiInsightType,
} from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { orchestrateInsightGeneration } from './generator/ai-insight-orchestrator';
import { generateLogInterpretation as generateLogInterpretationImpl } from './generator/log-interpreter';
import {
  parseBooleanSetting,
  parseNumberSetting,
  readInsightSettingValue,
} from './generator/settings-service';
import { isScheduledAiInsightsEnabled } from './scheduling';
import { AI_INSIGHTS_SETTINGS_KEYS } from './settings';

export type InsightScheduleSettings = {
  analyticsEnabled: boolean;
  analyticsMinutes: number;
  runtimeAnalyticsEnabled: boolean;
  runtimeAnalyticsMinutes: number;
  logsEnabled: boolean;
  logsMinutes: number;
  logsAutoOnError: boolean;
};

type InsightGenerationOptions = {
  range?: AiPathRuntimeAnalyticsRange;
  force?: boolean;
  source?: AiInsightSource;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
};

type ScheduledInsightJob = {
  enabledKey: string;
  failureMessage: string;
  run: () => Promise<AiInsightRecord | null>;
};

export async function getScheduleSettings(): Promise<InsightScheduleSettings> {
  const analyticsEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled),
    true
  );
  const analyticsMinutes = parseNumberSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes),
    30,
    5
  );
  const runtimeAnalyticsEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled),
    true
  );
  const runtimeAnalyticsMinutes = parseNumberSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes),
    30,
    5
  );
  const logsEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled),
    true
  );
  const logsMinutes = parseNumberSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes),
    15,
    5
  );
  const logsAutoOnError = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError),
    true
  );

  return {
    analyticsEnabled,
    analyticsMinutes,
    runtimeAnalyticsEnabled,
    runtimeAnalyticsMinutes,
    logsEnabled,
    logsMinutes,
    logsAutoOnError,
  };
}

export async function generateAiInsightByType(
  type: AiInsightType,
  options?: InsightGenerationOptions
): Promise<AiInsightRecord | null> {
  return orchestrateInsightGeneration(type, options);
}

export async function generateAnalyticsInsight(
  options?: Omit<InsightGenerationOptions, 'range'>
): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('analytics', options);
}

export async function generateRuntimeAnalyticsInsight(
  options?: InsightGenerationOptions
): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('runtime_analytics', options);
}

export async function generateLogsInsight(
  options?: Omit<InsightGenerationOptions, 'range'>
): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('logs', options);
}

export async function generateLogInterpretation(options: {
  source?: AiInsightSource;
  log: Record<string, unknown>;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateLogInterpretationImpl(options);
}

const runScheduledInsightJob = async (job: ScheduledInsightJob): Promise<void> => {
  const enabled = parseBooleanSetting(await readInsightSettingValue(job.enabledKey), false);
  if (!enabled) return;

  await job.run().catch((err: unknown) => {
    void logSystemEvent({
      source: 'ai.insights.auto-generation',
      message: job.failureMessage,
      level: 'error',
      error: err,
    });
  });
};

export async function runInsightsAutoGeneration(): Promise<void> {
  if (!isScheduledAiInsightsEnabled()) return;

  await Promise.all([
    runScheduledInsightJob({
      enabledKey: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled,
      failureMessage: 'Failed to auto-generate analytics insight',
      run: () => generateAnalyticsInsight({ source: 'scheduled_job' }),
    }),
    runScheduledInsightJob({
      enabledKey: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled,
      failureMessage: 'Failed to auto-generate logs insight',
      run: () => generateLogsInsight({ source: 'scheduled_job' }),
    }),
    runScheduledInsightJob({
      enabledKey: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled,
      failureMessage: 'Failed to auto-generate runtime analytics insight',
      run: () => generateRuntimeAnalyticsInsight({ source: 'scheduled_job' }),
    }),
  ]);
}
