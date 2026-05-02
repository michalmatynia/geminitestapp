import {
  type AgentLongTermMemoryRecord,
  getAgentLongTermMemoryDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import type { InputJsonValue } from '@/shared/contracts/json';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { DEBUG_CHATBOT, parseJsonObject } from './shared';

async function handleMemoryError(
  error: unknown,
  params: { memoryKey: string; runId?: string | null }
): Promise<void> {
  void ErrorSystem.captureException(error);
  try {
    await ErrorSystem.captureException(error, {
      service: 'agent-memory',
      action: 'addAgentLongTermMemory',
      memoryKey: params.memoryKey,
      runId: params.runId ?? undefined,
    });
  } catch (logError) {
    void ErrorSystem.captureException(logError);
    if (DEBUG_CHATBOT) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[chatbot][agent][memory] Failed to add long-term memory (and logging failed)',
        logError,
        {
          memoryKey: params.memoryKey,
          runId: params.runId,
          error,
        }
      );
    }
  }
}

export async function addAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  personaId?: string | null;
  content: string;
  summary?: string | null;
  tags?: string[];
  topicHints?: string[];
  moodHints?: string[];
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceCreatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
  importance?: number | null;
}): Promise<AgentLongTermMemoryRecord | null> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (agentLongTermMemory === null) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      {
        service: 'agent-memory',
      }
    );
    return null;
  }
  try {
    return await agentLongTermMemory.create<AgentLongTermMemoryRecord>({
      data: {
        memoryKey: params.memoryKey,
        runId: params.runId ?? null,
        personaId: params.personaId ?? null,
        content: params.content,
        summary: params.summary ?? null,
        tags: params.tags ?? [],
        topicHints: params.topicHints ?? [],
        moodHints: params.moodHints ?? [],
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
        sourceLabel: params.sourceLabel ?? null,
        sourceCreatedAt: (function() {
          if (params.sourceCreatedAt instanceof Date) return params.sourceCreatedAt;
          if (params.sourceCreatedAt != null) return new Date(params.sourceCreatedAt);
          return null;
        })(),
        ...(params.metadata != null && {
          metadata: params.metadata as InputJsonValue,
        }),
        importance: params.importance ?? null,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error) {
    await handleMemoryError(error, { memoryKey: params.memoryKey, runId: params.runId });
    throw error;
  }
}

async function handleMemoryError(
  error: unknown,
  params: { memoryKey: string; runId?: string | null }
): Promise<void> {
  void ErrorSystem.captureException(error);
  try {
    await ErrorSystem.captureException(error, {
      service: 'agent-memory',
      action: 'addAgentLongTermMemory',
      memoryKey: params.memoryKey,
      runId: params.runId ?? undefined,
    });
  } catch (logError) {
    void ErrorSystem.captureException(logError);
    if (DEBUG_CHATBOT) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        '[chatbot][agent][memory] Failed to add long-term memory (and logging failed)',
        logError,
        {
          memoryKey: params.memoryKey,
          runId: params.runId,
          error,
        }
      );
    }
  }
}

export async function addAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  personaId?: string | null;
  content: string;
  summary?: string | null;
  tags?: string[];
  topicHints?: string[];
  moodHints?: string[];
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceCreatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
  importance?: number | null;
}): Promise<AgentLongTermMemoryRecord | null> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (agentLongTermMemory === null) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      {
        service: 'agent-memory',
      }
    );
    return null;
  }
  try {
    return await agentLongTermMemory.create<AgentLongTermMemoryRecord>({
      data: {
        memoryKey: params.memoryKey,
        runId: params.runId ?? null,
        personaId: params.personaId ?? null,
        content: params.content,
        summary: params.summary ?? null,
        tags: params.tags ?? [],
        topicHints: params.topicHints ?? [],
        moodHints: params.moodHints ?? [],
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
        sourceLabel: params.sourceLabel ?? null,
        sourceCreatedAt:
          params.sourceCreatedAt instanceof Date
            ? params.sourceCreatedAt
            : (params.sourceCreatedAt !== null ? new Date(params.sourceCreatedAt) : null),
        ...(params.metadata !== null && {
          metadata: params.metadata as InputJsonValue,
        }),
        importance: params.importance ?? null,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error) {
    await handleMemoryError(error, { memoryKey: params.memoryKey, runId: params.runId });
    throw error;
  }
}

async function prepareMemoryValidation(params: {
  model?: string | null;
  prompt?: string | null;
}) {
  const config = await resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', {
    defaultTemperature: 0.2,
    defaultMaxTokens: 500,
    runtimeKind: 'validation',
  });
  const model = (params.model !== null && params.model.trim() !== '') ? params.model.trim() : config.modelId;
  const prompt = params.prompt ?? '';
  if (model === null) {
    throw new Error('AI Brain memory validation model is not configured.');
  }
  return { config, model, prompt };
}

export async function validateAgentLongTermMemory(params: {
  model?: string | null;
  prompt?: string | null;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ valid: boolean; issues: string[]; reason: string | null; model: string | null }> {
  const { config, model, prompt } = await prepareMemoryValidation(params);

  try {
    const response = await runBrainChatCompletion({
      modelId: model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      jsonMode: supportsBrainJsonMode(model),
      messages: [
        {
          role: 'system',
          content:
            'You validate long-term memory entries. Return only JSON with keys: valid (boolean), issues (array of strings), reason. Mark invalid if the prompt implies a target URL/domain that conflicts with metadata.url or metadata.run.url. Prefer strictness if evidence is missing.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt,
            content: params.content,
            summary: params.summary ?? null,
            metadata: params.metadata ?? null,
          }),
        },
      ],
    });
    const parsed = parseJsonObject(response.text) as {
      valid?: unknown;
      issues?: unknown;
      reason?: unknown;
    } | null;
    const issues = Array.isArray(parsed?.issues)
      ? (parsed.issues.filter((item: unknown): item is string => typeof item === 'string'))
      : [];
    return {
      valid: typeof parsed?.valid === 'boolean' ? parsed.valid : true,
      issues,
      reason: typeof parsed?.reason === 'string' ? parsed.reason : null,
      model,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {
      valid: false,
      issues: [
        `Memory validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      reason: null,
      model,
    };
  }
}

async function summarizeMemory(params: {
  summaryModel?: string | null;
  prompt?: string | null;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const config = await resolveBrainExecutionConfigForCapability(
    'agent_runtime.memory_summarization',
    {
      defaultTemperature: 0.2,
      defaultMaxTokens: 300,
      runtimeKind: 'chat',
    }
  );
  const summaryModel = (params.summaryModel !== null && params.summaryModel.trim() !== '') ? params.summaryModel.trim() : config.modelId;
  if (summaryModel === null) return params.summary ?? null;

  try {
    const response = await runBrainChatCompletion({
      modelId: summaryModel,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      jsonMode: supportsBrainJsonMode(summaryModel),
      messages: [
        {
          role: 'system',
          content:
            'You write concise long-term memory summaries. Return only JSON with key summary (string). Keep it 1-2 sentences.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: params.prompt ?? null,
            content: params.content,
            metadata: params.metadata ?? null,
          }),
        },
      ],
    });
    const parsed = parseJsonObject(response.text) as { summary?: unknown } | null;
    if (typeof parsed?.summary === 'string' && parsed.summary.trim() !== '') {
      return parsed.summary.trim();
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
  }
  return params.summary ?? null;
}

export async function validateAndAddAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  personaId?: string | null;
  content: string;
  summary?: string | null;
  summaryModel?: string | null;
  tags?: string[];
  topicHints?: string[];
  moodHints?: string[];
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceCreatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
  importance?: number | null;
  model?: string | null;
  prompt?: string | null;
}): Promise<{
  skipped: boolean;
  validation: Awaited<ReturnType<typeof validateAgentLongTermMemory>>;
  record?: AgentLongTermMemoryRecord | null;
}> {
  const summary = await summarizeMemory(params);
  
  const validation = await validateAgentLongTermMemory({
    ...(params.model !== null && { model: params.model }),
    ...(params.prompt !== null && { prompt: params.prompt }),
    content: params.content,
    ...(summary !== null && { summary }),
    ...(params.metadata !== null && { metadata: params.metadata }),
  });

  if (!validation.valid) {
    return { skipped: true, validation };
  }
  
  const record = await addAgentLongTermMemory({
    memoryKey: params.memoryKey,
    runId: params.runId ?? null,
    personaId: params.personaId ?? null,
    content: params.content,
    ...(summary !== null && { summary }),
    tags: params.tags ?? [],
    topicHints: params.topicHints ?? [],
    moodHints: params.moodHints ?? [],
    sourceType: params.sourceType ?? null,
    sourceId: params.sourceId ?? null,
    sourceLabel: params.sourceLabel ?? null,
    sourceCreatedAt: params.sourceCreatedAt ?? null,
    metadata: params.metadata ?? undefined,
    importance: params.importance ?? null,
  });
  
  return { skipped: false, validation, record };
}

function getListFilters(params: {
  memoryKey?: string;
  personaId?: string | null;
  tags?: string[];
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.memoryKey != null && params.memoryKey !== '') {
    where.memoryKey = params.memoryKey;
  }
  if (params.personaId != null && params.personaId !== '') {
    where.personaId = params.personaId;
  }
  if (Array.isArray(params.tags) && params.tags.length > 0) {
    where.tags = { hasSome: params.tags };
  }
  return where;
}

export async function listAgentLongTermMemory(params: {
  memoryKey?: string;
  personaId?: string | null;
  limit?: number;
  tags?: string[];
}): Promise<AgentLongTermMemoryRecord[]> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (agentLongTermMemory == null) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      { service: 'agent-memory' }
    );
    return [];
  }
  if ((params.memoryKey == null || params.memoryKey === '') && (params.personaId == null || params.personaId === '')) {
    return [];
  }
  
  const where = getListFilters(params);
  const items = await agentLongTermMemory.findMany<AgentLongTermMemoryRecord>({
    where,
    orderBy: { updatedAt: 'desc' },
    take: params.limit ?? 5,
  });

  const ids = items.map((item: AgentLongTermMemoryRecord) => item.id);
  if (ids.length > 0) {
    await agentLongTermMemory.updateMany({
      where: { id: { in: ids } },
      data: { lastAccessedAt: new Date() },
    });
  }
  return items;
}
