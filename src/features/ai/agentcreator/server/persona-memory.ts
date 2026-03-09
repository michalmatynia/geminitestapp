import 'server-only';

import type { Prisma } from '@/shared/lib/db/prisma-client';

import { addAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';
import {
  AGENT_PERSONA_MOOD_IDS,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type {
  PersonaMemoryRecord,
  PersonaMemorySearchResponse,
  PersonaMemorySourceType,
} from '@/shared/contracts/persona-memory';
import { buildAgentPersonaSettings, fetchAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import prisma from '@/shared/lib/db/prisma';

const MOOD_ID_SET = new Set<AgentPersonaMoodId>(AGENT_PERSONA_MOOD_IDS);
const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'agent',
  'because',
  'before',
  'being',
  'chat',
  'could',
  'first',
  'from',
  'have',
  'into',
  'just',
  'lesson',
  'memory',
  'message',
  'more',
  'page',
  'practice',
  'should',
  'student',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'topic',
  'tutor',
  'when',
  'which',
  'with',
  'would',
]);

const MOOD_KEYWORDS: Record<Exclude<AgentPersonaMoodId, 'neutral'>, string[]> = {
  thinking: ['think', 'consider', 'analyze', 'reason', 'step', 'reflect'],
  encouraging: ['keep going', 'you can', 'try again', 'practice', 'let us', 'let\'s', 'progress'],
  happy: ['glad', 'happy', 'pleased', 'delighted', 'enjoyed'],
  celebrating: ['great job', 'well done', 'congrat', 'excellent', 'amazing', 'celebrate'],
};

const clamp = (value: number | undefined, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value!)));
};

const asRecord = (
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');

const truncateText = (value: string, maxLength: number): string => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
};

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const extractTopicHints = (text: string, fallback: string[] = []): string[] => {
  const tokens = normalizeText(text)
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g);
  if (!tokens) {
    return fallback.slice(0, 5);
  }

  const unique = new Set<string>(fallback.map((item) => item.toLowerCase()));
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    unique.add(token);
    if (unique.size >= 5) break;
  }
  return Array.from(unique).slice(0, 5);
};

const inferMoodHintsFromText = (text: string): AgentPersonaMoodId[] => {
  const normalized = normalizeText(text).toLowerCase();
  const matches = Object.entries(MOOD_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([moodId]) => moodId as AgentPersonaMoodId);
  return matches;
};

const normalizeMoodHints = (
  moodHints: string[] | null | undefined,
  text: string
): AgentPersonaMoodId[] => {
  const normalized = Array.from(
    new Set(
      (moodHints ?? []).filter((moodId: string): moodId is AgentPersonaMoodId =>
        MOOD_ID_SET.has(moodId as AgentPersonaMoodId)
      )
    )
  );
  if (normalized.length > 0) return normalized;
  return inferMoodHintsFromText(text);
};

const countSuggestedMood = (items: PersonaMemoryRecord[]): AgentPersonaMoodId | null => {
  const counts = new Map<AgentPersonaMoodId, number>();

  items.forEach((item) => {
    item.moodHints.forEach((moodId) => {
      counts.set(moodId, (counts.get(moodId) ?? 0) + 1);
    });
  });

  const ordered = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  return ordered[0]?.[0] ?? null;
};

const resolveSourceTypeFilter = (
  sourceType: PersonaMemorySourceType | null | undefined
): { allowMessages: boolean; allowMemoryEntries: boolean } => {
  if (!sourceType) {
    return {
      allowMessages: true,
      allowMemoryEntries: true,
    };
  }

  if (sourceType === 'chat_message') {
    return {
      allowMessages: true,
      allowMemoryEntries: true,
    };
  }

  return {
    allowMessages: false,
    allowMemoryEntries: true,
  };
};

const uniqueStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    )
  );

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

type PersistAgentPersonaExchangeMemoryParams = {
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

const uniqueLowercaseStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? normalizeText(value).toLowerCase() : ''))
        .filter(Boolean)
    )
  );

const buildSearchTerms = (value?: string | null): string[] =>
  uniqueLowercaseStrings([
    value ?? null,
    ...extractTopicHints(value ?? ''),
  ]);

const normalizeTopicFilter = (value?: string | null): string | null => {
  const extractedHints = extractTopicHints(value ?? '');
  if (extractedHints.length > 0) {
    return extractedHints[0] ?? null;
  }

  return uniqueLowercaseStrings([value ?? null])[0] ?? null;
};

const matchesExactOrPartial = (values: string[], expected: string): boolean => {
  const normalizedExpected = normalizeText(expected).toLowerCase();
  return values.some((value) => {
    const normalizedValue = normalizeText(value).toLowerCase();
    return (
      normalizedValue === normalizedExpected ||
      normalizedValue.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedValue)
    );
  });
};

const buildRecordSearchHaystacks = (item: PersonaMemoryRecord): string[] =>
  uniqueLowercaseStrings([
    item.content,
    item.summary ?? null,
    item.title ?? null,
    item.sourceLabel ?? null,
    item.role ?? null,
    ...item.tags,
    ...item.topicHints,
    ...item.moodHints,
  ]);

const countMatchingSearchTerms = (item: PersonaMemoryRecord, searchTerms: string[]): number => {
  if (searchTerms.length === 0) {
    return 0;
  }

  const haystacks = buildRecordSearchHaystacks(item);
  return searchTerms.filter((term) => haystacks.some((value) => value.includes(term))).length;
};

const matchesPersonaMemoryRecord = (
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): boolean => {
  const normalizedTags = uniqueLowercaseStrings(item.tags);

  if (filters.tag && !matchesExactOrPartial(normalizedTags, filters.tag)) {
    return false;
  }

  if (filters.topic && !matchesExactOrPartial(item.topicHints, filters.topic)) {
    return false;
  }

  if (filters.mood && !item.moodHints.includes(filters.mood)) {
    return false;
  }

  if (filters.searchTerms.length > 0 && countMatchingSearchTerms(item, filters.searchTerms) === 0) {
    return false;
  }

  return true;
};

const scorePersonaMemoryRecord = (
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): number => {
  let score = countMatchingSearchTerms(item, filters.searchTerms) * 10;

  if (filters.tag && matchesExactOrPartial(item.tags, filters.tag)) {
    score += 8;
  }

  if (filters.topic && matchesExactOrPartial(item.topicHints, filters.topic)) {
    score += 12;
  }

  if (filters.mood && item.moodHints.includes(filters.mood)) {
    score += 10;
  }

  if (item.recordType === 'memory_entry') {
    score += 1;
  }

  return score;
};

export async function searchAgentPersonaMemory(
  params: SearchAgentPersonaMemoryParams
): Promise<PersonaMemorySearchResponse> {
  const persona = await getAgentPersonaById(params.personaId);
  if (!persona) {
    throw new Error(`Agent persona "${params.personaId}" was not found.`);
  }

  const settings = buildAgentPersonaSettings(persona.settings);
  const memorySettings = settings.memory ?? {};
  const limit = clamp(params.limit, 1, 100, memorySettings.defaultSearchLimit ?? 20);
  const searchQuery = params.q?.trim() || null;
  const tag = params.tag?.trim() || null;
  const topic = normalizeTopicFilter(params.topic);
  const mood = params.mood ?? null;
  const sourceType = params.sourceType ?? null;
  const searchTerms = buildSearchTerms(searchQuery);
  const { allowMessages, allowMemoryEntries } = resolveSourceTypeFilter(sourceType);
  const candidateLimit =
    searchTerms.length > 0 || tag || topic || mood
      ? clamp(limit * 4, limit, 200, limit)
      : limit;

  const memoryQuery =
    allowMemoryEntries && memorySettings.enabled !== false
      ? prisma.agentLongTermMemory.findMany({
        where: {
          personaId: params.personaId,
          ...(sourceType ? { sourceType } : {}),
          ...(tag ? { tags: { has: tag } } : {}),
          ...(topic ? { topicHints: { has: topic } } : {}),
          ...(mood ? { moodHints: { has: mood } } : {}),
          ...(searchTerms.length > 0
            ? {
              OR: searchTerms.flatMap((term) => [
                { content: { contains: term, mode: 'insensitive' as const } },
                { summary: { contains: term, mode: 'insensitive' as const } },
                { sourceLabel: { contains: term, mode: 'insensitive' as const } },
                { tags: { has: term } },
                { topicHints: { has: term } },
              ]),
            }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: candidateLimit,
      })
      : Promise.resolve([]);

  const messageQuery =
    allowMessages && memorySettings.includeChatHistory !== false && !tag
      ? prisma.chatbotMessage.findMany({
        where: {
          session: {
            personaId: params.personaId,
          },
          ...(searchTerms.length > 0
            ? {
              OR: searchTerms.flatMap((term) => [
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
        orderBy: { createdAt: 'desc' },
        take: candidateLimit,
      })
      : Promise.resolve([]);

  const [memoryEntries, conversationMessages] = await Promise.all([memoryQuery, messageQuery]);

  if (memoryEntries.length > 0) {
    await prisma.agentLongTermMemory.updateMany({
      where: {
        id: {
          in: memoryEntries.map((item) => item.id),
        },
      },
      data: {
        lastAccessedAt: new Date(),
      },
    });
  }

  const memoryItems: PersonaMemoryRecord[] = memoryEntries.map((item) => {
    const metadata = asRecord(item.metadata);
    const role =
      typeof metadata?.['role'] === 'string'
        ? metadata['role']
        : typeof metadata?.['originRole'] === 'string'
          ? metadata['originRole']
          : null;
    const sourceTypeValue = (item.sourceType ?? 'agent_memory') as PersonaMemorySourceType;
    const sourceCreatedAt =
      item.sourceCreatedAt?.toISOString() ??
      (typeof metadata?.['sourceCreatedAt'] === 'string' ? metadata['sourceCreatedAt'] : null);

    return {
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      personaId: params.personaId,
      recordType: 'memory_entry',
      content: item.content,
      summary: item.summary ?? null,
      title: item.sourceLabel ?? item.summary ?? truncateText(item.content, 80),
      role,
      sessionId:
        typeof metadata?.['sessionId'] === 'string' ? metadata['sessionId'] : item.runId ?? null,
      memoryKey: item.memoryKey,
      sourceType: sourceTypeValue,
      sourceId: item.sourceId ?? item.id,
      sourceLabel: item.sourceLabel ?? null,
      sourceCreatedAt,
      importance: item.importance ?? null,
      tags: item.tags ?? [],
      topicHints: extractTopicHints(item.summary ?? item.content, item.topicHints ?? []),
      moodHints: normalizeMoodHints(item.moodHints, item.summary ?? item.content),
      metadata: {
        ...(metadata ?? {}),
        ...(item.runId ? { runId: item.runId } : {}),
        ...(item.lastAccessedAt ? { lastAccessedAt: item.lastAccessedAt.toISOString() } : {}),
      },
    };
  });

  const messageItems: PersonaMemoryRecord[] = conversationMessages.map((message) => {
    const metadata = asRecord(message.metadata);
    const moodHints = normalizeMoodHints(
      Array.isArray(metadata?.['moodHints'])
        ? metadata['moodHints'].filter((item): item is string => typeof item === 'string')
        : [],
      message.content
    );

    return {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.createdAt.toISOString(),
      personaId: params.personaId,
      recordType: 'conversation_message',
      content: message.content,
      summary: truncateText(message.content, 140),
      title: `${message.role === 'assistant' ? 'Assistant' : 'User'} message`,
      role: message.role,
      sessionId: message.sessionId,
      memoryKey: null,
      sourceType: 'chat_message',
      sourceId: message.id,
      sourceLabel: message.session.title ?? 'Untitled session',
      sourceCreatedAt: message.createdAt.toISOString(),
      importance: null,
      tags: [],
      topicHints: extractTopicHints(message.content),
      moodHints,
      metadata: {
        ...(metadata ?? {}),
        sessionTitle: message.session.title ?? null,
        ...(message.model ? { model: message.model } : {}),
        ...(message.images.length > 0 ? { images: message.images } : {}),
      },
    };
  });

  const items = [...memoryItems, ...messageItems]
    .filter((item) =>
      matchesPersonaMemoryRecord(item, {
        tag,
        topic,
        mood,
        searchTerms,
      })
    )
    .sort((left, right) => {
      const scoreDelta =
        scorePersonaMemoryRecord(right, {
          tag,
          topic,
          mood,
          searchTerms,
        }) -
        scorePersonaMemoryRecord(left, {
          tag,
          topic,
          mood,
          searchTerms,
        });
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    })
    .slice(0, limit);

  return {
    items,
    summary: {
      personaId: params.personaId,
      suggestedMoodId: memorySettings.useMoodSignals === false ? null : countSuggestedMood(items),
      totalRecords: items.length,
      memoryEntryCount: items.filter((item) => item.recordType === 'memory_entry').length,
      conversationMessageCount: items.filter((item) => item.recordType === 'conversation_message')
        .length,
    },
  };
}

const formatMemoryPromptLine = (item: PersonaMemoryRecord): string => {
  const provenance = [
    item.recordType === 'conversation_message' ? 'chat history' : 'memory',
    item.sourceType ?? 'unknown-source',
    item.sourceLabel ? `from "${item.sourceLabel}"` : null,
    item.sourceCreatedAt ? `original ${item.sourceCreatedAt}` : null,
    `captured ${item.createdAt}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return `- ${provenance}: ${truncateText(item.summary ?? item.content, 220)}`;
};

export async function buildPersonaChatMemoryContext(
  params: BuildPersonaChatMemoryContextParams
): Promise<{
  persona: AgentPersona;
  memory: PersonaMemorySearchResponse;
  systemPrompt: string;
  suggestedMoodId: AgentPersonaMoodId | null;
}> {
  const persona = await getAgentPersonaById(params.personaId);
  if (!persona) {
    throw new Error(`Agent persona "${params.personaId}" was not found.`);
  }

  const settings = buildAgentPersonaSettings(persona.settings);
  const memorySettings = settings.memory ?? {};
  const limit = clamp(memorySettings.defaultSearchLimit, 1, 12, 6);
  const latestUserMessage = params.latestUserMessage?.trim() || null;

  const memory =
    memorySettings.enabled === false
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
    `Active persona: ${persona.name}${persona.role ? ` (${persona.role})` : ''}.`,
    persona.instructions ? `Persona instructions: ${persona.instructions}` : null,
    memory.summary.suggestedMoodId
      ? `Memory-informed mood: ${memory.summary.suggestedMoodId}.`
      : null,
    memoryLines.length > 0 ? `Relevant persona memory:\n${memoryLines.join('\n')}` : null,
  ].filter((section): section is string => Boolean(section));

  return {
    persona,
    memory,
    systemPrompt: promptSections.join('\n\n'),
    suggestedMoodId: memory.summary.suggestedMoodId,
  };
}

export async function persistAgentPersonaExchangeMemory(
  params: PersistAgentPersonaExchangeMemoryParams
): Promise<void> {
  const personaId = params.personaId.trim();
  const assistantMessage = params.assistantMessage.trim();
  const userMessage = params.userMessage?.trim() || '';
  if (!personaId || !assistantMessage) {
    return;
  }

  const combinedText = [userMessage, assistantMessage].filter(Boolean).join('\n');
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

  const content = userMessage
    ? `User: ${userMessage}\nAssistant: ${assistantMessage}`
    : `Assistant: ${assistantMessage}`;
  const summary = userMessage
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
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      originRole: 'assistant',
      ...(userMessage ? { latestUserMessage: userMessage } : {}),
    },
    importance: params.sourceType === 'chat_message' ? 2 : 3,
  });
}
