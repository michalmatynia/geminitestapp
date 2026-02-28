import 'server-only';

import OpenAI from 'openai';

import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import {
  getRuntimeAnalyticsSummary,
  recordBrainInsightAnalytics,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { listAnalyticsEvents, getAnalyticsSummary } from '@/shared/lib/analytics/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { listSystemLogs, getSystemLogMetrics } from '@/shared/lib/observability/system-logger';
import type {
  AiInsightRecordDto as AiInsightRecord,
  AiInsightSourceDto as AiInsightSource,
  AiInsightStatusDto as AiInsightStatus,
  AiInsightTypeDto as AiInsightType,
} from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRangeDto as AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import type { AnalyticsEventDto, AnalyticsSummaryDto } from '@/shared/contracts/analytics';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { appendAiInsight, appendAiInsightNotification, setAiInsightsMeta } from './repository';
import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from './settings';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const AI_INSIGHTS_MODEL_MAX_RETRIES = Math.max(
  0,
  Number(process.env['AI_INSIGHTS_MODEL_MAX_RETRIES'] ?? 2)
);
const AI_INSIGHTS_MODEL_RETRY_BASE_MS = Math.max(
  100,
  Number(process.env['AI_INSIGHTS_MODEL_RETRY_BASE_MS'] ?? 750)
);

type SettingDoc = { key?: string; value?: string; _id?: string };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDoc>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readInsightSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider().catch(() => null);

  if (provider === 'mongodb') {
    try {
      const mongoValue = await readMongoSettingValue(key);
      if (mongoValue !== null) return mongoValue;
    } catch {
      // Continue with fallback when provider read fails.
    }
    try {
      return await readPrismaSettingValue(key);
    } catch {
      return null;
    }
  }

  if (provider === 'prisma') {
    try {
      const prismaValue = await readPrismaSettingValue(key);
      if (prismaValue !== null) return prismaValue;
    } catch {
      // Continue with fallback when provider read fails.
    }
    try {
      return await readMongoSettingValue(key);
    } catch {
      return null;
    }
  }

  try {
    const prismaValue = await readPrismaSettingValue(key);
    if (prismaValue !== null) return prismaValue;
  } catch {
    // Fall back to defaults when settings storage is temporarily unavailable.
  }

  try {
    return await readMongoSettingValue(key);
  } catch {
    return null;
  }
};

const parseBooleanSetting = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
};

const parseNumberSetting = (
  value: string | null | undefined,
  fallback: number,
  min: number = 1
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

const LEGACY_INSIGHT_SCHEDULE_KEYS = {
  analyticsScheduleEnabled: 'ai_analytics_schedule_enabled',
  analyticsScheduleMinutes: 'ai_analytics_schedule_minutes',
  runtimeAnalyticsScheduleEnabled: 'ai_runtime_analytics_schedule_enabled',
  runtimeAnalyticsScheduleMinutes: 'ai_runtime_analytics_schedule_minutes',
  logsScheduleEnabled: 'ai_logs_schedule_enabled',
  logsScheduleMinutes: 'ai_logs_schedule_minutes',
  logsAutoOnError: 'ai_logs_auto_on_error',
} as const;

const readSettingWithFallback = async (keys: readonly string[]): Promise<string | null> => {
  for (const key of keys) {
    const value = await readInsightSettingValue(key);
    if (value !== null) return value;
  }
  return null;
};

const sanitizeEvents = (
  events: AnalyticsSummaryDto['recent'] | undefined
): Record<string, unknown>[] =>
  (events ?? []).map((event: AnalyticsEventDto) => ({
    id: event.id,
    ts: event.ts,
    type: event.type,
    scope: event.scope,
    path: event.path,
    referrer: event.referrer ?? null,
    country: event.country ?? null,
    language: event.language ?? null,
    meta: event.meta ?? null,
  }));

const sanitizeLogs = (logs: SystemLogRecord[]): Record<string, unknown>[] =>
  logs.map((log: SystemLogRecord) => ({
    id: log.id,
    level: log.level,
    message: log.message,
    source: log.source,
    createdAt: log.createdAt,
    path: log.path ?? null,
    method: log.method ?? null,
    statusCode: log.statusCode ?? null,
    context: log.context
      ? { fingerprint: (log.context as { fingerprint?: unknown }).fingerprint }
      : null,
  }));

const getClient = (
  modelName: string,
  apiKey: string | null
): { openai: OpenAI; isOllama: boolean } => {
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith('gpt-') && !modelLower.includes('oss')) ||
    modelLower.startsWith('ft:gpt-') ||
    modelLower.startsWith('o1-');

  if (isOpenAI) {
    if (!apiKey) {
      throw new Error('OpenAI API key is missing for GPT model.');
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: 'ollama',
    }),
    isOllama: true,
  };
};

const isAnthropicModel = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith('claude');

const isGeminiModel = (modelName: string): boolean => modelName.toLowerCase().startsWith('gemini');

const runAnthropicChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system =
    params.messages.find((message: ChatMessage) => message.role === 'system')?.content ?? '';
  const conversation = params.messages
    .filter((message: ChatMessage) => message.role !== 'system')
    .map((message: ChatMessage) => ({ role: message.role, content: message.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 700,
      system: system || undefined,
      messages: conversation,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `Anthropic error (${res.status})`);
  }
  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text = data.content
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
  return text ?? '';
};

const runGeminiChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system =
    params.messages.find((message: ChatMessage) => message.role === 'system')?.content ?? '';
  const userMessages = params.messages.filter((message: ChatMessage) => message.role === 'user');
  const assistantMessages = params.messages.filter(
    (message: ChatMessage) => message.role === 'assistant'
  );
  const contents = [
    ...userMessages.map((message: ChatMessage) => ({
      role: 'user',
      parts: [{ text: message.content }],
    })),
    ...assistantMessages.map((message: ChatMessage) => ({
      role: 'model',
      parts: [{ text: message.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      params.model
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 700 },
      }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || `Gemini error (${res.status})`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
  return text ?? '';
};

const stripCodeFence = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }
  return trimmed;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const collectErrorMessages = (error: unknown): string[] => {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const messages: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (typeof current === 'string') {
      messages.push(current);
      continue;
    }
    if (current instanceof Error) {
      messages.push(current.message);
      const withCause = current as Error & { cause?: unknown };
      if (withCause.cause) queue.push(withCause.cause);
      continue;
    }
    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (typeof record['message'] === 'string') {
        messages.push(record['message']);
      }
      if (Array.isArray(record['causeChain'])) {
        queue.push(...(record['causeChain'] as unknown[]));
      }
      if (record['cause']) {
        queue.push(record['cause']);
      }
      if (typeof record['code'] === 'string') {
        messages.push(record['code']);
      }
    }
  }
  return messages;
};

const isTransientModelConnectionError = (error: unknown): boolean => {
  const merged = collectErrorMessages(error).join(' | ').toLowerCase();
  if (!merged) return false;
  return [
    'connection error',
    'fetch failed',
    'network error',
    'timed out',
    'timeout',
    'socket hang up',
    'econnreset',
    'econnrefused',
    'eai_again',
    'enotfound',
    '429',
    'rate limit',
    'overloaded',
    'temporarily unavailable',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
  ].some((token) => merged.includes(token));
};

const withTransientModelRetry = async <T>(
  action: () => Promise<T>,
  context: { provider: 'openai' | 'anthropic' | 'gemini' | 'ollama'; modelId: string }
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_INSIGHTS_MODEL_MAX_RETRIES; attempt += 1) {
    try {
      return await action();
    } catch (error: unknown) {
      lastError = error;
      if (!isTransientModelConnectionError(error) || attempt >= AI_INSIGHTS_MODEL_MAX_RETRIES) {
        throw error;
      }
      const delayMs = AI_INSIGHTS_MODEL_RETRY_BASE_MS * Math.pow(2, attempt);
      await (ErrorSystem as any).logWarning('AI insights model call failed; retrying transient error.', {
        service: 'ai-insights',
        context: {
          provider: context.provider,
          modelId: context.modelId,
          attempt: attempt + 1,
          maxRetries: AI_INSIGHTS_MODEL_MAX_RETRIES,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? 'Unknown model error'));
};

const parseInsightPayload = (
  raw: string
): {
  status: AiInsightStatus;
  summary: string;
  warnings: string[];
  recommendations: string[];
} => {
  const clean = stripCodeFence(raw);
  try {
    const parsed = JSON.parse(clean) as {
      status?: AiInsightStatus;
      summary?: string;
      warnings?: string[];
      recommendations?: string[];
    };
    const status = parsed.status ?? 'warning';
    return {
      status,
      summary: typeof parsed.summary === 'string' ? parsed.summary : clean,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(Boolean) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter(Boolean)
        : [],
    };
  } catch {
    return {
      status: 'warning',
      summary: clean,
      warnings: [],
      recommendations: [],
    };
  }
};

const OUTPUT_FORMAT_INSTRUCTION =
  'Return a JSON object with keys: status (ok|warning|error), summary (string), warnings (array of strings), recommendations (array of strings). ' +
  'Be concise and actionable. If nothing looks wrong, status should be ok and warnings empty.';

const resolveInsightSystemPrompt = async (type: AiInsightType): Promise<string> => {
  const key =
    type === 'analytics'
      ? AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem
      : type === 'runtime_analytics'
        ? AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem
        : AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem;
  const configured = (await readInsightSettingValue(key))?.trim();
  if (configured) return configured;
  if (type === 'analytics') return DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT;
  if (type === 'runtime_analytics') return DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT;
  return DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT;
};

const buildInsightMessages = async (params: {
  type: AiInsightType;
  payload: Record<string, unknown>;
}): Promise<ChatMessage[]> => {
  const systemPrompt = await resolveInsightSystemPrompt(params.type);
  const title =
    params.type === 'analytics'
      ? 'Page analytics snapshot'
      : params.type === 'runtime_analytics'
        ? 'Runtime analytics snapshot'
        : 'System log snapshot';
  const now = new Date().toISOString();
  return [
    {
      id: `sys-${Date.now()}`,
      sessionId: 'insights',
      role: 'system',
      content: `${systemPrompt}\n\n${OUTPUT_FORMAT_INSTRUCTION}`,
      timestamp: now,
    },
    {
      id: `user-${Date.now()}`,
      sessionId: 'insights',
      role: 'user',
      content: `${title}:\n${JSON.stringify(params.payload, null, 2)}`,
      timestamp: now,
    },
  ];
};

const runInsightModel = async (params: {
  provider: 'model' | 'agent';
  modelId?: string | null;
  agentId?: string | null;
  messages: ChatMessage[];
}): Promise<string> => {
  if (params.provider === 'agent') {
    const agentId = params.agentId?.trim();
    if (!agentId) {
      throw new Error('Agent id is required.');
    }
    const response = await runTeachingChat({
      agentId,
      messages: params.messages,
    });
    return response.message ?? '';
  }

  const modelId =
    params.modelId?.trim() ||
    (await readInsightSettingValue('openai_model'))?.trim() ||
    'gpt-4o-mini';
  if (!modelId) throw new Error('Model id is required.');
  if (isAnthropicModel(modelId)) {
    const anthropicKey =
      (await readInsightSettingValue('anthropic_api_key')) ??
      process.env['ANTHROPIC_API_KEY'] ??
      null;
    if (!anthropicKey) {
      throw new Error('Anthropic API key is missing.');
    }
    return withTransientModelRetry(
      () => runAnthropicChat({ model: modelId, apiKey: anthropicKey, messages: params.messages }),
      { provider: 'anthropic', modelId }
    );
  }

  if (isGeminiModel(modelId)) {
    const geminiKey =
      (await readInsightSettingValue('gemini_api_key')) ?? process.env['GEMINI_API_KEY'] ?? null;
    if (!geminiKey) {
      throw new Error('Gemini API key is missing.');
    }
    return withTransientModelRetry(
      () => runGeminiChat({ model: modelId, apiKey: geminiKey, messages: params.messages }),
      { provider: 'gemini', modelId }
    );
  }

  const apiKey =
    (await readInsightSettingValue('openai_api_key')) ?? process.env['OPENAI_API_KEY'] ?? null;
  const { openai } = getClient(modelId, apiKey);
  const provider = modelId.toLowerCase().includes('gpt') ? 'openai' : 'ollama';
  const response = await withTransientModelRetry(
    () =>
      openai.chat.completions.create({
        model: modelId,
        messages: params.messages.map((message: ChatMessage) => ({
          role: message.role as 'system' | 'user' | 'assistant',
          content: message.content,
        })),
      }) as Promise<OpenAI.Chat.Completions.ChatCompletion>,
    { provider, modelId }
  );
  return response.choices?.[0]?.message?.content?.trim() ?? '';
};

export const generateAnalyticsInsight = async (params: {
  source: AiInsightSource;
  rangeHours?: number;
  scope?: 'all' | 'public' | 'admin';
}): Promise<AiInsightRecord> => {
  await assertScheduledInsightEnabled(params.source, 'analytics');
  const brainAssignment = await getBrainAssignmentForFeature('analytics');
  if (!brainAssignment.enabled) {
    throw new Error('AI Brain is disabled for Analytics.');
  }
  const provider = brainAssignment.provider;
  const modelId =
    brainAssignment.modelId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsModel));
  const agentId =
    brainAssignment.agentId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsAgentId));

  const rangeHours = params.rangeHours ?? 24;
  const to = new Date();
  const from = new Date(to.getTime() - rangeHours * 60 * 60 * 1000);
  const scope = params.scope && params.scope !== 'all' ? params.scope : undefined;

  const summary = await getAnalyticsSummary({ from, to, scope });
  const events = await listAnalyticsEvents({ from, to, scope, limit: 40, skip: 0 });
  const payload = {
    window: { from: summary.from, to: summary.to, scope: summary.scope ?? 'all' },
    totals: summary.totals,
    visitors: summary.visitors,
    sessions: summary.sessions,
    topPages: summary.topPages.slice(0, 10),
    topReferrers: summary.topReferrers.slice(0, 10),
    topLanguages: summary.topLanguages.slice(0, 10),
    topCountries: summary.topCountries.slice(0, 10),
    recentEvents: sanitizeEvents(events.events),
  };

  const messages = await buildInsightMessages({ type: 'analytics', payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight('analytics', {
    name: 'Analytics Insight',
    status: parsed.status,
    source: params.source,
    score: parsed.status === 'ok' ? 100 : 50,
    content: payload as Record<string, unknown>,
    metadata: {
      model: { provider, modelId, agentId },
      window: { from: summary.from, to: summary.to, scope: summary.scope ?? 'all' },
    },
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
  });
  await recordBrainInsightAnalytics({
    type: 'analytics',
    status: parsed.status,
  });

  await setAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt, new Date().toISOString());

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      insightId: insight.id,
      userId: 'system',
      readAt: null,
      type: 'analytics',
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recommendations: parsed.recommendations,
    });
  }

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await (ErrorSystem as any).logWarning('AI analytics insight reported warnings.', {
      service: 'ai-insights',
      context: {
        type: 'analytics',
        warnings: parsed.warnings.slice(0, 5),
      },
    });
  } else {
    await (ErrorSystem as any).logInfo('AI analytics insight completed.', {
      service: 'ai-insights',
      context: { type: 'analytics' },
    });
  }

  return insight;
};

export const generateLogsInsight = async (params: {
  source: AiInsightSource;
  windowHours?: number;
}): Promise<AiInsightRecord> => {
  await assertScheduledInsightEnabled(params.source, 'logs');
  const brainAssignment = await getBrainAssignmentForFeature('system_logs');
  if (!brainAssignment.enabled) {
    throw new Error('AI Brain is disabled for System Logs.');
  }
  const provider = brainAssignment.provider;
  const modelId =
    brainAssignment.modelId || (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsModel));
  const agentId =
    brainAssignment.agentId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAgentId));
  const windowHours = params.windowHours ?? 24;
  const to = new Date();
  const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);

  const [logsResult, metricsResult] = await Promise.all([
    listSystemLogs({ level: 'error', page: 1, pageSize: 40, from, to }),
    getSystemLogMetrics({ level: 'error', from, to }),
  ]);

  const payload = {
    window: { from: from.toISOString(), to: to.toISOString() },
    metrics: metricsResult,
    recentErrors: sanitizeLogs(logsResult.logs),
  };

  const messages = await buildInsightMessages({ type: 'logs', payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight('logs', {
    name: 'Logs Insight',
    status: parsed.status,
    score: parsed.status === 'ok' ? 100 : 50,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    content: payload as Record<string, unknown>,
    metadata: {
      model: { provider, modelId, agentId },
      window: { from: payload.window.from, to: payload.window.to },
    },
  });
  await recordBrainInsightAnalytics({
    type: 'logs',
    status: parsed.status,
  });

  await setAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt, new Date().toISOString());

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      insightId: insight.id,
      userId: 'system',
      readAt: null,
      type: 'logs',
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recommendations: parsed.recommendations,
    });
  }

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await (ErrorSystem as any).logWarning('AI log insight reported warnings.', {
      service: 'ai-insights',
      context: {
        type: 'logs',
        warnings: parsed.warnings.slice(0, 5),
      },
    });
  } else {
    await (ErrorSystem as any).logInfo('AI log insight completed.', {
      service: 'ai-insights',
      context: { type: 'logs' },
    });
  }

  return insight;
};

export const generateRuntimeAnalyticsInsight = async (params: {
  source: AiInsightSource;
  range?: AiPathRuntimeAnalyticsRange;
}): Promise<AiInsightRecord> => {
  await assertScheduledInsightEnabled(params.source, 'runtime_analytics');
  const brainAssignment = await getBrainAssignmentForFeature('runtime_analytics');
  if (!brainAssignment.enabled) {
    throw new Error('AI Brain is disabled for Runtime Analytics.');
  }
  const provider = brainAssignment.provider;
  const modelId =
    brainAssignment.modelId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsModel));
  const agentId =
    brainAssignment.agentId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsAgentId));
  const range = params.range ?? '24h';
  const { from, to } = resolveRuntimeAnalyticsRangeWindow(range);
  const runtimeSummary = await getRuntimeAnalyticsSummary({ from, to, range });

  const payload = {
    window: {
      from: runtimeSummary.from,
      to: runtimeSummary.to,
      range: runtimeSummary.range,
      storage: runtimeSummary.storage,
    },
    runs: runtimeSummary.runs,
    nodes: runtimeSummary.nodes,
    brainReports: runtimeSummary.brain,
  };

  const messages = await buildInsightMessages({ type: 'runtime_analytics', payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight('runtime_analytics', {
    name: 'Runtime Analytics Insight',
    status: parsed.status,
    score: parsed.status === 'ok' ? 100 : 50,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    content: payload as Record<string, unknown>,
    metadata: {
      model: { provider, modelId, agentId },
      window: {
        from: runtimeSummary.from,
        to: runtimeSummary.to,
        scope: String(runtimeSummary.range),
      },
    },
  });

  await setAiInsightsMeta(
    AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsLastRunAt,
    new Date().toISOString()
  );

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      insightId: insight.id,
      userId: 'system',
      readAt: null,
      type: 'runtime_analytics',
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recommendations: parsed.recommendations,
    });
    await (ErrorSystem as any).logWarning('AI runtime analytics insight reported warnings.', {
      service: 'ai-insights',
      context: {
        type: 'runtime_analytics',
        warnings: parsed.warnings.slice(0, 5),
      },
    });
  } else {
    await (ErrorSystem as any).logInfo('AI runtime analytics insight completed.', {
      service: 'ai-insights',
      context: { type: 'runtime_analytics' },
    });
  }

  return insight;
};

export const generateLogInterpretation = async (params: {
  source: AiInsightSource;
  log: {
    id: string;
    level: string;
    message: string;
    source?: string | null;
    context?: Record<string, unknown> | null;
    stack?: string | null;
    path?: string | null;
    method?: string | null;
    statusCode?: number | null;
    createdAt?: string | null;
  };
}): Promise<AiInsightRecord> => {
  const brainAssignment = await getBrainAssignmentForFeature('error_logs');
  if (!brainAssignment.enabled) {
    throw new Error('AI Brain is disabled for Error Logs.');
  }
  const provider = brainAssignment.provider;
  const modelId =
    brainAssignment.modelId || (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsModel));
  const agentId =
    brainAssignment.agentId ||
    (await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAgentId));

  const payload = {
    log: {
      id: params.log.id,
      level: params.log.level,
      message: params.log.message,
      source: params.log.source ?? null,
      createdAt: params.log.createdAt ?? null,
      path: params.log.path ?? null,
      method: params.log.method ?? null,
      statusCode: params.log.statusCode ?? null,
      stack: params.log.stack ?? null,
      context: params.log.context ?? null,
    },
  };

  const messages = await buildInsightMessages({ type: 'logs', payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight('logs', {
    name: 'Log Interpretation',
    status: parsed.status,
    score: parsed.status === 'ok' ? 100 : 50,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    content: payload as Record<string, unknown>,
    metadata: {
      model: { provider, modelId, agentId },
      context: { logId: params.log.id },
    },
  });

  if (parsed.status !== 'ok' || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      insightId: insight.id,
      userId: 'system',
      readAt: null,
      type: 'logs',
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recommendations: parsed.recommendations,
    });
  }

  return insight;
};

export const getScheduleSettings = async (): Promise<{
  analyticsEnabled: boolean;
  analyticsMinutes: number;
  runtimeAnalyticsEnabled: boolean;
  runtimeAnalyticsMinutes: number;
  logsEnabled: boolean;
  logsMinutes: number;
  logsAutoOnError: boolean;
}> => {
  const [
    analyticsEnabledRaw,
    analyticsMinutesRaw,
    runtimeAnalyticsEnabledRaw,
    runtimeAnalyticsMinutesRaw,
    logsEnabledRaw,
    logsMinutesRaw,
    logsAutoRaw,
  ] = await Promise.all([
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled,
      LEGACY_INSIGHT_SCHEDULE_KEYS.analyticsScheduleEnabled,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes,
      LEGACY_INSIGHT_SCHEDULE_KEYS.analyticsScheduleMinutes,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled,
      LEGACY_INSIGHT_SCHEDULE_KEYS.runtimeAnalyticsScheduleEnabled,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes,
      LEGACY_INSIGHT_SCHEDULE_KEYS.runtimeAnalyticsScheduleMinutes,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled,
      LEGACY_INSIGHT_SCHEDULE_KEYS.logsScheduleEnabled,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes,
      LEGACY_INSIGHT_SCHEDULE_KEYS.logsScheduleMinutes,
    ]),
    readSettingWithFallback([
      AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError,
      LEGACY_INSIGHT_SCHEDULE_KEYS.logsAutoOnError,
    ]),
  ]);

  return {
    analyticsEnabled: parseBooleanSetting(analyticsEnabledRaw, false),
    analyticsMinutes: parseNumberSetting(analyticsMinutesRaw, 30, 5),
    runtimeAnalyticsEnabled: parseBooleanSetting(runtimeAnalyticsEnabledRaw, false),
    runtimeAnalyticsMinutes: parseNumberSetting(runtimeAnalyticsMinutesRaw, 30, 5),
    logsEnabled: parseBooleanSetting(logsEnabledRaw, false),
    logsMinutes: parseNumberSetting(logsMinutesRaw, 15, 5),
    logsAutoOnError: parseBooleanSetting(logsAutoRaw, false),
  };
};

const SCHEDULED_INSIGHT_SOURCES = new Set<string>(['scheduled', 'scheduled_job']);

const assertScheduledInsightEnabled = async (
  source: AiInsightSource | string,
  type: 'analytics' | 'runtime_analytics' | 'logs'
): Promise<void> => {
  if (!SCHEDULED_INSIGHT_SOURCES.has(String(source))) return;
  const schedule = await getScheduleSettings();
  if (type === 'analytics' && !schedule.analyticsEnabled) {
    throw new Error('Analytics insight schedule is disabled.');
  }
  if (type === 'runtime_analytics' && !schedule.runtimeAnalyticsEnabled) {
    throw new Error('Runtime analytics insight schedule is disabled.');
  }
  if (type === 'logs' && !schedule.logsEnabled) {
    throw new Error('Logs insight schedule is disabled.');
  }
};
