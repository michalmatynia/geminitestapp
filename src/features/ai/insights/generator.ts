import "server-only";

import OpenAI from "openai";
import type { ChatMessage } from "@/shared/types/chatbot";
import type { AiInsightRecord, AiInsightSource, AiInsightStatus, AiInsightType } from "@/shared/types/ai-insights";
import type { AnalyticsSummaryDto } from "@/shared/types";
import { ErrorSystem } from "@/features/observability/server";
import { listAnalyticsEvents, getAnalyticsSummary } from "@/features/analytics/server";
import { listSystemLogs, getSystemLogMetrics } from "@/features/observability/server";
import { getSettingValue } from "@/features/products/services/aiDescriptionService";
import { runTeachingChat } from "@/features/ai/agentcreator/teaching/server/chat";
import { AI_INSIGHTS_SETTINGS_KEYS } from "./settings";
import { appendAiInsight, appendAiInsightNotification, setAiInsightsMeta } from "./repository";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const parseBooleanSetting = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  return value === "true" || value === "1";
};

const parseNumberSetting = (value: string | null | undefined, fallback: number, min = 1): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

const sanitizeEvents = (events: AnalyticsSummaryDto["recent"] | undefined) =>
  (events ?? []).map((event) => ({
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

const sanitizeLogs = (logs: Array<{ id: string; level: string; message: string; source: string | null; createdAt: string; path?: string | null; method?: string | null; statusCode?: number | null; context?: Record<string, unknown> | null }>) =>
  logs.map((log) => ({
    id: log.id,
    level: log.level,
    message: log.message,
    source: log.source,
    createdAt: log.createdAt,
    path: log.path ?? null,
    method: log.method ?? null,
    statusCode: log.statusCode ?? null,
    context: log.context ? { fingerprint: log.context?.fingerprint } : null,
  }));

const getClient = (
  modelName: string,
  apiKey: string | null,
): { openai: OpenAI; isOllama: boolean } => {
  const modelLower = modelName.toLowerCase();
  const isOpenAI =
    (modelLower.startsWith("gpt-") && !modelLower.includes("oss")) ||
    modelLower.startsWith("ft:gpt-") ||
    modelLower.startsWith("o1-");

  if (isOpenAI) {
    if (!apiKey) {
      throw new Error("OpenAI API key is missing for GPT model.");
    }
    return { openai: new OpenAI({ apiKey }), isOllama: false };
  }

  return {
    openai: new OpenAI({
      baseURL: `${OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama",
    }),
    isOllama: true,
  };
};

const isAnthropicModel = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith("claude");

const isGeminiModel = (modelName: string): boolean =>
  modelName.toLowerCase().startsWith("gemini");

const runAnthropicChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system = params.messages.find((message) => message.role === "system")?.content ?? "";
  const conversation = params.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 700,
      system: system || undefined,
      messages: conversation,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Anthropic error (${res.status})`);
  }
  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text = data.content?.map((part) => part.text ?? "").join("").trim();
  return text ?? "";
};

const runGeminiChat = async (params: {
  model: string;
  apiKey: string;
  messages: ChatMessage[];
}): Promise<string> => {
  const system = params.messages.find((message) => message.role === "system")?.content ?? "";
  const userMessages = params.messages.filter((message) => message.role === "user");
  const assistantMessages = params.messages.filter((message) => message.role === "assistant");
  const contents = [
    ...userMessages.map((message) => ({
      role: "user",
      parts: [{ text: message.content }],
    })),
    ...assistantMessages.map((message) => ({
      role: "model",
      parts: [{ text: message.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      params.model
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 700 },
      }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Gemini error (${res.status})`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return text ?? "";
};

const stripCodeFence = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return trimmed;
};

const parseInsightPayload = (raw: string): {
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
    const status = (parsed.status ?? "warning") as AiInsightStatus;
    return {
      status,
      summary: typeof parsed.summary === "string" ? parsed.summary : clean,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(Boolean) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter(Boolean)
        : [],
    };
  } catch {
    return {
      status: "warning",
      summary: clean,
      warnings: [],
      recommendations: [],
    };
  }
};

const buildInsightMessages = (params: {
  type: AiInsightType;
  payload: Record<string, unknown>;
}): ChatMessage[] => {
  const baseInstruction =
    "Return a JSON object with keys: status (ok|warning|error), summary (string), warnings (array of strings), recommendations (array of strings). " +
    "Be concise and actionable. If nothing looks wrong, status should be ok and warnings empty.";
  const title = params.type === "analytics" ? "Page analytics snapshot" : "System log snapshot";
  return [
    { role: "system", content: `You are a monitoring analyst. ${baseInstruction}` },
    {
      role: "user",
      content: `${title}:\n${JSON.stringify(params.payload, null, 2)}`,
    },
  ];
};

const runInsightModel = async (params: {
  provider: "model" | "agent";
  modelId?: string | null;
  agentId?: string | null;
  messages: ChatMessage[];
}): Promise<string> => {
  if (params.provider === "agent") {
    const agentId = params.agentId?.trim();
    if (!agentId) {
      throw new Error("Agent id is required.");
    }
    const response = await runTeachingChat({
      agentId,
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
    return response.message ?? "";
  }

  const modelId =
    params.modelId?.trim() ||
    (await getSettingValue("openai_model"))?.trim() ||
    "gpt-4o-mini";
  if (!modelId) throw new Error("Model id is required.");
  if (isAnthropicModel(modelId)) {
    const anthropicKey =
      (await getSettingValue("anthropic_api_key")) ?? process.env.ANTHROPIC_API_KEY ?? null;
    if (!anthropicKey) {
      throw new Error("Anthropic API key is missing.");
    }
    return runAnthropicChat({ model: modelId, apiKey: anthropicKey, messages: params.messages });
  }

  if (isGeminiModel(modelId)) {
    const geminiKey =
      (await getSettingValue("gemini_api_key")) ?? process.env.GEMINI_API_KEY ?? null;
    if (!geminiKey) {
      throw new Error("Gemini API key is missing.");
    }
    return runGeminiChat({ model: modelId, apiKey: geminiKey, messages: params.messages });
  }

  const apiKey =
    (await getSettingValue("openai_api_key")) ?? process.env.OPENAI_API_KEY ?? null;
  const { openai } = getClient(modelId, apiKey);
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: params.messages.map((message) => ({
      role: message.role as "system" | "user" | "assistant",
      content: message.content,
    })),
  });
  return response.choices?.[0]?.message?.content?.trim() ?? "";
};

export const generateAnalyticsInsight = async (params: {
  source: AiInsightSource;
  rangeHours?: number;
  scope?: "all" | "public" | "admin";
}): Promise<AiInsightRecord> => {
  const provider = ((await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsProvider)) || "model") as "model" | "agent";
  const modelId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsModel);
  const agentId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsAgentId);

  const rangeHours = params.rangeHours ?? 24;
  const to = new Date();
  const from = new Date(to.getTime() - rangeHours * 60 * 60 * 1000);
  const scope = params.scope && params.scope !== "all" ? params.scope : undefined;

  const summary = await getAnalyticsSummary({ from, to, scope });
  const events = await listAnalyticsEvents({ from, to, scope, limit: 40, skip: 0 });
  const payload = {
    window: { from: summary.from, to: summary.to, scope: summary.scope ?? "all" },
    totals: summary.totals,
    visitors: summary.visitors,
    sessions: summary.sessions,
    topPages: summary.topPages.slice(0, 10),
    topReferrers: summary.topReferrers.slice(0, 10),
    topLanguages: summary.topLanguages.slice(0, 10),
    topCountries: summary.topCountries.slice(0, 10),
    recentEvents: sanitizeEvents(events.events),
  };

  const messages = buildInsightMessages({ type: "analytics", payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight("analytics", {
    status: parsed.status,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    model: { provider, modelId, agentId },
    window: { from: summary.from, to: summary.to, scope: summary.scope ?? "all" },
  });

  await setAiInsightsMeta(
    AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt,
    new Date().toISOString()
  );

  if (parsed.status !== "ok" || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      type: "analytics",
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      source: params.source,
      model: { provider, modelId, agentId },
    });
  }

  if (parsed.status !== "ok" || parsed.warnings.length > 0) {
    await ErrorSystem.logWarning("AI analytics insight reported warnings.", {
      service: "ai-insights",
      context: {
        type: "analytics",
        warnings: parsed.warnings.slice(0, 5),
      },
    });
  } else {
    await ErrorSystem.logInfo("AI analytics insight completed.", {
      service: "ai-insights",
      context: { type: "analytics" },
    });
  }

  return insight;
};

export const generateLogsInsight = async (params: {
  source: AiInsightSource;
  windowHours?: number;
}): Promise<AiInsightRecord> => {
  const provider = ((await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsProvider)) || "model") as "model" | "agent";
  const modelId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsModel);
  const agentId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAgentId);
  const windowHours = params.windowHours ?? 24;
  const to = new Date();
  const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);

  const [logsResult, metricsResult] = await Promise.all([
    listSystemLogs({ level: "error", page: 1, pageSize: 40, from, to }),
    getSystemLogMetrics({ level: "error", from, to }),
  ]);

  const payload = {
    window: { from: from.toISOString(), to: to.toISOString() },
    metrics: metricsResult,
    recentErrors: sanitizeLogs(logsResult.logs),
  };

  const messages = buildInsightMessages({ type: "logs", payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight("logs", {
    status: parsed.status,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    model: { provider, modelId, agentId },
    window: { from: payload.window.from, to: payload.window.to },
  });

  await setAiInsightsMeta(
    AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt,
    new Date().toISOString()
  );

  if (parsed.status !== "ok" || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      type: "logs",
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      source: params.source,
      model: { provider, modelId, agentId },
    });
  }

  if (parsed.status !== "ok" || parsed.warnings.length > 0) {
    await ErrorSystem.logWarning("AI log insight reported warnings.", {
      service: "ai-insights",
      context: {
        type: "logs",
        warnings: parsed.warnings.slice(0, 5),
      },
    });
  } else {
    await ErrorSystem.logInfo("AI log insight completed.", {
      service: "ai-insights",
      context: { type: "logs" },
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
  const provider =
    ((await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsProvider)) || "model") as
      | "model"
      | "agent";
  const modelId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsModel);
  const agentId = await getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAgentId);

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

  const messages = buildInsightMessages({ type: "logs", payload });
  const raw = await runInsightModel({ provider, modelId, agentId, messages });
  const parsed = parseInsightPayload(raw);

  const insight = await appendAiInsight("logs", {
    status: parsed.status,
    summary: parsed.summary,
    warnings: parsed.warnings,
    recommendations: parsed.recommendations,
    source: params.source,
    model: { provider, modelId, agentId },
    context: { logId: params.log.id },
  });

  if (parsed.status !== "ok" || parsed.warnings.length > 0) {
    await appendAiInsightNotification({
      type: "logs",
      status: parsed.status,
      summary: parsed.summary,
      warnings: parsed.warnings,
      source: params.source,
      model: { provider, modelId, agentId },
    });
  }

  return insight;
};

export const getScheduleSettings = async (): Promise<{
  analyticsEnabled: boolean;
  analyticsMinutes: number;
  logsEnabled: boolean;
  logsMinutes: number;
  logsAutoOnError: boolean;
}> => {
  const [analyticsEnabledRaw, analyticsMinutesRaw, logsEnabledRaw, logsMinutesRaw, logsAutoRaw] =
    await Promise.all([
      getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled),
      getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes),
      getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled),
      getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes),
      getSettingValue(AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError),
    ]);

  return {
    analyticsEnabled: parseBooleanSetting(analyticsEnabledRaw, true),
    analyticsMinutes: parseNumberSetting(analyticsMinutesRaw, 30, 5),
    logsEnabled: parseBooleanSetting(logsEnabledRaw, true),
    logsMinutes: parseNumberSetting(logsMinutesRaw, 15, 5),
    logsAutoOnError: parseBooleanSetting(logsAutoRaw, true),
  };
};
