import { useState, useEffect, useCallback } from "react";
import type { UseNoteFiltersProps } from "@/features/notesapp/types/notes-hooks";
import type { NoteWithRelations } from "@/shared/types/notes";

export type UseNoteFiltersResult = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  filterPinned: boolean | undefined;
  setFilterPinned: (v: boolean | undefined) => void;
  filterArchived: boolean | undefined;
  setFilterArchived: (v: boolean | undefined) => void;
  filterFavorite: boolean | undefined;
  setFilterFavorite: (v: boolean | undefined) => void;
  filterTagIds: string[];
  setFilterTagIds: (ids: string[]) => void;
  highlightTagId: string | null;
  setHighlightTagId: (id: string | null) => void;
  page: number;
  setPage: (p: number | ((curr: number) => number)) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  handleFilterByTag: (tagId: string, setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: NoteWithRelations | null) => void, setIsEditing: (val: boolean) => void) => void;
  handleToggleFavoritesFilter: (setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: NoteWithRelations | null) => void, setIsEditing: (val: boolean) => void) => void;
};

export function useNoteFilters({ settings, updateSettings: _updateSettings }: UseNoteFiltersProps): UseNoteFiltersResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(undefined);
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(undefined);
  const [filterFavorite, setFilterFavorite] = useState<boolean | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [highlightTagId, setHighlightTagId] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Debounce search
  useEffect((): void | (() => void) => {
    const timer = setTimeout((): void => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect((): void => {

    setPage(1);
  }, [
    debouncedSearchQuery,
    filterPinned,
    filterArchived,
    filterTagIds,
    settings.selectedFolderId,
    settings.sortBy,
    settings.sortOrder,
    settings.selectedNotebookId,
  ]);

  // Clear highlight tag
  useEffect((): void | (() => void) => {
    if (!highlightTagId) return;
    const timer = setTimeout((): void => {
      setHighlightTagId(null);
    }, 2000);
    return (): void => clearTimeout(timer);
  }, [highlightTagId]);

  const handleFilterByTag = useCallback((tagId: string, setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: NoteWithRelations | null) => void, setIsEditing: (val: boolean) => void): void => {
    setSelectedFolderId(null);
    setFilterTagIds([tagId]);
    setSearchQuery("");
    setSelectedNote(null);
    setIsEditing(false);
    setHighlightTagId(tagId);
  }, []);

  const handleToggleFavoritesFilter = useCallback((setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: NoteWithRelations | null) => void, setIsEditing: (val: boolean) => void): void => {
    setFilterFavorite((prev: boolean | undefined) => (prev ? undefined : true));
    setSelectedFolderId(null);
    setSelectedNote(null);
    setIsEditing(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filterPinned,
    setFilterPinned,
    filterArchived,
    setFilterArchived,
    filterFavorite,
    setFilterFavorite,
    filterTagIds,
    setFilterTagIds,
    highlightTagId,
    setHighlightTagId,
    page,
    setPage,
    pageSize,
    setPageSize,
    handleFilterByTag,
    handleToggleFavoritesFilter,
  };
}
