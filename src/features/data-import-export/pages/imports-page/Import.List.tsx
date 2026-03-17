'use client';

import React from 'react';
import NextImage from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Button,
  Pagination,
  PanelFilters,
  StandardDataTablePanel,
  StatusBadge,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import type { ImportListItem } from '@/shared/contracts/integrations';
import type { FilterField } from '@/shared/contracts/ui';
import { DOCUMENTATION_MODULE_IDS, getDocumentationTooltip } from '@/shared/lib/documentation';
import {
  IMPORT_LIST_MODE_OPTIONS,
  IMPORT_LIST_PAGE_SIZE_OPTIONS,
} from './ImportsPage.Constants';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui';

export function ImportListPreviewSection(): React.JSX.Element {
  const { loadingImportList, importListStats, importList } = useImportExportData();
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
    selectedImportIds,
    setSelectedImportIds,
  } = useImportExportState();
  const { handleLoadImportList } = useImportExportActions();

  const selectedImportCount = selectedImportIds.size;
  const visibleImportIds = React.useMemo(
    () =>
      importList
        .map((item: ImportListItem) => item.baseProductId)
        .filter((id: string): id is string => Boolean(id)),
    [importList]
  );

  const toggleVisibleImportSelection = React.useCallback(
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

  const columns = React.useMemo<ColumnDef<ImportListItem>[]>(
    () => [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <input
            type='checkbox'
            className='size-4 rounded border-border/60'
            checked={selectedImportIds.has(row.original.baseProductId)}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setSelectedImportIds((prev: Set<string>) => {
                const next = new Set(prev);
                if (isChecked) next.add(row.original.baseProductId);
                else next.delete(row.original.baseProductId);
                return next;
              });
            }}
            aria-label={`Select ${row.original.name}`}
            title={`Select ${row.original.name}`}
          />
        ),
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
                <span
                  className='cursor-help rounded-sm text-[10px] opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
                  tabIndex={0}
                  aria-label={skuExistsTooltip}
                  title={skuExistsTooltip}
                >
                  ⚠
                </span>
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
          if (item.exists) return <StatusBadge status='Exists' variant='info' size='sm' />;
          if (item.skuExists) return <StatusBadge status='SKU Dup' variant='warning' size='sm' />;
          return <StatusBadge status='New' variant='active' size='sm' />;
        },
        size: 80,
      },
    ],
    [selectedImportIds, setSelectedImportIds, skuExistsTooltip]
  );

  const filters: FilterField[] = [
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      placeholder: 'Search SKU...',
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: IMPORT_LIST_MODE_OPTIONS,
    },
    {
      key: 'pageSize',
      label: 'Page Size',
      type: 'select',
      options: IMPORT_LIST_PAGE_SIZE_OPTIONS,
    },
  ];

  return (
    <div className='space-y-4 rounded-lg border border-border/60 bg-card/20 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Import list preview</h3>
          <p className='text-xs text-gray-500'>Compare Base products with existing records.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            onClick={(): void => {
              void handleLoadImportList();
            }}
            loading={loadingImportList}
            loadingText='Loading...'
          >
            Load import list
          </Button>
        </div>
      </div>

      <PanelFilters
        filters={filters}
        values={{
          sku: importSkuSearch,
          mode: uniqueOnly ? 'unique' : 'all',
          pageSize: String(importListPageSize),
        }}
        search={importNameSearch}
        searchPlaceholder='Search name...'
        onSearchChange={(val) => {
          setImportNameSearch(val);
          setImportListPage(1);
        }}
        onFilterChange={(key, value) => {
          if (key === 'sku') {
            setImportSkuSearch(value as string);
            setImportListPage(1);
          }
          if (key === 'mode') {
            setUniqueOnly(value === 'unique');
            setImportListPage(1);
          }
          if (key === 'pageSize') {
            setImportListPageSize(Number(value));
            setImportListPage(1);
          }
        }}
        onReset={() => {
          setImportNameSearch('');
          setImportSkuSearch('');
          setUniqueOnly(false);
          setImportListPage(1);
        }}
        compact
      />

      {importListStats && (
        <div className='flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider'>
          <div className='flex-1'>
            Total: {importListStats.total} · Existing: {importListStats.existing} · Available:{' '}
            {importListStats.available ?? importListStats.filtered} · Matching:{' '}
            {importListStats.filtered} · Selected: {selectedImportCount}
            {importListStats.skuDuplicates ? (
              <span className='text-amber-500'> · SKU dups: {importListStats.skuDuplicates}</span>
            ) : null}
          </div>
          <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
            <button
              type='button'
              className='hover:text-white transition-colors'
              onClick={() => toggleVisibleImportSelection(true)}
            >
              Select Page
            </button>
            <button
              type='button'
              className='hover:text-white transition-colors'
              onClick={() => setSelectedImportIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <StandardDataTablePanel
        columns={columns}
        data={importList}
        variant='flat'
        isLoading={loadingImportList}
        loadingVariant='table'
        footer={
          <Pagination
            page={importListPage}
            totalPages={importListStats?.totalPages ?? 1}
            onPageChange={setImportListPage}
            variant='compact'
          />
        }
        emptyState={
          <div className='py-12 text-center text-sm text-gray-500 italic'>
            {importListStats ? 'No matches for this search.' : 'No items loaded yet.'}
          </div>
        }
      />
    </div>
  );
}
