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

function resolveTopicHints(userMessage: string, assistantMessage: string, providedTopicHints?: string[]): string[] {
  const combinedText = [userMessage, assistantMessage].filter((part) => part !== '').join('\n');
  return uniqueStrings([
    ...(providedTopicHints ?? []),
    ...extractTopicHints(combinedText),
  ]).slice(0, 6);
}

function resolveMoodHints(assistantMessage: string, providedMoodHints?: AgentPersonaMoodId[]): AgentPersonaMoodId[] {
  const inferredMoodHints = normalizeMoodHints(providedMoodHints ?? [], assistantMessage);
  return Array.from(new Set([...(providedMoodHints ?? []), ...inferredMoodHints]));
}

function resolveTags(sourceType: string, providedTags?: string[]): string[] {
  return uniqueStrings([
    'persona-memory',
    sourceType,
    ...(providedTags ?? []),
  ]);
}

function resolveContent(userMessage: string, assistantMessage: string): string {
  return userMessage !== ''
    ? `User: ${userMessage}\nAssistant: ${assistantMessage}`
    : `Assistant: ${assistantMessage}`;
}

function resolveSummary(userMessage: string, assistantMessage: string): string {
  return userMessage !== ''
    ? `User asked: ${truncateText(userMessage, 90)} Assistant replied: ${truncateText(assistantMessage, 120)}`
    : truncateText(assistantMessage, 180);
}

const resolvePersistenceMetadata = (params: PersistAgentPersonaExchangeMemoryParams, userMessage: string): Record<string, unknown> => {
  return {
    ...(params.metadata ?? {}),
    ...(params.sessionId !== undefined && params.sessionId !== null ? { sessionId: params.sessionId } : {}),
    originRole: 'assistant',
    ...(userMessage !== '' ? { latestUserMessage: userMessage } : {}),
  };
};

export async function persistAgentPersonaExchangeMemory(
  params: PersistAgentPersonaExchangeMemoryParams
): Promise<void> {
  const personaId = params.personaId.trim();
  const assistantMessage = params.assistantMessage.trim();
  const userMessage = (params.userMessage ?? '').trim();

  if (personaId === '' || assistantMessage === '') {
    return;
  }

  await addAgentLongTermMemory({
    memoryKey: buildAgentPersonaMemoryKey(personaId),
    personaId,
    content: resolveContent(userMessage, assistantMessage),
    summary: resolveSummary(userMessage, assistantMessage),
    tags: resolveTags(params.sourceType, params.tags),
    topicHints: resolveTopicHints(userMessage, assistantMessage, params.topicHints),
    moodHints: resolveMoodHints(assistantMessage, params.moodHints),
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    sourceLabel: params.sourceLabel ?? null,
    sourceCreatedAt: params.sourceCreatedAt ?? null,
    metadata: resolvePersistenceMetadata(params, userMessage),
    importance: params.sourceType === 'chat_message' ? 2 : 3,
  });
}
