'use client';

import { useState, useMemo, useCallback } from 'react';

import type { ChatbotMemoryItem } from '@/shared/contracts/chatbot';

import { useChatbotMemory } from '../hooks/useChatbotMemoryQueries';

// ChatbotMemoryItem already includes memoryKey, content, summary, tags, etc.
// ExtendedMemoryItem just re-uses the base type as-is.
export type ExtendedMemoryItem = ChatbotMemoryItem;

export interface UseChatbotMemoryStateReturn {
  items: ExtendedMemoryItem[];
  memoryKey: string;
  setMemoryKey: (key: string) => void;
  tag: string;
  setTag: (tag: string) => void;
  query: string;
  setQuery: (query: string) => void;
  limit: number;
  setLimit: (limit: number) => void;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  resetFilters: () => void;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChatbotMemoryState(): UseChatbotMemoryStateReturn {
  const [memoryKey, setMemoryKey] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (memoryKey.trim()) params.set('memoryKey', memoryKey.trim());
    if (tag.trim()) params.set('tag', tag.trim());
    if (query.trim()) params.set('q', query.trim());
    if (limit) params.set('limit', String(limit));
    return params.toString();
  }, [memoryKey, tag, query, limit]);

  const memoryQuery = useChatbotMemory(queryString);
  const items = memoryQuery.data ?? [];

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setMemoryKey('');
    setTag('');
    setQuery('');
    setLimit(50);
  }, []);

  return {
    items,
    memoryKey,
    setMemoryKey,
    tag,
    setTag,
    query,
    setQuery,
    limit,
    setLimit,
    expanded,
    toggleExpanded,
    resetFilters,
    loading: memoryQuery.isLoading,
    isFetching: memoryQuery.isFetching,
    error: memoryQuery.error,
    refetch: () => void memoryQuery.refetch(),
  };
}
