import { addAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemorySourceType } from '@/shared/contracts/persona-memory';
import {
  uniqueStrings,
  extractTopicHints,
  normalizeMoodHints,
  truncateText,
} from './persona-memory-utils';
import { buildAgentPersonaMemoryKey } from './persona-memory';

export type PersistAgentPersonaExchangeMemoryParams = {
  personaId: string;
  sourceType: PersonaMemorySourceType;
  sourceId: string;
  sourceLabel?: string | null;
  sourceCreatedAt?: string | Date | null;
  sessionId?: string | null;
  userMessage?: string | null;
  assistantMessage: string;
  tags?: string[];
  topicHints?: string[];
  moodHints?: AgentPersonaMoodId[];
  metadata?: Record<string, unknown>;
};

export async function persistAgentPersonaExchangeMemory(
  params: PersistAgentPersonaExchangeMemoryParams
): Promise<void> {
  const personaId = params.personaId.trim();
  const assistantMessage = params.assistantMessage.trim();
  const userMessageRaw = params.userMessage;
  const userMessage = userMessageRaw !== null && userMessageRaw !== undefined ? userMessageRaw.trim() : '';

  if (personaId === '' || assistantMessage === '') {
    return;
  }

  const combinedText = [userMessage, assistantMessage].filter((part) => part !== '').join('\n');
  const topicHints = uniqueStrings([
    ...(params.topicHints ?? []),
    ...extractTopicHints(combinedText),
  ]).slice(0, 6);
  const inferredMoodHints = normalizeMoodHints(params.moodHints ?? [], assistantMessage);
  const moodHints = Array.from(new Set([...(params.moodHints ?? []), ...inferredMoodHints]));
  const tags = uniqueStrings([
    'persona-memory',
    params.sourceType,
    ...(params.tags ?? []),
  ]);

  const content = userMessage !== ''
    ? `User: ${userMessage}\nAssistant: ${assistantMessage}`
    : `Assistant: ${assistantMessage}`;
  const summary = userMessage !== ''
    ? `User asked: ${truncateText(userMessage, 90)} Assistant replied: ${truncateText(assistantMessage, 120)}`
    : truncateText(assistantMessage, 180);

  await addAgentLongTermMemory({
    memoryKey: buildAgentPersonaMemoryKey(personaId),
    personaId,
    content,
    summary,
    tags,
    topicHints,
    moodHints,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    sourceLabel: params.sourceLabel ?? null,
    sourceCreatedAt: params.sourceCreatedAt ?? null,
    metadata: {
      ...(params.metadata ?? {}),
      ...(params.sessionId !== null && params.sessionId !== undefined ? { sessionId: params.sessionId } : {}),
      originRole: 'assistant',
      ...(userMessage !== '' ? { latestUserMessage: userMessage } : {}),
    },
    importance: params.sourceType === 'chat_message' ? 2 : 3,
  });
}
