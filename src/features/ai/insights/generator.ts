import 'server-only';

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
import type {
  AiInsightRecord,
  AiInsightSource,
  AiInsightType,
} from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { type AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import { listAnalyticsEvents, getAnalyticsSummary } from '@/shared/lib/analytics/server';
import { buildSystemLogsContextRegistrySystemPrompt } from '@/shared/lib/observability/runtime-context/server';
import { sanitizeSystemLogForAi } from '@/features/observability/entry-server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getSystemLogMetrics, listSystemLogs } from '@/shared/lib/observability/system-log-repository';;

import { callInsightChatModel } from './generator/chat-runtime';
import {
  assessRuntimeKernelParityRisk,
  buildRuntimeKernelParityMetadata,
  buildRuntimeKernelParityPrompt,
} from './generator/runtime-analytics-prompt';
import {
  readInsightSettingValue,
  parseBooleanSetting,
  parseNumberSetting,
} from './generator/settings-service';
import { sanitizeEvents, stripCodeFence } from './generator/utils';
import { appendAiInsight } from './repository';
import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from './settings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const AI_INSIGHTS_MODEL_MAX_RETRIES = Math.max(
  0,
  Number(process.env['AI_INSIGHTS_MODEL_MAX_RETRIES'] ?? 2)
);
const AI_INSIGHTS_MODEL_RETRY_BASE_MS = Math.max(
  100,
  Number(process.env['AI_INSIGHTS_MODEL_RETRY_BASE_MS'] ?? 750)
);

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type InsightScheduleSettings = {
  analyticsEnabled: boolean;
  analyticsMinutes: number;
  runtimeAnalyticsEnabled: boolean;
  runtimeAnalyticsMinutes: number;
  logsEnabled: boolean;
  logsMinutes: number;
  logsAutoOnError: boolean;
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

async function callChatModel(params: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= AI_INSIGHTS_MODEL_MAX_RETRIES; attempt += 1) {
    try {
      return await callInsightChatModel({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        maxTokens: 1000,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      lastError = error;
      if (attempt < AI_INSIGHTS_MODEL_MAX_RETRIES) {
        const delay = AI_INSIGHTS_MODEL_RETRY_BASE_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

export async function generateAiInsightByType(
  type: AiInsightType,
  options?: {
    range?: AiPathRuntimeAnalyticsRange;
    force?: boolean;
    source?: AiInsightSource;
    contextRegistry?: ContextRegistryConsumerEnvelope | null;
  }
): Promise<AiInsightRecord | null> {
  const capabilityMap: Record<AiInsightType, AiBrainCapabilityKey> = {
    analytics: 'insights.analytics',
    runtime_analytics: 'insights.runtime_analytics',
    system_logs: 'insights.system_logs',
    logs: 'insights.system_logs',
    product_recommendation: 'insights.analytics',
    content_optimization: 'insights.analytics',
    anomaly_detection: 'insights.analytics',
    trend_analysis: 'insights.analytics',
    system_health: 'insights.system_logs',
  };

  const capability = capabilityMap[type] || 'insights.analytics';
  const assignment = await getBrainAssignmentForCapability(capability);
  if (!assignment?.enabled) {
    throw new Error(`No enabled AI model assigned for ${capability} capability.`);
  }

  const { modelId } = assignment;
  let systemPrompt = '';
  let userPrompt = '';
  const source: AiInsightSource = options?.source ?? 'manual';
  let insightName = `${type.replace('_', ' ')} Insight - ${new Date().toLocaleDateString()}`;
  let insightMetadata: Record<string, unknown> | undefined;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (type === 'analytics') {
    const summary = await getAnalyticsSummary({ from: oneDayAgo, to: now });
    const eventsResult = await listAnalyticsEvents({
      from: oneDayAgo,
      to: now,
      limit: 50,
      skip: 0,
    });
    const events = eventsResult.events;
    systemPrompt =
      [
        (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem)) ||
          DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
        buildAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
      ]
        .filter(Boolean)
        .join('\n\n');
    userPrompt = `Current Analytics Summary:
${JSON.stringify(summary, null, 2)}

Recent Events (Last 50):
${JSON.stringify(sanitizeEvents(events), null, 2)}

Analyze this data and provide actionable insights.`;
  } else if (type === 'logs' || type === 'system_logs') {
    const logsResult = await listSystemLogs({ level: 'warn' });
    const logs = logsResult.logs;
    const metrics = await getSystemLogMetrics({ level: 'warn' });
    systemPrompt = [
      (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem)) ||
        DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
      buildSystemLogsContextRegistrySystemPrompt(options?.contextRegistry?.resolved),
    ]
      .filter(Boolean)
      .join('\n\n');
    userPrompt = `System Log Metrics (Last 24h):
${JSON.stringify(metrics, null, 2)}

Recent Warning/Error Logs (Last 100):
${JSON.stringify(logs.map(sanitizeSystemLogForAi), null, 2)}

Identify any patterns or critical issues.`;
  } else if (type === 'runtime_analytics') {
    const range = options?.range ?? '24h';
    const window = resolveRuntimeAnalyticsRangeWindow(range);
    const summary = await getRuntimeAnalyticsSummary(window);
    const kernelParityAssessment = assessRuntimeKernelParityRisk(summary);
    const kernelParityPrompt = buildRuntimeKernelParityPrompt(summary, kernelParityAssessment);
    insightName = `${type.replace('_', ' ')} Insight [${kernelParityAssessment.riskLevel.toUpperCase()} risk] - ${now.toLocaleDateString()}`;
    insightMetadata = buildRuntimeKernelParityMetadata(summary, kernelParityAssessment);
    systemPrompt =
      [
        (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem)) ||
          DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
        buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(
          options?.contextRegistry?.resolved
        ),
      ]
        .filter(Boolean)
        .join('\n\n');
    userPrompt = `AI Path Runtime Analytics Summary (${range}):
${JSON.stringify(summary, null, 2)}

Kernel Runtime Parity Snapshot:
${kernelParityPrompt}

Analyze performance and success rates of AI Path executions. Include migration risk commentary using kernel parity distribution and the computed parity risk level. Recommend rollout/rollback actions when parity coverage or v3 share is weak.`;
  }

  const messages: ChatMessage[] = [
    {
      id: `sys_${Date.now()}`,
      sessionId: 'insights_gen',
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      id: `user_${Date.now()}`,
      sessionId: 'insights_gen',
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString(),
    },
  ];

  try {
    const content = await callChatModel({ model: modelId, messages });
    const insight = await appendAiInsight(type, {
      name: insightName,
      source,
      content: { text: stripCodeFence(content) },
      status: 'new',
      score: 0,
      metadata: insightMetadata,
    });

    if (type === 'runtime_analytics') {
      await recordBrainInsightAnalytics({
        type: 'analytics',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });
    }

    return insight;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (type === 'runtime_analytics') {
      await recordBrainInsightAnalytics({
        type: 'analytics',
        status: 'failed',
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}

export async function generateAnalyticsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('analytics', options);
}

export async function generateRuntimeAnalyticsInsight(options?: {
  source?: AiInsightSource;
  range?: AiPathRuntimeAnalyticsRange;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('runtime_analytics', options);
}

export async function generateLogsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('logs', options);
}

export async function generateLogInterpretation(options: {
  source?: AiInsightSource;
  log: Record<string, unknown>;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  const capability: AiBrainCapabilityKey = 'insights.system_logs';
  const assignment = await getBrainAssignmentForCapability(capability);
  if (!assignment?.enabled) {
    throw new Error(`No enabled AI model assigned for ${capability} capability.`);
  }

  const { modelId } = assignment;
  const source: AiInsightSource = options.source ?? 'manual';
  const systemPrompt = [
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem)) ||
      DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
    buildSystemLogsContextRegistrySystemPrompt(options.contextRegistry?.resolved),
  ]
    .filter(Boolean)
    .join('\n\n');
  const userPrompt = `Interpret this specific system log entry and provide:
1) likely root cause,
2) impact/risk,
3) immediate remediation steps.

System log entry:
${JSON.stringify(options.log, null, 2)}`;

  const messages: ChatMessage[] = [
    {
      id: `sys_${Date.now()}`,
      sessionId: 'log_interpret',
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      id: `user_${Date.now()}`,
      sessionId: 'log_interpret',
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const content = await callChatModel({ model: modelId, messages });
  return appendAiInsight('logs', {
    name: `Log Interpretation - ${new Date().toLocaleDateString()}`,
    source,
    content: { text: stripCodeFence(content) },
    status: 'new',
    score: 0,
  });
}

export async function runInsightsAutoGeneration(): Promise<void> {
  const analyticsEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled),
    false
  );
  if (analyticsEnabled) {
    await generateAnalyticsInsight({ source: 'scheduled_job' }).catch((err) => {
      void logSystemEvent({
        source: 'ai.insights.auto-generation',
        message: 'Failed to auto-generate analytics insight',
        level: 'error',
        error: err,
      });
    });
  }

  const logsEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled),
    false
  );
  if (logsEnabled) {
    await generateLogsInsight({ source: 'scheduled_job' }).catch((err) => {
      void logSystemEvent({
        source: 'ai.insights.auto-generation',
        message: 'Failed to auto-generate logs insight',
        level: 'error',
        error: err,
      });
    });
  }

  const runtimeEnabled = parseBooleanSetting(
    await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled),
    false
  );
  if (runtimeEnabled) {
    await generateRuntimeAnalyticsInsight({ source: 'scheduled_job' }).catch((err) => {
      void logSystemEvent({
        source: 'ai.insights.auto-generation',
        message: 'Failed to auto-generate runtime analytics insight',
        level: 'error',
        error: err,
      });
    });
  }
}
