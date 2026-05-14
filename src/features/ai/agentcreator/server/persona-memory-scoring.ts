import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';
import {
  uniqueLowercaseStrings,
  matchesExactOrPartial,
} from './persona-memory-utils';

export const buildRecordSearchHaystacks = (item: PersonaMemoryRecord): string[] =>
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

export const countMatchingSearchTerms = (item: PersonaMemoryRecord, searchTerms: string[]): number => {
  if (searchTerms.length === 0) {
    return 0;
  }

  const haystacks = buildRecordSearchHaystacks(item);
  return searchTerms.filter((term) => haystacks.some((value) => value.includes(term))).length;
};

export const matchesPersonaMemoryRecord = (
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): boolean => {
  const normalizedTags = uniqueLowercaseStrings(item.tags);

  if (filters.tag !== null && !matchesExactOrPartial(normalizedTags, filters.tag)) {
    return false;
  }

  if (filters.topic !== null && !matchesExactOrPartial(item.topicHints, filters.topic)) {
    return false;
  }

  if (filters.mood !== null && !item.moodHints.includes(filters.mood)) {
    return false;
  }

  if (filters.searchTerms.length > 0 && countMatchingSearchTerms(item, filters.searchTerms) === 0) {
    return false;
  }

  return true;
};

function resolveMatchScore(
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
  }
): number {
  let score = 0;
  if (filters.tag !== null && matchesExactOrPartial(item.tags, filters.tag)) score += 8;
  if (filters.topic !== null && matchesExactOrPartial(item.topicHints, filters.topic)) score += 12;
  if (filters.mood !== null && item.moodHints.includes(filters.mood)) score += 10;
  return score;
}

export const scorePersonaMemoryRecord = (
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): number => {
  const termScore = countMatchingSearchTerms(item, filters.searchTerms) * 10;
  const matchScore = resolveMatchScore(item, filters);
  const typeScore = item.recordType === 'memory_entry' ? 1 : 0;

  return termScore + matchScore + typeScore;
};
