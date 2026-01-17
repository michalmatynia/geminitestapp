import { useState, useEffect, useCallback } from "react";
import type { UseNoteFiltersProps } from "@/types/notes-hooks";

export function useNoteFilters({ settings, updateSettings }: UseNoteFiltersProps) {
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
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  useEffect(() => {
    if (!highlightTagId) return;
    const timer = setTimeout(() => {
      setHighlightTagId(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlightTagId]);

  const handleFilterByTag = useCallback((tagId: string, setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: any) => void, setIsEditing: (val: boolean) => void) => {
    setSelectedFolderId(null);
    setFilterTagIds([tagId]);
    setSearchQuery("");
    setSelectedNote(null);
    setIsEditing(false);
    setHighlightTagId(tagId);
  }, []);

  const handleToggleFavoritesFilter = useCallback((setSelectedFolderId: (id: string | null) => void, setSelectedNote: (val: any) => void, setIsEditing: (val: boolean) => void) => {
    setFilterFavorite((prev) => (prev ? undefined : true));
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
