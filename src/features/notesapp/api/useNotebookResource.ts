import { z } from 'zod';
import {
  notebookSchema,
  type NotebookRecord,
} from '@/shared/contracts/notes';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-key-exports';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import {
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
} from './useNoteMutations';

export function useNotebookResource(): {
  listQuery: ListQuery<NotebookRecord>;
  createMutation: ReturnType<typeof useCreateNotebook>;
  updateMutation: ReturnType<typeof useUpdateNotebook>;
  deleteMutation: ReturnType<typeof useDeleteNotebook>;
} {
  const queryKey = QUERY_KEYS.notes.notebooks();

  const listQuery = createListQueryV2<NotebookRecord>({
    queryKey,
    queryFn: async (): Promise<NotebookRecord[]> => {
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
      description: 'Loads notes notebooks.',
    },
  });

  const createMutation = useCreateNotebook();
  const updateMutation = useUpdateNotebook();
  const deleteMutation = useDeleteNotebook();

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}


