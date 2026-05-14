import 'server-only';

import {
  getAgentLongTermMemoryDelegate,
  getChatbotMessageDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { buildAgentPersonaSettings, fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import type {
  AgentPersona,
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
  formatMemoryPromptLine,
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

export {
  persistAgentPersonaExchangeMemory,
  type PersistAgentPersonaExchangeMemoryParams,
} from './persona-memory-persistence';

export const buildAgentPersonaMemoryKey = (personaId: string): string => `persona:${personaId}`;

export const getAgentPersonaById = async (personaId: string): Promise<AgentPersona | null> => {
  const personas = await fetchAgentPersonas();
  return personas.find((persona) => persona.id === personaId) ?? null;
};

type SearchAgentPersonaMemoryParams = {
  personaId: string;
  q?: string | null;
  tag?: string | null;
  topic?: string | null;
  mood?: AgentPersonaMoodId | null;
  sourceType?: PersonaMemorySourceType | null;
  limit?: number;
};

type BuildPersonaChatMemoryContextParams = {
  personaId: string;
  latestUserMessage?: string | null;
};

function buildMemoryQuery(params: {
  personaId: string;
  sourceType: string | null;
  tag: string | null;
  topic: string | null;
  mood: string | null;
  searchTerms: string[];
  take: number;
}) {
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
}) {
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

  const rawQ = params.q;
  const searchQuery = rawQ !== null && rawQ !== undefined ? rawQ.trim() : null;
  const rawTag = params.tag;
  const tag = rawTag !== null && rawTag !== undefined ? rawTag.trim() : null;

  const topic = normalizeTopicFilter(params.topic);
  const mood = params.mood ?? null;
  const sourceType = params.sourceType ?? null;
  const searchTerms = buildSearchTerms(searchQuery);
  const { allowMessages, allowMemoryEntries } = resolveSourceTypeFilter(sourceType);
  const agentLongTermMemory = getAgentLongTermMemoryDelegate();
  const chatbotMessage = getChatbotMessageDelegate();

  const hasFilter = searchTerms.length > 0 || tag !== null || topic !== null || mood !== null;
  const candidateLimit = hasFilter ? clamp(limit * 4, limit, 200, limit) : limit;

  const memoryQuery =
    allowMemoryEntries && memorySettings.enabled !== false && agentLongTermMemory !== null
      ? agentLongTermMemory.findMany<PersonaMemoryEntryRecord>(buildMemoryQuery({
        personaId,
        sourceType,
        tag,
        topic,
        mood,
        searchTerms,
        take: candidateLimit,
      }))
      : Promise.resolve<PersonaMemoryEntryRecord[]>([]);

  const messageQuery =
    allowMessages && memorySettings.includeChatHistory !== false && tag === null && chatbotMessage !== null
      ? chatbotMessage.findMany<PersonaConversationMessageRecord>(buildMessageQuery({
        personaId,
        searchTerms,
        take: candidateLimit,
      }))
      : Promise.resolve<PersonaConversationMessageRecord[]>([]);

  const [memoryEntries, conversationMessages] = await Promise.all([memoryQuery, messageQuery]);

  if (memoryEntries.length > 0 && agentLongTermMemory !== null) {
    await agentLongTermMemory.updateMany({
      where: {
        id: { in: memoryEntries.map((item) => item.id) },
      },
      data: { lastAccessedAt: new Date() },
    });
  }

  const memoryItems = memoryEntries.map((item) => mapMemoryEntryToRecord(item, personaId));
  const messageItems = conversationMessages.map((message) => mapConversationMessageToRecord(message, personaId));

  const items = [...memoryItems, ...messageItems]
    .filter((item) => matchesPersonaMemoryRecord(item, { tag, topic, mood, searchTerms }))
    .sort((left, right) => {
      const scoreDelta =
        scorePersonaMemoryRecord(right, { tag, topic, mood, searchTerms }) -
        scorePersonaMemoryRecord(left, { tag, topic, mood, searchTerms });
      return scoreDelta !== 0 ? scoreDelta : toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    })
    .slice(0, limit);

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

export async function buildPersonaChatMemoryContext(
  params: BuildPersonaChatMemoryContextParams
): Promise<{
  persona: AgentPersona;
  memory: PersonaMemorySearchResponse;
  systemPrompt: string;
  suggestedMoodId: AgentPersonaMoodId | null;
}> {
  const persona = await getAgentPersonaById(params.personaId);
  if (persona === null) {
    throw new Error(`Agent persona "${params.personaId}" was not found.`);
  }

  const settings = buildAgentPersonaSettings(persona.settings);
  const memorySettings = settings.memory ?? {};
  const limit = clamp(memorySettings.defaultSearchLimit, 1, 12, 6);
  const latestUserMessageRaw = params.latestUserMessage;
  const latestUserMessage = latestUserMessageRaw !== null && latestUserMessageRaw !== undefined ? latestUserMessageRaw.trim() : null;

  const memory = memorySettings.enabled === false
    ? {
      items: [],
      summary: {
        personaId: params.personaId,
        suggestedMoodId: null,
        totalRecords: 0,
        memoryEntryCount: 0,
        conversationMessageCount: 0,
      },
    }
    : await searchAgentPersonaMemory({
      personaId: params.personaId,
      q: latestUserMessage,
      limit,
    });

  const memoryLines = memory.items.slice(0, limit).map(formatMemoryPromptLine);
  const promptSections = [
    `Active persona: ${persona.name}${persona.role !== null ? ` (${persona.role})` : ''}.`,
    persona.instructions !== null ? `Persona instructions: ${persona.instructions}` : null,
    memory.summary.suggestedMoodId !== null ? `Memory-informed mood: ${memory.summary.suggestedMoodId}.` : null,
    memoryLines.length > 0 ? `Relevant persona memory:\n${memoryLines.join('\n')}` : null,
  ].filter((section): section is string => section !== null);

  return {
    persona,
    memory,
    systemPrompt: promptSections.join('\n\n'),
    suggestedMoodId: memory.summary.suggestedMoodId,
  };
}
