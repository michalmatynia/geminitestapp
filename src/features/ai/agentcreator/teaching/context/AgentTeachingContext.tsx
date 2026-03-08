'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { internalError } from '@/shared/errors/app-error';

import { useTeachingAgents, useTeachingCollections } from '../hooks/useAgentTeachingQueries';

interface AgentTeachingStateContextType {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  chatModelId: string;
  embeddingModelId: string;
  isLoading: boolean;
}

interface AgentTeachingActionsContextType {
  refetchAgents: () => Promise<unknown>;
  refetchCollections: () => Promise<unknown>;
}

type AgentTeachingContextType = AgentTeachingStateContextType & AgentTeachingActionsContextType;

const AgentTeachingStateContext = createContext<AgentTeachingStateContextType | null>(null);
const AgentTeachingActionsContext = createContext<AgentTeachingActionsContextType | null>(null);

export const useAgentTeachingState = (): AgentTeachingStateContextType => {
  const context = useContext(AgentTeachingStateContext);
  if (!context) {
    throw internalError(
      'useAgentTeachingState must be used within an AgentTeachingProvider'
    );
  }
  return context;
};

export const useAgentTeachingActions = (): AgentTeachingActionsContextType => {
  const context = useContext(AgentTeachingActionsContext);
  if (!context) {
    throw internalError(
      'useAgentTeachingActions must be used within an AgentTeachingProvider'
    );
  }
  return context;
};

export const useAgentTeachingQueriesContext = (): AgentTeachingContextType => {
  const state = useAgentTeachingState();
  const actions = useAgentTeachingActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
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

  const stateValue = useMemo(
    (): AgentTeachingStateContextType => ({
      agents,
      collections,
      chatModelId,
      embeddingModelId,
      isLoading,
    }),
    [agents, collections, chatModelId, embeddingModelId, isLoading]
  );
  const actionsValue = useMemo(
    (): AgentTeachingActionsContextType => ({
      refetchAgents,
      refetchCollections,
    }),
    [refetchAgents, refetchCollections]
  );

  return (
    <AgentTeachingActionsContext.Provider value={actionsValue}>
      <AgentTeachingStateContext.Provider value={stateValue}>
        {children}
      </AgentTeachingStateContext.Provider>
    </AgentTeachingActionsContext.Provider>
  );
}
