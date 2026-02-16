'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
} from '@/shared/lib/query-factories-v2';
import { agentTeachingKeys } from '@/shared/lib/query-key-exports';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord, AgentTeachingEmbeddingDocumentListItem, AgentTeachingChatSource } from '@/shared/types/domain/agent-teaching';
import type { ChatMessage } from '@/shared/types/domain/chatbot';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult 
} from '@/shared/types/query-result-types';

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
  return createCreateMutation<AgentTeachingChatSource[], { collectionId: string; queryText: string; topK?: number; minScore?: number }>({
    mutationFn: ({ collectionId, queryText, topK, minScore }: { collectionId: string; queryText: string; topK?: number; minScore?: number }) => {
      const payload: Parameters<typeof searchEmbeddingCollection>[1] = { queryText };
      if (topK !== undefined) payload.topK = topK;
      if (minScore !== undefined) payload.minScore = minScore;
      return searchEmbeddingCollection(collectionId, payload);
    },
  });
}

export function useTeachingChatMutation(): MutationResult<
  { message: string; sources: AgentTeachingChatSource[] },
  { agentId: string; messages: ChatMessage[] }
  > {
  return createCreateMutation<{ message: string; sources: AgentTeachingChatSource[] }, { agentId: string; messages: ChatMessage[] }>({
    mutationFn: ({ agentId, messages }: { agentId: string; messages: ChatMessage[] }) => teachingChat(agentId, messages),
  });
}

export function useTeachingAgents(options?: { enabled?: boolean }): ListQuery<AgentTeachingAgentRecord> {
  return createListQuery<AgentTeachingAgentRecord>({
    queryKey: agentTeachingKeys.agents(),
    queryFn: getTeachingAgents,
    enabled: options?.enabled ?? true,
  });
}

export function useTeachingCollections(): ListQuery<AgentTeachingEmbeddingCollectionRecord> {
  return createListQuery<AgentTeachingEmbeddingCollectionRecord>({
    queryKey: agentTeachingKeys.collections(),
    queryFn: getEmbeddingCollections,
  });
}

export function useUpsertTeachingAgentMutation(): MutationResult<
  AgentTeachingAgentRecord,
  Partial<AgentTeachingAgentRecord> & { name: string }
  > {
  const qc = useQueryClient();
  return createCreateMutation<AgentTeachingAgentRecord, Partial<AgentTeachingAgentRecord> & { name: string }>({
    mutationFn: upsertTeachingAgent,
    options: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
      },
    },
  });
}

export function useDeleteTeachingAgentMutation(): MutationResult<
  void,
  { id: string }
  > {
  const qc = useQueryClient();
  return createCreateMutation<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteTeachingAgent(id),
    options: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
      },
    },
  });
}

export function useUpsertEmbeddingCollectionMutation(): MutationResult<
  AgentTeachingEmbeddingCollectionRecord,
  Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
  > {
  const qc = useQueryClient();
  return createCreateMutation<AgentTeachingEmbeddingCollectionRecord, Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }>({
    mutationFn: upsertEmbeddingCollection,
    options: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
      },
    },
  });
}

export function useDeleteEmbeddingCollectionMutation(): MutationResult<
  void,
  { id: string }
  > {
  const qc = useQueryClient();
  return createCreateMutation<void, { id: string }>({
    mutationFn: ({ id }: { id: string }) => deleteEmbeddingCollection(id),
    options: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
      },
    },
  });
}

export function useEmbeddingDocuments(collectionId: string | null): SingleQuery<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number } | null> {
  return createSingleQuery<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number } | null>({
    id: collectionId,
    queryKey: (id: string) => id !== 'none' ? agentTeachingKeys.documents(id) : [...agentTeachingKeys.all, 'detail', 'documents', 'none'],
    queryFn: async () => {
      if (!collectionId) return null;
      return fetchEmbeddingDocs(collectionId);
    },
    enabled: !!collectionId,
  });
}

export function useAddEmbeddingDocumentMutation(): MutationResult<
  AgentTeachingEmbeddingDocumentListItem,
  { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }
  > {
  const qc = useQueryClient();
  return createCreateMutation<AgentTeachingEmbeddingDocumentListItem, { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }>({
    mutationFn: ({ collectionId, text, title, source, tags }: { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }) => {
      const payload: Parameters<typeof addEmbeddingDocument>[1] = { text };
      if (title !== undefined) payload.title = title;
      if (source !== undefined) payload.source = source;
      if (tags !== undefined) payload.tags = tags;
      return addEmbeddingDocument(collectionId, payload);
    },
    options: {
      onSuccess: (_item, vars: { collectionId: string }) => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
      },
    }
  });
}

export function useDeleteEmbeddingDocumentMutation(): MutationResult<
  void,
  { collectionId: string; documentId: string }
  > {
  const qc = useQueryClient();
  return createCreateMutation<void, { collectionId: string; documentId: string }>({
    mutationFn: ({ collectionId, documentId }: { collectionId: string; documentId: string }) => deleteEmbeddingDocument(collectionId, documentId),
    options: {
      onSuccess: (_item, vars: { collectionId: string }) => {
        void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
      },
    }
  });
}
