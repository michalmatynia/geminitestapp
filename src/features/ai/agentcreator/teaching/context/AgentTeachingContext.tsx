'use client';

import React, { type ReactNode, useMemo } from 'react';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { internalError } from '@/shared/errors/app-error';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: AgentTeachingStateContext, useStrictContext: useAgentTeachingState } =
  createStrictContext<AgentTeachingStateContextType>({
    hookName: 'useAgentTeachingState',
    providerName: 'an AgentTeachingProvider',
    displayName: 'AgentTeachingStateContext',
    errorFactory: internalError,
  });
const { Context: AgentTeachingActionsContext, useStrictContext: useAgentTeachingActions } =
  createStrictContext<AgentTeachingActionsContextType>({
    hookName: 'useAgentTeachingActions',
    providerName: 'an AgentTeachingProvider',
    displayName: 'AgentTeachingActionsContext',
    errorFactory: internalError,
  });
export { useAgentTeachingState, useAgentTeachingActions };

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
