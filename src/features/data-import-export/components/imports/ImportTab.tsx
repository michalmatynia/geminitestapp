'use client';

import NextImage from 'next/image';

import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import type {
  CatalogOption,
  ImportListItem,
  InventoryOption,
  Template,
} from '@/features/data-import-export/types/imports';
import { Button, Input, Label, Checkbox, Pagination, SelectSimple } from '@/shared/ui';

export function ImportTab(): React.JSX.Element {
  const {
    inventories,
    isFetchingInventories: loadingInventories,
    inventoryId,
    setInventoryId,
    handleLoadInventories,
    handleClearInventory,
    limit,
    setLimit,
    catalogsData: catalogs,
    loadingCatalogs,
    catalogId,
    setCatalogId,
    importTemplateId,
    setImportTemplateId,
    importTemplates,
    loadingImportTemplates,
    imageMode,
    setImageMode,
    allowDuplicateSku,
    setAllowDuplicateSku,
    importing,
    handleImport,
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
    lastResult,
  } = useImportExport();

  const selectedImportCount = selectedImportIds.size;
  const allVisibleSelected = importList.length > 0 && importList.every((item: ImportListItem) => selectedImportIds.has(item.baseProductId));
  const isSomeVisibleSelected = importList.some((item: ImportListItem) => selectedImportIds.has(item.baseProductId)) && !allVisibleSelected;

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-white'>Base.com</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Connected via Integrations. Load inventories to start importing.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='flex h-2 w-2 rounded-full bg-green-500'></span>
            <span className='text-xs text-green-400'>Connected</span>
          </div>
        </div>

        <div className='mt-4 space-y-4'>
          <div className='flex flex-wrap items-end gap-3'>
            <Button
              onClick={(): void => {
                void handleLoadInventories();
              }}
              disabled={loadingInventories}
              className='mt-6'
            >
              {loadingInventories ? 'Loading...' : 'Load inventories'}
            </Button>
            <div className='flex-1 min-w-[200px]'>
              <Label className='text-xs text-gray-400'>Inventory</Label>
              <div className='mt-2'>
                <SelectSimple size='sm'
                  value={inventoryId}
                  onValueChange={setInventoryId}
                  disabled={inventories.length === 0}
                  options={inventories.map((inv: InventoryOption) => ({ value: inv.id, label: inv.name }))}
                  placeholder={inventories.length === 0 ? 'Load inventories first' : 'Select inventory'}
                  triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
                />
              </div>
            </div>
            <Button
              type='button'
              variant='secondary'
              onClick={(): void => {
                void handleClearInventory();
              }}
              disabled={!inventoryId}
              className='mt-6'
            >
              Clear inventory
            </Button>
            <div className='w-40'>
              <Label className='text-xs text-gray-400'>Limit</Label>
              <div className='mt-2'>
                <SelectSimple size='sm'
                  value={limit}
                  onValueChange={setLimit}
                  options={[
                    { value: '1', label: '1' },
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                    { value: 'all', label: 'All' }
                  ]}
                  triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
                />
              </div>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label className='text-xs text-gray-400'>Catalog</Label>
              <div className='mt-2'>
                <SelectSimple size='sm'
                  value={catalogId || '__none__'}
                  onValueChange={(v: string): void => setCatalogId(v === '__none__' ? '' : v)}
                  disabled={loadingCatalogs || catalogs.length === 0}
                  options={[
                    { value: '__none__', label: '— No catalog —' },
                    ...catalogs.map((cat: CatalogOption) => ({ value: cat.id, label: `${cat.name}${cat.isDefault ? ' (Default)' : ''}` }))
                  ]}
                  placeholder={loadingCatalogs ? 'Loading catalogs...' : 'No catalogs'}
                  triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
                />
              </div>
            </div>
            <div>
              <Label className='text-xs text-gray-400'>Import template</Label>
              <div className='mt-2'>
                <SelectSimple size='sm'
                  value={importTemplateId || '__none__'}
                  onValueChange={(v: string): void => setImportTemplateId(v === '__none__' ? '' : v)}
                  disabled={loadingImportTemplates || importTemplates.length === 0}
                  options={[
                    { value: '__none__', label: 'No template' },
                    ...importTemplates.map((template: Template) => ({ value: template.id, label: template.name }))
                  ]}
                  placeholder='No template'
                  triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
                />
              </div>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label className='text-xs text-gray-400'>Images</Label>
              <div className='mt-2'>
                <SelectSimple size='sm'
                  value={imageMode}
                  onValueChange={(v: string): void => setImageMode(v as 'links' | 'download')}
                  options={[
                    { value: 'links', label: 'Import image links' },
                    { value: 'download', label: 'Download product images' }
                  ]}
                  triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
                />
              </div>
              <p className='mt-2 text-xs text-gray-500'>
                Image links keep Base.com URLs. Download stores images in your
                uploads folder.
              </p>
            </div>
            <div>
              <Label className='text-xs text-gray-400'>SKU Handling</Label>
              <div className='mt-2 flex items-center gap-2'>
                <Checkbox
                  id='allowDuplicateSku'
                  checked={allowDuplicateSku}
                  onCheckedChange={(checked: boolean | 'indeterminate'): void =>
                    setAllowDuplicateSku(Boolean(checked))
                  }
                  className='h-4 w-4 rounded border bg-gray-900 text-blue-500'
                />
                <Label
                  htmlFor='allowDuplicateSku'
                  className='text-sm text-white'
                >
                  Allow duplicate SKUs
                </Label>
              </div>
              <p className='mt-2 text-xs text-gray-500'>
                When unchecked, products with existing SKUs will be skipped.
              </p>
            </div>
          </div>

          <div className='flex items-center justify-between gap-4'>
            <p className='text-xs text-gray-500'>
              Default catalog and price group must be configured before import.
            </p>
            <Button
              onClick={(): void => {
                void handleImport();
              }}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import products'}
            </Button>
          </div>
        </div>
      </div>

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h3 className='text-sm font-semibold text-white'>
              Import list preview
            </h3>
            <p className='mt-1 text-xs text-gray-400'>
              Compare Base products with existing records by Base ID.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              value={importNameSearch}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setImportNameSearch(event.target.value);
                setImportListPage(1);
              }}
              placeholder='Search name...'
              className='h-8 w-48 border-border bg-gray-900 text-xs text-white placeholder:text-gray-500'
            />
            <Input
              value={importSkuSearch}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setImportSkuSearch(event.target.value);
                setImportListPage(1);
              }}
              placeholder='Search SKU...'
              className='h-8 w-40 border-border bg-gray-900 text-xs text-white placeholder:text-gray-500'
            />
            <SelectSimple size='sm'
              value={uniqueOnly ? 'unique' : 'all'}
              onValueChange={(v: string): void => {
                setUniqueOnly(v === 'unique');
                setImportListPage(1);
              }}
              options={[
                { value: 'unique', label: 'Unique only' },
                { value: 'all', label: 'All products' }
              ]}
              className='w-32'
              triggerClassName='h-8 border-border bg-gray-900 text-xs text-white'
            />
            <SelectSimple size='sm'
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
                { value: '100', label: '100 / page' }
              ]}
              className='w-32'
              triggerClassName='h-8 border-border bg-gray-900 text-xs text-white'
            />
            <Button
              onClick={(): void => {
                void handleLoadImportList();
              }}
              disabled={loadingImportList}
            >
              {loadingImportList ? 'Loading...' : 'Load import list'}
            </Button>
          </div>
        </div>

        {importListStats ? (
          <div className='mt-3 flex items-center justify-between text-xs text-gray-400'>
            <div>
              Total: {importListStats.total} · Existing:{' '}
              {importListStats.existing} · Available:{' '}
              {importListStats.available ?? importListStats.filtered} · Showing:{' '}
              {importListStats.filtered} · Selected: {selectedImportCount}
              {importListStats.skuDuplicates ? (
                <span className='text-yellow-400'>
                  {' '}
                  · SKU duplicates: {importListStats.skuDuplicates}
                </span>
              ) : null}
            </div>
            <Pagination
              page={importListPage}
              totalPages={importListStats.totalPages ?? 1}
              onPageChange={setImportListPage}
              className='scale-90 origin-right'
            />
          </div>
        ) : null}

        {importList.length > 0 ? (
          <div className='mt-3 max-h-96 overflow-auto rounded-md border border-border/60 bg-card/20 p-0'>
            <div className='grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-border/60 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 sticky top-0 bg-card z-10'>
              <span className='flex items-center'>
                <Checkbox
                  aria-label='Select all visible products'
                  checked={
                    allVisibleSelected ||
                    (isSomeVisibleSelected && 'indeterminate')
                  }
                  onCheckedChange={(
                    checked: boolean | 'indeterminate',
                  ): void => {
                    if (checked) {
                      setSelectedImportIds((prev: Set<string>) => {
                        const next = new Set(prev);
                        importList.forEach((item: ImportListItem) => {
                          if (item.baseProductId) next.add(item.baseProductId);
                        });
                        return next;
                      });
                    } else {
                      setSelectedImportIds((prev: Set<string>) => {
                        const next = new Set(prev);
                        importList.forEach((item: ImportListItem) => {
                          if (item.baseProductId)
                            next.delete(item.baseProductId);
                        });
                        return next;
                      });
                    }
                  }}
                  className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
                />
              </span>
              <span>Img</span>
              <span>Base ID</span>
              <span>Product</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Status</span>
            </div>
            {importList.map((item: ImportListItem) => (
              <div
                key={item.baseProductId}
                className={`grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-gray-900/70 px-3 py-2 text-xs text-gray-300 last:border-b-0 items-center transition-colors ${
                  selectedImportIds.has(item.baseProductId)
                    ? 'bg-emerald-500/5'
                    : 'hover:bg-card/40'
                }`}
              >
                <Checkbox
                  checked={selectedImportIds.has(item.baseProductId)}
                  onCheckedChange={(
                    checked: boolean | 'indeterminate',
                  ): void => {
                    const isChecked = Boolean(checked);
                    setSelectedImportIds((prev: Set<string>) => {
                      const next = new Set(prev);
                      if (isChecked) {
                        next.add(item.baseProductId);
                      } else {
                        next.delete(item.baseProductId);
                      }
                      return next;
                    });
                  }}
                  className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
                  aria-label={`Select ${item.name}`}
                />
                <div className='relative h-10 w-10 overflow-hidden rounded bg-gray-900'>
                  {item.image ? (
                    <NextImage
                      src={item.image}
                      alt=''
                      fill
                      className='object-cover'
                      unoptimized={!item.image.includes('baselinker.com')}
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center text-[10px] text-gray-600'>
                      No img
                    </div>
                  )}
                </div>
                <span className='truncate text-gray-400 font-mono text-[11px]'>
                  {item.baseProductId}
                </span>
                <div className='min-w-0'>
                  <div className='truncate font-medium text-gray-200'>
                    {item.name}
                  </div>
                  {item.description && (
                    <div className='truncate text-[11px] text-gray-500'>
                      {item.description}
                    </div>
                  )}
                </div>
                <span
                  className={`truncate font-mono text-[11px] ${
                    item.skuExists ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                >
                  {item.sku ?? '—'}
                  {item.skuExists && (
                    <span className='ml-1' title='SKU already exists'>
                      ⚠
                    </span>
                  )}
                </span>
                <span className='truncate'>{item.price ?? 0}</span>
                <span className='truncate'>{item.stock ?? 0}</span>
                <span
                  className={`text-[11px] font-medium ${
                    item.exists
                      ? 'text-amber-400'
                      : item.skuExists
                        ? 'text-yellow-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {item.exists ? 'Exists' : item.skuExists ? 'SKU dup' : 'New'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className='mt-3 text-xs text-gray-500'>
            {importList.length > 0
              ? 'No matches for this search.'
              : 'No items loaded yet.'}
          </p>
        )}
      </div>

      {lastResult ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <h3 className='text-sm font-semibold text-white'>
            Last import summary
          </h3>
          <p className='mt-2 text-sm text-gray-300'>
            Imported {lastResult.imported} of {lastResult.total} product(s).
          </p>
          {lastResult.failed > 0 ? (
            <p className='mt-1 text-sm text-red-300'>
              {lastResult.failed} failed.
            </p>
          ) : null}
          {lastResult.errors?.length ? (
            <div className='mt-3 space-y-1 text-xs text-gray-400'>
              {lastResult.errors.map((entry: { productId?: string; sku?: string; error: string }, index: number) => (
                <p key={`${entry.productId ?? entry.sku ?? entry.error}-${index}`}>
                  • {entry.error}
                  {entry.sku ? ` (SKU: ${entry.sku})` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
