'use client';

import React, { useCallback, useMemo } from 'react';
import NextImage from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';

import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { getDocumentationTooltip } from '@/shared/lib/tooltip-engine';
import type { ImportListItem } from '@/shared/contracts/data-import-export';
import {
  Button,
  Pagination,
  SelectSimple,
  DataTable,
  Badge,
  SearchInput,
  Tooltip,
  SelectionBar,
  FormSection,
  Checkbox,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

export function ImportListPreviewSection(): React.JSX.Element {
  const {
    importNameSearch,
    setImportNameSearch,
    importSkuSearch,
    setImportSkuSearch,
    importListPage,
    setImportListPage,
    importListPageSize,
    setImportListPageSize,
    uniqueOnly,
    setUniqueOnly,
    handleLoadImportList,
    loadingImportList,
    importListStats,
    importList,
    selectedImportIds,
    setSelectedImportIds,
  } = useImportExport();

  const selectedImportCount = selectedImportIds.size;
  const visibleImportIds = useMemo(
    () =>
      importList
        .map((item: ImportListItem) => item.baseProductId)
        .filter((id: string): id is string => Boolean(id)),
    [importList]
  );
  const selectedVisibleImportCount = useMemo(
    () => visibleImportIds.filter((id) => selectedImportIds.has(id)).length,
    [visibleImportIds, selectedImportIds]
  );
  const allVisibleImportsSelected =
    visibleImportIds.length > 0 && selectedVisibleImportCount === visibleImportIds.length;
  const someVisibleImportsSelected = selectedVisibleImportCount > 0 && !allVisibleImportsSelected;

  const toggleVisibleImportSelection = useCallback(
    (checked: boolean): void => {
      setSelectedImportIds((previous: Set<string>) => {
        const next = new Set(previous);
        if (checked) {
          visibleImportIds.forEach((id) => next.add(id));
        } else {
          visibleImportIds.forEach((id) => next.delete(id));
        }
        return next;
      });
    },
    [setSelectedImportIds, visibleImportIds]
  );

  const skuExistsTooltip =
    getDocumentationTooltip(
      DOCUMENTATION_MODULE_IDS.dataImportExport,
      'import_sku_exists_warning'
    ) ?? 'SKU already exists in the database';

  const handleSelectVisibleImports = useCallback((): void => {
    toggleVisibleImportSelection(true);
  }, [toggleVisibleImportSelection]);

  const handleDeselectAllImports = useCallback((): void => {
    setSelectedImportIds(new Set());
  }, [setSelectedImportIds]);

  const hasImportSearch = importNameSearch.trim().length > 0 || importSkuSearch.trim().length > 0;

  const columns = useMemo<ColumnDef<ImportListItem>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={allVisibleImportsSelected || (someVisibleImportsSelected && 'indeterminate')}
            onCheckedChange={(value) => toggleVisibleImportSelection(Boolean(value))}
            aria-label='Select all visible'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedImportIds.has(row.original.baseProductId)}
            onCheckedChange={(checked) => {
              const isChecked = Boolean(checked);
              setSelectedImportIds((prev: Set<string>) => {
                const next = new Set(prev);
                if (isChecked) next.add(row.original.baseProductId);
                else next.delete(row.original.baseProductId);
                return next;
              });
            }}
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'image',
        header: 'Img',
        cell: ({ row }) => (
          <div className='relative h-10 w-10 overflow-hidden rounded bg-gray-900 border border-white/5'>
            {row.original.image ? (
              <NextImage
                src={row.original.image}
                alt=''
                fill
                className='object-cover'
                unoptimized={!row.original.image.includes('baselinker.com')}
              />
            ) : (
              <div className='flex h-full w-full items-center justify-center text-[10px] text-gray-600 font-bold uppercase'>
                NA
              </div>
            )}
          </div>
        ),
        size: 60,
      },
      {
        accessorKey: 'baseProductId',
        header: 'Base ID',
        cell: ({ row }) => (
          <span className='font-mono text-[10px] text-gray-500'>{row.original.baseProductId}</span>
        ),
        size: 100,
      },
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div className='flex flex-col min-w-0'>
            <span className='font-medium text-gray-200 truncate'>{row.original.name}</span>
            {row.original.description && (
              <span className='text-[10px] text-gray-500 truncate italic'>
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <span
              className={cn(
                'font-mono text-[11px]',
                row.original.skuExists ? 'text-amber-400 font-bold' : 'text-gray-400'
              )}
            >
              {row.original.sku || '—'}
            </span>
            {row.original.skuExists && (
              <Tooltip content={skuExistsTooltip}>
                <span className='text-[10px] opacity-70 cursor-help'>⚠</span>
              </Tooltip>
            )}
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <span className='font-mono text-xs text-gray-300'>{row.original.price ?? 0}</span>
        ),
        size: 80,
      },
      {
        accessorKey: 'stock',
        header: 'Qty',
        cell: ({ row }) => (
          <span className='font-mono text-xs text-gray-300'>{row.original.stock ?? 0}</span>
        ),
        size: 60,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original;
          if (item.exists)
            return (
              <Badge
                variant='outline'
                className='bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] uppercase font-bold'
              >
                Exists
              </Badge>
            );
          if (item.skuExists)
            return (
              <Badge
                variant='outline'
                className='bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] uppercase font-bold'
              >
                SKU Dup
              </Badge>
            );
          return (
            <Badge
              variant='outline'
              className='bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-bold'
            >
              New
            </Badge>
          );
        },
        size: 80,
      },
    ],
    [
      allVisibleImportsSelected,
      selectedImportIds,
      setSelectedImportIds,
      skuExistsTooltip,
      someVisibleImportsSelected,
      toggleVisibleImportSelection,
    ]
  );

  return (
    <FormSection
      title='Import list preview'
      description='Compare Base products with existing records by Base ID.'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <SearchInput
            value={importNameSearch}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setImportNameSearch(event.target.value);
              setImportListPage(1);
            }}
            onClear={() => {
              setImportNameSearch('');
              setImportListPage(1);
            }}
            placeholder='Search name...'
            className='w-48'
            size='sm'
          />
          <SearchInput
            value={importSkuSearch}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setImportSkuSearch(event.target.value);
              setImportListPage(1);
            }}
            onClear={() => {
              setImportSkuSearch('');
              setImportListPage(1);
            }}
            placeholder='Search SKU...'
            className='w-40'
            size='sm'
          />
          <SelectSimple
            size='sm'
            value={uniqueOnly ? 'unique' : 'all'}
            onValueChange={(v: string): void => {
              setUniqueOnly(v === 'unique');
              setImportListPage(1);
            }}
            options={[
              { value: 'unique', label: 'Unique only' },
              { value: 'all', label: 'All products' },
            ]}
            className='w-32'
            triggerClassName='h-8 border-border bg-gray-900 text-xs text-white'
          />
          <SelectSimple
            size='sm'
            value={String(importListPageSize)}
            onValueChange={(value: string): void => {
              const nextSize = Number(value);
              setImportListPageSize(Number.isFinite(nextSize) ? nextSize : 25);
              setImportListPage(1);
            }}
            options={[
              { value: '10', label: '10 / page' },
              { value: '25', label: '25 / page' },
              { value: '50', label: '50 / page' },
              { value: '100', label: '100 / page' },
            ]}
            className='w-32'
            triggerClassName='h-8 border-border bg-gray-900 text-xs text-white'
          />
          <Button
            onClick={(): void => {
              void handleLoadImportList();
            }}
            loading={loadingImportList}
            loadingText='Loading...'
          >
            Load import list
          </Button>
        </div>
      }
    >
      {importListStats ? (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
          <div className='flex-1'>
            Total: {importListStats.total} · Existing: {importListStats.existing} · Available:{' '}
            {importListStats.available ?? importListStats.filtered} · Matching:{' '}
            {importListStats.filtered} · Showing: {importList.length}
            {importListStats.skuDuplicates ? (
              <span className='text-yellow-400'>
                {' '}
                · SKU duplicates: {importListStats.skuDuplicates}
              </span>
            ) : null}
          </div>
          <div className='flex items-center gap-4'>
            <SelectionBar
              data={importList}
              getRowId={(item) => item.baseProductId}
              selectedCount={selectedImportCount}
              onSelectPage={handleSelectVisibleImports}
              onDeselectPage={() => toggleVisibleImportSelection(false)}
              onDeselectAll={handleDeselectAllImports}
              label='Import Items'
            />
            <Pagination
              page={importListPage}
              totalPages={importListStats.totalPages ?? 1}
              onPageChange={setImportListPage}
              className='scale-90 origin-right'
            />
          </div>
        </div>
      ) : null}

      {importList.length > 0 ? (
        <div className='mt-3 rounded-md border border-border bg-gray-950/20 overflow-hidden'>
          <DataTable columns={columns} data={importList} getRowId={(row) => row.baseProductId} />
        </div>
      ) : (
        <p className='mt-3 text-xs text-gray-500'>
          {importListStats
            ? hasImportSearch
              ? 'No matches for this search.'
              : 'No products available for current filters.'
            : 'No items loaded yet.'}
        </p>
      )}
    </FormSection>
  );
}
