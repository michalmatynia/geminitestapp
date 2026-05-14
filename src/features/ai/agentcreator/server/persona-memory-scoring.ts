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

function matchesTag(tags: string[], tag: string | null): boolean {
  return tag === null || matchesExactOrPartial(tags, tag);
}

function matchesTopic(topicHints: string[], topic: string | null): boolean {
  return topic === null || matchesExactOrPartial(topicHints, topic);
}

function matchesMood(moodHints: string[], mood: AgentPersonaMoodId | null): boolean {
  return mood === null || moodHints.includes(mood);
}

function matchesSearchTerms(item: PersonaMemoryRecord, searchTerms: string[]): boolean {
  return searchTerms.length === 0 || countMatchingSearchTerms(item, searchTerms) > 0;
}

export const matchesPersonaMemoryRecord = (
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): boolean => {
  if (!matchesTag(uniqueLowercaseStrings(item.tags), filters.tag)) return false;
  if (!matchesTopic(item.topicHints, filters.topic)) return false;
  if (!matchesMood(item.moodHints, filters.mood)) return false;
  return matchesSearchTerms(item, filters.searchTerms);
};

function resolveTagScore(item: PersonaMemoryRecord, tag: string | null): number {
  return (tag !== null && matchesExactOrPartial(item.tags, tag)) ? 8 : 0;
}

function resolveTopicScore(item: PersonaMemoryRecord, topic: string | null): number {
  return (topic !== null && matchesExactOrPartial(item.topicHints, topic)) ? 12 : 0;
}

function resolveMoodScore(item: PersonaMemoryRecord, mood: string | null): number {
  return (mood !== null && item.moodHints.includes(mood)) ? 10 : 0;
}

function resolveMatchScore(
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
  }
): number {
  return resolveTagScore(item, filters.tag) + resolveTopicScore(item, filters.topic) + resolveMoodScore(item, filters.mood);
}

function resolveTermScore(item: PersonaMemoryRecord, searchTerms: string[]): number {
  return countMatchingSearchTerms(item, searchTerms) * 10;
}

function resolveTypeScore(recordType: string): number {
  return recordType === 'memory_entry' ? 1 : 0;
}

export function scorePersonaMemoryRecord(
  item: PersonaMemoryRecord,
  filters: {
    tag: string | null;
    topic: string | null;
    mood: AgentPersonaMoodId | null;
    searchTerms: string[];
  }
): number {
  const termScore = resolveTermScore(item, filters.searchTerms);
  const matchScore = resolveMatchScore(item, filters);
  const typeScore = resolveTypeScore(item.recordType);

  return termScore + matchScore + typeScore;
}
