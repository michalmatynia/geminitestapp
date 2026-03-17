'use client';

import { ClipboardList, Download, Upload } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import React from 'react';

import { ExportBaseConfigSection } from '@/features/data-import-export/components/imports/sections/ExportBaseConfigSection';
import {
  ImportExportProvider,
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import {
  getDefaultImageRetryPresets,
  withImageRetryPresetLabels,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  BaseImportItemRecord,
  BaseImportPreflightIssue,
  CatalogOption,
  ImageRetryPreset,
  ImportListItem,
  InventoryOption,
  Template,
  WarehouseOption,
} from '@/shared/contracts/integrations';
import type { FilterField } from '@/shared/contracts/ui';
import { useCategoryMappingsByConnection } from '@/shared/hooks/useIntegrationQueries';
import { DOCUMENTATION_MODULE_IDS, getDocumentationTooltip } from '@/shared/lib/documentation';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DocumentationSection,
  FormField,
  FormSection,
  Hint,
  Input,
  Label,
  LoadingState,
  MetadataItem,
  Pagination,
  PanelFilters,
  SectionHeader,
  SelectSimple,
  StandardDataTablePanel,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleRow,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { TemplatesTabContent } from './imports/TemplatesTabContent';

import type { ColumnDef } from '@tanstack/react-table';

const BASE_CONNECTION_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select a connection...',
};

const NO_CATALOG_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: '— No catalog —',
};

const NO_TEMPLATE_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'No template',
};

const LIMIT_OPTIONS = [
  { value: '1', label: '1' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'all', label: 'All' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'1' | '5' | '10' | '50' | '100' | 'all'>>;

const IMAGE_MODE_OPTIONS = [
  { value: 'links', label: 'Import image links' },
  { value: 'download', label: 'Download product images' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'links' | 'download'>>;

const IMPORT_MODE_OPTIONS = [
  { value: 'upsert_on_base_id', label: 'Upsert by Base ID' },
  { value: 'upsert_on_sku', label: 'Upsert by SKU' },
  { value: 'create_only', label: 'Create only' },
] as const satisfies ReadonlyArray<
  LabeledOptionDto<'create_only' | 'upsert_on_base_id' | 'upsert_on_sku'>
>;

const IMPORT_LIST_MODE_OPTIONS: Array<LabeledOptionDto<'all' | 'unique'>> = [
  { value: 'all', label: 'All products' },
  { value: 'unique', label: 'Unique only' },
];

const IMPORT_LIST_PAGE_SIZE_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
];

const EXPORT_WAREHOUSE_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Skip stock export',
};

function ImportBaseConnectionSection(): React.JSX.Element {
  const {
    inventories,
    isFetchingInventories: loadingInventories,
    catalogsData: catalogs,
    loadingCatalogs,
    importTemplates,
    loadingImportTemplates,
    isBaseConnected,
    baseConnections,
  } = useImportExportData();
  const {
    inventoryId,
    setInventoryId,
    limit,
    setLimit,
    catalogId,
    setCatalogId,
    importTemplateId,
    setImportTemplateId,
    selectedBaseConnectionId,
    setSelectedBaseConnectionId,
    imageMode,
    setImageMode,
    importMode,
    setImportMode,
    importDryRun,
    setImportDryRun,
    allowDuplicateSku,
    setAllowDuplicateSku,
  } = useImportExportState();
  const {
    handleLoadInventories,
    handleClearInventory,
    savingDefaultConnection,
    handleSaveDefaultBaseConnection,
    importing,
    handleImport,
  } = useImportExportActions();
  const baseConnectionOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      BASE_CONNECTION_PLACEHOLDER_OPTION,
      ...baseConnections.map((connection) => ({
        value: connection.id,
        label: connection.name,
      })),
    ],
    [baseConnections]
  );
  const inventoryOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      inventories.map((inv: InventoryOption) => ({
        value: inv.id,
        label: inv.name,
      })),
    [inventories]
  );
  const catalogOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      NO_CATALOG_OPTION,
      ...catalogs.map((cat: CatalogOption) => ({
        value: cat.id,
        label: `${cat.name}${cat.isDefault ? ' (Default)' : ''}`,
      })),
    ],
    [catalogs]
  );
  const templateOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      NO_TEMPLATE_OPTION,
      ...importTemplates.map((template: Template) => ({
        value: template.id,
        label: template.name,
      })),
    ],
    [importTemplates]
  );

  return (
    <FormSection
      title='Base.com Connection'
      description='Connect to Base.com, load inventories, and configure import settings.'
      actions={
        <StatusBadge
          status={isBaseConnected ? 'Connected' : 'Disconnected'}
          variant={isBaseConnected ? 'success' : 'error'}
        />
      }
      className='p-6'
    >
      <div className='space-y-6'>
        <div className='grid gap-6 md:grid-cols-2'>
          <FormField
            label='Base Connection'
            description='Select which Base.com account to use for this import.'
          >
            <div className='space-y-3'>
              <SelectSimple
                size='sm'
                value={selectedBaseConnectionId || '__none__'}
                onValueChange={(v: string): void =>
                  setSelectedBaseConnectionId(v === '__none__' ? '' : v)
                }
                disabled={baseConnections.length === 0}
                options={baseConnectionOptions}
                placeholder={
                  baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'
                }
                ariaLabel={
                  baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'
                }
                title={
                  baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'
                }
              />
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={(): void => {
                  void handleSaveDefaultBaseConnection();
                }}
                disabled={!selectedBaseConnectionId}
                loading={savingDefaultConnection}
                loadingText='Saving...'
                className='w-full'
              >
                Set as default connection
              </Button>
            </div>
          </FormField>

          <FormField
            label='Inventory & Limits'
            description='Load and select an inventory to fetch products from.'
          >
            <div className='space-y-3'>
              <div className='flex gap-2'>
                <SelectSimple
                  size='sm'
                  value={inventoryId}
                  onValueChange={setInventoryId}
                  disabled={inventories.length === 0}
                  options={inventoryOptions}
                  placeholder={
                    inventories.length === 0 ? 'Load inventories first' : 'Select inventory'
                  }
                  ariaLabel={
                    inventories.length === 0 ? 'Load inventories first' : 'Select inventory'
                  }
                  title={inventories.length === 0 ? 'Load inventories first' : 'Select inventory'}
                />
                <Button
                  size='sm'
                  variant='outline'
                  className='whitespace-nowrap'
                  onClick={(): void => {
                    void handleLoadInventories();
                  }}
                  loading={loadingInventories}
                  loadingText='Loading...'
                >
                  Load inventories
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={(): void => {
                    handleClearInventory();
                  }}
                >
                  Clear
                </Button>
              </div>
              <FormField
                label='Limit'
                description='Max number of products to load (used by import list and import run).'
              >
                <SelectSimple
                  size='sm'
                  value={limit}
                  onValueChange={(v: string): void => setLimit(v)}
                  options={LIMIT_OPTIONS}
                />
              </FormField>
            </div>
          </FormField>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <FormField label='Catalog' description='Optional catalog override for import.'>
            <SelectSimple
              size='sm'
              value={catalogId}
              onValueChange={(v: string): void => setCatalogId(v === '__none__' ? '' : v)}
              options={catalogOptions}
              disabled={loadingCatalogs}
              placeholder={loadingCatalogs ? 'Loading catalogs...' : 'Select catalog'}
            />
          </FormField>
          <FormField label='Import template' description='Optional mapping template for import.'>
            <SelectSimple
              size='sm'
              value={importTemplateId}
              onValueChange={(v: string): void => setImportTemplateId(v === '__none__' ? '' : v)}
              options={templateOptions}
              disabled={loadingImportTemplates}
              placeholder={loadingImportTemplates ? 'Loading templates...' : 'Select template'}
            />
          </FormField>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <FormSection
            title='Import Mode'
            description='Choose how Base products should be matched.'
            className='p-4'
          >
            <SelectSimple
              size='sm'
              value={importMode}
              onValueChange={(v: string): void => setImportMode(v)}
              options={IMPORT_MODE_OPTIONS}
            />
            <Hint className='mt-2'>
              Upsert by Base ID will update existing products tied to a Base.com product id.
            </Hint>
          </FormSection>
          <FormSection
            title='Image Mode'
            description='Choose how to handle images for imported products.'
            className='p-4'
          >
            <SelectSimple
              size='sm'
              value={imageMode}
              onValueChange={(v: string): void => setImageMode(v)}
              options={IMAGE_MODE_OPTIONS}
            />
            <Hint className='mt-2'>
              Downloading images may take longer but ensures availability for AI processing.
            </Hint>
          </FormSection>
        </div>

        <Card className='border-border/60 bg-card/40 p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-sm font-semibold text-white'>Import Options</h3>
              <p className='text-xs text-gray-500'>
                Control execution behavior for this import run.
              </p>
            </div>
            <Button
              size='sm'
              onClick={(): void => {
                void handleImport();
              }}
              loading={importing}
              loadingText='Importing...'
            >
              Run import
            </Button>
          </div>
          <div className='mt-3 space-y-2'>
            <ToggleRow
              label='Dry run (do not write to database)'
              description='Fetch and validate import data without saving.'
              checked={importDryRun}
              onCheckedChange={setImportDryRun}
            />
            <ToggleRow
              label='Allow duplicate SKUs'
              description='If enabled, duplicates are allowed to import.'
              checked={allowDuplicateSku}
              onCheckedChange={setAllowDuplicateSku}
            />
          </div>
        </Card>
      </div>
    </FormSection>
  );
}

function ImportListPreviewSection(): React.JSX.Element {
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
          <div className='flex items-center gap-3'>
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

function ImportRunStatusSection(): React.JSX.Element | null {
  const { activeImportRun, loadingImportRun } = useImportExportData();
  const { importing, handleResumeImport, handleCancelImport, handleDownloadImportReport } =
    useImportExportActions();

  const activeRun = activeImportRun?.run ?? null;
  const activeRunStats = activeRun?.stats ?? null;

  const runHasRetryableItems = React.useMemo(
    (): boolean =>
      Boolean(
        activeImportRun?.items.some(
          (item: BaseImportItemRecord) => item.status === 'failed' || item.status === 'pending'
        )
      ),
    [activeImportRun?.items]
  );

  const runErrorItems = React.useMemo(
    () =>
      (activeImportRun?.items ?? [])
        .filter((item: BaseImportItemRecord) => item.status === 'failed' || item.errorMessage)
        .slice(0, 10),
    [activeImportRun?.items]
  );

  const activeRunParameterImportSummary = React.useMemo(() => {
    const fromRun = activeRun?.stats?.parameterImportSummary;
    if (
      fromRun &&
      (fromRun.itemsApplied > 0 ||
        fromRun.extracted > 0 ||
        fromRun.resolved > 0 ||
        fromRun.created > 0 ||
        fromRun.written > 0)
    ) {
      return fromRun;
    }
    const items = activeImportRun?.items ?? [];
    if (items.length === 0) return null;
    const aggregated = items.reduce(
      (
        acc: {
          itemsApplied: number;
          extracted: number;
          resolved: number;
          created: number;
          written: number;
        },
        item: BaseImportItemRecord
      ) => {
        const summary = item.parameterImportSummary;
        if (!summary) return acc;
        const extracted =
          typeof summary.extracted === 'number' && Number.isFinite(summary.extracted)
            ? Math.max(0, Math.floor(summary.extracted))
            : 0;
        const resolved =
          typeof summary.resolved === 'number' && Number.isFinite(summary.resolved)
            ? Math.max(0, Math.floor(summary.resolved))
            : 0;
        const created =
          typeof summary.created === 'number' && Number.isFinite(summary.created)
            ? Math.max(0, Math.floor(summary.created))
            : 0;
        const written =
          typeof summary.written === 'number' && Number.isFinite(summary.written)
            ? Math.max(0, Math.floor(summary.written))
            : 0;
        return {
          itemsApplied: acc.itemsApplied + 1,
          extracted: acc.extracted + extracted,
          resolved: acc.resolved + resolved,
          created: acc.created + created,
          written: acc.written + written,
        };
      },
      {
        itemsApplied: 0,
        extracted: 0,
        resolved: 0,
        created: 0,
        written: 0,
      }
    );
    if (
      aggregated.itemsApplied === 0 &&
      aggregated.extracted === 0 &&
      aggregated.resolved === 0 &&
      aggregated.created === 0 &&
      aggregated.written === 0
    ) {
      return null;
    }
    return aggregated;
  }, [activeImportRun?.items, activeRun?.stats?.parameterImportSummary]);

  const parameterSyncHistoryItems = React.useMemo(
    () =>
      (activeImportRun?.items ?? [])
        .filter((item: BaseImportItemRecord) => Boolean(item.parameterImportSummary))
        .sort((a: BaseImportItemRecord, b: BaseImportItemRecord) => {
          const aTime = Date.parse(a.finishedAt ?? a.updatedAt ?? '');
          const bTime = Date.parse(b.finishedAt ?? b.updatedAt ?? '');
          if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
          if (!Number.isFinite(aTime)) return 1;
          if (!Number.isFinite(bTime)) return -1;
          return bTime - aTime;
        })
        .slice(0, 8),
    [activeImportRun?.items]
  );

  if (!activeRun) return null;

  return (
    <FormSection
      title='Import run'
      subtitle={activeRun.id}
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <StatusBadge status={activeRun.status} className='font-bold' />
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleResumeImport();
            }}
            disabled={!runHasRetryableItems || importing}
          >
            Resume failed
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleCancelImport();
            }}
            disabled={
              !(activeRun.status === 'queued' || activeRun.status === 'running') || importing
            }
          >
            Cancel run
          </Button>
          <Button type='button' variant='secondary' size='sm' onClick={handleDownloadImportReport}>
            Download report
          </Button>
        </div>
      }
    >
      {activeRunStats ? (
        <p className='mt-1 text-sm text-gray-300'>
          Total {activeRunStats.total} · Imported {activeRunStats.imported} · Updated{' '}
          {activeRunStats.updated} · Skipped {activeRunStats.skipped} · Failed{' '}
          {activeRunStats.failed} · Pending {activeRunStats.pending}
        </p>
      ) : null}
      {activeRunParameterImportSummary ? (
        <div className='mt-3 rounded-md border border-border/60 bg-gray-950/30 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-gray-300'>
              Parameter sync
            </p>
            <span className='text-[11px] text-gray-400'>
              Items applied: {activeRunParameterImportSummary.itemsApplied}
            </span>
          </div>
          <p className='mt-1 text-xs text-gray-300'>
            Extracted {activeRunParameterImportSummary.extracted} · Resolved{' '}
            {activeRunParameterImportSummary.resolved} · Created{' '}
            {activeRunParameterImportSummary.created} · Written{' '}
            {activeRunParameterImportSummary.written}
          </p>
          {parameterSyncHistoryItems.length > 0 ? (
            <div className='mt-2 space-y-1'>
              {parameterSyncHistoryItems.map((item: BaseImportItemRecord) => (
                <p
                  key={`${item.itemId}-${item.attempt}-parameter-sync`}
                  className='text-[11px] text-gray-400 font-mono truncate'
                >
                  {item.itemId}
                  {item.sku ? ` (${item.sku})` : ''} · e:
                  {item.parameterImportSummary?.extracted ?? 0} · r:
                  {item.parameterImportSummary?.resolved ?? 0} · c:
                  {item.parameterImportSummary?.created ?? 0} · w:
                  {item.parameterImportSummary?.written ?? 0}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {activeRun.summaryMessage ? (
        <p className='mt-2 text-xs text-gray-400'>{activeRun.summaryMessage}</p>
      ) : null}
      {loadingImportRun ? <Hint className='mt-2'>Refreshing run status...</Hint> : null}
      {runErrorItems.length > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {runErrorItems.map((item: BaseImportItemRecord) => (
            <p key={`${item.itemId}-${item.attempt}`}>
              • {item.errorMessage || 'Import failed'}
              {item.sku ? ` (SKU: ${item.sku})` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </FormSection>
  );
}

function ImportLastResultSection(): React.JSX.Element | null {
  const { lastResult, activeImportRunId } = useImportExportData();

  if (!lastResult) return null;

  return (
    <FormSection title='Last import summary' className='p-4'>
      <div className='flex items-center gap-2 mt-1'>
        <span className='text-sm text-gray-300'>Run {lastResult.runId} is</span>
        <StatusBadge status={lastResult.status} className='font-bold' />
      </div>
      {lastResult.summaryMessage ? (
        <p className='mt-1 text-xs text-gray-400'>{lastResult.summaryMessage}</p>
      ) : null}
      {(lastResult.preflight?.issues?.length ?? 0) > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {lastResult.preflight?.issues?.map((issue: BaseImportPreflightIssue, index: number) => (
            <p key={`${issue.code}-${index}`}>• {issue.message}</p>
          ))}
        </div>
      ) : null}
      {activeImportRunId ? (
        <Hint className='mt-2 font-mono'>Active run: {activeImportRunId}</Hint>
      ) : null}
    </FormSection>
  );
}

function ImportTab(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <ImportBaseConnectionSection />
      <ImportListPreviewSection />
      <ImportRunStatusSection />
      <ImportLastResultSection />
    </div>
  );
}

function ExportCategoryStatusSection(): React.JSX.Element {
  const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set(['categoryid', 'category_id', 'category']);

  const { selectedBaseConnectionId, exportTemplateMappings } = useImportExportState();

  const usesCategoryMapper = React.useMemo(
    (): boolean =>
      exportTemplateMappings.some((mapping) =>
        CATEGORY_TEMPLATE_PRODUCT_FIELDS.has(mapping.targetField.trim().toLowerCase())
      ),
    [exportTemplateMappings]
  );

  const categoryMappingsQuery = useCategoryMappingsByConnection(selectedBaseConnectionId, {
    enabled: usesCategoryMapper && !!selectedBaseConnectionId,
  });

  const activeCategoryMappings = React.useMemo(
    () => (categoryMappingsQuery.data ?? []).filter((mapping) => mapping.isActive),
    [categoryMappingsQuery.data]
  );

  const mappedInternalCategoryCount = React.useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.internalCategoryId)).size,
    [activeCategoryMappings]
  );

  const mappedExternalCategoryCount = React.useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.externalCategoryId)).size,
    [activeCategoryMappings]
  );

  return (
    <div className='rounded-md border border-border/60 bg-card/30 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <Hint size='xs' uppercase className='font-semibold text-gray-300'>
            Category Mapping Status
          </Hint>
          <p className='mt-1 text-xs text-gray-500'>
            Pre-export validation for template category field mapping.
          </p>
        </div>
        {!usesCategoryMapper ? (
          <Badge variant='neutral' className='text-[11px] font-normal'>
            Not used by template
          </Badge>
        ) : !selectedBaseConnectionId ? (
          <Badge variant='warning' className='text-[11px] font-normal'>
            Select connection
          </Badge>
        ) : categoryMappingsQuery.isLoading ? (
          <Badge variant='info' className='text-[11px] font-normal'>
            Checking mappings...
          </Badge>
        ) : activeCategoryMappings.length > 0 ? (
          <Badge variant='success' className='text-[11px] font-normal'>
            Ready
          </Badge>
        ) : (
          <Badge variant='error' className='text-[11px] font-normal'>
            Missing mappings
          </Badge>
        )}
      </div>
      <div className='mt-2 text-xs text-gray-400'>
        {!usesCategoryMapper ? (
          <span>Current export template does not map product category field (`categoryId`).</span>
        ) : !selectedBaseConnectionId ? (
          <span>Select a Base connection to validate category mappings.</span>
        ) : categoryMappingsQuery.isError ? (
          <span>Failed to load category mappings for this connection.</span>
        ) : activeCategoryMappings.length === 0 ? (
          <span>
            No active mappings found for this connection. Add mappings in{' '}
            <Link
              href='/admin/integrations/aggregators/base-com/category-mapping'
              className='text-amber-300 underline'
            >
              Category Mapper
            </Link>
            .
          </span>
        ) : (
          <span>
            Found {activeCategoryMappings.length} active mapping(s), {mappedInternalCategoryCount}{' '}
            internal category(ies) and {mappedExternalCategoryCount} Base category(ies).
          </span>
        )}
      </div>
    </div>
  );
}

function ExportWarehouseConfigSection(): React.JSX.Element {
  const { warehouses: warehouseOptions, allWarehouses, warehouses } = useImportExportData();
  const {
    exportWarehouseId,
    setExportWarehouseId,
    showAllWarehouses,
    setShowAllWarehouses,
    exportStockFallbackEnabled,
    setExportStockFallbackEnabled,
  } = useImportExportState();

  const exportStockFallbackLoaded = true;
  const inventoryWarehouseIds = new Set(warehouses.map((w: WarehouseOption) => w.id));
  const warehouseSelectOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      EXPORT_WAREHOUSE_PLACEHOLDER_OPTION,
      ...warehouseOptions.map((warehouse: WarehouseOption) => ({
        value: warehouse.id,
        label: `${warehouse.name} (${warehouse.id})${
          showAllWarehouses && !inventoryWarehouseIds.has(warehouse.id)
            ? ' (not in inventory)'
            : ''
        }`,
      })),
    ],
    [inventoryWarehouseIds, showAllWarehouses, warehouseOptions]
  );

  return (
    <div>
      <Label className='text-xs text-gray-400'>Default Warehouse ID</Label>
      <div className='mt-2'>
        <SelectSimple
          size='sm'
          value={exportWarehouseId || '__none__'}
          onValueChange={(v: string): void => setExportWarehouseId(v === '__none__' ? '' : v)}
          disabled={warehouseOptions.length === 0}
          options={warehouseSelectOptions}
          placeholder={
            warehouseOptions.length === 0 ? 'Load warehouses first' : 'Skip stock export'
          }
          triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
          ariaLabel={
            warehouseOptions.length === 0 ? 'Load warehouses first' : 'Skip stock export'
          }
          title={warehouseOptions.length === 0 ? 'Load warehouses first' : 'Skip stock export'}
        />
      </div>
      <p className='mt-1 text-xs text-gray-500'>
        Used for exporting stock quantities to Base.com. Leave blank to skip stock.
      </p>
      <div className='mt-3 flex items-center gap-2 text-xs text-gray-400'>
        <Checkbox
          id='exportStockFallback'
          checked={exportStockFallbackEnabled}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setExportStockFallbackEnabled(Boolean(checked))
          }
          disabled={!exportStockFallbackLoaded}
          className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
        />
        <Label htmlFor='exportStockFallback'>
          Skip stock when Base rejects the warehouse (allow listing)
        </Label>
      </div>
      {allWarehouses.length > 0 && allWarehouses.length > warehouses.length ? (
        <div className='mt-2 flex items-center gap-2 text-xs text-gray-400'>
          <Checkbox
            id='showAllWarehouses'
            checked={showAllWarehouses}
            onCheckedChange={(checked: boolean | 'indeterminate'): void =>
              setShowAllWarehouses(Boolean(checked))
            }
            className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
          />
          <Label htmlFor='showAllWarehouses'>
            Show all warehouses (may include ones not assigned to the inventory)
          </Label>
        </div>
      ) : null}
    </div>
  );
}

function ExportImageRetryPresetsSection(): React.JSX.Element {
  const { imageRetryPresets, setImageRetryPresets } = useImportExportState();

  const imageRetryPresetsLoaded = true;

  const updateImageRetryPreset = (
    presetId: string,
    update: Partial<ImageRetryPreset['transform']>
  ): void => {
    setImageRetryPresets((prev: ImageRetryPreset[]) =>
      prev.map((preset: ImageRetryPreset) => {
        if (preset.id !== presetId) return preset;
        const nextPreset = withImageRetryPresetLabels({
          ...preset,
          transform: {
            ...preset.transform,
            ...update,
          },
        });
        return nextPreset;
      })
    );
  };

  const handleResetImageRetryPresets = (): void => {
    setImageRetryPresets(getDefaultImageRetryPresets());
  };

  return (
    <Card className='border-border/60 bg-card/40 p-4'>
      <SectionHeader
        title='Image retry presets'
        description='Used by Retry image export and Re-export images only actions.'
        size='xs'
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleResetImageRetryPresets}
            disabled={!imageRetryPresetsLoaded}
          >
            Reset defaults
          </Button>
        }
      />
      {!imageRetryPresetsLoaded ? (
        <Hint className='mt-3'>Loading presets...</Hint>
      ) : (
        <div className='mt-3 space-y-3'>
          {imageRetryPresets.map((preset: ImageRetryPreset) => (
            <div key={preset.id} className='rounded-md border border-border/60 bg-card/30 p-3'>
              <div className='text-xs font-semibold text-gray-200'>{preset.name}</div>
              <Hint className='mt-1'>{preset.description}</Hint>
              <div className='mt-2 grid gap-3 md:grid-cols-2'>
                <FormField label='Max dimension (px)'>
                  <Input
                    type='number'
                    min={1}
                    value={preset.transform?.maxDimension ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const raw = event.target.value;
                      updateImageRetryPreset(preset.id, {
                        maxDimension: raw ? Number(raw) : undefined,
                        width: raw ? Number(raw) : undefined,
                        height: raw ? Number(raw) : undefined,
                      });
                    }}
                    className='h-8'
                    aria-label='Max dimension (px)'
                    title='Max dimension (px)'
                  />
                </FormField>
                <FormField label='JPEG quality'>
                  <Input
                    type='number'
                    min={10}
                    max={100}
                    value={preset.transform?.jpegQuality ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const raw = event.target.value;
                      updateImageRetryPreset(preset.id, {
                        jpegQuality: raw ? Number(raw) : undefined,
                        quality: raw ? Number(raw) : undefined,
                      });
                    }}
                    className='h-8'
                    aria-label='JPEG quality'
                    title='JPEG quality'
                  />
                </FormField>
              </div>
              <ToggleRow
                label='Force JPEG conversion'
                checked={preset.transform?.forceJpeg ?? true}
                onCheckedChange={(checked: boolean) =>
                  updateImageRetryPreset(preset.id, { forceJpeg: checked })
                }
                className='mt-2 border-none bg-transparent hover:bg-transparent p-0'
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExportQuickActionsSection(): React.JSX.Element {
  const {
    exportInventoryId,
    includeAllWarehouses,
    setIncludeAllWarehouses,
    debugWarehouses,
    setDebugWarehouses,
  } = useImportExportState();
  const { isFetchingInventories: loadingInventories, isFetchingWarehouses: loadingWarehouses } =
    useImportExportData();
  const {
    handleLoadInventories,
    handleLoadWarehouses,
    handleSaveExportSettings,
    savingExportSettings,
  } = useImportExportActions();

  const loadingDebugWarehouses = false;

  const handleDebugWarehouses = (): void => {
    // Not implemented in context yet, but can be added if needed
  };

  return (
    <>
      <Card className='border-border/60 bg-card/40 p-4'>
        <SectionHeader title='Quick Actions' size='xs' className='mb-3' />
        <div className='flex flex-wrap gap-3'>
          <Button
            onClick={(): void => {
              handleLoadInventories().catch(() => {});
            }}
            loading={loadingInventories}
            loadingText='Loading Inventories...'
            variant='outline'
            size='sm'
          >
            Load Inventories
          </Button>
          <Button
            onClick={(): void => {
              handleLoadWarehouses().catch(() => {});
            }}
            loading={loadingWarehouses}
            loadingText='Loading Warehouses...'
            variant='outline'
            size='sm'
          >
            Load Warehouses
          </Button>
          <Button
            onClick={(): void => {
              handleDebugWarehouses();
            }}
            loading={loadingDebugWarehouses}
            loadingText='Debugging...'
            variant='outline'
            size='sm'
          >
            Debug Warehouses
          </Button>
          <ToggleRow
            label='Try loading global warehouses (if supported)'
            checked={includeAllWarehouses}
            onCheckedChange={setIncludeAllWarehouses}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
          <Button
            onClick={(): void => {
              handleSaveExportSettings().catch(() => {});
            }}
            loading={savingExportSettings}
            loadingText='Saving...'
            size='sm'
          >
            Save Export Settings
          </Button>
          <Link href='/admin/ai-paths/queue?tab=paths-external#export-jobs'>
            <Button variant='outline' size='sm'>
              View Export Jobs
            </Button>
          </Link>
          <Link href='/admin/products'>
            <Button variant='outline' size='sm'>
              Go to Products
            </Button>
          </Link>
        </div>
      </Card>

      {debugWarehouses ? (
        <Card className='border-border bg-card/60 p-3 text-xs text-gray-300'>
          <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
            <span className='font-semibold text-gray-200'>Warehouse debug (raw IDs)</span>
            <Button
              type='button'
              variant='ghost'
              size='xs'
              onClick={(): void => setDebugWarehouses(null)}
              className='text-[11px] uppercase tracking-wide text-gray-500 hover:text-gray-200'
            >
              Clear
            </Button>
          </div>
          <div className='mt-2 space-y-4'>
            <div>
              <Hint uppercase className='mb-1'>
                Selected inventory raw response
              </Hint>
              {debugWarehouses.inventoriesRaw ? (
                <div className='mt-1 space-y-1'>
                  <MetadataItem
                    variant='minimal'
                    label='Method'
                    value={debugWarehouses.inventoriesRaw.method}
                  />
                  <MetadataItem
                    variant='minimal'
                    label='Status'
                    value={debugWarehouses.inventoriesRaw.statusCode}
                  />
                  <MetadataItem
                    variant='minimal'
                    label='Ok'
                    value={debugWarehouses.inventoriesRaw.ok ? 'true' : 'false'}
                  />
                  {debugWarehouses.inventoriesRaw.error ? (
                    <MetadataItem
                      variant='minimal'
                      label='Error'
                      value={debugWarehouses.inventoriesRaw.error}
                      valueClassName='text-red-400'
                    />
                  ) : null}
                  {((): React.JSX.Element | null => {
                    const payload = debugWarehouses.inventoriesRaw?.payload as
                      | { inventories?: Array<Record<string, unknown>> }
                      | null
                      | undefined;
                    const inventories = payload?.inventories;
                    if (!Array.isArray(inventories)) return null;
                    const match = inventories.find((inv: Record<string, unknown>) => {
                      if (!inv || typeof inv !== 'object') return false;
                      const inventoryId = inv['inventory_id'];
                      return (
                        exportInventoryId &&
                        (typeof inventoryId === 'string' || typeof inventoryId === 'number') &&
                        String(inventoryId) === exportInventoryId
                      );
                    });
                    if (!match) {
                      return (
                        <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300 mt-2'>
                          Selected inventory not found in response.
                        </div>
                      );
                    }
                    return (
                      <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300 mt-2'>
                        <Hint size='xxs' uppercase className='text-gray-500 mb-1'>
                          Selected inventory details
                        </Hint>
                        <pre className='whitespace-pre-wrap font-mono'>
                          {JSON.stringify(match, null, 2)}
                        </pre>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <Hint italic>No raw response.</Hint>
              )}
            </div>
            <div>
              <Hint uppercase className='mb-1'>
                Inventory warehouses raw response
              </Hint>
              {debugWarehouses.inventoryRaw ? (
                <div className='mt-1 space-y-1'>
                  <MetadataItem
                    variant='minimal'
                    label='Inventory ID'
                    value={exportInventoryId || '—'}
                  />
                  <MetadataItem
                    variant='minimal'
                    label='Method'
                    value={debugWarehouses.inventoryRaw.method}
                  />
                  <MetadataItem
                    variant='minimal'
                    label='Status'
                    value={debugWarehouses.inventoryRaw.statusCode}
                  />
                  <MetadataItem
                    variant='minimal'
                    label='Ok'
                    value={debugWarehouses.inventoryRaw.ok ? 'true' : 'false'}
                  />
                  {debugWarehouses.inventoryRaw.error ? (
                    <MetadataItem
                      variant='minimal'
                      label='Error'
                      value={debugWarehouses.inventoryRaw.error}
                      valueClassName='text-red-400'
                    />
                  ) : null}
                  <pre className='mt-2 max-h-64 overflow-auto rounded border border-border bg-card p-2 text-[10px] text-gray-300 font-mono'>
                    {debugWarehouses.inventoryRaw.payload
                      ? JSON.stringify(debugWarehouses.inventoryRaw.payload, null, 2)
                      : 'No payload returned.'}
                  </pre>
                </div>
              ) : (
                <Hint italic>No raw response.</Hint>
              )}
            </div>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function ExportTab(): React.JSX.Element {
  return (
    <Card className='border-border/60 bg-card/40 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-white'>Base.com Export Settings</h2>
          <p className='mt-1 text-sm text-gray-400'>
            Configure default export settings for Base.com product listings
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='flex h-2 w-2 rounded-full bg-green-500'></span>
          <span className='text-xs text-green-400'>Connected</span>
        </div>
      </div>

      <div className='mt-6 space-y-4'>
        <ExportBaseConfigSection />

        <ExportCategoryStatusSection />

        <ExportWarehouseConfigSection />

        <ExportImageRetryPresetsSection />

        <DocumentationSection
          title='Export Guidelines'
          className='border-blue-900/50 bg-blue-900/20'
        >
          <ul className='list-disc space-y-1 pl-5 text-xs text-blue-300/70'>
            <li>Exports use templates to map internal product fields to Base.com API parameters</li>
            <li>
              Without a template, default field mappings are used (SKU, Name, Price, Stock, etc.)
            </li>
            <li>Import and export templates are managed separately in the Templates tab</li>
            <li>
              Export to Base.com from Product List → Integrations → List Products → Select Base.com
            </li>
            <li>
              Track export jobs in the{' '}
              <Link
                href='/admin/ai-paths/queue?tab=paths-external#export-jobs'
                className='text-blue-400 underline'
              >
                Job Queue → External Runs
              </Link>{' '}
              tab
            </li>
          </ul>
        </DocumentationSection>

        <ExportQuickActionsSection />
      </div>
    </Card>
  );
}

function ImportsPageContent(): React.JSX.Element {
  const { checkingIntegration, isBaseConnected } = useImportExportData();

  if (checkingIntegration) {
    return (
      <div className='page-section w-full'>
        <LoadingState
          message='Checking Base.com integration status...'
          className='bg-card/40 border border-border/60 rounded-lg h-64'
        />
      </div>
    );
  }
  if (!isBaseConnected) {
    return (
      <div className='page-section w-full'>
        <Card variant='warning' padding='lg'>
          <h3 className='text-lg font-bold mb-2 text-amber-300'>Base.com integration required</h3>
          <p className='text-sm text-amber-300'>
            Please configure your Base.com API connection in the Integrations settings before using
            import/export tools.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className='page-section space-y-6'>
      <SectionHeader
        title='Product Import/Export'
        subtitle={
          <nav
            aria-label='Breadcrumb'
            className='flex flex-wrap items-center gap-1 text-xs text-gray-400'
          >
            <Link href='/admin' className='hover:text-gray-200 transition-colors'>
              Admin
            </Link>
            <span>/</span>
            <Link href='/admin/integrations' className='hover:text-gray-200 transition-colors'>
              Integrations
            </Link>
            <span>/</span>
            <span className='text-gray-300'>Imports</span>
          </nav>
        }
      />

      <Tabs defaultValue='imports' className='w-full'>
        <TabsList className='bg-muted/40 p-1' aria-label='Import export tabs'>
          <TabsTrigger value='imports' className='gap-2'>
            <Download className='size-3.5' />
            Imports
          </TabsTrigger>
          <TabsTrigger value='exports' className='gap-2'>
            <Upload className='size-3.5' />
            Exports
          </TabsTrigger>
          <TabsTrigger value='templates' className='gap-2'>
            <ClipboardList className='size-3.5' />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value='imports' className='mt-6 outline-none'>
          <ImportTab />
        </TabsContent>

        <TabsContent value='exports' className='mt-6 outline-none'>
          <ExportTab />
        </TabsContent>

        <TabsContent value='templates' className='mt-6 outline-none'>
          <TemplatesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ImportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ImportsPageContent />
    </ImportExportProvider>
  );
}
