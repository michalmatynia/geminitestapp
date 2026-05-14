import {
  getAgentLongTermMemoryDelegate,
  getChatbotMessageDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { buildAgentPersonaSettings } from '@/features/ai/agentcreator/utils/personas';
import type {
  AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type {
  PersonaMemoryRecord,
  PersonaMemorySearchResponse,
  PersonaMemorySourceType,
} from '@/shared/contracts/persona-memory';

import {
  clamp,
  countSuggestedMood,
  resolveSourceTypeFilter,
  buildSearchTerms,
  normalizeTopicFilter,
  toTimestamp,
} from './persona-memory-utils';
import {
  matchesPersonaMemoryRecord,
  scorePersonaMemoryRecord,
} from './persona-memory-scoring';
import {
  mapMemoryEntryToRecord,
  mapConversationMessageToRecord,
} from './persona-memory-mappers';
import type {
  PersonaMemoryEntryRecord,
  PersonaConversationMessageRecord,
} from './persona-memory-types';
import { getAgentPersonaById } from './persona-memory';

export type SearchAgentPersonaMemoryParams = {
  personaId: string;
  q?: string | null;
  tag?: string | null;
  topic?: string | null;
  mood?: AgentPersonaMoodId | null;
  sourceType?: PersonaMemorySourceType | null;
  limit?: number;
};

function buildMemoryQuery(params: {
  personaId: string;
  sourceType: string | null;
  tag: string | null;
  topic: string | null;
  mood: string | null;
  searchTerms: string[];
  take: number;
}): Record<string, unknown> {
  return {
    where: {
      personaId: params.personaId,
      ...(params.sourceType !== null ? { sourceType: params.sourceType } : {}),
      ...(params.tag !== null ? { tags: { has: params.tag } } : {}),
      ...(params.topic !== null ? { topicHints: { has: params.topic } } : {}),
      ...(params.mood !== null ? { moodHints: { has: params.mood } } : {}),
      ...(params.searchTerms.length > 0
        ? {
          OR: params.searchTerms.flatMap((term) => [
            { content: { contains: term, mode: 'insensitive' as const } },
            { summary: { contains: term, mode: 'insensitive' as const } },
            { sourceLabel: { contains: term, mode: 'insensitive' as const } },
            { tags: { has: term } },
            { topicHints: { has: term } },
          ]),
        }
        : {}),
    },
    orderBy: { updatedAt: 'desc' as const },
    take: params.take,
  };
}

function buildMessageQuery(params: {
  personaId: string;
  searchTerms: string[];
  take: number;
}): Record<string, unknown> {
  return {
    where: {
      session: { personaId: params.personaId },
      ...(params.searchTerms.length > 0
        ? {
          OR: params.searchTerms.flatMap((term) => [
            { content: { contains: term, mode: 'insensitive' as const } },
            {
              session: {
                title: { contains: term, mode: 'insensitive' as const },
              },
            },
          ]),
        }
        : {}),
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: params.take,
  };
}

function normalizeSearchParams(params: SearchAgentPersonaMemoryParams): {
  searchQuery: string | null;
  tag: string | null;
  topic: string | null;
  mood: AgentPersonaMoodId | null;
  sourceType: PersonaMemorySourceType | null;
  searchTerms: string[];
} {
  const rawQ = params.q;
  const searchQuery = rawQ !== null && rawQ !== undefined ? rawQ.trim() : null;
  const rawTag = params.tag;
  const tag = rawTag !== null && rawTag !== undefined ? rawTag.trim() : null;

  return {
    searchQuery,
    tag,
    topic: normalizeTopicFilter(params.topic),
    mood: params.mood ?? null,
    sourceType: params.sourceType ?? null,
    searchTerms: buildSearchTerms(searchQuery),
  };
}

function processMemoryResults(
  memoryEntries: PersonaMemoryEntryRecord[],
  conversationMessages: PersonaConversationMessageRecord[],
  personaId: string,
  params: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
    limit: number;
  }
): PersonaMemoryRecord[] {
  const memoryItems = memoryEntries.map((item) => mapMemoryEntryToRecord(item, personaId));
  const messageItems = conversationMessages.map((message) => mapConversationMessageToRecord(message, personaId));

  return [...memoryItems, ...messageItems]
    .filter((item) => matchesPersonaMemoryRecord(item, params))
    .sort((left, right) => {
      const scoreDelta =
        scorePersonaMemoryRecord(right, params) -
        scorePersonaMemoryRecord(left, params);
      return scoreDelta !== 0 ? scoreDelta : toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    })
    .slice(0, params.limit);
}

function resolveCandidateLimit(limit: number, hasFilter: boolean): number {
  return hasFilter ? clamp(limit * 4, limit, 200, limit) : limit;
}

async function fetchMemoryEntries(params: {
  personaId: string;
  sourceType: PersonaMemorySourceType | null;
  tag: string | null;
  topic: string | null;
  mood: AgentPersonaMoodId | null;
  searchTerms: string[];
  take: number;
  enabled: boolean;
}): Promise<PersonaMemoryEntryRecord[]> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (!params.enabled || agentLongTermMemory === null) {
    return [];
  }

  return agentLongTermMemory.findMany<PersonaMemoryEntryRecord>(buildMemoryQuery({
    personaId: params.personaId,
    sourceType: params.sourceType,
    tag: params.tag,
    topic: params.topic,
    mood: params.mood,
    searchTerms: params.searchTerms,
    take: params.take,
  }));
}

async function fetchConversationMessages(params: {
  personaId: string;
  searchTerms: string[];
  take: number;
  enabled: boolean;
}): Promise<PersonaConversationMessageRecord[]> {
  const chatbotMessage = getChatbotMessageDelegate();
  if (!params.enabled || chatbotMessage === null) {
    return [];
  }

  return chatbotMessage.findMany<PersonaConversationMessageRecord>(buildMessageQuery({
    personaId: params.personaId,
    searchTerms: params.searchTerms,
    take: params.take,
  }));
}

async function updateLastAccessedAt(memoryEntries: PersonaMemoryEntryRecord[]): Promise<void> {
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  if (memoryEntries.length === 0 || agentLongTermMemory === null) {
    return;
  }

  await agentLongTermMemory.updateMany({
    where: { id: { in: memoryEntries.map((item) => item.id) } },
    data: { lastAccessedAt: new Date() },
  });
}

export async function searchAgentPersonaMemory(
  params: SearchAgentPersonaMemoryParams
): Promise<PersonaMemorySearchResponse> {
  const personaId = params.personaId;
  const persona = await getAgentPersonaById(personaId);
  if (persona === null) {
    throw new Error(`Agent persona "${personaId}" was not found.`);
  }

  const settings = buildAgentPersonaSettings(persona.settings);
  const memorySettings = settings.memory ?? {};
  const limit = clamp(params.limit, 1, 100, memorySettings.defaultSearchLimit ?? 20);

  const normalized = normalizeSearchParams(params);
  const { allowMessages, allowMemoryEntries } = resolveSourceTypeFilter(normalized.sourceType);

  const hasFilter = normalized.searchTerms.length > 0 || normalized.tag !== null || normalized.topic !== null || normalized.mood !== null;
  const candidateLimit = resolveCandidateLimit(limit, hasFilter);

  const [memoryEntries, conversationMessages] = await Promise.all([
    fetchMemoryEntries({
      ...normalized,
      personaId,
      take: candidateLimit,
      enabled: allowMemoryEntries && memorySettings.enabled !== false,
    }),
    fetchConversationMessages({
      personaId,
      searchTerms: normalized.searchTerms,
      take: candidateLimit,
      enabled: allowMessages && memorySettings.includeChatHistory !== false && normalized.tag === null,
    }),
  ]);

  await updateLastAccessedAt(memoryEntries);

  const items = processMemoryResults(memoryEntries, conversationMessages, personaId, {
    ...normalized,
    limit,
  });

  return {
    items,
    summary: {
      personaId,
      suggestedMoodId: memorySettings.useMoodSignals === false ? null : countSuggestedMood(items),
      totalRecords: items.length,
      memoryEntryCount: items.filter((item) => item.recordType === 'memory_entry').length,
      conversationMessageCount: items.filter((item) => item.recordType === 'conversation_message').length,
    },
  };
}
