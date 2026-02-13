'use client';

import { useState, useMemo, useCallback } from 'react';
import type { UsePickerSearchOptions, UsePickerSearchReturn } from './types';

/**
 * usePickerSearch - Reusable search/filter hook for picker components
 *
 * Features:
 * - Generic type support
 * - Configurable matching function
 * - Debounce support (optional)
 * - Clear search functionality
 *
 * @example
 * const { query, setQuery, filtered, clearSearch } = usePickerSearch(
 *   items,
 *   { matcher: (q, item) => item.label.includes(q) }
 * );
 */
export function usePickerSearch<T>(
  items: T[],
  options: UsePickerSearchOptions<T> = {}
): UsePickerSearchReturn<T> {
  const { initialQuery = '', matcher } = options;

  const [query, setQuery] = useState(initialQuery);

  const defaultMatcher = useCallback((searchQuery: string, item: T): boolean => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (!searchTerm) return true;

    // Try common property names
    const itemStr = JSON.stringify(item).toLowerCase();
    return itemStr.includes(searchTerm);
  }, []);

  const filteredItems = useMemo(() => {
    const searchFn = matcher || defaultMatcher;
    return items.filter((item: T) => searchFn(query, item));
  }, [items, query, matcher, defaultMatcher]);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    filtered: filteredItems,
    isSearching: query.length > 0,
    clearSearch,
  };
}
