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
}: UseNoteDataProps) {
  const queryClient = useQueryClient();

  // Queries
  const notebooksQuery = useNotebooks();
  const folderTreeQuery = useNoteFolderTree(selectedNotebookId ?? undefined);
  const tagsQuery = useNoteTags(selectedNotebookId ?? undefined);
  const themesQuery = useNoteThemes(selectedNotebookId ?? undefined);

  const folderTree = useMemo(() => folderTreeQuery.data ?? [], [folderTreeQuery.data]);
  const folderTreeRef = useRef(folderTree);
  
  useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  // Derived category IDs for notes filter
  const categoryIds = useMemo(() => {
    if (!selectedFolderId) return [];
    const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTree);
    return descendantIds.length > 0 ? descendantIds : [selectedFolderId];
  }, [selectedFolderId, folderTree]);

  const notesParams = useMemo(() => {
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

  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load initial notebook if none selected
  useEffect(() => {
    if (selectedNotebookId) return;
    const firstNotebook = notebooksQuery.data?.[0];
    if (firstNotebook) {
      setSelectedNotebookId(firstNotebook.id);
    }
  }, [selectedNotebookId, notebooksQuery.data, setSelectedNotebookId]);

  const notebook = useMemo(() => 
    notebooksQuery.data?.find(n => n.id === selectedNotebookId) ?? null,
    [notebooksQuery.data, selectedNotebookId]
  );

  const setNotes = useCallback((updater: NoteWithRelations[] | ((prev: NoteWithRelations[]) => NoteWithRelations[])) => {
    queryClient.setQueryData(["notes", notesParams], updater);
  }, [queryClient, notesParams]);

  const setNotebook = useCallback((updated: NotebookRecord) => {
    queryClient.setQueryData(["notebooks"], (prev: NotebookRecord[] | undefined) => {
      if (!prev) return [updated];
      return prev.map(n => n.id === updated.id ? updated : n);
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
    fetchNotes: async () => { await notesQuery.refetch(); },
    fetchFolderTree: async () => { await folderTreeQuery.refetch(); },
    fetchTags: async () => { await tagsQuery.refetch(); },
    fetchThemes: async () => { await themesQuery.refetch(); },
  };
}
