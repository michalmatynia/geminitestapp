'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
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
  useNotebooks as useNotebooksQuery,
  useNotes as useNotesQuery,
  useNoteTags as useNoteTagsQuery,
  useNoteThemes as useNoteThemesQuery,
  type FetchNotesParams,
} from '@/features/notesapp/api/useNoteQueries';
import type { UseNoteDataProps } from '@/features/notesapp/types/notes-hooks';
import { useDebounce } from '@/shared/hooks/ui/use-debounce';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { DeleteResponse } from '@/shared/types/api/api';
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
} from '@/shared/types/domain/notes';

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
  return useNotesQuery(toFetchNotesParams(debouncedFilters), options);
};

export const useNote = (
  noteId: string,
  options?: QueryOptions
): UseQueryResult<NoteWithRelations, Error> => {
  return useNoteQuery(noteId || null, options) as UseQueryResult<NoteWithRelations, Error>;
};

export const useNoteTree = (options?: QueryOptions): UseQueryResult<NotebookRecord[], Error> => {
  return useNotebooksQuery(options);
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

export const useCreateNoteMutation = (): UseMutationResult<NoteWithRelations, Error, NoteCreateInput> => {
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

export const useCreateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookCreateInput> => {
  return useCreateNotebook();
};

export const useUpdateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookUpdateInput & { id: string }> => {
  return useUpdateNotebook();
};

export const useDeleteNotebookMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNotebook();
};

export const useCreateTagMutation = (): UseMutationResult<TagRecord, Error, TagCreateInput> => {
  return useCreateNoteTag();
};

export const useUpdateTagMutation = (): UseMutationResult<TagRecord, Error, TagUpdateInput & { id: string }> => {
  return useUpdateNoteTag();
};

export const useDeleteTagMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteTag();
};

export const useCreateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryCreateInput> => {
  return useCreateNoteFolder();
};

export const useUpdateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryUpdateInput & { id: string }> => {
  return useUpdateNoteFolder();
};

export const useDeleteCategoryMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteFolder();
};

export const useCreateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeCreateInput> => {
  return useCreateNoteTheme();
};

export const useUpdateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeUpdateInput & { id: string }> => {
  return useUpdateNoteTheme();
};

export const useDeleteThemeMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  return useDeleteNoteTheme();
};

export const useUpdateNoteRelationsMutation = (noteId: string): UseMutationResult<void, Error, {
  relationsFrom?: string[];
  relationsTo?: string[];
}> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { relationsFrom?: string[]; relationsTo?: string[] }) => 
      api.put<void>(`/api/notes/${noteId}/relations`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
    },
  });
};

export const useCreateNoteFileMutation = (
  noteId?: string
): UseMutationResult<
  NoteFileRecord,
  Error,
  { slotIndex: number; file: File; onProgress?: (loaded: number, total?: number) => void }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slotIndex,
      file,
      onProgress,
    }: {
      slotIndex: number;
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }): Promise<NoteFileRecord> => {
      if (!noteId) throw new Error('Note ID is required for file upload');
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
        throw new Error(error.error || 'Failed to upload note file');
      }
      return result.data as NoteFileRecord;
    },
    onSuccess: () => {
      if (noteId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
      }
    },
  });
};

export const useDeleteNoteFileMutation = (noteId?: string): UseMutationResult<DeleteResponse, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotIndex: number) => {
      if (!noteId) throw new Error('Note ID is required for file deletion');
      return api.delete<DeleteResponse>(`/api/notes/${noteId}/files/${slotIndex}`);
    },
    onSuccess: () => {
      if (noteId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes.detail(noteId) });
      }
    },
  });
};

// --- Composite Hook ---

export interface UseNoteDataResult {
  notes: NoteWithRelations[];
  setNotes: (updater: NoteWithRelations[] | ((prev: NoteWithRelations[] | undefined) => NoteWithRelations[])) => void;
  tags: TagRecord[];
  themes: ThemeRecord[];
  notebook: NotebookRecord | null;
  setNotebook: (newNotebook: NotebookRecord) => void;
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
  const queryClient = useQueryClient();
  const notesRef = useRef<NoteWithRelations[]>([]);
  const folderTreeRef = useRef<CategoryWithChildren[]>([]);

  // Queries
  const filters = useMemo(() => ({
    search: searchQuery,
    searchScope,
    ...(filterPinned !== undefined && { isPinned: filterPinned }),
    ...(filterArchived !== undefined && { isArchived: filterArchived }),
    ...(filterFavorite !== undefined && { isFavorite: filterFavorite }),
    tagIds: filterTagIds,
    categoryIds: selectedFolderId ? [selectedFolderId] : [],
    notebookId: selectedNotebookId,
    truncateContent: true,
  }), [searchQuery, searchScope, filterPinned, filterArchived, filterFavorite, filterTagIds, selectedFolderId, selectedNotebookId]);

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

  // Setters (wrappers for query updates or optimistic UI - simplified for now)
  const setNotes = useCallback((updater: NoteWithRelations[] | ((prev: NoteWithRelations[] | undefined) => NoteWithRelations[])): void => {
    queryClient.setQueryData(QUERY_KEYS.notes.list(toFetchNotesParams(filters)), updater);
  }, [queryClient, filters]);

  const setNotebook = useCallback((newNotebook: NotebookRecord): void => {
    // This might need to update the notebook in the list
    queryClient.setQueryData(QUERY_KEYS.notes.notebooks, (old: NotebookRecord[] | undefined) => {
      if (!old) return [newNotebook];
      return old.map((n: NotebookRecord) => n.id === newNotebook.id ? newNotebook : n);
    });
    // And possibly selected notebook state if needed, but that's passed in
  }, [queryClient]);

  // Initial selection
  useEffect(() => {
    if (!selectedNotebookId && notebooks.length > 0) {
      setSelectedNotebookId(notebooks[0]!.id);
    }
  }, [selectedNotebookId, notebooks, setSelectedNotebookId]);

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
    fetchNotes: async (): Promise<void> => { void await notesQuery.refetch(); },
    fetchFolderTree: async (): Promise<void> => { void await categoriesQuery.refetch(); },
    fetchTags: async (): Promise<void> => { void await tagsQuery.refetch(); },
  };
}
