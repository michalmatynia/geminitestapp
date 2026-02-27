import { useState, useEffect, useCallback } from 'react';

import type { UseNoteFiltersProps } from '@/shared/contracts/notes';
import type { NoteWithRelationsDto as NoteWithRelations } from '@/shared/contracts/notes';

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
  handleFilterByTag: (
    tagId: string,
    setSelectedFolderId: (id: string | null) => void,
    setSelectedNote: (val: NoteWithRelations | null) => void,
    setIsEditing: (val: boolean) => void,
  ) => void;
  handleToggleFavoritesFilter: (
    setSelectedFolderId: (id: string | null) => void,
    setSelectedNote: (val: NoteWithRelations | null) => void,
    setIsEditing: (val: boolean) => void,
  ) => void;
};

export function useNoteFilters({
  settings,
  updateSettings: _updateSettings,
}: UseNoteFiltersProps): UseNoteFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(
    undefined,
  );
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(
    undefined,
  );
  const [filterFavorite, setFilterFavorite] = useState<boolean | undefined>(
    undefined,
  );
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [highlightTagId, setHighlightTagId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Debounce search
  useEffect((): void | (() => void) => {
    const timer = setTimeout((): void => {
      if (searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
        setPage(1);
      }
    }, 250);
    return (): void => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Reset page when settings change
  const [prevSettingsKey, setPrevSettingsKey] = useState('');
  const currentSettingsKey = `${settings.selectedFolderId ?? ''}-${settings.sortBy ?? ''}-${settings.sortOrder ?? ''}-${settings.selectedNotebookId ?? ''}`;

  if (currentSettingsKey !== prevSettingsKey) {
    setPrevSettingsKey(currentSettingsKey);
    setPage(1);
  }

  // Clear highlight tag
  useEffect((): void | (() => void) => {
    if (!highlightTagId) return;
    const timer = setTimeout((): void => {
      setHighlightTagId(null);
    }, 2000);
    return (): void => clearTimeout(timer);
  }, [highlightTagId]);

  const handleFilterByTag = useCallback(
    (
      tagId: string,
      setSelectedFolderId: (id: string | null) => void,
      setSelectedNote: (val: NoteWithRelations | null) => void,
      setIsEditing: (val: boolean) => void,
    ): void => {
      setSelectedFolderId(null);
      setFilterTagIds([tagId]);
      setSearchQuery('');
      setSelectedNote(null);
      setIsEditing(false);
      setHighlightTagId(tagId);
      setPage(1);
    },
    [],
  );

  const handleToggleFavoritesFilter = useCallback(
    (
      setSelectedFolderId: (id: string | null) => void,
      setSelectedNote: (val: NoteWithRelations | null) => void,
      setIsEditing: (val: boolean) => void,
    ): void => {
      setFilterFavorite((prev: boolean | undefined) =>
        prev ? undefined : true,
      );
      setSelectedFolderId(null);
      setSelectedNote(null);
      setIsEditing(false);
      setPage(1);
    },
    [],
  );

  const setFilterPinnedWithPage = (v: boolean | undefined): void => {
    setFilterPinned(v);
    setPage(1);
  };

  const setFilterArchivedWithPage = (v: boolean | undefined): void => {
    setFilterArchived(v);
    setPage(1);
  };

  const setFilterFavoriteWithPage = (v: boolean | undefined): void => {
    setFilterFavorite(v);
    setPage(1);
  };

  const setFilterTagIdsWithPage = (ids: string[]): void => {
    setFilterTagIds(ids);
    setPage(1);
  };

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filterPinned,
    setFilterPinned: setFilterPinnedWithPage,
    filterArchived,
    setFilterArchived: setFilterArchivedWithPage,
    filterFavorite,
    setFilterFavorite: setFilterFavoriteWithPage,
    filterTagIds,
    setFilterTagIds: setFilterTagIdsWithPage,
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
