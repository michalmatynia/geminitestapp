import type {
  AgentTeachingAgentDto as AgentTeachingAgentRecord,
  AgentTeachingChatResponse,
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingDocumentsResponse,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingChatSourceDto as AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageDto as ChatMessage, SimpleChatMessage } from '@/shared/contracts/chatbot';
import type { ListQuery, SingleQuery, MutationResult } from '@/shared/contracts/ui/queries';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createPaginatedListQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import { agentTeachingKeys } from '@/shared/lib/query-key-exports';

import {
  getTeachingAgents,
  upsertTeachingAgent,
  deleteTeachingAgent,
  getEmbeddingCollections,
  upsertEmbeddingCollection,
  deleteEmbeddingCollection,
  getEmbeddingDocuments as fetchEmbeddingDocs,
  addEmbeddingDocument,
  deleteEmbeddingDocument,
  searchEmbeddingCollection,
  teachingChat,
} from '../api';

export { agentTeachingKeys };

export function useSearchEmbeddingCollectionMutation(): MutationResult<
  AgentTeachingChatSource[],
  { collectionId: string; queryText: string; topK?: number; minScore?: number }
  > {
  const mutationKey = agentTeachingKeys.collections();
  return createMutationV2<
    AgentTeachingChatSource[],
    { collectionId: string; queryText: string; topK?: number; minScore?: number }
  >({
    mutationFn: ({
      collectionId,
      queryText,
      topK,
      minScore,
    }: {
      collectionId: string;
      queryText: string;
      topK?: number;
      minScore?: number;
    }) => {
      const payload: Parameters<typeof searchEmbeddingCollection>[1] = { queryText };
      if (topK !== undefined) payload.topK = topK;
      if (minScore !== undefined) payload.minScore = minScore;
      return searchEmbeddingCollection(collectionId, payload);
    },
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useSearchEmbeddingCollectionMutation',
      operation: 'action',
      resource: 'agent-teaching.embedding-collections.search',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'search'],
      description: 'Runs agent teaching embedding collections search.'},
  });
}

export function useTeachingChatMutation(): MutationResult<
  AgentTeachingChatResponse,
  { agentId: string; messages: SimpleChatMessage[]; contextRegistry?: ContextRegistryConsumerEnvelope | null }
  > {
  const mutationKey = agentTeachingKeys.agents();
  return createMutationV2<
    AgentTeachingChatResponse,
    { agentId: string; messages: SimpleChatMessage[]; contextRegistry?: ContextRegistryConsumerEnvelope | null }
  >({
    mutationFn: ({
      agentId,
      messages,
      contextRegistry,
    }: {
      agentId: string;
      messages: SimpleChatMessage[];
      contextRegistry?: ContextRegistryConsumerEnvelope | null;
    }) => teachingChat(agentId, messages as ChatMessage[], contextRegistry),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useTeachingChatMutation',
      operation: 'action',
      resource: 'agent-teaching.chat',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'chat'],
      description: 'Runs agent teaching chat.'},
  });
}

export function useTeachingAgents(options?: {
  enabled?: boolean;
}): ListQuery<AgentTeachingAgentRecord> {
  const queryKey = agentTeachingKeys.agents();
  return createListQueryV2<AgentTeachingAgentRecord>({
    queryKey,
    queryFn: getTeachingAgents,
    enabled: options?.enabled ?? true,
    meta: {
      source: 'agentTeaching.hooks.useTeachingAgents',
      operation: 'list',
      resource: 'agent-teaching.agents',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-teaching', 'agents'],
      description: 'Loads agent teaching agents.'},
  });
}

export function useTeachingCollections(): ListQuery<AgentTeachingEmbeddingCollectionRecord> {
  const queryKey = agentTeachingKeys.collections();
  return createListQueryV2<AgentTeachingEmbeddingCollectionRecord>({
    queryKey,
    queryFn: getEmbeddingCollections,
    meta: {
      source: 'agentTeaching.hooks.useTeachingCollections',
      operation: 'list',
      resource: 'agent-teaching.embedding-collections',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-teaching', 'collections'],
      description: 'Loads agent teaching embedding collections.'},
  });
}

export function useUpsertTeachingAgentMutation(): MutationResult<
  AgentTeachingAgentRecord,
  Partial<AgentTeachingAgentRecord> & { name: string }
  > {
  const mutationKey = agentTeachingKeys.agents();
  return createUpdateMutationV2<
    AgentTeachingAgentRecord,
    Partial<AgentTeachingAgentRecord> & { name: string }
  >({
    mutationFn: upsertTeachingAgent,
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useUpsertTeachingAgentMutation',
      operation: 'update',
      resource: 'agent-teaching.agents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'agents', 'upsert'],
      description: 'Updates agent teaching agents.'},
    invalidateKeys: [agentTeachingKeys.agents()],
  });
}

export function useDeleteTeachingAgentMutation(): MutationResult<void, { id: string }> {
  const mutationKey = agentTeachingKeys.agents();
  return createDeleteMutationV2<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteTeachingAgent(id),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteTeachingAgentMutation',
      operation: 'delete',
      resource: 'agent-teaching.agents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'agents', 'delete'],
      description: 'Deletes agent teaching agents.'},
    invalidateKeys: [agentTeachingKeys.agents()],
  });
}

export function useUpsertEmbeddingCollectionMutation(): MutationResult<
  AgentTeachingEmbeddingCollectionRecord,
  Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
  > {
  const mutationKey = agentTeachingKeys.collections();
  return createUpdateMutationV2<
    AgentTeachingEmbeddingCollectionRecord,
    Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
  >({
    mutationFn: upsertEmbeddingCollection,
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useUpsertEmbeddingCollectionMutation',
      operation: 'update',
      resource: 'agent-teaching.embedding-collections',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'upsert'],
      description: 'Updates agent teaching embedding collections.'},
    invalidateKeys: [agentTeachingKeys.collections()],
  });
}

export function useDeleteEmbeddingCollectionMutation(): MutationResult<void, { id: string }> {
  const mutationKey = agentTeachingKeys.collections();
  return createDeleteMutationV2<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteEmbeddingCollection(id),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteEmbeddingCollectionMutation',
      operation: 'delete',
      resource: 'agent-teaching.embedding-collections',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'delete'],
      description: 'Deletes agent teaching embedding collections.'},
    invalidateKeys: [agentTeachingKeys.collections(), agentTeachingKeys.agents()],
  });
}

export function useEmbeddingDocuments(
  collectionId: string | null
): SingleQuery<AgentTeachingDocumentsResponse | null> {
  if (!collectionId) {
    return {
      data: null,
      isPending: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: async () => ({ data: null }),
    } as SingleQuery<AgentTeachingDocumentsResponse | null>;
  }

  const queryKey = agentTeachingKeys.documents(collectionId);

  return createPaginatedListQueryV2<AgentTeachingEmbeddingDocumentListItem>({
    id: collectionId,
    queryKey,
    queryFn: () => fetchEmbeddingDocs(collectionId),
    enabled: true,
    meta: {
      source: 'agentTeaching.hooks.useEmbeddingDocuments',
      operation: 'list',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      queryKey,
      tags: ['agent-teaching', 'documents'],
      description: 'Loads agent teaching embedding documents.'},
  });
}

export function useAddEmbeddingDocumentMutation(): MutationResult<
  AgentTeachingEmbeddingDocumentListItem,
  {
    collectionId: string;
    text: string;
    title?: string | null;
    source?: string | null;
    tags?: string[];
  }
  > {
  const mutationKey = agentTeachingKeys.collections();
  return createCreateMutationV2<
    AgentTeachingEmbeddingDocumentListItem,
    {
      collectionId: string;
      text: string;
      title?: string | null;
      source?: string | null;
      tags?: string[];
    }
  >({
    mutationFn: ({
      collectionId,
      text,
      title,
      source,
      tags,
    }: {
      collectionId: string;
      text: string;
      title?: string | null;
      source?: string | null;
      tags?: string[];
    }) => {
      const payload: Parameters<typeof addEmbeddingDocument>[1] = { text };
      if (title !== undefined) payload.title = title;
      if (source !== undefined) payload.source = source;
      if (tags !== undefined) payload.tags = tags;
      return addEmbeddingDocument(collectionId, payload);
    },
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useAddEmbeddingDocumentMutation',
      operation: 'create',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'create'],
      description: 'Creates agent teaching embedding documents.'},
    invalidateKeys: (_item, vars: { collectionId: string }) => [
      agentTeachingKeys.documents(vars.collectionId),
    ],
  });
}

export function useDeleteEmbeddingDocumentMutation(): MutationResult<
  void,
  { collectionId: string; documentId: string }
  > {
  const mutationKey = agentTeachingKeys.collections();
  return createDeleteMutationV2<void, { collectionId: string; documentId: string }>({
    mutationFn: ({ collectionId, documentId }: { collectionId: string; documentId: string }) =>
      deleteEmbeddingDocument(collectionId, documentId),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteEmbeddingDocumentMutation',
      operation: 'delete',
      resource: 'agent-teaching.embedding-documents',
      domain: 'agent_creator',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'delete'],
      description: 'Deletes agent teaching embedding documents.'},
    invalidateKeys: (_item, vars: { collectionId: string }) => [
      agentTeachingKeys.documents(vars.collectionId),
    ],
  });
}
