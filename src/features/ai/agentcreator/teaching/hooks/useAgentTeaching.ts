'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord, AgentTeachingEmbeddingDocumentListItem } from '@/shared/types/agent-teaching';

export const agentTeachingKeys = {
  all: ['agent-teaching'] as const,
  agents: () => [...agentTeachingKeys.all, 'agents'] as const,
  collections: () => [...agentTeachingKeys.all, 'collections'] as const,
  documents: (collectionId: string) => [...agentTeachingKeys.all, 'collections', collectionId, 'documents'] as const,
};

export function useTeachingAgents(): UseQueryResult<AgentTeachingAgentRecord[], Error> {
  return useQuery({
    queryKey: agentTeachingKeys.agents(),
    queryFn: async (): Promise<AgentTeachingAgentRecord[]> => {
      try {
        const res = await fetch('/api/agentcreator/teaching/agents');
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          console.warn('[learner-agents] Failed to load learner agents', payload?.error ?? res.status);
          return [];
        }
        const data = (await res.json()) as { agents?: AgentTeachingAgentRecord[] };
        return data.agents ?? [];
      } catch (error) {
        console.warn('[learner-agents] Failed to load learner agents', error);
        return [];
      }
    },
  });
}

export function useTeachingCollections(): UseQueryResult<AgentTeachingEmbeddingCollectionRecord[], Error> {
  return useQuery({
    queryKey: agentTeachingKeys.collections(),
    queryFn: async (): Promise<AgentTeachingEmbeddingCollectionRecord[]> => {
      const res = await fetch('/api/agentcreator/teaching/collections');
      if (!res.ok) throw new Error('Failed to load embedding collections.');
      const data = (await res.json()) as { collections?: AgentTeachingEmbeddingCollectionRecord[] };
      return data.collections ?? [];
    },
  });
}

export function useUpsertTeachingAgentMutation(): UseMutationResult<
  AgentTeachingAgentRecord,
  Error,
  Partial<AgentTeachingAgentRecord> & { name: string }
  > {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AgentTeachingAgentRecord> & { name: string }): Promise<AgentTeachingAgentRecord> => {
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      const isUpdate = id.length > 0;
      const url = isUpdate
        ? `/api/agentcreator/teaching/agents/${encodeURIComponent(id)}`
        : '/api/agentcreator/teaching/agents';
      const method = isUpdate ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to save learner agent.');
      }
      const data = (await res.json()) as { agent?: AgentTeachingAgentRecord };
      if (!data.agent) throw new Error('Missing agent in response.');
      return data.agent;
    },
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
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const res = await fetch(`/api/agentcreator/teaching/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to delete learner agent.');
      }
    },
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
    mutationFn: async (payload: Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }): Promise<AgentTeachingEmbeddingCollectionRecord> => {
      const id = typeof payload.id === 'string' ? payload.id.trim() : '';
      const isUpdate = id.length > 0;
      const url = isUpdate
        ? `/api/agentcreator/teaching/collections/${encodeURIComponent(id)}`
        : '/api/agentcreator/teaching/collections';
      const method = isUpdate ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to save embedding collection.');
      }
      const data = (await res.json()) as { collection?: AgentTeachingEmbeddingCollectionRecord };
      if (!data.collection) throw new Error('Missing collection in response.');
      return data.collection;
    },
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
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const res = await fetch(`/api/agentcreator/teaching/collections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to delete embedding collection.');
      }
    },
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
      const res = await fetch(`/api/agentcreator/teaching/collections/${encodeURIComponent(collectionId)}/documents?limit=100&skip=0`);
      if (!res.ok) throw new Error('Failed to load documents.');
      return (await res.json()) as { items: AgentTeachingEmbeddingDocumentListItem[]; total: number };
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
    mutationFn: async (payload: { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }): Promise<AgentTeachingEmbeddingDocumentListItem> => {
      const res = await fetch(
        `/api/agentcreator/teaching/collections/${encodeURIComponent(payload.collectionId)}/documents`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: payload.text,
            title: payload.title ?? null,
            source: payload.source ?? null,
            tags: payload.tags ?? [],
          }),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to add document.');
      }
      const data = (await res.json()) as { item?: AgentTeachingEmbeddingDocumentListItem };
      if (!data.item) throw new Error('Missing item in response.');
      return data.item;
    },
    onSuccess: (_item: AgentTeachingEmbeddingDocumentListItem, vars: { collectionId: string; text: string; title?: string | null; source?: string | null; tags?: string[] }) => {
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
    mutationFn: async ({ collectionId, documentId }: { collectionId: string; documentId: string }): Promise<void> => {
      const res = await fetch(
        `/api/agentcreator/teaching/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(documentId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to delete document.');
      }
    },
    onSuccess: (_item: void, vars: { collectionId: string; documentId: string }) => {
      void qc.invalidateQueries({ queryKey: agentTeachingKeys.documents(vars.collectionId) });
    },
  });
}
