import { useState, useCallback, useEffect, useRef } from "react";
import type { NoteWithRelations, TagRecord, CategoryWithChildren, ThemeRecord, NotebookRecord } from "@/types/notes";
import { getCategoryIdsWithDescendants } from "../utils";

interface UseNoteDataProps {
  selectedNotebookId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  searchScope: "both" | "title" | "content";
  filterPinned?: boolean;
  filterArchived?: boolean;
  filterFavorite?: boolean;
  filterTagIds: string[];
  setSelectedNotebookId: (id: string | null) => void;
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
}: UseNoteDataProps) {
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [notebook, setNotebook] = useState<NotebookRecord | null>(null);
  const [folderTree, setFolderTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  
  const hasLoadedNotesRef = useRef(false);
  const folderTreeRef = useRef(folderTree);
  const notesRef = useRef(notes);

  useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const fetchFolderTree = useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/categories/tree?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as CategoryWithChildren[];
      setFolderTree(data);
    } catch (error) {
      console.error("Failed to fetch folder tree:", error);
    }
  }, [selectedNotebookId]);

  const fetchTags = useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/tags?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as TagRecord[];
      setTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, [selectedNotebookId]);

  const fetchThemes = useCallback(async () => {
    try {
      if (!selectedNotebookId) return;
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/themes?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ThemeRecord[];
      setThemes(data);
    } catch (error) {
      console.error("Failed to fetch themes:", error);
    }
  }, [selectedNotebookId]);

  const fetchNotebook = useCallback(async () => {
    if (!selectedNotebookId) {
      setNotebook(null);
      return;
    }
    try {
      const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as NotebookRecord[];
      const found = data.find((n) => n.id === selectedNotebookId);
      setNotebook(found ?? null);
    } catch (error) {
      console.error("Failed to fetch notebook:", error);
    }
  }, [selectedNotebookId]);

  const fetchNotes = useCallback(async () => {
    try {
      if (!selectedNotebookId) {
        setLoading(false);
        return;
      }
      setLoading(!hasLoadedNotesRef.current);
      const params = new URLSearchParams();
      params.append("notebookId", selectedNotebookId);
      if (searchQuery) {
        params.append("search", searchQuery);
        params.append("searchScope", searchScope);
      }
      if (filterPinned !== undefined) params.append("isPinned", String(filterPinned));
      if (filterArchived !== undefined) params.append("isArchived", String(filterArchived));
      if (filterFavorite !== undefined) params.append("isFavorite", String(filterFavorite));
      if (filterTagIds.length > 0) params.append("tagIds", filterTagIds.join(","));

      if (selectedFolderId) {
        const descendantIds = getCategoryIdsWithDescendants(selectedFolderId, folderTreeRef.current);
        if (descendantIds.length > 0) {
          params.append("categoryIds", descendantIds.join(","));
        } else {
          params.append("categoryIds", selectedFolderId);
        }
      }

      const response = await fetch(`/api/notes?${params}`, { cache: "no-store" });
      const data = (await response.json()) as NoteWithRelations[];
      setNotes(data);
      hasLoadedNotesRef.current = true;
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    searchScope,
    filterPinned,
    filterArchived,
    filterFavorite,
    selectedFolderId,
    filterTagIds,
    selectedNotebookId,
  ]);

  // Initial Data Fetch
  useEffect(() => {
    void fetchTags();
    void fetchFolderTree();
    void fetchThemes();
    void fetchNotebook();
  }, [fetchTags, fetchFolderTree, fetchThemes, fetchNotebook]);

  // Fetch Notes when filters change
  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  // Load initial notebook if none selected
  useEffect(() => {
    if (selectedNotebookId) return;
    let isActive = true;
    const loadNotebooks = async () => {
      try {
        const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Array<{ id: string }>;
        const firstId = data[0]?.id;
        if (isActive && firstId) {
          setSelectedNotebookId(firstId);
        }
      } catch (error) {
        console.error("Failed to load notebooks:", error);
      }
    };
    void loadNotebooks();
    return () => {
      isActive = false;
    };
  }, [selectedNotebookId, setSelectedNotebookId]);

  return {
    notes,
    setNotes,
    tags,
    setTags,
    themes,
    setThemes,
    notebook,
    setNotebook,
    folderTree,
    setFolderTree,
    loading,
    setLoading,
    folderTreeRef,
    notesRef,
    fetchNotes,
    fetchFolderTree,
    fetchTags,
    fetchThemes,
  };
}
