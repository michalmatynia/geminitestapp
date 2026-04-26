import { useState } from 'react';

import {
  useCategoryMapperActions,
  useCategoryMapperConfig,
  useCategoryMapperData,
  useCategoryMapperUIState,
} from '@/features/integrations/context/CategoryMapperContext';

import { useCategoryMapperColumns } from './CategoryMapperTable.columns';
import { useCategoryMapperFetchDiagnostics } from './CategoryMapperTable.fetch-diagnostics';
import type { CategoryMapperTablePanelProps } from './CategoryMapperTablePanel';
import type { CategoryMappingFilter } from './filtering';
import { useCategoryMapperTableFiltering } from './useCategoryMapperTableFiltering';

const isBlank = (value: string | null): boolean => value === null || value.trim().length === 0;

const isAutoMatchDisabled = ({
  externalCategoriesLength,
  externalCategoriesLoading,
  internalCategoriesLength,
  internalCategoriesLoading,
  isFetchPending,
  isSavePending,
  mappingsLoading,
  selectedCatalogId,
}: {
  externalCategoriesLength: number;
  externalCategoriesLoading: boolean;
  internalCategoriesLength: number;
  internalCategoriesLoading: boolean;
  isFetchPending: boolean;
  isSavePending: boolean;
  mappingsLoading: boolean;
  selectedCatalogId: string | null;
}): boolean =>
  [
    isFetchPending,
    isSavePending,
    externalCategoriesLoading,
    mappingsLoading,
    internalCategoriesLoading,
    isBlank(selectedCatalogId),
    externalCategoriesLength === 0,
    internalCategoriesLength === 0,
  ].some((blocked) => blocked);

export function useCategoryMapperTableModel(): CategoryMapperTablePanelProps {
  const config = useCategoryMapperConfig();
  const data = useCategoryMapperData();
  const uiState = useCategoryMapperUIState();
  const actions = useCategoryMapperActions();
  const [searchQuery, setSearchQuery] = useState('');
  const [mappingFilter, setMappingFilter] = useState<CategoryMappingFilter>('all');
  const isFetchPending = actions.fetchMutation.isPending;
  const isSavePending = actions.saveMutation.isPending;
  const isTraderaConnection = (config.integrationSlug ?? '').trim().toLowerCase() === 'tradera';
  const diagnostics = useCategoryMapperFetchDiagnostics({
    externalCategories: data.externalCategories,
    isTraderaConnection,
    lastFetchResult: uiState.lastFetchResult,
    lastFetchWarning: uiState.lastFetchWarning,
  });
  const filtering = useCategoryMapperTableFiltering({
    categoryTree: data.categoryTree,
    expandedIds: uiState.expandedIds,
    getMappingForExternal: actions.getMappingForExternal,
    mappingFilter,
    searchQuery,
  });
  const columns = useCategoryMapperColumns({
    getMappingForExternal: actions.getMappingForExternal,
    pendingMappings: uiState.pendingMappings,
    toggleExpand: uiState.toggleExpand,
    handleMappingChange: actions.handleMappingChange,
    internalCategoriesLoading: data.internalCategoriesLoading,
    isTraderaConnection,
    selectedCatalogId: data.selectedCatalogId,
    internalCategoryOptions: data.internalCategoryOptions,
  });
  const autoMatchDisabled = isAutoMatchDisabled({
    externalCategoriesLength: data.externalCategories.length,
    externalCategoriesLoading: data.externalCategoriesLoading,
    internalCategoriesLength: data.internalCategoryOptions.length,
    internalCategoriesLoading: data.internalCategoriesLoading,
    isFetchPending,
    isSavePending,
    mappingsLoading: data.mappingsLoading,
    selectedCatalogId: data.selectedCatalogId,
  });

  return {
    autoMatchDisabled, columns, connectionName: config.connectionName, diagnostics,
    expandedState: filtering.expandedState, filteredCategoryTree: filtering.filteredCategoryTree,
    hasExternalCategories: data.externalCategories.length > 0, isFetchPending,
    isFilterActive: filtering.isFilterActive, isLoading: data.externalCategoriesLoading || data.mappingsLoading,
    isSavePending, isSearchActive: filtering.isSearchActive, isTraderaConnection,
    lastFetchWarning: uiState.lastFetchWarning, mappingFilter,
    onAutoMatchByName: actions.handleAutoMatchByName,
    onFetchExternalCategories: actions.handleFetchExternalCategories,
    onMappingFilterChange: setMappingFilter, onSave: actions.handleSave,
    onSearchQueryChange: setSearchQuery, pendingCount: uiState.pendingMappings.size, searchQuery,
    setTraderaCategoryFetchBrowserMode: uiState.setTraderaCategoryFetchBrowserMode,
    stats: uiState.stats, traderaCategoryFetchBrowserMode: uiState.traderaCategoryFetchBrowserMode, uiState,
  };
}
