"use client";

import { useQuery } from "@tanstack/react-query";
import type { 
  NoteWithRelations, 
  TagRecord, 
  CategoryWithChildren, 
  ThemeRecord, 
  NotebookRecord 
} from "@/shared/types/notes";

export function useNotebooks() {
  return useQuery({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch notebooks");
      return (await response.json()) as NotebookRecord[];
    },
  });
}

export function useNoteFolderTree(notebookId?: string) {
  return useQuery({
    queryKey: ["note-folder-tree", notebookId],
    queryFn: async () => {
      if (!notebookId) return [] as CategoryWithChildren[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/categories/tree?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch folder tree");
      return (await response.json()) as CategoryWithChildren[];
    },
    enabled: !!notebookId,
  });
}

export function useNoteTags(notebookId?: string) {
  return useQuery({
    queryKey: ["note-tags", notebookId],
    queryFn: async () => {
      if (!notebookId) return [] as TagRecord[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/tags?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch tags");
      return (await response.json()) as TagRecord[];
    },
    enabled: !!notebookId,
  });
}

export function useNoteThemes(notebookId?: string) {
  return useQuery({
    queryKey: ["note-themes", notebookId],
    queryFn: async () => {
      if (!notebookId) return [] as ThemeRecord[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/themes?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch themes");
      return (await response.json()) as ThemeRecord[];
    },
    enabled: !!notebookId,
  });
}

export interface FetchNotesParams {
  notebookId?: string;
  search?: string;
  searchScope?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
}

export function useNotes(params: FetchNotesParams) {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: async () => {
      const { notebookId, search, searchScope, isPinned, isArchived, isFavorite, tagIds, categoryIds } = params;
      if (!notebookId) return [] as NoteWithRelations[];

      const urlParams = new URLSearchParams();
      urlParams.append("notebookId", notebookId);
      if (search) {
        urlParams.append("search", search);
        urlParams.append("searchScope", searchScope || "content");
      }
      if (isPinned !== undefined) urlParams.append("isPinned", String(isPinned));
      if (isArchived !== undefined) urlParams.append("isArchived", String(isArchived));
      if (isFavorite !== undefined) urlParams.append("isFavorite", String(isFavorite));
      if (tagIds && tagIds.length > 0) urlParams.append("tagIds", tagIds.join(","));
      if (categoryIds && categoryIds.length > 0) urlParams.append("categoryIds", categoryIds.join(","));

      const response = await fetch(`/api/notes?${urlParams}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return (await response.json()) as NoteWithRelations[];
    },
    enabled: !!params.notebookId,
  });
}
