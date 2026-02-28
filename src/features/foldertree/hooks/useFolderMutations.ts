'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { FolderNode } from '@/features/foldertree/utils/folderImporter';
import type { CreateMutation } from '@/shared/contracts/ui';
import { createCreateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

interface ImportFolderPayload {
  notebookId: string;
  parentFolderId: string | null;
  structures: FolderNode[];
}

interface ImportFolderResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export function useImportFolderMutation(): CreateMutation<
  ImportFolderResponse,
  ImportFolderPayload
  > {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.notes.all;

  return createCreateMutationV2({
    mutationFn: async (payload: ImportFolderPayload): Promise<ImportFolderResponse> => {
      const response = await fetch('/api/notes/import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to import folder structure');
      }

      return response.json() as Promise<ImportFolderResponse>;
    },
    mutationKey,
    meta: {
      source: 'foldertree.hooks.useImportFolderMutation',
      operation: 'create',
      resource: 'notes.folder-tree.import',
      domain: 'global',
      mutationKey,
      tags: ['notes', 'folder-tree', 'import'],
    },
    onSuccess: (_data: ImportFolderResponse, variables: ImportFolderPayload) => {
      // Invalidate folder tree for the specific notebook
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notes.folderTree(variables.notebookId),
      });
      // Invalidate notes list as new notes are added
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notes.all,
      });
      // Also invalidate stats or other related queries if they exist
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notes.notebooks(),
      });
    },
  });
}
