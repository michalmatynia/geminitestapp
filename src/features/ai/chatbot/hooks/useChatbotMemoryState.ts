'use client';

import { useState, useMemo, useCallback } from 'react';

import { useChatbotMemory } from '../hooks/useChatbotMemory';

import type { ChatbotMemoryItem } from '../types';

export interface ExtendedMemoryItem extends ChatbotMemoryItem {
  memoryKey?: string;
  summary?: string;
  content?: string;
  tags?: string[];
  importance?: number;
  runId?: string;
  lastAccessedAt?: string;
  metadata?: Record<string, unknown>;
}

export function useChatbotMemoryState() {
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
  const items = (memoryQuery.data ?? []) as ExtendedMemoryItem[];

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
