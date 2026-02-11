'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord, AgentTeachingEmbeddingDocumentListItem, AgentTeachingChatSource } from '@/shared/types/domain/agent-teaching';
import type { ChatMessage } from '@/shared/types/domain/chatbot';

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

export const agentTeachingKeys = QUERY_KEYS.agentTeaching;

export function useSearchEmbeddingCollectionMutation(): UseMutationResult<
  AgentTeachingChatSource[],
  Error,
  { collectionId: string; queryText: string; topK?: number; minScore?: number }
  > {
  return useMutation({
    mutationFn: ({ collectionId, queryText, topK, minScore }) => {
      const payload: Parameters<typeof searchEmbeddingCollection>[1] = { queryText };
      if (topK !== undefined) payload.topK = topK;
      if (minScore !== undefined) payload.minScore = minScore;
      return searchEmbeddingCollection(collectionId, payload);
    },
  });
}

export function useTeachingChatMutation(): UseMutationResult<
  { message: string; sources: AgentTeachingChatSource[] },
  Error,
  { agentId: string; messages: ChatMessage[] }
  > {
  return useMutation({
    mutationFn: ({ agentId, messages }) => teachingChat(agentId, messages),
  });
}

export function useTeachingAgents(options?: { enabled?: boolean }): UseQueryResult<AgentTeachingAgentRecord[], Error> {
  return useQuery({
    queryKey: agentTeachingKeys.agents(),
    queryFn: getTeachingAgents,
    enabled: options?.enabled ?? true,
  });
}

export function useTeachingCollections(): UseQueryResult<AgentTeachingEmbeddingCollectionRecord[], Error> {
  return useQuery({
    queryKey: agentTeachingKeys.collections(),
    queryFn: getEmbeddingCollections,
  });
}

export function useUpsertTeachingAgentMutation(): UseMutationResult<
  AgentTeachingAgentRecord,
  Error,
  Partial<AgentTeachingAgentRecord> & { name: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertTeachingAgent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useDeleteTeachingAgentMutation(): UseMutationResult<
  void,
  Error,
  { id: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteTeachingAgent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useUpsertEmbeddingCollectionMutation(): UseMutationResult<
  AgentTeachingEmbeddingCollectionRecord,
  Error,
  Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertEmbeddingCollection,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
    },
  });
}

export function useDeleteEmbeddingCollectionMutation(): UseMutationResult<
  void,
  Error,
  { id: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteEmbeddingCollection(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.collections() });
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.agents() });
    },
  });
}

export function useEmbeddingDocuments(collectionId: string | null): UseQueryResult<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number } | null, Error> {
  return useQuery({
    queryKey: collectionId ? agentTeachingKeys.documents(collectionId) : [...agentTeachingKeys.all, 'documents', 'none'],
    queryFn: async () => {
      if (!collectionId) return null;
      return fetchEmbeddingDocs(collectionId);
    },
    enabled: !!collectionId,
  });
}

export function useAddEmbeddingDocumentMutation(): UseMutationResult<
  AgentTeachingEmbeddingDocumentListItem,
  Error,
  { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, text, title, source, tags }) => {
      const payload: Parameters<typeof addEmbeddingDocument>[1] = { text };
      if (title !== undefined) payload.title = title;
      if (source !== undefined) payload.source = source;
      if (tags !== undefined) payload.tags = tags;
      return addEmbeddingDocument(collectionId, payload);
    },
    onSuccess: (_item, vars) => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
    },
  });
}

export function useDeleteEmbeddingDocumentMutation(): UseMutationResult<
  void,
  Error,
  { collectionId: string; documentId: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, documentId }) => deleteEmbeddingDocument(collectionId, documentId),
    onSuccess: (_item, vars) => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
    },
  });
}
