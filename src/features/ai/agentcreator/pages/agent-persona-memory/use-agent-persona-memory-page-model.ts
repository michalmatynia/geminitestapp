'use client';

import { useMemo } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';

import { useAgentPersonaMemory } from '@/features/ai/agentcreator/hooks/useAgentPersonaMemory';
import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import type { AgentPersona } from '@/shared/contracts/agents';
import type {
  PersonaMemoryRecord,
  PersonaMemorySearchResponse,
  PersonaMemorySummary,
} from '@/shared/contracts/persona-memory';

import { useMemoryPageExpanded } from './use-memory-page-expanded';
import { useMemoryPageFilters, type MemoryPageFiltersState } from './use-memory-page-filters';

export type AgentPersonaMemoryPageModel = {
  persona: AgentPersona | null;
  memoryQuery: UseQueryResult<PersonaMemorySearchResponse, Error>;
  items: PersonaMemoryRecord[];
  summary: PersonaMemorySummary | null;
  filters: MemoryPageFiltersState;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  refetchMemory: () => Promise<unknown>;
};

export function useAgentPersonaMemoryPageModel(personaId: string): AgentPersonaMemoryPageModel {
  const { data: personas = [] } = useAgentPersonas();
  const persona = useMemo(
    () => personas.find((item: AgentPersona): boolean => item.id === personaId) ?? null,
    [personas, personaId]
  );
  const filters = useMemoryPageFilters();
  const { expanded, toggleExpanded } = useMemoryPageExpanded();
  const memoryQuery = useAgentPersonaMemory(personaId, {
    q: filters.query,
    tag: filters.tag,
    topic: filters.topic,
    mood: filters.mood,
    sourceType: filters.sourceType,
    limit: filters.limit,
  });
  const items = memoryQuery.data?.items ?? [];
  const summary = memoryQuery.data?.summary ?? null;
  const refetchMemory = (): Promise<unknown> => memoryQuery.refetch();
  return {
    persona,
    memoryQuery,
    items,
    summary,
    filters,
    expanded,
    toggleExpanded,
    refetchMemory,
  };
}
