import {
  type AgentLongTermMemoryRecord,
  getAgentLongTermMemoryDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { DEBUG_CHATBOT, parseJsonObject } from './shared';
import { 
  buildLongTermMemoryData, 
  parseValidationResponse, 
} from './long-term-utils';

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
      { service: 'agent-memory' }
    );
    return null;
  }
  try {
    const data = buildLongTermMemoryData(params);
    return await agentLongTermMemory.create<AgentLongTermMemoryRecord>({ data: data as unknown as any });
  } catch (error) {
    await handleMemoryError(error, { memoryKey: params.memoryKey, runId: params.runId });
    throw error;
  }
}

interface MemoryValidationConfig {
  config: Awaited<ReturnType<typeof resolveBrainExecutionConfigForCapability>>;
  model: string;
  prompt: string;
}

async function prepareMemoryValidation(params: {
  model?: string | null;
  prompt?: string | null;
}): Promise<MemoryValidationConfig> {
  const config = await resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', {
    defaultTemperature: 0.2,
    defaultMaxTokens: 500,
    runtimeKind: 'validation',
  });
  const trimmed = params.model?.trim();
  const model = (trimmed !== undefined && trimmed !== '') ? trimmed : config.modelId;
  const prompt = params.prompt ?? '';
  if (model === '') {
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
    return {
      ...parseValidationResponse(response.text),
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

async function performSummarization(args: {
  model: string;
  config: any;
  prompt: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
}): Promise<string | null> {
  const response = await runBrainChatCompletion({
    modelId: args.model,
    temperature: args.config.temperature,
    maxTokens: args.config.maxTokens,
    jsonMode: supportsBrainJsonMode(args.model),
    messages: [
      {
        role: 'system',
        content:
          'You write concise long-term memory summaries. Return only JSON with key summary (string). Keep it 1-2 sentences.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          prompt: args.prompt,
          content: args.content,
          metadata: args.metadata,
        }),
      },
    ],
  });
  const parsed = parseJsonObject(response.text) as { summary?: unknown } | null;
  return (typeof parsed?.summary === 'string' && parsed.summary.trim() !== '') ? parsed.summary.trim() : null;
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
  
  const trimmed = params.summaryModel?.trim();
  const summaryModel = (trimmed !== undefined && trimmed !== '') ? trimmed : config.modelId;
  if (summaryModel === '') return params.summary ?? null;

  try {
    const summary = await performSummarization({
      model: summaryModel,
      config,
      prompt: params.prompt ?? null,
      content: params.content,
      metadata: params.metadata ?? null,
    });
    if (summary) return summary;
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
    model: params.model ?? null,
    prompt: params.prompt ?? null,
    content: params.content,
    summary: summary ?? null,
    metadata: params.metadata ?? undefined,
  });

  if (!validation.valid) {
    return { skipped: true, validation };
  }
  
  const record = await addAgentLongTermMemory({
    ...params,
    summary: summary ?? null,
  });
  
  return { skipped: false, validation, record };
}

function getListFilters(params: {
  memoryKey?: string;
  personaId?: string | null;
  tags?: string[];
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.memoryKey !== undefined && params.memoryKey !== '') {
    where.memoryKey = params.memoryKey;
  }
  if (params.personaId !== null && params.personaId !== undefined && params.personaId !== '') {
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
  if (agentLongTermMemory === null) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      { service: 'agent-memory' }
    );
    return [];
  }
  
  const hasKey = params.memoryKey !== undefined && params.memoryKey !== '';
  const hasPersona = params.personaId !== null && params.personaId !== undefined && params.personaId !== '';
  if (!hasKey && !hasPersona) {
    return [];
  }
  
  const items = await agentLongTermMemory.findMany<AgentLongTermMemoryRecord>({
    where: getListFilters(params),
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
