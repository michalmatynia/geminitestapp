'use client';

import { ColumnDef, ExpandedState, Updater } from '@tanstack/react-table';
import React, { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import { StandardDataTablePanel, EmptyState, GenericMapperStats } from '@/shared/ui';

import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';
import { CategoryMapperTableHeaderActions } from './category-table/CategoryMapperTableHeaderActions';
import { CategoryMapperNameCell } from './category-table/CategoryMapperNameCell';
import { CategoryMapperSelectCell } from './category-table/CategoryMapperSelectCell';
import { buildCategoryTree, type CategoryRow } from './category-table/utils';

export function CategoryMapperTable(): React.JSX.Element {
  const {
    connectionName,
    externalCategoriesLoading,
    mappingsLoading,
    externalCategories,
    getMappingForExternal,
    handleMappingChange,
    internalCategoriesLoading,
    selectedCatalogId,
    internalCategoryOptions,
    pendingMappings,
    expandedIds,
    toggleExpand,
    handleFetchFromBase,
    handleSave,
    fetchMutation,
    saveMutation,
    stats,
  } = useCategoryMapper();

  const data = useMemo(() => buildCategoryTree(externalCategories), [externalCategories]);

  // Sync expanded state
  const expanded = useMemo(() => {
    const state: ExpandedState = {};
    expandedIds.forEach((id) => {
      state[id] = true;
    });
    return state;
  }, [expandedIds]);

  const onExpandedChange = (_updater: Updater<ExpandedState>) => {
    // Controlled via expandedIds in context
  };

  const isFetchPending = fetchMutation.isPending;
  const isSavePending = saveMutation.isPending;
  const pendingCount = pendingMappings.size;

  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'External Category',
        cell: ({ row }) => {
          const currentMapping = getMappingForExternal(row.original.id);
          const hasPendingChange = pendingMappings.has(row.original.id);

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
          const currentMapping = getMappingForExternal(row.original.id);

          return (
            <CategoryMapperSelectCell
              value={currentMapping}
              onChange={(value) => handleMappingChange(row.original.id, value)}
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
      <EmptyState
        title='No external categories found'
        description='Click "Fetch Categories" to load from Base.com.'
        variant='compact'
        className='py-8'
      />
    );
  }

  return (
    <StandardDataTablePanel
      title='Marketplace Categories'
      description={`Connection: ${connectionName}`}
      headerActions={
        <CategoryMapperTableHeaderActions
          onFetch={() => void handleFetchFromBase()}
          isFetching={isFetchPending}
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
      data={data}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      getRowId={(row) => row.id}
      getSubRows={(row) => row.subRows}
      maxHeight='60vh'
      stickyHeader
    />
  );
}
