'use client';

import { useState } from 'react';

import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemorySourceType } from '@/shared/contracts/persona-memory';

export type MemoryPageFiltersState = {
  query: string;
  setQuery: (value: string) => void;
  tag: string;
  setTag: (value: string) => void;
  topic: string;
  setTopic: (value: string) => void;
  mood: AgentPersonaMoodId | 'all';
  setMood: (value: AgentPersonaMoodId | 'all') => void;
  sourceType: PersonaMemorySourceType | 'all';
  setSourceType: (value: PersonaMemorySourceType | 'all') => void;
  limit: number;
  setLimit: (value: number) => void;
};

export function useMemoryPageFilters(): MemoryPageFiltersState {
  const [query, setQuery] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [mood, setMood] = useState<AgentPersonaMoodId | 'all'>('all');
  const [sourceType, setSourceType] = useState<PersonaMemorySourceType | 'all'>('all');
  const [limit, setLimit] = useState<number>(20);
  return {
    query,
    setQuery,
    tag,
    setTag,
    topic,
    setTopic,
    mood,
    setMood,
    sourceType,
    setSourceType,
    limit,
    setLimit,
  };
}
