"use client";

import { useQuery, useQueryClient, useMutation, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { useRef, useEffect, useMemo, useCallback } from "react";
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
} from "@/shared/types/notes";
import type { DeleteResponse } from "@/shared/types/api";
import { useDebounce } from "@/shared/hooks/use-debounce";
import type { UseNoteDataProps } from "@/features/notesapp/types/notes-hooks";

// --- Queries ---

export const useNotes = (
  filters: NoteFilters,
  options?: { enabled?: boolean }
): UseQueryResult<NoteWithRelations[], Error> => {
  const debouncedFilters = useDebounce(filters, 300);

  return useQuery<NoteWithRelations[], Error>({
    queryKey: ["notes", debouncedFilters],
    queryFn: async (): Promise<NoteWithRelations[]> => {
      const params = new URLSearchParams();
      
      if (debouncedFilters.search) params.append("search", debouncedFilters.search);
      if (debouncedFilters.searchScope) params.append("searchScope", debouncedFilters.searchScope);
      if (debouncedFilters.isPinned !== undefined) params.append("isPinned", String(debouncedFilters.isPinned));
      if (debouncedFilters.isArchived !== undefined) params.append("isArchived", String(debouncedFilters.isArchived));
      if (debouncedFilters.isFavorite !== undefined) params.append("isFavorite", String(debouncedFilters.isFavorite));
      if (debouncedFilters.notebookId) params.append("notebookId", debouncedFilters.notebookId);
      if (debouncedFilters.tagIds?.length) params.append("tagIds", debouncedFilters.tagIds.join(","));
      if (debouncedFilters.categoryIds?.length) params.append("categoryIds", debouncedFilters.categoryIds.join(","));
      if (debouncedFilters.truncateContent) params.append("truncateContent", "true");

      const response = await fetch(`/api/notes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json() as Promise<NoteWithRelations[]>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useNote = (
  noteId: string,
  options?: { enabled?: boolean }
): UseQueryResult<NoteWithRelations, Error> => {
  return useQuery<NoteWithRelations, Error>({
    queryKey: ["notes", noteId],
    queryFn: async (): Promise<NoteWithRelations> => {
      const response = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch note");
      return response.json() as Promise<NoteWithRelations>;
    },
    enabled: !!noteId && (options?.enabled ?? true),
  });
};

export const useNoteTree = (options?: { enabled?: boolean }): UseQueryResult<NotebookRecord[], Error> => {
  return useQuery<NotebookRecord[], Error>({
    queryKey: ["notes", "notebooks"],
    queryFn: async (): Promise<NotebookRecord[]> => {
      const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch notebooks");
      return response.json() as Promise<NotebookRecord[]>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useNoteTags = (options?: { enabled?: boolean }): UseQueryResult<TagRecord[], Error> => {
  return useQuery<TagRecord[], Error>({
    queryKey: ["notes", "tags"],
    queryFn: async (): Promise<TagRecord[]> => {
      const response = await fetch("/api/notes/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      return response.json() as Promise<TagRecord[]>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useNoteCategories = (options?: { enabled?: boolean }): UseQueryResult<CategoryRecord[], Error> => {
  return useQuery<CategoryRecord[], Error>({
    queryKey: ["notes", "categories"],
    queryFn: async (): Promise<CategoryRecord[]> => {
      const response = await fetch("/api/notes/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json() as Promise<CategoryRecord[]>;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useNoteThemes = (options?: { enabled?: boolean }): UseQueryResult<ThemeRecord[], Error> => {
  return useQuery<ThemeRecord[], Error>({
    queryKey: ["notes", "themes"],
    queryFn: async (): Promise<ThemeRecord[]> => {
      const response = await fetch("/api/notes/themes");
      if (!response.ok) throw new Error("Failed to fetch themes");
      return response.json() as Promise<ThemeRecord[]>;
    },
    enabled: options?.enabled ?? true,
  });
};

// --- Mutations ---

export const useCreateNoteMutation = (): UseMutationResult<NoteRecord, Error, NoteCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NoteCreateInput): Promise<NoteRecord> => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json() as Promise<NoteRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};

export const useUpdateNoteMutation = (): UseMutationResult<NoteRecord, Error, NoteUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NoteUpdateInput & { id: string }): Promise<NoteRecord> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return response.json() as Promise<NoteRecord>;
    },
    onSuccess: (_: NoteRecord, variables: NoteUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};

export const useDeleteNoteMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete note");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};

export const useCreateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NotebookCreateInput): Promise<NotebookRecord> => {
      const response = await fetch("/api/notes/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create notebook");
      return response.json() as Promise<NotebookRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "notebooks"] });
    },
  });
};

export const useUpdateNotebookMutation = (): UseMutationResult<NotebookRecord, Error, NotebookUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NotebookUpdateInput & { id: string }): Promise<NotebookRecord> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/notes/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update notebook");
      return response.json() as Promise<NotebookRecord>;
    },
    onSuccess: (_: NotebookRecord, variables: NotebookUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "notebooks"] });
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
};

export const useDeleteNotebookMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/notebooks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete notebook");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "notebooks"] });
    },
  });
};

export const useCreateTagMutation = (): UseMutationResult<TagRecord, Error, TagCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TagCreateInput): Promise<TagRecord> => {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create tag");
      return response.json() as Promise<TagRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "tags"] });
    },
  });
};

export const useUpdateTagMutation = (): UseMutationResult<TagRecord, Error, TagUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TagUpdateInput & { id: string }): Promise<TagRecord> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/notes/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update tag");
      return response.json() as Promise<TagRecord>;
    },
    onSuccess: (_: TagRecord, variables: TagUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "tags"] });
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
};

export const useDeleteTagMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/tags/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete tag");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "tags"] });
    },
  });
};

export const useCreateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryCreateInput): Promise<CategoryRecord> => {
      const response = await fetch("/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json() as Promise<CategoryRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "categories"] });
    },
  });
};

export const useUpdateCategoryMutation = (): UseMutationResult<CategoryRecord, Error, CategoryUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryUpdateInput & { id: string }): Promise<CategoryRecord> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/notes/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json() as Promise<CategoryRecord>;
    },
    onSuccess: (_: CategoryRecord, variables: CategoryUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "categories"] });
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
};

export const useDeleteCategoryMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/categories/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete category");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "categories"] });
    },
  });
};

export const useCreateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeCreateInput> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ThemeCreateInput): Promise<ThemeRecord> => {
      const response = await fetch("/api/notes/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create theme");
      return response.json() as Promise<ThemeRecord>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "themes"] });
    },
  });
};

export const useUpdateThemeMutation = (): UseMutationResult<ThemeRecord, Error, ThemeUpdateInput & { id: string }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ThemeUpdateInput & { id: string }): Promise<ThemeRecord> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/notes/themes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update theme");
      return response.json() as Promise<ThemeRecord>;
    },
    onSuccess: (_: ThemeRecord, variables: ThemeUpdateInput & { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "themes"] });
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
};

export const useDeleteThemeMutation = (): UseMutationResult<DeleteResponse, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DeleteResponse> => {
      const response = await fetch(`/api/notes/themes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete theme");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", "themes"] });
    },
  });
};

export const useUpdateNoteRelationsMutation = (noteId: string): UseMutationResult<void, Error, {
  relationsFrom?: string[];
  relationsTo?: string[];
}> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      relationsFrom,
      relationsTo,
    }: {
      relationsFrom?: string[];
      relationsTo?: string[];
    }): Promise<void> => {
      const response = await fetch(`/api/notes/${noteId}/relations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationsFrom, relationsTo }),
      });
      if (!response.ok) throw new Error("Failed to update note relations");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
    },
  });
};

export const useCreateNoteFileMutation = (noteId?: string): UseMutationResult<NoteFileRecord, Error, { slotIndex: number; file: File }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slotIndex, file }: { slotIndex: number; file: File }): Promise<NoteFileRecord> => {
      if (!noteId) throw new Error("Note ID is required for file upload");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slotIndex", slotIndex.toString());

      const response = await fetch(`/api/notes/${noteId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "Failed to upload note file");
      }
      return response.json() as Promise<NoteFileRecord>;
    },
    onSuccess: () => {
      if (noteId) {
        void queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
      }
    },
  });
};

export const useDeleteNoteFileMutation = (noteId?: string): UseMutationResult<DeleteResponse, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotIndex: number): Promise<DeleteResponse> => {
      if (!noteId) throw new Error("Note ID is required for file deletion");
      const response = await fetch(`/api/notes/${noteId}/files/${slotIndex}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note file");
      return response.json() as Promise<DeleteResponse>;
    },
    onSuccess: () => {
      if (noteId) {
        void queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
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
    isPinned: filterPinned,
    isArchived: filterArchived,
    isFavorite: filterFavorite,
    tagIds: filterTagIds,
    categoryIds: selectedFolderId ? [selectedFolderId] : [],
    notebookId: selectedNotebookId,
    truncateContent: true,
  }), [searchQuery, searchScope, filterPinned, filterArchived, filterFavorite, filterTagIds, selectedFolderId, selectedNotebookId]);

  const notesQuery = useNotes(filters);

  const notebooksQuery = useNoteTree();
  const tagsQuery = useNoteTags();
  const themesQuery = useNoteThemes();
  const categoriesQuery = useNoteCategories();

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
    queryClient.setQueryData(["notes", filters], updater);
  }, [queryClient, filters]);

  const setNotebook = useCallback((newNotebook: NotebookRecord): void => {
    // This might need to update the notebook in the list
    queryClient.setQueryData(["notes", "notebooks"], (old: NotebookRecord[] | undefined) => {
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
