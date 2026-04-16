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
  if (!agentLongTermMemory) {
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
            : params.sourceCreatedAt
              ? new Date(params.sourceCreatedAt)
              : null,
        ...(params.metadata !== undefined && {
          metadata: params.metadata as InputJsonValue,
        }),
        importance: params.importance ?? null,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error) {
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
    throw error;
  }
}

export async function validateAgentLongTermMemory(params: {
  model?: string | null;
  prompt?: string | null;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ valid: boolean; issues: string[]; reason: string | null; model: string | null }> {
  const config = await resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', {
    defaultTemperature: 0.2,
    defaultMaxTokens: 500,
    runtimeKind: 'validation',
  });
  const model = params.model?.trim() || config.modelId;
  const prompt = params.prompt ?? '';
  if (!model) {
    throw new Error('AI Brain memory validation model is not configured.');
  }
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
    const content = response.text;
    const parsed = parseJsonObject(content) as {
      valid?: unknown;
      issues?: unknown;
      reason?: unknown;
    } | null;
    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.filter((item: unknown) => typeof item === 'string')
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
  const summaryConfig = await resolveBrainExecutionConfigForCapability(
    'agent_runtime.memory_summarization',
    {
      defaultTemperature: 0.2,
      defaultMaxTokens: 300,
      runtimeKind: 'chat',
    }
  );
  const summaryModel = params.summaryModel?.trim() || summaryConfig.modelId;
  let summary = params.summary ?? null;
  if (summaryModel) {
    try {
      const response = await runBrainChatCompletion({
        modelId: summaryModel,
        temperature: summaryConfig.temperature,
        maxTokens: summaryConfig.maxTokens,
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
      const parsed = parseJsonObject(response.text) as {
        summary?: unknown;
      } | null;
      if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
        summary = parsed.summary.trim();
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // keep existing summary if summarization fails
    }
  }
  const validation = await validateAgentLongTermMemory({
    ...(params.model !== undefined && { model: params.model }),
    ...(params.prompt !== undefined && { prompt: params.prompt }),
    content: params.content,
    ...(summary !== undefined && { summary }),
    ...(params.metadata !== undefined && { metadata: params.metadata }),
  });
  if (!validation.valid) {
    return { skipped: true, validation };
  }
  const record = await addAgentLongTermMemory({
    memoryKey: params.memoryKey,
    runId: params.runId ?? null,
    personaId: params.personaId ?? null,
    content: params.content,
    ...(summary !== undefined && { summary }),
    tags: params.tags ?? [],
    topicHints: params.topicHints ?? [],
    moodHints: params.moodHints ?? [],
    sourceType: params.sourceType ?? null,
    sourceId: params.sourceId ?? null,
    sourceLabel: params.sourceLabel ?? null,
    sourceCreatedAt: params.sourceCreatedAt ?? null,
    ...(params.metadata !== undefined && { metadata: params.metadata }),
    importance: params.importance ?? null,
  });
  return { skipped: false, validation, record };
}

export async function listAgentLongTermMemory(params: {
  memoryKey?: string;
  personaId?: string | null;
  limit?: number;
  tags?: string[];
}): Promise<AgentLongTermMemoryRecord[]> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (!agentLongTermMemory) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      {
        service: 'agent-memory',
      }
    );
    return [];
  }
  try {
    if (!params.memoryKey && !params.personaId) {
      return [];
    }
    const tagFilter = params.tags && params.tags.length > 0 ? { hasSome: params.tags } : undefined;
    const items = await agentLongTermMemory.findMany<AgentLongTermMemoryRecord>({
      where: {
        ...(params.memoryKey ? { memoryKey: params.memoryKey } : {}),
        ...(params.personaId ? { personaId: params.personaId } : {}),
        ...(tagFilter ? { tags: tagFilter } : {}),
      },
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
  } catch (error) {
    void ErrorSystem.captureException(error);
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'listAgentLongTermMemory',
        memoryKey: params.memoryKey,
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
      if (DEBUG_CHATBOT) {
        const { logger } = await import('@/shared/utils/logger');
        logger.error(
          '[chatbot][agent][memory] Failed to list long-term memory (and logging failed)',
          logError,
          {
            memoryKey: params.memoryKey,
            error,
          }
        );
      }
    }
    throw error;
  }
}
