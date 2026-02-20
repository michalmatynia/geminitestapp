'use client';

import { ColumnDef, ExpandedState, Updater } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Download, RefreshCw, Save, Check } from 'lucide-react';
import React, { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { ExternalCategory } from '@/features/integrations/types/category-mapping';
import { Button, SelectSimple, StandardDataTablePanel, EmptyState } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';
import { CategoryMapperStats } from './CategoryMapperStats';

type CategoryRow = ExternalCategory & {
  subRows?: CategoryRow[] | undefined;
};

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

const buildCategoryTree = (categories: ExternalCategory[]): CategoryRow[] => {
  const byId = new Map<string, CategoryRow>();
  const roots: CategoryRow[] = [];

  // First pass: create all nodes
  categories.forEach(cat => {
    byId.set(cat.externalId, { ...cat, subRows: [] });
  });

  // Second pass: link children
  categories.forEach(cat => {
    const node = byId.get(cat.externalId)!;
    const parentId = normalizeParentExternalId(cat.parentExternalId);
    
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.subRows!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort function
  const sortNodes = (nodes: CategoryRow[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => {
      if (node.subRows?.length) {
        sortNodes(node.subRows);
      } else {
        node.subRows = undefined; // Remove empty arrays for leaf nodes
      }
    });
  };

  sortNodes(roots);
  return roots;
};

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
  } = useCategoryMapper();

  const data = useMemo(() => buildCategoryTree(externalCategories), [externalCategories]);

  // Sync expanded state
  const expanded = useMemo(() => {
    const state: ExpandedState = {};
    expandedIds.forEach(id => {
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

  const columns = useMemo<ColumnDef<CategoryRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'External Category',
      cell: ({ row }) => {
        const currentMapping = getMappingForExternal(row.original.id);
        const hasPendingChange = pendingMappings.has(row.original.id);
        
        return (
          <div className={cn('flex items-center', hasPendingChange && 'bg-yellow-500/5 rounded px-2 -ml-2 py-1')}>
            <div style={{ paddingLeft: `${row.depth * 20}px` }} className='flex items-center'>
              {row.getCanExpand() ? (
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={() => toggleExpand(row.original.id)} // Use context toggle
                  className='mr-2 p-0.5 text-gray-400 hover:text-white h-6 w-6'
                >
                  {row.getIsExpanded() ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </Button>
              ) : (
                <span className='mr-2 w-6 inline-block' />
              )}
              <span className='text-sm text-gray-200'>{row.original.name}</span>
              {currentMapping && (
                <Check className='ml-2 h-3 w-3 text-emerald-400' />
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'mapping',
      header: 'Internal Category',
      cell: ({ row }) => {
        const currentMapping = getMappingForExternal(row.original.id);
        
        return (
          <SelectSimple
            size='sm'
            value={currentMapping ?? '__unmapped__'}
            onValueChange={(value: string): void =>
              handleMappingChange(row.original.id, value === '__unmapped__' ? null : value)
            }
            disabled={internalCategoriesLoading || !selectedCatalogId}
            options={[
              { value: '__unmapped__', label: '— Not mapped —' },
              ...internalCategoryOptions
            ]}
            placeholder='— Not mapped —'
            triggerClassName='w-full max-w-md h-8 text-xs'
          />
        );
      },
    },
  ], [
    getMappingForExternal,
    pendingMappings,
    toggleExpand,
    handleMappingChange,
    internalCategoriesLoading,
    selectedCatalogId,
    internalCategoryOptions
  ]);

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
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            onClick={(): void => { void handleFetchFromBase(); }}
            disabled={isFetchPending}
          >
            {isFetchPending ? <RefreshCw className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Download className='mr-2 h-3.5 w-3.5' />}
            {isFetchPending ? 'Fetching...' : 'Fetch Categories'}
          </Button>

          <Button
            size='xs'
            className='h-8'
            onClick={(): void => { void handleSave(); }}
            disabled={isSavePending || pendingCount === 0}
          >
            {isSavePending ? <RefreshCw className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Save className='mr-2 h-3.5 w-3.5' />}
            {isSavePending ? 'Saving...' : `Save (${pendingCount})`}
          </Button>
        </div>
      }
      filters={(
        <div className='mb-2'>
          <CategoryMapperCatalogSelector />
        </div>
      )}
      alerts={<CategoryMapperStats />}
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
