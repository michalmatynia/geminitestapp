"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseNoteDataProps } from "@/features/notesapp/types/notes-hooks";
import type { NotebookRecord, NoteWithRelations } from "@/shared/types/notes";
import { getCategoryIdsWithDescendants } from "../utils";
import {
  useNotebooks,
  useNoteFolderTree,
  useNoteTags,
  useNoteThemes,
  useNotes,
  type FetchNotesParams,
} from "@/features/notesapp/api/useNoteQueries";

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
}: UseNoteDataProps): any {
  const queryClient = useQueryClient();

  // Queries
  const notebooksQuery = useNotebooks();
  const folderTreeQuery = useNoteFolderTree(selectedNotebookId ?? undefined);
  const tagsQuery = useNoteTags(selectedNotebookId ?? undefined);
  const themesQuery = useNoteThemes(selectedNotebookId ?? undefined);

  const folderTree = useMemo((): any[] => folderTreeQuery.data ?? [], [folderTreeQuery.data]);
  const folderTreeRef = useRef(folderTree);
  
  useEffect((): void => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  // Derived category IDs for notes filter
  const categoryIds = useMemo((): string[] => {
    if (!selectedFolderId) return [];
    const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTree);
    return descendantIds.length > 0 ? descendantIds : [selectedFolderId];
  }, [selectedFolderId, folderTree]);

  const notesParams = useMemo((): FetchNotesParams => {
    const params: FetchNotesParams = {
      search: searchQuery,
      searchScope,
      isPinned: filterPinned,
      isArchived: filterArchived,
      isFavorite: filterFavorite,
      tagIds: filterTagIds,
      categoryIds,
    };
    if (selectedNotebookId) {
      params.notebookId = selectedNotebookId;
    }
    return params;
  }, [
    selectedNotebookId,
    searchQuery,
    searchScope,
    filterPinned,
    filterArchived,
    filterFavorite,
    filterTagIds,
    categoryIds,
  ]);

  const notesQuery = useNotes(notesParams);

  const notes = useMemo((): NoteWithRelations[] => notesQuery.data ?? [], [notesQuery.data]);
  const notesRef = useRef(notes);

  useEffect((): void => {
    notesRef.current = notes;
  }, [notes]);

  // Load initial notebook if none selected
  useEffect((): void => {
    if (selectedNotebookId) return;
    const firstNotebook = notebooksQuery.data?.[0];
    if (firstNotebook) {
      setSelectedNotebookId(firstNotebook.id);
    }
  }, [selectedNotebookId, notebooksQuery.data, setSelectedNotebookId]);

  const notebook = useMemo((): NotebookRecord | null => 
    notebooksQuery.data?.find((n: NotebookRecord) => n.id === selectedNotebookId) ?? null,
    [notebooksQuery.data, selectedNotebookId]
  );

  const setNotes = useCallback((updater: NoteWithRelations[] | ((prev: NoteWithRelations[]) => NoteWithRelations[])): void => {
    queryClient.setQueryData(["notes", notesParams], updater);
  }, [queryClient, notesParams]);

  const setNotebook = useCallback((updated: NotebookRecord): void => {
    queryClient.setQueryData(["notebooks"], (prev: NotebookRecord[] | undefined): NotebookRecord[] => {
      if (!prev) return [updated];
      return prev.map((n: NotebookRecord) => n.id === updated.id ? updated : n);
    });
  }, [queryClient]);

  return {
    notes,
    setNotes,
    tags: tagsQuery.data ?? [],
    themes: themesQuery.data ?? [],
    notebook,
    setNotebook,
    folderTree,
    loading: notesQuery.isLoading || folderTreeQuery.isLoading || notebooksQuery.isLoading,
    folderTreeRef,
    notesRef,
    fetchNotes: async (): Promise<void> => { await notesQuery.refetch(); },
    fetchFolderTree: async (): Promise<void> => { await folderTreeQuery.refetch(); },
    fetchTags: async (): Promise<void> => { await tagsQuery.refetch(); },
    fetchThemes: async (): Promise<void> => { await themesQuery.refetch(); },
  };
}
