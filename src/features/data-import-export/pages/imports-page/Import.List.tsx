'use client';

import React from 'react';
import NextImage from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Tooltip, useToast } from '@/shared/ui/primitives.public';
import { Pagination } from '@/shared/ui/navigation-and-layout.public';
import { PanelFilters, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportDirectTargetType } from '@/shared/contracts/integrations/base-com';
import type { BaseImportListIdsResponse, ImportListItem } from '@/shared/contracts/integrations/import-export';
import type { FilterField } from '@/shared/contracts/ui/panels';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import {
  IMPORT_LIST_PAGE_SIZE_OPTIONS,
} from './ImportsPage.Constants';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { api } from '@/shared/lib/api-client';

function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel: string;
  title: string;
}): React.JSX.Element {
  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type='checkbox'
      className='size-4 rounded border-border/60'
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      title={title}
    />
  );
}

const DIRECT_TARGET_TYPE_OPTIONS: Array<{ value: BaseImportDirectTargetType; label: string }> = [
  { value: 'base_product_id', label: 'Base Product ID' },
  { value: 'sku', label: 'SKU' },
];

export function ImportListPreviewSection(): React.JSX.Element {
  const { toast } = useToast();
  const { loadingImportList, importListStats, importList } = useImportExportData();
  const {
    selectedBaseConnectionId,
    inventoryId,
    catalogId,
    limit,
    importNameSearch,
    setImportNameSearch,
    importSkuSearch,
    setImportSkuSearch,
    importDirectTargetType,
    setImportDirectTargetType,
    importDirectTargetValue,
    setImportDirectTargetValue,
    importListPage,
    setImportListPage,
    importListPageSize,
    setImportListPageSize,
    uniqueOnly,
    selectedImportIds,
    setSelectedImportIds,
  } = useImportExportState();
  const { handleLoadImportList, handleImport, importing } = useImportExportActions();
  const [loadingAllMatchingSelection, setLoadingAllMatchingSelection] = React.useState(false);
  const normalizedDirectTargetValue = importDirectTargetValue.trim();
  const hasDirectTarget = normalizedDirectTargetValue.length > 0;

  const selectedImportCount = selectedImportIds.size;
  const visibleImportIds = React.useMemo(
    () =>
      importList
        .map((item: ImportListItem) => item.baseProductId)
        .filter((id: string): id is string => Boolean(id)),
    [importList]
  );
  const selectedVisibleCount = React.useMemo(
    () => visibleImportIds.filter((id: string) => selectedImportIds.has(id)).length,
    [selectedImportIds, visibleImportIds]
  );
  const allVisibleSelected =
    visibleImportIds.length > 0 && selectedVisibleCount === visibleImportIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const scopeSelectionKey = React.useMemo(
    () =>
      JSON.stringify({
        selectedBaseConnectionId,
        inventoryId,
        catalogId,
        limit,
        uniqueOnly,
        importNameSearch,
        importSkuSearch,
        importDirectTargetType,
        directTargetValue: normalizedDirectTargetValue,
      }),
    [
      catalogId,
      importNameSearch,
      importSkuSearch,
      importDirectTargetType,
      inventoryId,
      limit,
      normalizedDirectTargetValue,
      selectedBaseConnectionId,
      uniqueOnly,
    ]
  );
  const previousScopeSelectionKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (previousScopeSelectionKeyRef.current === null) {
      previousScopeSelectionKeyRef.current = scopeSelectionKey;
      return;
    }
    if (
      previousScopeSelectionKeyRef.current !== scopeSelectionKey &&
      selectedImportIds.size > 0
    ) {
      setSelectedImportIds(new Set());
    }
    previousScopeSelectionKeyRef.current = scopeSelectionKey;
  }, [scopeSelectionKey, selectedImportIds.size, setSelectedImportIds]);

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

  const handleSelectAllMatching = React.useCallback(async (): Promise<void> => {
    if (!selectedBaseConnectionId.trim() || !inventoryId.trim()) {
      toast('Load the import list first.', { variant: 'error' });
      return;
    }

    setLoadingAllMatchingSelection(true);
    try {
      const response = await api.post<BaseImportListIdsResponse>('/api/v2/integrations/imports/base', {
        action: 'list_ids',
        connectionId: selectedBaseConnectionId.trim(),
        inventoryId: inventoryId.trim(),
        catalogId: catalogId.trim() || undefined,
        limit: limit === 'all' ? undefined : Number(limit),
        uniqueOnly,
        searchName: importNameSearch,
        searchSku: importSkuSearch,
        directTarget: hasDirectTarget
          ? {
              type: importDirectTargetType,
              value: normalizedDirectTargetValue,
            }
          : undefined,
      });
      setSelectedImportIds(new Set(response.ids));
      toast(`Selected ${response.totalMatching} matching products.`, { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to select all matching products.';
      toast(message, { variant: 'error' });
    } finally {
      setLoadingAllMatchingSelection(false);
    }
  }, [
    catalogId,
    importNameSearch,
    importSkuSearch,
    importDirectTargetType,
    inventoryId,
    hasDirectTarget,
    limit,
    normalizedDirectTargetValue,
    selectedBaseConnectionId,
    setSelectedImportIds,
    toast,
    uniqueOnly,
  ]);

  const updateDirectTargetType = React.useCallback(
    (value: BaseImportDirectTargetType): void => {
      setImportDirectTargetType(value);
      setImportListPage(1);
    },
    [setImportDirectTargetType, setImportListPage]
  );

  const updateDirectTargetValue = React.useCallback(
    (value: string): void => {
      setImportDirectTargetValue(value);
      setImportListPage(1);
    },
    [setImportDirectTargetValue, setImportListPage]
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
        header: () => (
          <SelectionCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={(event) => toggleVisibleImportSelection(event.target.checked)}
            ariaLabel='Select all products on this page'
            title='Select all products on this page'
          />
        ),
        cell: ({ row }) => (
          <SelectionCheckbox
            checked={selectedImportIds.has(row.original.baseProductId)}
            onChange={(event) => {
              const isChecked = event.target.checked;
              setSelectedImportIds((prev: Set<string>) => {
                const next = new Set(prev);
                if (isChecked) next.add(row.original.baseProductId);
                else next.delete(row.original.baseProductId);
                return next;
              });
            }}
            ariaLabel={`Select ${row.original.name}`}
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
    [
      allVisibleSelected,
      selectedImportIds,
      selectedImportIds.size,
      setSelectedImportIds,
      skuExistsTooltip,
      someVisibleSelected,
      toggleVisibleImportSelection,
    ]
  );

  const filters: FilterField[] = [
    {
      key: 'sku',
      label: 'SKU',
      type: 'text',
      placeholder: 'Search SKU...',
      inputName: 'base-import-sku-filter',
      autoComplete: 'off',
      spellCheck: false,
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
          <p className='mt-1 text-[11px] text-gray-500'>
            Using import settings: {uniqueOnly ? 'Unique only' : 'All products'} · Limit{' '}
            {limit === 'all' ? 'All' : limit}
          </p>
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
            {hasDirectTarget ? 'Load exact item' : 'Load import list'}
          </Button>
          <Button
            size='sm'
            onClick={(): void => {
              void handleImport(
                hasDirectTarget
                  ? {
                      directTarget: {
                        type: importDirectTargetType,
                        value: normalizedDirectTargetValue,
                      },
                    }
                  : undefined
              );
            }}
            loading={importing}
            loadingText='Importing...'
          >
            {hasDirectTarget ? 'Run exact import' : 'Run import'}
          </Button>
        </div>
      </div>

      <div className='rounded-md border border-border/60 bg-black/20 p-3'>
        <div className='flex flex-wrap items-end gap-3'>
          <label className='flex min-w-[180px] flex-col gap-1 text-xs text-gray-300'>
            <span className='font-semibold text-gray-200'>Exact import target</span>
            <select
              className='h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-white'
              value={importDirectTargetType}
              onChange={(event) =>
                updateDirectTargetType(event.target.value as BaseImportDirectTargetType)
              }
              aria-label='Exact import target type'
            >
              {DIRECT_TARGET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className='flex min-w-[260px] flex-1 flex-col gap-1 text-xs text-gray-300'>
            <span className='font-semibold text-gray-200'>
              {importDirectTargetType === 'sku' ? 'Exact SKU' : 'Exact Base Product ID'}
            </span>
            <input
              type='text'
              value={importDirectTargetValue}
              onChange={(event) => updateDirectTargetValue(event.target.value)}
              name='base-import-exact-target'
              autoComplete='off'
              spellCheck={false}
              autoCapitalize='none'
              autoCorrect='off'
              placeholder={
                importDirectTargetType === 'sku'
                  ? 'Example: FOASW022'
                  : 'Example: 9568407'
              }
              aria-label='Exact import target value'
              className='h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-white placeholder:text-gray-500'
            />
          </label>
          <Button
            size='sm'
            variant='outline'
            onClick={(): void => {
              updateDirectTargetValue('');
            }}
            disabled={!hasDirectTarget}
          >
            Clear exact target
          </Button>
        </div>
        <p className='mt-2 text-[11px] text-gray-400'>
          When set, exact import target overrides preview row selection, preview filters, limit, and
          unique-only filtering for this preview and run.
        </p>
        {hasDirectTarget ? (
          <p className='mt-1 text-[11px] text-cyan-300'>
            Exact target imports always create a new product, generate a unique SKU when needed,
            and stay detached from Base sync/update linkage.
          </p>
        ) : null}
      </div>

      <PanelFilters
        filters={filters}
        values={{
          sku: importSkuSearch,
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
          if (key === 'pageSize') {
            setImportListPageSize(Number(value));
            setImportListPage(1);
          }
        }}
        onReset={() => {
          setImportNameSearch('');
          setImportSkuSearch('');
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
            {hasDirectTarget ? (
              <span className='text-cyan-300'>
                {' '}
                · Exact target:{' '}
                {importDirectTargetType === 'sku'
                  ? `SKU ${normalizedDirectTargetValue}`
                  : `Base ID ${normalizedDirectTargetValue}`}
              </span>
            ) : null}
            {selectedImportCount > 0 ? (
              <span className='text-emerald-300'>
                {' '}
                ·{' '}
                {selectedImportCount === importListStats.filtered &&
                importListStats.filtered > visibleImportIds.length
                  ? `All ${selectedImportCount} matching products selected`
                  : `${selectedImportCount} products selected`}
              </span>
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
              onClick={() => toggleVisibleImportSelection(false)}
            >
              Deselect Page
            </button>
            <button
              type='button'
              className='hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50'
              onClick={() => {
                void handleSelectAllMatching();
              }}
              disabled={loadingAllMatchingSelection}
            >
              {loadingAllMatchingSelection
                ? 'Selecting...'
                : `Select All Pages (${importListStats.filtered})`}
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
