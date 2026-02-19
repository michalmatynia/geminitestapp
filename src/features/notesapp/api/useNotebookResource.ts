'use client';

import type { NotebookDto } from '@/shared/contracts/notes';
import { useResource } from '@/shared/hooks/query/useResource';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/**
 * Hook for Notebook CRUD operations using the generic useResource.
 * This provides standardized list, create, update, and remove mutations.
 */
export function useNotebookResource() {
  return useResource<NotebookDto>(
    '/api/notes/notebooks',
    QUERY_KEYS.notes.notebooks()
  );
}
