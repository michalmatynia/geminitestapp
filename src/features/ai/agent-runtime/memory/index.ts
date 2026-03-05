import 'server-only';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import prisma from '@/shared/lib/db/prisma';
import type { MemoryScope } from '@/shared/contracts/agent-runtime';

import type { Prisma } from '@prisma/client';

export type { MemoryScope };
const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const parseJsonObject = (raw: string): unknown => {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch {
    return null;
  }
};

export async function addAgentMemory(params: {
  runId?: string | null;
  scope: MemoryScope;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<Prisma.AgentMemoryItemGetPayload<Record<string, never>> | null> {
  if (!('agentMemoryItem' in prisma)) {
    void ErrorSystem.logWarning('[chatbot][agent][memory] Memory table not initialized.', {
      service: 'agent-memory',
    });
    return null;
  }
  try {
    return prisma.agentMemoryItem.create({
      data: {
        runId: params.runId ?? null,
        scope: params.scope,
        content: params.content,
        ...(params.metadata !== undefined && {
          metadata: params.metadata as Prisma.InputJsonValue,
        }),
      },
    });
  } catch (error) {
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'addAgentMemory',
        runId: params.runId ?? undefined,
      });
    } catch (logError) {
      if (DEBUG_CHATBOT) {
        const { logger } = await import('@/shared/utils/logger');
        logger.error(
          '[chatbot][agent][memory] Failed to add memory (and logging failed)',
          logError,
          {
            runId: params.runId,
            error,
          }
        );
      }
    }
    throw error;
  }
}

export async function listAgentMemory(params: {
  runId?: string | null;
  scope?: MemoryScope;
}): Promise<Prisma.AgentMemoryItemGetPayload<Record<string, never>>[]> {
  if (!('agentMemoryItem' in prisma)) {
    void ErrorSystem.logWarning('[chatbot][agent][memory] Memory table not initialized.', {
      service: 'agent-memory',
    });
    return [];
  }
  try {
    return prisma.agentMemoryItem.findMany({
      where: {
        ...(params.runId ? { runId: params.runId } : {}),
        ...(params.scope ? { scope: params.scope } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'listAgentMemory',
        runId: params.runId ?? undefined,
        scope: params.scope,
      });
    } catch (logError) {
      if (DEBUG_CHATBOT) {
        const { logger } = await import('@/shared/utils/logger');
        logger.error(
          '[chatbot][agent][memory] Failed to list memory (and logging failed)',
          logError,
          {
            runId: params.runId,
            scope: params.scope,
            error,
          }
        );
      }
    }
    throw error;
  }
}

export async function addAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  content: string;
  summary?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importance?: number | null;
}): Promise<Prisma.AgentLongTermMemoryGetPayload<Record<string, never>> | null> {
  if (!('agentLongTermMemory' in prisma)) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      {
        service: 'agent-memory',
      }
    );
    return null;
  }
  try {
    return prisma.agentLongTermMemory.create({
      data: {
        memoryKey: params.memoryKey,
        runId: params.runId ?? null,
        content: params.content,
        summary: params.summary ?? null,
        tags: params.tags ?? [],
        ...(params.metadata !== undefined && {
          metadata: params.metadata as Prisma.InputJsonValue,
        }),
        importance: params.importance ?? null,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error) {
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'addAgentLongTermMemory',
        memoryKey: params.memoryKey,
        runId: params.runId ?? undefined,
      });
    } catch (logError) {
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
  content: string;
  summary?: string | null;
  summaryModel?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importance?: number | null;
  model?: string | null;
  prompt?: string | null;
}): Promise<{
  skipped: boolean;
  validation: Awaited<ReturnType<typeof validateAgentLongTermMemory>>;
  record?: Prisma.AgentLongTermMemoryGetPayload<Record<string, never>> | null;
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
    } catch {
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
    content: params.content,
    ...(summary !== undefined && { summary }),
    tags: params.tags ?? [],
    ...(params.metadata !== undefined && { metadata: params.metadata }),
    importance: params.importance ?? null,
  });
  return { skipped: false, validation, record };
}

export async function listAgentLongTermMemory(params: {
  memoryKey: string;
  limit?: number;
  tags?: string[];
}): Promise<Prisma.AgentLongTermMemoryGetPayload<Record<string, never>>[]> {
  if (!('agentLongTermMemory' in prisma)) {
    void ErrorSystem.logWarning(
      '[chatbot][agent][memory] Long-term memory table not initialized.',
      {
        service: 'agent-memory',
      }
    );
    return [];
  }
  try {
    const tagFilter = params.tags && params.tags.length > 0 ? { hasSome: params.tags } : undefined;
    const items = await prisma.agentLongTermMemory.findMany({
      where: {
        memoryKey: params.memoryKey,
        ...(tagFilter ? { tags: tagFilter } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: params.limit ?? 5,
    });
    const ids = items.map(
      (item: Prisma.AgentLongTermMemoryGetPayload<Record<string, never>>) => item.id
    );
    if (ids.length > 0) {
      await prisma.agentLongTermMemory.updateMany({
        where: { id: { in: ids } },
        data: { lastAccessedAt: new Date() },
      });
    }
    return items;
  } catch (error) {
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'listAgentLongTermMemory',
        memoryKey: params.memoryKey,
      });
    } catch (logError) {
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
