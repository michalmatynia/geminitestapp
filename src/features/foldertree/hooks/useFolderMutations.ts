'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { FolderNode } from '@/features/foldertree/utils/folderImporter';
import { createCreateMutation } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CreateMutation } from '@/shared/types/query-result-types';

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

export function useImportFolderMutation(): CreateMutation<ImportFolderResponse, ImportFolderPayload> {
  const queryClient = useQueryClient();

  return createCreateMutation({
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
    options: {
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
    },
  });
}
