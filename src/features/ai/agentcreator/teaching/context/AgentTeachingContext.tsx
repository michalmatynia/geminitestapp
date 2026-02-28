'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';

import { useTeachingAgents, useTeachingCollections } from '../hooks/useAgentTeachingQueries';

interface AgentTeachingContextType {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  chatModelId: string;
  embeddingModelId: string;
  isLoading: boolean;
  refetchAgents: () => Promise<unknown>;
  refetchCollections: () => Promise<unknown>;
}

const AgentTeachingContext = createContext<AgentTeachingContextType | null>(null);

export const useAgentTeachingQueriesContext = (): AgentTeachingContextType => {
  const context = useContext(AgentTeachingContext);
  if (!context) {
    throw new Error('useAgentTeachingQueriesContext must be used within an AgentTeachingProvider');
  }
  return context;
};

export function AgentTeachingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const {
    data: agents = [],
    isLoading: loadingAgents,
    refetch: refetchAgents,
  } = useTeachingAgents();
  const {
    data: collections = [],
    isLoading: loadingCollections,
    refetch: refetchCollections,
  } = useTeachingCollections();
  const chatAssignment = useBrainAssignment({
    capability: 'agent_teaching.chat',
  });
  const embeddingAssignment = useBrainAssignment({
    capability: 'agent_teaching.embeddings',
  });
  const chatModelId = chatAssignment.effectiveModelId.trim();
  const embeddingModelId = embeddingAssignment.effectiveModelId.trim();
  const isLoading = loadingAgents || loadingCollections;

  const value = useMemo(
    (): AgentTeachingContextType => ({
      agents,
      collections,
      chatModelId,
      embeddingModelId,
      isLoading,
      refetchAgents,
      refetchCollections,
    }),
    [
      agents,
      collections,
      chatModelId,
      embeddingModelId,
      isLoading,
      refetchAgents,
      refetchCollections,
    ]
  );

  return <AgentTeachingContext.Provider value={value}>{children}</AgentTeachingContext.Provider>;
}
