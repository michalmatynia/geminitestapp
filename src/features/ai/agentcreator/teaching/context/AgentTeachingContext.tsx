'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';

import { useTeachingAgents, useTeachingCollections } from '../hooks/useAgentTeaching';

interface AgentTeachingContextType {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  modelOptions: string[];
  isLoading: boolean;
  refetchAgents: () => Promise<unknown>;
  refetchCollections: () => Promise<unknown>;
}

const AgentTeachingContext = createContext<AgentTeachingContextType | null>(null);

export const useAgentTeachingContext = (): AgentTeachingContextType => {
  const context = useContext(AgentTeachingContext);
  if (!context) {
    throw new Error('useAgentTeachingContext must be used within an AgentTeachingProvider');
  }
  return context;
};

export function AgentTeachingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { data: agents = [], isLoading: loadingAgents, refetch: refetchAgents } = useTeachingAgents();
  const { data: collections = [], isLoading: loadingCollections, refetch: refetchCollections } = useTeachingCollections();
  const { data: modelOptions = [], isLoading: loadingModels } = useChatbotModels();

  const isLoading = loadingAgents || loadingCollections || loadingModels;

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
