import { useMemo } from 'react';

import type { ExpandedState } from '@tanstack/react-table';

import {
  collectExpandedCategoryIds,
  filterCategoryTree,
  getCategorySearchTerms,
  type CategoryMappingFilter,
} from './filtering';
import { type CategoryRow } from './utils';

type UseCategoryMapperTableFilteringParams = {
  categoryTree: CategoryRow[];
  expandedIds: Set<string>;
  getMappingForExternal: (externalCategoryId: string) => string | null;
  mappingFilter: CategoryMappingFilter;
  searchQuery: string;
};

type CategoryMapperTableFiltering = {
  expandedState: ExpandedState;
  filteredCategoryTree: CategoryRow[];
  isFilterActive: boolean;
  isSearchActive: boolean;
};

export function useCategoryMapperTableFiltering({
  categoryTree,
  expandedIds,
  getMappingForExternal,
  mappingFilter,
  searchQuery,
}: UseCategoryMapperTableFilteringParams): CategoryMapperTableFiltering {
  const searchTerms = useMemo(() => getCategorySearchTerms(searchQuery), [searchQuery]);
  const isSearchActive = searchTerms.length > 0;
  const isMappingFilterActive = mappingFilter !== 'all';
  const filteredCategoryTree = useMemo(
    () =>
      filterCategoryTree({
        rows: categoryTree,
        terms: searchTerms,
        mappingFilter,
        getMappingForExternal,
      }),
    [categoryTree, getMappingForExternal, mappingFilter, searchTerms]
  );
  const isFilterActive = isSearchActive || isMappingFilterActive;
  const expandedState = useMemo<ExpandedState>(() => {
    const expandedSource = isFilterActive
      ? collectExpandedCategoryIds(filteredCategoryTree)
      : expandedIds;
    return Object.fromEntries(Array.from(expandedSource).map((id) => [id, true]));
  }, [expandedIds, filteredCategoryTree, isFilterActive]);

  return {
    expandedState,
    filteredCategoryTree,
    isFilterActive,
    isSearchActive,
  };
}
