import {
  type AgentMemoryItemRecord,
  getAgentMemoryItemDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import type { InputJsonValue } from '@/shared/contracts/json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { DEBUG_CHATBOT, type MemoryScope } from './shared';

const recordShortTermMemoryAudit = async (
  runId: string | undefined,
  action: string,
  error: unknown,
  scope?: MemoryScope
): Promise<void> => {
  void ErrorSystem.captureException(error);
  try {
    await ErrorSystem.captureException(error, {
      service: 'agent-memory',
      action,
      runId,
      scope,
    });
  } catch (logError) {
    void ErrorSystem.captureException(logError);
    if (DEBUG_CHATBOT) {
      const { logger } = await import('@/shared/utils/logger');
      logger.error(
        `[chatbot][agent][memory] Failed to ${action} memory (and logging failed)`,
        logError,
        { runId, scope, error }
      );
    }
  }
};

interface ShortTermMemoryData {
  runId: string | null;
  personaId: string | null;
  scope: MemoryScope;
  content: string;
  metadata?: InputJsonValue;
}

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
    const data: ShortTermMemoryData = {
      runId: params.runId ?? null,
      personaId: params.personaId ?? null,
      scope: params.scope,
      content: params.content,
    };
    if (params.metadata !== undefined) {
      data.metadata = params.metadata as InputJsonValue;
    }
    return await agentMemoryItem.create<AgentMemoryItemRecord>({ data: data as unknown as any });
  } catch (error) {
    await recordShortTermMemoryAudit(params.runId ?? undefined, 'addAgentMemory', error, params.scope);
    throw error;
  }
}

interface ListMemoryFilters {
  runId?: string;
  personaId?: string;
  scope?: MemoryScope;
}

const buildListMemoryFilters = (params: {
  runId?: string | null;
  personaId?: string | null;
  scope?: MemoryScope;
}): ListMemoryFilters => {
  const where: ListMemoryFilters = {};
  if (params.runId !== null && params.runId !== undefined && params.runId !== '') {
    where.runId = params.runId;
  }
  if (params.personaId !== null && params.personaId !== undefined && params.personaId !== '') {
    where.personaId = params.personaId;
  }
  if (params.scope !== undefined) {
    where.scope = params.scope;
  }
  return where;
};

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
    const where = buildListMemoryFilters(params);
    return await agentMemoryItem.findMany<AgentMemoryItemRecord>({
      where: where as unknown as any,
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    await recordShortTermMemoryAudit(params.runId ?? undefined, 'listAgentMemory', error, params.scope);
    throw error;
  }
}
