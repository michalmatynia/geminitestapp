import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  buildAnalyticsInsightContextRegistrySystemPrompt,
  buildRuntimeAnalyticsInsightContextRegistrySystemPrompt,
} from '@/features/ai/insights/context-registry/system-prompt';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { AiInsightSource, AiInsightType } from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import { sanitizeSystemLogForAi } from '@/shared/lib/observability/runtime-context/sanitize-system-log-for-ai';
import { buildSystemLogsContextRegistrySystemPrompt } from '@/shared/lib/observability/runtime-context/server';
import {
  getSystemLogMetrics,
  listSystemLogs,
} from '@/shared/lib/observability/system-log-repository';
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
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '../settings';
import { listAnalyticsEvents, getAnalyticsSummary } from '@/shared/lib/analytics/server';

export type InsightBuilderOptions = {
  source?: AiInsightSource;
  range?: AiPathRuntimeAnalyticsRange;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
};

type InsightPrompt = {
  systemPrompt: string;
  userPrompt: string;
  name: string;
  metadata?: Record<string, unknown>;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

const resolvePromptValue = (value: string | null | undefined, fallback: string): string =>
  isNonEmptyString(value) ? value : fallback;

const joinPromptSections = (sections: Array<string | null | undefined>): string =>
  sections.filter(isNonEmptyString).join('\n\n');

export const buildAnalyticsPrompt = async (
  options?: InsightBuilderOptions
): Promise<InsightPrompt> => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const summary = await getAnalyticsSummary({ from: oneDayAgo, to: now });
  const eventsResult = await listAnalyticsEvents({ from: oneDayAgo, to: now, limit: 50, skip: 0 });
  const events = eventsResult.events;
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem);
  const systemPrompt = joinPromptSections([
    resolvePromptValue(promptValue, DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT),
    buildAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
  ]);
  const userPrompt = `Current Analytics Summary:
${JSON.stringify(summary, null, 2)}

Recent Events (Last 50):
${JSON.stringify(sanitizeEvents(events), null, 2)}

Analyze this data and provide actionable insights.`;
  return { systemPrompt, userPrompt, name: `analytics Insight - ${now.toLocaleDateString()}` };
};

export const buildLogsPrompt = async (options?: InsightBuilderOptions): Promise<InsightPrompt> => {
  const logsResult = await listSystemLogs({ level: 'warn' });
  const logs = logsResult.logs;
  const metrics = await getSystemLogMetrics({ level: 'warn' });
  const sanitizedLogs = await Promise.all(logs.map(sanitizeSystemLogForAi));
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem);
  const systemPrompt = joinPromptSections([
    resolvePromptValue(promptValue, DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT),
    buildSystemLogsContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
  ]);
  const userPrompt = `System Log Metrics (Last 24h):
${JSON.stringify(metrics, null, 2)}

Recent Warning/Error Logs (Last 100):
${JSON.stringify(sanitizedLogs, null, 2)}

Identify any patterns or critical issues.`;
  return { systemPrompt, userPrompt, name: `logs Insight - ${new Date().toLocaleDateString()}` };
};

export const buildRuntimeAnalyticsPrompt = async (
  range: AiPathRuntimeAnalyticsRange,
  options?: InsightBuilderOptions
): Promise<InsightPrompt> => {
  const now = new Date();
  const window = resolveRuntimeAnalyticsRangeWindow(range);
  const summary = await getRuntimeAnalyticsSummary(window);
  const kernelParityAssessment = assessRuntimeKernelParityRisk(summary);
  const kernelParityPrompt = buildRuntimeKernelParityPrompt(summary, kernelParityAssessment);
  const insightMetadata = buildRuntimeKernelParityMetadata(summary, kernelParityAssessment);
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem);
  const systemPrompt = joinPromptSections([
    resolvePromptValue(promptValue, DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT),
    buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
  ]);
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
): Promise<InsightPrompt> {
  const promptValue = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem);
  const systemPrompt = joinPromptSections([
    resolvePromptValue(promptValue, DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT),
    buildSystemLogsContextRegistrySystemPrompt(contextRegistry?.resolved),
  ]);

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
  AiInsightType,
  ((options?: InsightBuilderOptions) => Promise<InsightPrompt>) | undefined
> = {
  anomaly_detection: undefined,
  analytics: buildAnalyticsPrompt,
  content_optimization: undefined,
  logs: buildLogsPrompt,
  product_recommendation: undefined,
  system_logs: buildLogsPrompt,
  system_health: undefined,
  trend_analysis: undefined,
  runtime_analytics: (options?: InsightBuilderOptions) =>
    buildRuntimeAnalyticsPrompt(options?.range ?? '24h', options),
};
