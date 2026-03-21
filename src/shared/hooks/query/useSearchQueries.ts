'use client';

import { useCallback, useMemo } from 'react';

import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

import type { UseQueryResult } from '@tanstack/react-query';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


interface SearchConfig<T> {
  searchFn: (query: string) => Promise<T[]>;
  minLength?: number;
  cacheTime?: number;
  domain?: TanstackFactoryDomain;
}

// Hook for search with caching
export function useSearchQuery<T>(
  searchTerm: string,
  config: SearchConfig<T>
): UseQueryResult<T[], Error> {
  const { searchFn, minLength = 2, cacheTime = 5 * 60 * 1000, domain = 'global' } = config;

  return createListQueryV2<T, T[]>({
    queryKey: QUERY_KEYS.search.term(searchTerm),
    queryFn: (): Promise<T[]> => searchFn(searchTerm),
    enabled: searchTerm.length >= minLength,
    staleTime: cacheTime,
    gcTime: cacheTime * 2,
    meta: {
      source: 'shared.hooks.query.useSearchQuery',
      operation: 'list',
      resource: 'search',
      domain,
      tags: ['search'],
      description: 'Loads search results for the current term.',
    },
  });
}

// Hook for autocomplete with recent searches
export function useAutocomplete<T>(
  searchTerm: string,
  searchFn: (query: string) => Promise<T[]>,
  options?: {
    maxRecentSearches?: number;
    storageKey?: string;
    domain?: TanstackFactoryDomain;
  }
): UseQueryResult<T[], Error> & {
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
} {
  const maxRecent = options?.maxRecentSearches || 5;
  const storageKey = options?.storageKey || 'recentSearches';
  const domain = options?.domain ?? 'global';

  const getRecentSearches = useCallback((): string[] => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    } catch (error) {
      logClientCatch(error, {
        source: 'useAutocomplete',
        action: 'getRecentSearches',
        storageKey,
        level: 'warn',
      });
      return [];
    }
  }, [storageKey]);

  const addRecentSearch = useCallback(
    (term: string): void => {
      if (term.length < 2) return;

      const recent = getRecentSearches();
      const updated = [term, ...recent.filter((t: string) => t !== term)].slice(0, maxRecent);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },
    [getRecentSearches, maxRecent, storageKey]
  );

  const searchQuery = useSearchQuery(searchTerm, { searchFn, domain });

  const recentSearches = useMemo((): string[] => {
    if (searchTerm.length === 0) {
      return getRecentSearches();
    }
    return [];
  }, [searchTerm, getRecentSearches]);

  return {
    ...searchQuery,
    recentSearches,
    addRecentSearch,
  };
}

// Hook for paginated search results
export function usePaginatedSearch<T>(
  searchTerm: string,
  searchFn: (
    query: string,
    page: number,
    pageSize: number
  ) => Promise<{
    data: T[];
    total: number;
    hasMore: boolean;
  }>,
  options?: {
    pageSize?: number;
    enabled?: boolean;
    domain?: TanstackFactoryDomain;
  }
): UseQueryResult<{ data: T[]; total: number; hasMore: boolean }, Error> {
  const pageSize = options?.pageSize || 20;
  const enabled = options?.enabled !== false;
  const domain = options?.domain ?? 'global';

  return createListQueryV2<
    { data: T[]; total: number; hasMore: boolean },
    { data: T[]; total: number; hasMore: boolean }
  >({
    queryKey: QUERY_KEYS.search.paginated(searchTerm, pageSize),
    queryFn: async (): Promise<{ data: T[]; total: number; hasMore: boolean }> => {
      const results: T[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && results.length < pageSize * 3) {
        // Load up to 3 pages
        const result = await searchFn(searchTerm, page, pageSize);
        results.push(...result.data);
        hasMore = result.hasMore;
        page++;
      }

      return {
        data: results,
        total: results.length,
        hasMore,
      };
    },
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    meta: {
      source: 'shared.hooks.query.usePaginatedSearch',
      operation: 'list',
      resource: 'search',
      domain,
      tags: ['search', 'paginated'],
      description: 'Loads paginated search results for the current term.',
    },
  });
}

// Hook for search suggestions
export function useSearchSuggestions(
  searchTerm: string,
  getSuggestions: (query: string) => Promise<string[]>,
  options?: { domain?: TanstackFactoryDomain }
): UseQueryResult<string[], Error> {
  const domain = options?.domain ?? 'global';
  return createListQueryV2<string, string[]>({
    queryKey: QUERY_KEYS.search.suggestions(searchTerm),
    queryFn: (): Promise<string[]> => getSuggestions(searchTerm),
    enabled: searchTerm.length >= 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data: string[]): string[] => data.slice(0, 8), // Limit to 8 suggestions
    meta: {
      source: 'shared.hooks.query.useSearchSuggestions',
      operation: 'list',
      resource: 'search-suggestions',
      domain,
      tags: ['search', 'suggestions'],
      description: 'Loads search suggestions for the current term.',
    },
  });
}
