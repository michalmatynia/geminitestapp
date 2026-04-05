'use client';

import { useState, useCallback } from 'react';

import { PanelState, UsePanelStateOptions, UsePanelStateReturn } from '@/shared/contracts/ui/ui/panels';

/**
 * Hook for managing panel state (pagination, filters, search, sorting)
 * @param options Configuration options for initial state
 * @returns State object and setter functions
 */
export function usePanelState(options: UsePanelStateOptions = {}): UsePanelStateReturn {
  const { initialPage = 1, initialPageSize = 10, initialFilters = {}, onStateChange } = options;

  const [state, setState] = useState<PanelState>({
    page: initialPage,
    pageSize: initialPageSize,
    filters: initialFilters,
    search: '',
  });

  const updateState = useCallback(
    (newState: PanelState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  const setPage = useCallback(
    (page: number) => {
      updateState({
        ...state,
        page: Math.max(1, page),
      });
    },
    [state, updateState]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateState({
        ...state,
        pageSize: Math.max(1, pageSize),
        page: 1, // Reset to first page when changing page size
      });
    },
    [state, updateState]
  );

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      updateState({
        ...state,
        filters: {
          ...state.filters,
          [key]: value,
        },
        page: 1, // Reset to first page when filtering
      });
    },
    [state, updateState]
  );

  const setFilters = useCallback(
    (filters: Record<string, unknown>) => {
      updateState({
        ...state,
        filters,
        page: 1, // Reset to first page when filtering
      });
    },
    [state, updateState]
  );

  const setSearch = useCallback(
    (search: string) => {
      updateState({
        ...state,
        search,
        page: 1, // Reset to first page when searching
      });
    },
    [state, updateState]
  );

  const reset = useCallback(() => {
    updateState({
      page: initialPage,
      pageSize: initialPageSize,
      filters: initialFilters,
      search: '',
    });
  }, [initialPage, initialPageSize, initialFilters, updateState]);

  return {
    state,
    setPage,
    setPageSize,
    setFilter,
    setFilters,
    setSearch,
    reset,
  };
}
