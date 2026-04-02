'use client';

import { ColumnDef } from '@tanstack/react-table';
import React, { useMemo } from 'react';

import {
  useCategoryMapperActions,
  useCategoryMapperConfig,
  useCategoryMapperData,
  useCategoryMapperUIState,
} from '@/features/integrations/context/CategoryMapperContext';
import { StandardDataTablePanel, CompactEmptyState, GenericMapperStats } from '@/shared/ui';

import { CategoryMapperNameCell } from './category-table/CategoryMapperNameCell';
import { CategoryMapperSelectCell } from './category-table/CategoryMapperSelectCell';
import { CategoryMapperTableHeaderActions } from './category-table/CategoryMapperTableHeaderActions';
import { type CategoryRow } from './category-table/utils';
import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';

export function CategoryMapperTable(): React.JSX.Element {
  const { connectionName } = useCategoryMapperConfig();
  const {
    externalCategoriesLoading,
    mappingsLoading,
    externalCategories,
    internalCategoriesLoading,
    selectedCatalogId,
    internalCategoryOptions,
    categoryTree,
  } = useCategoryMapperData();
  const { pendingMappings, expandedIds, toggleExpand, stats } = useCategoryMapperUIState();
  const {
    getMappingForExternal,
    handleMappingChange,
    handleFetchExternalCategories,
    handleAutoMatchByName,
    handleSave,
    fetchMutation,
    saveMutation,
  } = useCategoryMapperActions();

  const isFetchPending = fetchMutation.isPending;
  const isSavePending = saveMutation.isPending;
  const pendingCount = pendingMappings.size;
  const isAutoMatchDisabled =
    isFetchPending ||
    isSavePending ||
    externalCategoriesLoading ||
    mappingsLoading ||
    internalCategoriesLoading ||
    !selectedCatalogId ||
    externalCategories.length === 0 ||
    internalCategoryOptions.length === 0;

  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'External Category',
        cell: ({ row }) => {
          const mappingKey = row.original.externalId;
          const currentMapping = getMappingForExternal(mappingKey);
          const hasPendingChange = pendingMappings.has(mappingKey);

          return (
            <CategoryMapperNameCell
              name={row.original.name}
              depth={row.depth}
              canExpand={row.getCanExpand()}
              isExpanded={row.getIsExpanded()}
              onToggleExpand={() => toggleExpand(row.original.id)}
              isMapped={!!currentMapping}
              hasPendingChange={hasPendingChange}
            />
          );
        },
      },
      {
        id: 'mapping',
        header: 'Internal Category',
        cell: ({ row }) => {
          const mappingKey = row.original.externalId;
          const currentMapping = getMappingForExternal(mappingKey);

          return (
            <CategoryMapperSelectCell
              value={currentMapping}
              onChange={(value) => handleMappingChange(mappingKey, value)}
              options={internalCategoryOptions}
              disabled={internalCategoriesLoading || !selectedCatalogId}
            />
          );
        },
      },
    ],
    [
      getMappingForExternal,
      pendingMappings,
      toggleExpand,
      handleMappingChange,
      internalCategoriesLoading,
      selectedCatalogId,
      internalCategoryOptions,
    ]
  );

  const isLoading = externalCategoriesLoading || mappingsLoading;

  if (externalCategories.length === 0 && !isLoading) {
    return (
      <CompactEmptyState
        title='No external categories found'
        description={`Click "Fetch Categories" to load categories from ${connectionName}.`}
        className='py-8'
       />
    );
  }

  const expandedState = useMemo(
    () => Object.fromEntries(Array.from(expandedIds).map((id) => [id, true])),
    [expandedIds]
  );

  return (
    <StandardDataTablePanel
      title='Marketplace Categories'
      description={`Connection: ${connectionName}`}
      headerActions={
        <CategoryMapperTableHeaderActions
          onFetch={() => void handleFetchExternalCategories()}
          isFetching={isFetchPending}
          onAutoMatchByName={handleAutoMatchByName}
          autoMatchDisabled={isAutoMatchDisabled}
          onSave={() => void handleSave()}
          isSaving={isSavePending}
          pendingCount={pendingCount}
        />
      }
      filters={
        <div className='mb-2'>
          <CategoryMapperCatalogSelector />
        </div>
      }
      alerts={
        <GenericMapperStats
          total={stats.total}
          mapped={stats.mapped}
          pending={stats.pending}
          itemLabel='Categories'
        />
      }
      isLoading={isLoading}
      variant='flat'
      columns={columns}
      data={categoryTree}
      expanded={expandedState}
      onExpandedChange={() => {}}
      getRowId={(row: CategoryRow) => row.id}
      getSubRows={(row: CategoryRow) => row.subRows}
      maxHeight='60vh'
      stickyHeader
    />
  );
}
