'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useBrainModelOptions } from '@/features/ai/brain/hooks/useBrainModelOptions';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';

import { useTeachingAgents, useTeachingCollections } from '../hooks/useAgentTeachingQueries';

interface AgentTeachingContextType {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  modelOptions: string[];
  isLoading: boolean;
  refetchAgents: () => Promise<unknown>;
  refetchCollections: () => Promise<unknown>;
}

const AgentTeachingContext = createContext<AgentTeachingContextType | null>(null);

const normalizeModelOptions = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (!input || typeof input !== 'object') {
    return [];
  }
  const record = input as Record<string, unknown>;
  if ('models' in record) {
    return normalizeModelOptions(record['models']);
  }
  if ('data' in record) {
    return normalizeModelOptions(record['data']);
  }
  return [];
};

export const useAgentTeachingQueriesContext = (): AgentTeachingContextType => {
  const context = useContext(AgentTeachingContext);
  if (!context) {
    throw new Error('useAgentTeachingQueriesContext must be used within an AgentTeachingProvider');
  }
  return context;
};

export function AgentTeachingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { data: agents = [], isLoading: loadingAgents, refetch: refetchAgents } = useTeachingAgents();
  const { data: collections = [], isLoading: loadingCollections, refetch: refetchCollections } = useTeachingCollections();
  const brainModelOptions = useBrainModelOptions({
    feature: 'prompt_engine',
  });
  const modelOptions = useMemo(
    () => normalizeModelOptions(brainModelOptions.models),
    [brainModelOptions.models],
  );

  const isLoading =
    loadingAgents || loadingCollections || brainModelOptions.isLoading;

  const value = useMemo((): AgentTeachingContextType => ({
    agents,
    collections,
    modelOptions,
    isLoading,
    refetchAgents,
    refetchCollections,
  }), [agents, collections, modelOptions, isLoading, refetchAgents, refetchCollections]);

  return (
    <AgentTeachingContext.Provider value={value}>
      {children}
    </AgentTeachingContext.Provider>
  );
}
