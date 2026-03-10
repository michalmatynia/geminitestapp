'use client';

import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect, useMemo, useCallback } from 'react';

import {
  useCreateNote,
  useCreateNotebook,
  useCreateNoteFolder,
  useCreateNoteTag,
  useCreateNoteTheme,
  useDeleteNote,
  useDeleteNotebook,
  useDeleteNoteFolder,
  useDeleteNoteTag,
  useDeleteNoteTheme,
  useUpdateNote,
  useUpdateNotebook,
  useUpdateNoteFolder,
  useUpdateNoteTag,
  useUpdateNoteTheme,
} from '@/features/notesapp/api/useNoteMutations';
import {
  useNote as useNoteQuery,
  useNoteCategories as useNoteCategoriesQuery,
  useNotebookResource,
  useNotes as useNotesQuery,
  useNoteTags as useNoteTagsQuery,
  useNoteThemes as useNoteThemesQuery,
} from '@/features/notesapp/api/useNoteQueries';
import { type FetchNotesParams } from '@/features/notesapp/api/useNoteQueries';
export type { FetchNotesParams };
import type { UseNoteDataProps } from '@/shared/contracts/notes';
import type {
  NoteWithRelations,
  NoteFilters,
  NotebookRecord,
  TagRecord,
  CategoryRecord,
  ThemeRecord,
  NoteCreateInput,
  NoteUpdateInput,
  NotebookCreateInput,
  NotebookUpdateInput,
  TagCreateInput,
  TagUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  ThemeCreateInput,
  ThemeUpdateInput,
  NoteFileRecord,
  CategoryWithChildren,
} from '@/shared/contracts/notes';
import type { DeleteResponse } from '@/shared/contracts/ui';
import { useDebounce } from '@/shared/hooks/ui/use-debounce';
import { api, ApiError } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createUpdateMutationV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateNoteDetail } from '@/shared/lib/query-invalidation';
import { noteKeys } from '@/shared/lib/query-key-exports';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

// --- Queries ---

const NOTES_QUERY_DEBOUNCE_MS = 300;

type QueryOptions = {
  enabled?: boolean;
};

function toFetchNotesParams(filters: NoteFilters): FetchNotesParams {
  return {
    notebookId: filters.notebookId ?? undefined,
    search: filters.search || undefined,
    searchScope: filters.searchScope || undefined,
    isPinned: filters.isPinned,
    isArchived: filters.isArchived,
    isFavorite: filters.isFavorite,
    tagIds: filters.tagIds,
    categoryIds: filters.categoryIds,
    truncateContent: filters.truncateContent,
  };
}

export const useNotes = (
  filters: NoteFilters,
  options?: QueryOptions
): UseQueryResult<NoteWithRelations[], Error> => {
  const debouncedFilters = useDebounce(filters, NOTES_QUERY_DEBOUNCE_MS);
  return useNotesQuery(toFetchNotesParams(debouncedFilters), options) as UseQueryResult<
    NoteWithRelations[],
    Error
  >;
};

export const useNote = (
  noteId: string,
  options?: QueryOptions
): UseQueryResult<NoteWithRelations, Error> => {
  return useNoteQuery(noteId || null, options) as UseQueryResult<NoteWithRelations, Error>;
};

export const useNoteTree = (_options?: QueryOptions): UseQueryResult<NotebookRecord[], Error> => {
  const { listQuery } = useNotebookResource();
  return listQuery as UseQueryResult<NotebookRecord[], Error>;
};

export const useNoteTags = (options?: QueryOptions): UseQueryResult<TagRecord[], Error> => {
  return useNoteTagsQuery(undefined, options);
};

export const useNoteCategories = (
  notebookId?: string | null,
  options?: QueryOptions
): UseQueryResult<CategoryRecord[], Error> => {
  return useNoteCategoriesQuery(notebookId, options);
};

export const useNoteThemes = (options?: QueryOptions): UseQueryResult<ThemeRecord[], Error> => {
  return useNoteThemesQuery(undefined, options);
};

// --- Mutations ---

export const useCreateNoteMutation = (): UseMutationResult<
  NoteWithRelations,
  Error,
  NoteCreateInput
> => {
  return useCreateNote();
};

export const useUpdateNoteMutation = (): UseMutationResult<
  NoteWithRelations,
  Error,
  NoteUpdateInput & { id: string }
> => {
  return useUpdateNote();
};

export const useDeleteNoteMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNote();
};

export const useCreateNotebookMutation = (): UseMutationResult<
  NotebookRecord,
  Error,
  NotebookCreateInput
> => {
  return useCreateNotebook();
};

export const useUpdateNotebookMutation = (): UseMutationResult<
  NotebookRecord,
  Error,
  NotebookUpdateInput & { id: string }
> => {
  return useUpdateNotebook();
};

export const useDeleteNotebookMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNotebook();
};

export const useCreateTagMutation = (): UseMutationResult<TagRecord, Error, TagCreateInput> => {
  return useCreateNoteTag();
};

export const useUpdateTagMutation = (): UseMutationResult<
  TagRecord,
  Error,
  TagUpdateInput & { id: string }
> => {
  return useUpdateNoteTag();
};

export const useDeleteTagMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteTag();
};

export const useCreateCategoryMutation = (): UseMutationResult<
  CategoryRecord,
  Error,
  CategoryCreateInput
> => {
  return useCreateNoteFolder();
};

export const useUpdateCategoryMutation = (): UseMutationResult<
  CategoryRecord,
  Error,
  CategoryUpdateInput & { id: string }
> => {
  return useUpdateNoteFolder();
};

export const useDeleteCategoryMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteFolder();
};

export const useCreateThemeMutation = (): UseMutationResult<
  ThemeRecord,
  Error,
  ThemeCreateInput
> => {
  return useCreateNoteTheme();
};

export const useUpdateThemeMutation = (): UseMutationResult<
  ThemeRecord,
  Error,
  ThemeUpdateInput & { id: string }
> => {
  return useUpdateNoteTheme();
};

export const useDeleteThemeMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteTheme();
};

export const useUpdateNoteRelationsMutation = (noteId: string) => {
  const mutationKey = QUERY_KEYS.notes.detail(noteId);
  return createUpdateMutationV2<
    void,
    {
      relationsFrom?: string[];
      relationsTo?: string[];
    }
  >({
    mutationFn: (variables) => api.put<void>(`/api/notes/${noteId}/relations`, variables),
    mutationKey,
    meta: {
      source: 'notes.hooks.useUpdateNoteRelationsMutation',
      operation: 'update',
      resource: 'notes.relations',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'relations', 'update'],
      description: 'Updates notes relations.'},
    invalidate: (queryClient) => invalidateNoteDetail(queryClient, noteId),
  });
};

export const useCreateNoteFileMutation = (noteId?: string) => {
  const mutationKey = QUERY_KEYS.notes.detail(noteId ?? 'none');
  return createMutationV2<
    NoteFileRecord,
    {
      slotIndex: number;
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
        }
        >({
          mutationFn: async ({
            slotIndex,
            file,
            onProgress,
          }: {
      slotIndex: number;
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }): Promise<NoteFileRecord> => {
            if (!noteId) throw new ApiError('Note ID is required for file upload', 400);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('slotIndex', slotIndex.toString());

            const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
            const result = await uploadWithProgress<NoteFileRecord | { error?: string }>(
              `/api/notes/${noteId}/files`,
              {
                formData,
                onProgress,
              }
            );
            if (!result.ok) {
              const error = result.data as { error?: string };
              throw new ApiError(error.error || 'Failed to upload note file', 400);
            }
            return result.data as NoteFileRecord;
          },
          mutationKey,
          meta: {
            source: 'notes.hooks.useCreateNoteFileMutation',
            operation: 'upload',
            resource: 'notes.files',
            domain: 'notes',
            mutationKey,
            tags: ['notes', 'files', 'upload'],
            description: 'Uploads notes files.'},
          invalidate: async (queryClient) => {
            if (noteId) {
              await invalidateNoteDetail(queryClient, noteId);
            }
          },
        });
};

export const useDeleteNoteFileMutation = (noteId?: string) => {
  const mutationKey = QUERY_KEYS.notes.detail(noteId ?? 'none');
  return createDeleteMutationV2<DeleteResponse, number>({
    mutationFn: (slotIndex) => {
      if (!noteId) throw new ApiError('Note ID is required for file deletion', 400);
      return api.delete<DeleteResponse>(`/api/notes/${noteId}/files/${slotIndex}`);
    },
    mutationKey,
    meta: {
      source: 'notes.hooks.useDeleteNoteFileMutation',
      operation: 'delete',
      resource: 'notes.files',
      domain: 'notes',
      mutationKey,
      tags: ['notes', 'files', 'delete'],
      description: 'Deletes notes files.'},
    invalidate: async (queryClient) => {
      if (noteId) {
        await invalidateNoteDetail(queryClient, noteId);
      }
    },
  });
};

// --- Composite Hook ---

export interface UseNoteDataResult {
  notes: NoteWithRelations[];
  setNotes: (
    updater: NoteWithRelations[] | ((prev: NoteWithRelations[] | undefined) => NoteWithRelations[])
  ) => void;
  tags: TagRecord[];
  themes: ThemeRecord[];
  notebook: NotebookRecord | null;
  setNotebook: (
    updater:
      | NotebookRecord
      | null
      | ((prev: NotebookRecord | null | undefined) => NotebookRecord | null)
  ) => void;
  folderTree: CategoryWithChildren[];
  loading: boolean;
  notesRef: React.MutableRefObject<NoteWithRelations[]>;
  folderTreeRef: React.MutableRefObject<CategoryWithChildren[]>;
  fetchNotes: () => Promise<void>;
  fetchFolderTree: () => Promise<void>;
  fetchTags: () => Promise<void>;
}

export function useNoteData({
  selectedNotebookId,
  selectedFolderId,
  searchQuery,
  searchScope,
  filterPinned,
  filterArchived,
  filterFavorite,
  filterTagIds,
  setSelectedNotebookId,
}: UseNoteDataProps): UseNoteDataResult {
  const notesRef = useRef<NoteWithRelations[]>([]);
  const folderTreeRef = useRef<CategoryWithChildren[]>([]);
  const queryClient = useQueryClient();

  // Queries
  const filters = useMemo(
    () => ({
      search: searchQuery,
      searchScope,
      ...(filterPinned !== undefined && { isPinned: filterPinned }),
      ...(filterArchived !== undefined && { isArchived: filterArchived }),
      ...(filterFavorite !== undefined && { isFavorite: filterFavorite }),
      tagIds: filterTagIds,
      categoryIds: selectedFolderId ? [selectedFolderId] : [],
      notebookId: selectedNotebookId,
      truncateContent: true,
    }),
    [
      searchQuery,
      searchScope,
      filterPinned,
      filterArchived,
      filterFavorite,
      filterTagIds,
      selectedFolderId,
      selectedNotebookId,
    ]
  );

  const notesQuery = useNotes(filters);

  const notebooksQuery = useNoteTree();
  const tagsQuery = useNoteTags();
  const themesQuery = useNoteThemes();
  const categoriesQuery = useNoteCategories(selectedNotebookId);

  // Derived state
  const notes = useMemo(() => notesQuery.data || [], [notesQuery.data]);
  const notebooks = useMemo(() => notebooksQuery.data || [], [notebooksQuery.data]);
  const tags = tagsQuery.data || [];
  const themes = themesQuery.data || [];
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

  const notebook = useMemo(
    () => notebooks.find((n: NotebookRecord) => n.id === selectedNotebookId) || null,
    [notebooks, selectedNotebookId]
  );

  // Sync refs for imperative access
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Build folder tree
  const folderTree = useMemo(() => {
    if (!categories.length) {
      return [];
    }

    const categoryMap = new Map<string, CategoryWithChildren>();

    // Initialize map
    categories.forEach((cat: CategoryRecord) => {
      if (selectedNotebookId && cat.notebookId !== selectedNotebookId) return;
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
        notes: [],
        _count: { notes: 0 },
      });
    });

    const roots: CategoryWithChildren[] = [];

    // Build tree
    categoryMap.forEach((node: CategoryWithChildren) => {
      if (node.parentId && categoryMap.has(node.parentId)) {
        categoryMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by sortIndex or name
    const sortNodes = (nodes: CategoryWithChildren[]): void => {
      nodes.sort((a: CategoryWithChildren, b: CategoryWithChildren) => {
        if (a.sortIndex !== null && b.sortIndex !== null) {
          return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node: CategoryWithChildren) => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
  }, [categories, selectedNotebookId]);

  // Update folderTreeRef in useEffect
  useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  // Initial selection
  useEffect(() => {
    if (!selectedNotebookId && notebooks.length > 0) {
      setSelectedNotebookId(notebooks[0]!.id);
    }
  }, [selectedNotebookId, notebooks, setSelectedNotebookId]);

  const setNotes = useCallback(
    (
      updater:
        | NoteWithRelations[]
        | ((prev: NoteWithRelations[] | undefined) => NoteWithRelations[])
    ): void => {
      queryClient.setQueryData(noteKeys.list(filters), updater);
    },
    [queryClient, filters]
  );

  const setNotebook = useCallback(
    (
      updater:
        | NotebookRecord
        | null
        | ((prev: NotebookRecord | null | undefined) => NotebookRecord | null)
    ): void => {
      queryClient.setQueryData(noteKeys.detail(selectedNotebookId ?? ''), updater);
    },
    [queryClient, selectedNotebookId]
  );

  return {
    notes,
    setNotes,
    tags,
    themes,
    notebook,
    setNotebook,
    folderTree,
    loading: notesQuery.isLoading || notebooksQuery.isLoading,
    notesRef,
    folderTreeRef,
    fetchNotes: async (): Promise<void> => {
      void (await notesQuery.refetch());
    },
    fetchFolderTree: async (): Promise<void> => {
      void (await categoriesQuery.refetch());
    },
    fetchTags: async (): Promise<void> => {
      void (await tagsQuery.refetch());
    },
  };
}
