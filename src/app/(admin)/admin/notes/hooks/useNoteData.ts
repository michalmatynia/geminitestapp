"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { UseNoteDataProps } from "@/types/notes-hooks";
import { getCategoryIdsWithDescendants } from "../utils";
import { 
  useNotebooks, 
  useNoteFolderTree, 
  useNoteTags, 
  useNoteThemes, 
  useNotes 
} from "@/lib/hooks/useNoteQueries";

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
  // Queries
  const notebooksQuery = useNotebooks();
  const folderTreeQuery = useNoteFolderTree(selectedNotebookId);
  const tagsQuery = useNoteTags(selectedNotebookId);
  const themesQuery = useNoteThemes(selectedNotebookId);

  const folderTree = folderTreeQuery.data ?? [];
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

  const notesParams = useMemo(() => ({
    notebookId: selectedNotebookId,
    search: searchQuery,
    searchScope,
    isPinned: filterPinned,
    isArchived: filterArchived,
    isFavorite: filterFavorite,
    tagIds: filterTagIds,
    categoryIds,
  }), [
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

  const notes = notesQuery.data ?? [];
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load initial notebook if none selected
  useEffect(() => {
    if (selectedNotebookId) return;
    if (notebooksQuery.data && notebooksQuery.data.length > 0) {
      setSelectedNotebookId(notebooksQuery.data[0].id);
    }
  }, [selectedNotebookId, notebooksQuery.data, setSelectedNotebookId]);

  const notebook = useMemo(() => 
    notebooksQuery.data?.find(n => n.id === selectedNotebookId) ?? null,
    [notebooksQuery.data, selectedNotebookId]
  );

  return {
    notes,
    tags: tagsQuery.data ?? [],
    themes: themesQuery.data ?? [],
    notebook,
    folderTree,
    loading: notesQuery.isLoading || folderTreeQuery.isLoading || notebooksQuery.isLoading,
    folderTreeRef,
    notesRef,
    fetchNotes: notesQuery.refetch,
    fetchFolderTree: folderTreeQuery.refetch,
    fetchTags: tagsQuery.refetch,
    fetchThemes: themesQuery.refetch,
  };
}