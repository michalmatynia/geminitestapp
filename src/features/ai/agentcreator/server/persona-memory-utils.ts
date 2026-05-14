import {
  AGENT_PERSONA_MOOD_IDS,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type {
  PersonaMemoryRecord,
  PersonaMemorySourceType,
} from '@/shared/contracts/persona-memory';
import type { JsonValue } from '@/shared/contracts/json';

export const MOOD_ID_SET = new Set<AgentPersonaMoodId>(AGENT_PERSONA_MOOD_IDS);
export const STOP_WORDS = new Set([
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

export const MOOD_KEYWORDS: Record<Exclude<AgentPersonaMoodId, 'neutral'>, string[]> = {
  thinking: ['think', 'consider', 'analyze', 'reason', 'step', 'reflect'],
  encouraging: ['keep going', 'you can', 'try again', 'practice', 'let us', 'let\'s', 'progress'],
  happy: ['glad', 'happy', 'pleased', 'delighted', 'enjoyed'],
  celebrating: ['great job', 'well done', 'congrat', 'excellent', 'amazing', 'celebrate'],
};

export const clamp = (value: number | undefined, min: number, max: number, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

export const asRecord = (
  value: JsonValue | null | undefined
): Record<string, unknown> | undefined => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const withEllipsis = (value: string, maxLength: number): string =>
  `${value.slice(0, maxLength - 1)}...`;

export const truncateText = (value: string, maxLength: number): string => {
  const normalized = normalizeText(value);
  return normalized.length <= maxLength ? normalized : withEllipsis(normalized, maxLength);
};

export const toTimestamp = (value?: string | null): number => {
  if (value === null || value === undefined) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const extractTopicHints = (text: string, fallback: string[] = []): string[] => {
  const tokens = normalizeText(text)
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g);
  if (tokens === null) {
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

export const inferMoodHintsFromText = (text: string): AgentPersonaMoodId[] => {
  const normalized = normalizeText(text).toLowerCase();
  const matches = Object.entries(MOOD_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([moodId]) => moodId as AgentPersonaMoodId);
  return matches;
};

export const normalizeMoodHints = (
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

export const countSuggestedMood = (items: PersonaMemoryRecord[]): AgentPersonaMoodId | null => {
  const counts = new Map<AgentPersonaMoodId, number>();

  items.forEach((item) => {
    item.moodHints.forEach((moodId) => {
      counts.set(moodId, (counts.get(moodId) ?? 0) + 1);
    });
  });

  const ordered = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  return ordered[0]?.[0] ?? null;
};

export const resolveSourceTypeFilter = (
  sourceType: PersonaMemorySourceType | null | undefined
): { allowMessages: boolean; allowMemoryEntries: boolean } => {
  if (sourceType === null || sourceType === undefined) {
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

export const uniqueStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    )
  );

export const uniqueLowercaseStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? normalizeText(value).toLowerCase() : ''))
        .filter(Boolean)
    )
  );

export const buildSearchTerms = (value?: string | null): string[] =>
  uniqueLowercaseStrings([
    value ?? null,
    ...extractTopicHints(value ?? ''),
  ]);

const resolvePrimaryExtractedTopicHint = (value?: string | null): string | null =>
  extractTopicHints(value ?? '')[0] ?? null;

export const normalizeTopicFilter = (value?: string | null): string | null => {
  return (
    resolvePrimaryExtractedTopicHint(value) ??
    uniqueLowercaseStrings([value ?? null])[0] ??
    null
  );
};

export const matchesExactOrPartial = (values: string[], expected: string): boolean => {
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

export const formatMemoryPromptLine = (item: PersonaMemoryRecord): string => {
  const provenance = [
    item.recordType === 'conversation_message' ? 'chat history' : 'memory',
    item.sourceType ?? 'unknown-source',
    item.sourceLabel !== null ? `from "${item.sourceLabel}"` : null,
    item.sourceCreatedAt !== null ? `original ${item.sourceCreatedAt}` : null,
    `captured ${item.createdAt}`,
  ]
    .filter((part): part is string => part !== null)
    .join(' | ');

  return `- ${provenance}: ${truncateText(item.summary ?? item.content, 220)}`;
};
