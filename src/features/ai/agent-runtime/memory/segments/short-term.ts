import {
  type AgentMemoryItemRecord,
  getAgentMemoryItemDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import type { InputJsonValue } from '@/shared/contracts/json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { DEBUG_CHATBOT, type MemoryScope } from './shared';

export async function addAgentMemory(params: {
  runId?: string | null;
  personaId?: string | null;
  scope: MemoryScope;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<AgentMemoryItemRecord | null> {
  const agentMemoryItem = getAgentMemoryItemDelegate();
  if (!agentMemoryItem) {
    void ErrorSystem.logWarning('[chatbot][agent][memory] Memory table not initialized.', {
      service: 'agent-memory',
    });
    return null;
  }
  try {
    return await agentMemoryItem.create<AgentMemoryItemRecord>({
      data: {
        runId: params.runId ?? null,
        personaId: params.personaId ?? null,
        scope: params.scope,
        content: params.content,
        ...(params.metadata !== undefined && {
          metadata: params.metadata as InputJsonValue,
        }),
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'addAgentMemory',
        runId: params.runId ?? undefined,
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
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
  personaId?: string | null;
  scope?: MemoryScope;
}): Promise<AgentMemoryItemRecord[]> {
  const agentMemoryItem = getAgentMemoryItemDelegate();
  if (!agentMemoryItem) {
    void ErrorSystem.logWarning('[chatbot][agent][memory] Memory table not initialized.', {
      service: 'agent-memory',
    });
    return [];
  }
  try {
    return await agentMemoryItem.findMany<AgentMemoryItemRecord>({
      where: {
        ...(params.runId ? { runId: params.runId } : {}),
        ...(params.personaId ? { personaId: params.personaId } : {}),
        ...(params.scope ? { scope: params.scope } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-memory',
        action: 'listAgentMemory',
        runId: params.runId ?? undefined,
        scope: params.scope,
      });
    } catch (logError) {
      void ErrorSystem.captureException(logError);
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
