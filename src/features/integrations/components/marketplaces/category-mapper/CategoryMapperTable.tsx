'use client';

import { ColumnDef, ExpandedState, Updater } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import React, { useMemo } from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { ExternalCategory } from '@/features/integrations/types/category-mapping';
import { Button, DataTable, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils';

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
    toggleExpand, // We might need to bypass this if we want full control or sync
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
    // We let the table handle expansion state internally for now,
    // but we could sync it back to context if needed.
    // Since the context initializes expansion for roots, and we pass `expanded` prop,
    // we need to handle updates if we want interactive expansion.
    
    // However, we are using the toggle function from context directly in the cell renderer.
    // So this handler might not be triggered by the table's default expanders if we don't use them.
    // But since we pass `expanded` prop, the table is controlled.
    // The cell renderer calls `toggleExpand` which updates `expandedIds` in context.
    // `expandedIds` updates `expanded` memo, which updates the table.
    // So this handler is technically not needed unless we use standard table expanders.
  };

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
            value={currentMapping ?? '__unmapped__'}
            onValueChange={(v: string): void =>
              handleMappingChange(row.original.id, v === '__unmapped__' ? null : v)
            }
            disabled={internalCategoriesLoading || !selectedCatalogId}
            options={[
              { value: '__unmapped__', label: '— Not mapped —' },
              ...internalCategoryOptions
            ]}
            size='sm'
            className='w-full max-w-md'
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

  if (externalCategoriesLoading || mappingsLoading) {
    return (
      <div className='rounded-md border border-border p-8 text-center text-gray-500'>
        Loading categories...
      </div>
    );
  }

  if (externalCategories.length === 0) {
    return (
      <div className='rounded-md border border-border p-8 text-center text-gray-500'>
        No external categories found. Click &quot;Fetch Categories&quot; to load from Base.com.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      expanded={expanded}
      onExpandedChange={onExpandedChange} // We override cell click, so this might not be called, but good to have
      getRowId={(row) => row.id}
      isLoading={externalCategoriesLoading || mappingsLoading}
      maxHeight='60vh'
      stickyHeader
    />
  );
}
