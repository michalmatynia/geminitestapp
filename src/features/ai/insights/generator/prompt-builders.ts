import {
  getRuntimeAnalyticsSummary,
  recordBrainInsightAnalytics,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  buildAnalyticsInsightContextRegistrySystemPrompt,
  buildRuntimeAnalyticsInsightContextRegistrySystemPrompt,
} from '@/features/ai/insights/context-registry/system-prompt';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import {
  AiInsightRecord,
  AiInsightSource,
  AiInsightType,
} from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import {
  assessRuntimeKernelParityRisk,
  buildRuntimeKernelParityMetadata,
  buildRuntimeKernelParityPrompt,
} from './runtime-analytics-prompt';
import { sanitizeEvents } from './utils';
import {
  readInsightSettingValue,
} from './settings-service';
import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '../settings';
import { listAnalyticsEvents, getAnalyticsSummary } from '@/shared/lib/analytics/server';

export const buildAnalyticsPrompt = async (options?: { contextRegistry?: ContextRegistryConsumerEnvelope | null }): Promise<{ systemPrompt: string; userPrompt: string; name: string }> => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const summary = await getAnalyticsSummary({ from: oneDayAgo, to: now });
  const eventsResult = await listAnalyticsEvents({ from: oneDayAgo, to: now, limit: 50, skip: 0 });
  const events = eventsResult.events;
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem);
  const systemPrompt = [
    promptValue ?? DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
    buildAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
  ].filter((p): p is string => Boolean(p)).join('\n\n');
  const userPrompt = `Current Analytics Summary:
${JSON.stringify(summary, null, 2)}

Recent Events (Last 50):
${JSON.stringify(sanitizeEvents(events), null, 2)}

Analyze this data and provide actionable insights.`;
  return { systemPrompt, userPrompt, name: `analytics Insight - ${now.toLocaleDateString()}` };
};

export const buildRuntimeAnalyticsPrompt = async (range: AiPathRuntimeAnalyticsRange, options?: { contextRegistry?: ContextRegistryConsumerEnvelope | null }): Promise<{ systemPrompt: string; userPrompt: string; name: string; metadata: Record<string, unknown> }> => {
  const now = new Date();
  const window = resolveRuntimeAnalyticsRangeWindow(range);
  const summary = await getRuntimeAnalyticsSummary(window);
  const kernelParityAssessment = assessRuntimeKernelParityRisk(summary);
  const kernelParityPrompt = buildRuntimeKernelParityPrompt(summary, kernelParityAssessment);
  const insightMetadata = buildRuntimeKernelParityMetadata(summary, kernelParityAssessment);
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem);
  const systemPrompt = [
    promptValue ?? DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
    buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
  ].filter((p): p is string => Boolean(p)).join('\n\n');
  const userPrompt = `AI Path Runtime Analytics Summary (${range}):
${JSON.stringify(summary, null, 2)}

Kernel Runtime Parity Snapshot:
${kernelParityPrompt}

Analyze performance and success rates of AI Path executions. Include migration risk commentary using kernel parity distribution and the computed parity risk level. Recommend rollout/rollback actions when parity coverage or v3 share is weak.`;
  return {
    systemPrompt,
    userPrompt,
    name: `runtime_analytics Insight [${kernelParityAssessment.riskLevel.toUpperCase()} risk] - ${now.toLocaleDateString()}`,
    metadata: insightMetadata,
  };
};

export async function buildLogInterpretationPrompt(
  log: Record<string, unknown>,
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): Promise<{ systemPrompt: string; userPrompt: string; name: string }> {
  const systemPrompt = [
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem)) ||
      DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
    buildSystemLogsContextRegistrySystemPrompt(contextRegistry?.resolved),
  ]
    .filter((p): p is string => p !== undefined && p !== null && p !== '')
    .join('\n\n');

  const userPrompt = `Interpret this specific system log entry and provide:
1) likely root cause,
2) impact/risk,
3) immediate remediation steps.

System log entry:
${JSON.stringify(log, null, 2)}`;

  return {
    systemPrompt,
    userPrompt,
    name: `Log Interpretation - ${new Date().toLocaleDateString()}`,
  };
}

export const INSIGHT_BUILDERS: Record<
  string,
  (options?: InsightBuilderOptions) => Promise<{
    systemPrompt: string;
    userPrompt: string;
    name: string;
    metadata?: Record<string, unknown>;
  }>
> = {
  analytics: buildAnalyticsPrompt,
  logs: buildLogsPrompt,
  system_logs: buildLogsPrompt,
  runtime_analytics: (options?: InsightBuilderOptions) =>
    buildRuntimeAnalyticsPrompt(options?.range ?? '24h', options),
};
