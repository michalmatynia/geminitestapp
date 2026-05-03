import type { ColumnDef, ExpandedState, OnChangeFn } from '@tanstack/react-table';
import React from 'react';

import type { CategoryMapperFetchWarning, CategoryMapperUIState } from '@/features/integrations/context/CategoryMapperContext.helpers';
import type { TraderaCategoryFetchBrowserMode } from '@/shared/contracts/integrations/marketplace';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';

import { CategoryMapperTableHeaderActions } from './CategoryMapperTableHeaderActions';
import { CategoryMapperTableFilters } from './CategoryMapperTableFilters';
import { CategoryMapperTableAlerts } from './CategoryMapperTableAlerts';
import type { CategoryMapperFetchDiagnostics } from './CategoryMapperTable.fetch-diagnostics';
import { CategoryMapperTableEmptyState } from './CategoryMapperTableEmptyState';
import type { CategoryMappingFilter } from './filtering';
import { type CategoryRow } from './utils';

export type CategoryMapperTablePanelProps = {
  autoMatchDisabled: boolean;
  columns: ColumnDef<CategoryRow>[];
  connectionName: string;
  diagnostics: CategoryMapperFetchDiagnostics;
  expandedState: ExpandedState;
  filteredCategoryTree: CategoryRow[];
  hasExternalCategories: boolean;
  isFetchPending: boolean;
  isFilterActive: boolean;
  isLoading: boolean;
  isSavePending: boolean;
  isSearchActive: boolean;
  isTraderaConnection: boolean;
  lastFetchWarning: CategoryMapperFetchWarning | null;
  mappingFilter: CategoryMappingFilter;
  onAutoMatchByName: () => void;
  onFetchExternalCategories: () => void | Promise<void>;
  onMappingFilterChange: (filter: CategoryMappingFilter) => void;
  onSave: () => void | Promise<void>;
  onSearchQueryChange: (query: string) => void;
  pendingCount: number;
  searchQuery: string;
  setTraderaCategoryFetchBrowserMode: (mode: TraderaCategoryFetchBrowserMode) => void;
  stats: CategoryMapperUIState['stats'];
  traderaCategoryFetchBrowserMode: TraderaCategoryFetchBrowserMode;
  uiState: Pick<CategoryMapperUIState, 'nonLeafMappings' | 'staleMappings'>;
};

const ignoreExpandedChange: OnChangeFn<ExpandedState> = () => {};
const getCategoryRowId = (row: CategoryRow): string => row.id;
const getCategorySubRows = (row: CategoryRow): CategoryRow[] | undefined => row.subRows;

export function CategoryMapperTablePanel(props: CategoryMapperTablePanelProps): React.JSX.Element {
  return (
    <StandardDataTablePanel
      title='Marketplace Categories'
      description={`Connection: ${props.connectionName}`}
      headerActions={
        <CategoryMapperTableHeaderActions
          onFetch={props.onFetchExternalCategories}
          isFetching={props.isFetchPending}
          showBrowserModeControl={props.isTraderaConnection}
          browserMode={props.traderaCategoryFetchBrowserMode}
          onBrowserModeChange={props.setTraderaCategoryFetchBrowserMode}
          onAutoMatchByName={props.onAutoMatchByName}
          autoMatchDisabled={props.autoMatchDisabled}
          onSave={props.onSave}
          isSaving={props.isSavePending}
          pendingCount={props.pendingCount}
        />
      }
      filters={<CategoryMapperTableFilters {...props} />}
      alerts={<CategoryMapperTableAlerts {...props.uiState} {...props} />}
      isLoading={props.isLoading}
      emptyState={
        <CategoryMapperTableEmptyState
          connectionName={props.connectionName}
          hasExternalCategories={props.hasExternalCategories}
          hasSearch={props.isSearchActive}
          isFilterActive={props.isFilterActive}
          isLoading={props.isLoading}
          mappingFilter={props.mappingFilter}
        />
      }
      variant='flat'
      columns={props.columns}
      data={props.filteredCategoryTree}
      expanded={props.expandedState}
      onExpandedChange={ignoreExpandedChange}
      getRowId={getCategoryRowId}
      getSubRows={getCategorySubRows}
      maxHeight='60vh'
      stickyHeader
    />
  );
}
