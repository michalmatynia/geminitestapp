import { z } from 'zod';

import {
  notebookSchema,
  type NotebookRecord,
  type NotebookCreateInput,
  type NotebookUpdateInput,
} from '@/shared/contracts/notes';
import type { DeleteResponse } from '@/shared/contracts/ui/api';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/**
 * Hook for Notebook CRUD operations using explicit v2 factories.
 * This provides standardized list, create, update, and remove mutations with explicit meta.
 */
export function useNotebookResource() {
  const queryKey = QUERY_KEYS.notes.notebooks();

  const listQuery = createListQueryV2<NotebookRecord>({
    queryKey,
    queryFn: async () => {
      const data = await api.get<NotebookRecord[]>('/api/notes/notebooks');
      return z.array(notebookSchema).parse(data);
    },
    meta: {
      source: 'notes.hooks.useNotebookResource.list',
      operation: 'list',
      resource: 'notes.notebooks',
      domain: 'notes',
      queryKey,
      tags: ['notes', 'notebooks'],
      description: 'Loads notes notebooks.'},
  });

  const createMutation = createCreateMutationV2<NotebookRecord, NotebookCreateInput>({
    mutationFn: (payload) => api.post<NotebookRecord>('/api/notes/notebooks', payload),
    mutationKey: queryKey,
    meta: {
      source: 'notes.hooks.useNotebookResource.create',
      operation: 'create',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey: queryKey,
      tags: ['notes', 'notebooks', 'create'],
      description: 'Creates notes notebooks.'},
    invalidateKeys: [queryKey],
  });

  const updateMutation = createUpdateMutationV2<
    NotebookRecord,
    NotebookUpdateInput & { id: string }
  >({
    mutationFn: ({ id, ...payload }) =>
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, payload),
    mutationKey: queryKey,
    meta: {
      source: 'notes.hooks.useNotebookResource.update',
      operation: 'update',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey: queryKey,
      tags: ['notes', 'notebooks', 'update'],
      description: 'Updates notes notebooks.'},
    invalidateKeys: [queryKey],
  });

  const deleteMutation = createDeleteMutationV2<DeleteResponse, string>({
    mutationFn: (id) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    mutationKey: queryKey,
    meta: {
      source: 'notes.hooks.useNotebookResource.delete',
      operation: 'delete',
      resource: 'notes.notebooks',
      domain: 'notes',
      mutationKey: queryKey,
      tags: ['notes', 'notebooks', 'delete'],
      description: 'Deletes notes notebooks.'},
    invalidateKeys: [queryKey],
  });

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
