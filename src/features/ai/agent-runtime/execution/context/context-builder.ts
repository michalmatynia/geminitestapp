import {
  addAgentMemory,
  listAgentLongTermMemory,
  listAgentMemory,
} from '@/features/ai/agent-runtime/memory';
import {
  buildSelfImprovementPlaybook,
  jsonValueToRecord,
} from '@/features/ai/agent-runtime/core/utils';
import { logAgentAudit } from '@/features/ai/agent-runtime/audit';

interface ContextMemoryResult {
  sessionContext: string[];
  longTermContext: string[];
  selfImprovementPlaybook: string | null;
}

export async function fetchContextMemory(
  runId: string,
  personaId: string | null | undefined,
  memoryKey: string | null
): Promise<ContextMemoryResult> {
  await addAgentMemory({
    runId,
    personaId: personaId ?? null,
    scope: 'session',
    content: 'Context initialization',
    metadata: { source: 'system' },
  });

  const memory = await listAgentMemory({
    runId,
    personaId: personaId ?? null,
    scope: 'session',
  });
  
  const sessionContext = memory.map((item: { content: string }) => item.content).slice(-8);

  const getSharedMemoryLookup = (pId: string | null | undefined, mKey: string | null): { personaId: string } | { memoryKey: string } | null => {
    if (pId !== null && pId !== undefined && pId.trim().length > 0) {
      return { personaId: pId.trim() };
    }
    if (mKey !== null && mKey.length > 0) {
      return { memoryKey: mKey };
    }
    return null;
  };

  const sharedMemoryLookup = getSharedMemoryLookup(personaId, memoryKey);

  const [longTermItems, longTermProblemItems, longTermImprovementItems] = sharedMemoryLookup
    ? await Promise.all([
        listAgentLongTermMemory({ ...sharedMemoryLookup, limit: 4 }),
        listAgentLongTermMemory({ ...sharedMemoryLookup, limit: 4, tags: ['problem-solution'] }),
        listAgentLongTermMemory({ ...sharedMemoryLookup, limit: 3, tags: ['self-improvement'] }),
      ])
    : [[], [], []];

  const selfImprovementPlaybook = buildSelfImprovementPlaybook(
    longTermImprovementItems.map(
      (item) => ({
        summary: item.summary,
        content: item.content,
        metadata: jsonValueToRecord(item.metadata),
      })
    )
  );

  const longTermContext = [...longTermItems, ...longTermProblemItems, ...longTermImprovementItems]
    .map((item: { summary: string | null; content: string }) => item.summary ?? item.content)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((item: string) => `Long-term memory: ${  item}`);

  if (longTermImprovementItems.length > 0) {
    await logAgentAudit(runId, 'info', 'Self-improvement memory loaded.', {
      type: 'self-improvement-context',
      count: longTermImprovementItems.length,
    });
  }

  return { sessionContext, longTermContext, selfImprovementPlaybook };
}
