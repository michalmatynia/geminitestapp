'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { 
  AgentTeachingAgentDto as AgentTeachingAgentRecord, 
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord, 
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem, 
  AgentTeachingChatSourceDto as AgentTeachingChatSource 
} from '@/shared/contracts/agent-teaching';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { agentTeachingKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult 
} from '@/shared/contracts/ui';

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
  teachingChat
} from '../api';

export { agentTeachingKeys };

export function useSearchEmbeddingCollectionMutation(): MutationResult<
  AgentTeachingChatSource[],
  { collectionId: string; queryText: string; topK?: number; minScore?: number }
  > {
  const mutationKey = agentTeachingKeys.collections();
  return createCreateMutationV2<AgentTeachingChatSource[], { collectionId: string; queryText: string; topK?: number; minScore?: number }>({
    mutationFn: ({ collectionId, queryText, topK, minScore }: { collectionId: string; queryText: string; topK?: number; minScore?: number }) => {
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
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'search'],
    },
  });
}

export function useTeachingChatMutation(): MutationResult<
  { message: string; sources: AgentTeachingChatSource[] },
  { agentId: string; messages: ChatMessage[] }
  > {
  const mutationKey = agentTeachingKeys.agents();
  return createCreateMutationV2<{ message: string; sources: AgentTeachingChatSource[] }, { agentId: string; messages: ChatMessage[] }>({
    mutationFn: ({ agentId, messages }: { agentId: string; messages: ChatMessage[] }) => teachingChat(agentId, messages),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useTeachingChatMutation',
      operation: 'action',
      resource: 'agent-teaching.chat',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'chat'],
    },
  });
}

export function useTeachingAgents(options?: { enabled?: boolean }): ListQuery<AgentTeachingAgentRecord> {
  const queryKey = agentTeachingKeys.agents();
  return createListQueryV2<AgentTeachingAgentRecord>({
    queryKey,
    queryFn: getTeachingAgents,
    enabled: options?.enabled ?? true,
    meta: {
      source: 'agentTeaching.hooks.useTeachingAgents',
      operation: 'list',
      resource: 'agent-teaching.agents',
      domain: 'global',
      queryKey,
      tags: ['agent-teaching', 'agents'],
    },
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
      domain: 'global',
      queryKey,
      tags: ['agent-teaching', 'collections'],
    },
  });
}

export function useUpsertTeachingAgentMutation(): MutationResult<
  AgentTeachingAgentRecord,
  Partial<AgentTeachingAgentRecord> & { name: string }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.agents();
  return createUpdateMutationV2<AgentTeachingAgentRecord, Partial<AgentTeachingAgentRecord> & { name: string }>({
    mutationFn: upsertTeachingAgent,
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useUpsertTeachingAgentMutation',
      operation: 'update',
      resource: 'agent-teaching.agents',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'agents', 'upsert'],
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useDeleteTeachingAgentMutation(): MutationResult<
  void,
  { id: string }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.agents();
  return createDeleteMutationV2<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteTeachingAgent(id),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteTeachingAgentMutation',
      operation: 'delete',
      resource: 'agent-teaching.agents',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'agents', 'delete'],
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useUpsertEmbeddingCollectionMutation(): MutationResult<
  AgentTeachingEmbeddingCollectionRecord,
  Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.collections();
  return createUpdateMutationV2<AgentTeachingEmbeddingCollectionRecord, Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }>({
    mutationFn: upsertEmbeddingCollection,
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useUpsertEmbeddingCollectionMutation',
      operation: 'update',
      resource: 'agent-teaching.embedding-collections',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'upsert'],
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
    },
  });
}

export function useDeleteEmbeddingCollectionMutation(): MutationResult<
  void,
  { id: string }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.collections();
  return createDeleteMutationV2<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteEmbeddingCollection(id),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteEmbeddingCollectionMutation',
      operation: 'delete',
      resource: 'agent-teaching.embedding-collections',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'collections', 'delete'],
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useEmbeddingDocuments(collectionId: string | null): SingleQuery<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number } | null> {
  return createSingleQueryV2<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number } | null>({
    id: collectionId,
    queryKey: (id: string) => id !== 'none' ? agentTeachingKeys.documents(id) : [...agentTeachingKeys.all, 'detail', 'documents', 'none'],
    queryFn: async () => {
      if (!collectionId) return null;
      return fetchEmbeddingDocs(collectionId);
    },
    enabled: !!collectionId,
    meta: {
      source: 'agentTeaching.hooks.useEmbeddingDocuments',
      operation: 'detail',
      resource: 'agent-teaching.embedding-documents',
      domain: 'global',
      tags: ['agent-teaching', 'documents'],
    },
  });
}

export function useAddEmbeddingDocumentMutation(): MutationResult<
  AgentTeachingEmbeddingDocumentListItem,
  { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.collections();
  return createCreateMutationV2<AgentTeachingEmbeddingDocumentListItem, { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }>({
    mutationFn: ({ collectionId, text, title, source, tags }: { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }) => {
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
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'create'],
    },
    onSuccess: (_item, vars: { collectionId: string }) => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
    }
  });
}

export function useDeleteEmbeddingDocumentMutation(): MutationResult<
  void,
  { collectionId: string; documentId: string }
  > {
  const qc = useQueryClient();
  const mutationKey = agentTeachingKeys.collections();
  return createDeleteMutationV2<void, { collectionId: string; documentId: string }>({
    mutationFn: ({ collectionId, documentId }: { collectionId: string; documentId: string }) => deleteEmbeddingDocument(collectionId, documentId),
    mutationKey,
    meta: {
      source: 'agentTeaching.hooks.useDeleteEmbeddingDocumentMutation',
      operation: 'delete',
      resource: 'agent-teaching.embedding-documents',
      domain: 'global',
      mutationKey,
      tags: ['agent-teaching', 'documents', 'delete'],
    },
    onSuccess: (_item, vars: { collectionId: string }) => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
    }
  });
}
