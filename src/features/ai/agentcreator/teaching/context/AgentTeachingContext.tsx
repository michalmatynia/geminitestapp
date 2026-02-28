'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';

import { useTeachingAgents, useTeachingCollections } from '../hooks/useAgentTeachingQueries';

interface AgentTeachingContextType {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  modelOptions: string[];
  chatModelId: string;
  embeddingModelId: string;
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
  const chatModelOptions = useBrainModelOptions({
    capability: 'agent_teaching.chat',
  });
  const embeddingModelOptions = useBrainModelOptions({
    capability: 'agent_teaching.embeddings',
  });
  const chatModelId = chatModelOptions.effectiveModelId.trim();
  const embeddingModelId = embeddingModelOptions.effectiveModelId.trim();
  const modelOptions = useMemo(
    () =>
      normalizeModelOptions([
        ...chatModelOptions.models,
        ...embeddingModelOptions.models,
        chatModelId,
        embeddingModelId,
      ]),
    [chatModelId, chatModelOptions.models, embeddingModelId, embeddingModelOptions.models]
  );

  const isLoading =
    loadingAgents ||
    loadingCollections ||
    chatModelOptions.isLoading ||
    embeddingModelOptions.isLoading;

  const value = useMemo(
    (): AgentTeachingContextType => ({
      agents,
      collections,
      modelOptions,
      chatModelId,
      embeddingModelId,
      isLoading,
      refetchAgents,
      refetchCollections,
    }),
    [
      agents,
      collections,
      modelOptions,
      chatModelId,
      embeddingModelId,
      isLoading,
      refetchAgents,
      refetchCollections,
    ]
  );

  return <AgentTeachingContext.Provider value={value}>{children}</AgentTeachingContext.Provider>;
}
