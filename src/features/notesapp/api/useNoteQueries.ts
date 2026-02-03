"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { 
  NoteWithRelations, 
  TagRecord, 
  CategoryWithChildren, 
  ThemeRecord, 
  NotebookRecord 
} from "@/shared/types/notes";

const NOTES_STALE_MS = 10_000;

export function useNotebooks(): UseQueryResult<NotebookRecord[]> {
  return useQuery({
    queryKey: ["notebooks"],
    queryFn: async (): Promise<NotebookRecord[]> => {
      const response = await fetch("/api/notes/notebooks");
      if (!response.ok) throw new Error("Failed to fetch notebooks");
      return (await response.json()) as NotebookRecord[];
    },
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteFolderTree(notebookId?: string): UseQueryResult<CategoryWithChildren[]> {
  return useQuery({
    queryKey: ["note-folder-tree", notebookId],
    queryFn: async (): Promise<CategoryWithChildren[]> => {
      if (!notebookId) return [] as CategoryWithChildren[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/categories/tree?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch folder tree");
      return (await response.json()) as CategoryWithChildren[];
    },
    enabled: !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteTags(notebookId?: string): UseQueryResult<TagRecord[]> {
  return useQuery({
    queryKey: ["note-tags", notebookId],
    queryFn: async (): Promise<TagRecord[]> => {
      if (!notebookId) return [] as TagRecord[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/tags?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch tags");
      return (await response.json()) as TagRecord[];
    },
    enabled: !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export function useNoteThemes(notebookId?: string): UseQueryResult<ThemeRecord[]> {
  return useQuery({
    queryKey: ["note-themes", notebookId],
    queryFn: async (): Promise<ThemeRecord[]> => {
      if (!notebookId) return [] as ThemeRecord[];
      const params = new URLSearchParams({ notebookId });
      const response = await fetch(`/api/notes/themes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch themes");
      return (await response.json()) as ThemeRecord[];
    },
    enabled: !!notebookId,
    staleTime: NOTES_STALE_MS,
  });
}

export interface FetchNotesParams {
  notebookId?: string | undefined;
  search?: string | undefined;
  searchScope?: string | undefined;
  isPinned?: boolean | undefined;
  isArchived?: boolean | undefined;
  isFavorite?: boolean | undefined;
  tagIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
}

export function useNotes(params: FetchNotesParams): UseQueryResult<NoteWithRelations[]> {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: async (): Promise<NoteWithRelations[]> => {
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

      const response = await fetch(`/api/notes?${urlParams}`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      return (await response.json()) as NoteWithRelations[];
    },
    enabled: !!params.notebookId,
    staleTime: NOTES_STALE_MS,
  });
}
