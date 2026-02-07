'use client';

import { useQuery, useQueryClient, useMutation, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { useRef, useEffect, useMemo, useCallback } from 'react';

import type { UseNoteDataProps } from '@/features/notesapp/types/notes-hooks';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { api } from '@/shared/lib/api-client';
import type { DeleteResponse } from '@/shared/types/api';
import type {
  NoteRecord,
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
} from '@/shared/types/notes';

// --- Queries ---

const NOTES_STALE_MS = 10_000;

export const useNotes = (
  filters: NoteFilters,
  options?: { enabled?: boolean }
): UseQueryResult<NoteWithRelations[], Error> => {
  const debouncedFilters = useDebounce(filters, 300);

  return useQuery<NoteWithRelations[], Error>({
    queryKey: ['notes', debouncedFilters],
    queryFn: () => api.get<NoteWithRelations[]>('/api/notes', {
      params: {
        search: debouncedFilters.search || undefined,
        searchScope: debouncedFilters.searchScope || undefined,
        isPinned: debouncedFilters.isPinned !== undefined ? String(debouncedFilters.isPinned) : undefined,
        isArchived: debouncedFilters.isArchived !== undefined ? String(debouncedFilters.isArchived) : undefined,
        isFavorite: debouncedFilters.isFavorite !== undefined ? String(debouncedFilters.isFavorite) : undefined,
        notebookId: debouncedFilters.notebookId || undefined,
        tagIds: debouncedFilters.tagIds?.length ? debouncedFilters.tagIds.join(',') : undefined,
        categoryIds: debouncedFilters.categoryIds?.length ? debouncedFilters.categoryIds.join(',') : undefined,
        truncateContent: debouncedFilters.truncateContent ? 'true' : undefined,
      }
    }),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
};

export const useNote = (
  noteId: string,
  options?: { enabled?: boolean }
): UseQueryResult<NoteWithRelations, Error> => {
  return useQuery<NoteWithRelations, Error>({
    queryKey: ['notes', noteId],
    queryFn: () => api.get<NoteWithRelations>(`/api/notes/${noteId}`),
    enabled: !!noteId && (options?.enabled ?? true),
    staleTime: NOTES_STALE_MS,
  });
};

export const useNoteTree = (options?: { enabled?: boolean }): UseQueryResult<NotebookRecord[], Error> => {
  return useQuery<NotebookRecord[], Error>({
    queryKey: ['notes', 'notebooks'],
    queryFn: () => api.get<NotebookRecord[]>('/api/notes/notebooks'),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
};

export const useNoteTags = (options?: { enabled?: boolean }): UseQueryResult<TagRecord[], Error> => {
  return useQuery<TagRecord[], Error>({
    queryKey: ['notes', 'tags'],
    queryFn: () => api.get<TagRecord[]>('/api/notes/tags'),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
};

export const useNoteCategories = (notebookId?: string | null, options?: { enabled?: boolean }): UseQueryResult<CategoryRecord[], Error> => {
  return useQuery<CategoryRecord[], Error>({
    queryKey: ['notes', 'categories', notebookId],
    queryFn: () => 
      notebookId 
        ? api.get<CategoryRecord[]>('/api/notes/categories', { params: { notebookId } })
        : Promise.resolve([] as CategoryRecord[]),
    enabled: (options?.enabled ?? true) && !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
};

export const useNoteThemes = (options?: { enabled?: boolean }): UseQueryResult<ThemeRecord[], Error> => {
  return useQuery<ThemeRecord[], Error>({
    queryKey: ['notes', 'themes'],
    queryFn: () => api.get<ThemeRecord[]>('/api/notes/themes'),
    enabled: options?.enabled ?? true,
    staleTime: NOTES_STALE_MS,
  });
};

// --- Mutations ---

export const useCreateNoteMutation = (): UseMutationResult<NoteRecord, Error, NoteCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NoteCreateInput) => api.post<NoteRecord>('/api/notes', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useUpdateNoteMutation = (): UseMutationResult<NoteRecord, Error, NoteUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updateData }: NoteUpdateInput & { id: string }) => 
      api.patch<NoteRecord>(`/api/notes/${id}`, updateData),
    onSuccess: (_: NoteRecord, variables: NoteUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useDeleteNoteMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useCreateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotebookCreateInput) => api.post<NotebookRecord>('/api/notes/notebooks', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'notebooks'] });
    },
  });
};

export const useUpdateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updateData }: NotebookUpdateInput & { id: string }) => 
      api.patch<NotebookRecord>(`/api/notes/notebooks/${id}`, updateData),
    onSuccess: (_: NotebookRecord, variables: NotebookUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'notebooks'] });
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
};

export const useDeleteNotebookMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/notebooks/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'notebooks'] });
    },
  });
};

export const useCreateTagMutation = (): UseMutationResult<TagRecord, Error, TagCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TagCreateInput) => api.post<TagRecord>('/api/notes/tags', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'tags'] });
    },
  });
};

export const useUpdateTagMutation = (): UseMutationResult<TagRecord, Error, TagUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updateData }: TagUpdateInput & { id: string }) => 
      api.patch<TagRecord>(`/api/notes/tags/${id}`, updateData),
    onSuccess: (_: TagRecord, variables: TagUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'tags'] });
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
};

export const useDeleteTagMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/tags/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'tags'] });
    },
  });
};

export const useCreateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryCreateInput) => api.post<CategoryRecord>('/api/notes/categories', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'categories'] });
    },
  });
};

export const useUpdateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updateData }: CategoryUpdateInput & { id: string }) => 
      api.patch<CategoryRecord>(`/api/notes/categories/${id}`, updateData),
    onSuccess: (_: CategoryRecord, variables: CategoryUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
};

export const useDeleteCategoryMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'categories'] });
    },
  });
};

export const useCreateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ThemeCreateInput) => api.post<ThemeRecord>('/api/notes/themes', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'themes'] });
    },
  });
};

export const useUpdateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updateData }: ThemeUpdateInput & { id: string }) => 
      api.patch<ThemeRecord>(`/api/notes/themes/${id}`, updateData),
    onSuccess: (_: ThemeRecord, variables: ThemeUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'themes'] });
      void queryClient.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
};

export const useDeleteThemeMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<DeleteResponse>(`/api/notes/themes/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', 'themes'] });
    },
  });
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
      void queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
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
        void queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
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
        void queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
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
    queryClient.setQueryData(['notes', filters], updater);
  }, [queryClient, filters]);

  const setNotebook = useCallback((newNotebook: NotebookRecord): void => {
    // This might need to update the notebook in the list
    queryClient.setQueryData(['notes', 'notebooks'], (old: NotebookRecord[] | undefined) => {
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
