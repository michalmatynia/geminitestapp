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
  const tagScore = (filters.tag !== null && matchesExactOrPartial(item.tags, filters.tag)) ? 8 : 0;
  const topicScore = (filters.topic !== null && matchesExactOrPartial(item.topicHints, filters.topic)) ? 12 : 0;
  const moodScore = (filters.mood !== null && item.moodHints.includes(filters.mood)) ? 10 : 0;
  return tagScore + topicScore + moodScore;
}

function resolveTermScore(item: PersonaMemoryRecord, searchTerms: string[]): number {
  return countMatchingSearchTerms(item, searchTerms) * 10;
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
  const termScore = resolveTermScore(item, filters.searchTerms);
  const matchScore = resolveMatchScore(item, filters);
  const typeScore = item.recordType === 'memory_entry' ? 1 : 0;

  return termScore + matchScore + typeScore;
};
