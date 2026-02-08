'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import type {
  InventoryOption,
  Template,
  WarehouseOption,
  ImageRetryPreset,
} from '@/features/data-import-export/types/imports';
import {
  getDefaultImageRetryPresets,
  withImageRetryPresetLabels,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { IntegrationConnectionBasic } from '@/features/integrations';
import { useCategoryMappingsByConnection } from '@/features/integrations/hooks/useMarketplaceQueries';
import { Button, Input, Checkbox, Label, UnifiedSelect, SectionPanel } from '@/shared/ui';

export function ExportTab(): React.JSX.Element {
  const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set([
    'categoryid',
    'category_id',
    'category',
  ]);

  const {
    baseConnections,
    selectedBaseConnectionId,
    setSelectedBaseConnectionId,
    inventories,
    exportInventoryId,
    setExportInventoryId,
    exportActiveTemplateId,
    setExportActiveTemplateId,
    exportTemplates,
    exportTemplateMappings,
    loadingExportTemplates,
    applyTemplate,
    exportWarehouseId,
    setExportWarehouseId,
    warehouses: warehouseOptions,
    showAllWarehouses,
    setShowAllWarehouses,
    exportStockFallbackEnabled,
    setExportStockFallbackEnabled,
    allWarehouses,
    warehouses,
    imageRetryPresets,
    setImageRetryPresets,
    handleLoadInventories,
    isFetchingInventories: loadingInventories,
    handleLoadWarehouses,
    isFetchingWarehouses: loadingWarehouses,
    includeAllWarehouses,
    setIncludeAllWarehouses,
    handleSaveExportSettings,
    savingExportSettings,
    debugWarehouses,
    setDebugWarehouses,
  } = useImportExport();

  const usesCategoryMapper = useMemo(
    (): boolean =>
      exportTemplateMappings.some((mapping) =>
        CATEGORY_TEMPLATE_PRODUCT_FIELDS.has(mapping.targetField.trim().toLowerCase())
      ),
    [exportTemplateMappings]
  );

  const categoryMappingsQuery = useCategoryMappingsByConnection(selectedBaseConnectionId, {
    enabled: usesCategoryMapper && !!selectedBaseConnectionId,
  });
  const activeCategoryMappings = useMemo(
    () =>
      (categoryMappingsQuery.data ?? []).filter(
        (mapping) => mapping.isActive
      ),
    [categoryMappingsQuery.data]
  );
  const mappedInternalCategoryCount = useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.internalCategoryId)).size,
    [activeCategoryMappings]
  );
  const mappedExternalCategoryCount = useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.externalCategoryId)).size,
    [activeCategoryMappings]
  );

  const exportStockFallbackLoaded = true;
  const imageRetryPresetsLoaded = true;
  const loadingDebugWarehouses = false;
  const inventoryWarehouseIds = new Set(warehouses.map((w: WarehouseOption) => w.id));

  const handleDebugWarehouses = (): void => {
    // Not implemented in context yet, but can be added if needed
  };

  const updateImageRetryPreset = (
    presetId: string,
    update: Partial<ImageRetryPreset['transform']>,
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
      }),
    );
  };

  const handleResetImageRetryPresets = (): void => {
    setImageRetryPresets(getDefaultImageRetryPresets());
  };

  return (
    <SectionPanel variant='subtle' className='p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-white'>
            Base.com Export Settings
          </h2>
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
        <div className='grid grid-cols-2 gap-4'>
          <div className='col-span-2'>
            <Label className='text-xs text-gray-400'>
              Base connection for inventories/warehouses
            </Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={selectedBaseConnectionId || '__none__'}
                onValueChange={(v: string): void => setSelectedBaseConnectionId(v === '__none__' ? '' : v)}
                disabled={baseConnections.length === 0}
                options={[
                  { value: '__none__', label: 'Select a connection...' },
                  ...baseConnections.map((connection: IntegrationConnectionBasic) => ({ value: connection.id, label: connection.name }))
                ]}
                placeholder={baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'}
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
              />
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              Used for loading inventories/warehouses and debug output.
            </p>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Default Inventory</Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={exportInventoryId || '__none__'}
                onValueChange={(v: string): void => setExportInventoryId(v === '__none__' ? '' : v)}
                disabled={inventories.length === 0 && !exportInventoryId}
                options={[
                  { value: '__none__', label: 'Select default inventory...' },
                  ...inventories.map((inv: InventoryOption) => ({ value: inv.id, label: inv.name }))
                ]}
                placeholder={inventories.length === 0 ? (exportInventoryId ? `Saved inventory (${exportInventoryId})` : 'No inventories loaded') : 'Select default inventory...'}
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
              />
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              Default inventory for product exports
            </p>
          </div>

          <div>
            <Label className='text-xs text-gray-400'>
              Default Export Template
            </Label>
            <div className='mt-2'>
              <UnifiedSelect
                value={exportActiveTemplateId || '__none__'}
                onValueChange={(nextId: string): void => {
                  const val = nextId === '__none__' ? '' : nextId;
                  const selected = exportTemplates.find(
                    (template: Template) => template.id === val,
                  );
                  if (selected) {
                    applyTemplate(selected, 'export');
                  } else {
                    setExportActiveTemplateId(val);
                  }
                }}
                disabled={loadingExportTemplates || exportTemplates.length === 0}
                options={[
                  { value: '__none__', label: 'No template (use defaults)' },
                  ...exportTemplates.map((tpl: Template) => ({ value: tpl.id, label: tpl.name }))
                ]}
                placeholder='No template (use defaults)'
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
              />
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              Template for field mapping on export
            </p>
          </div>
        </div>

        <SectionPanel variant='subtle' className='border border-border/70 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-xs font-semibold uppercase tracking-wide text-gray-300'>
                Category Mapping Status
              </div>
              <p className='mt-1 text-xs text-gray-500'>
                Pre-export validation for template category field mapping.
              </p>
            </div>
            {!usesCategoryMapper ? (
              <span className='rounded border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-[11px] text-slate-200'>
                Not used by template
              </span>
            ) : !selectedBaseConnectionId ? (
              <span className='rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
                Select connection
              </span>
            ) : categoryMappingsQuery.isLoading ? (
              <span className='rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200'>
                Checking mappings...
              </span>
            ) : activeCategoryMappings.length > 0 ? (
              <span className='rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200'>
                Ready
              </span>
            ) : (
              <span className='rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200'>
                Missing mappings
              </span>
            )}
          </div>
          <div className='mt-2 text-xs text-gray-400'>
            {!usesCategoryMapper ? (
              <span>
                Current export template does not map product category field (`categoryId`).
              </span>
            ) : !selectedBaseConnectionId ? (
              <span>Select a Base connection to validate category mappings.</span>
            ) : categoryMappingsQuery.isError ? (
              <span>
                Failed to load category mappings for this connection.
              </span>
            ) : activeCategoryMappings.length === 0 ? (
              <span>
                No active mappings found for this connection. Add mappings in{' '}
                <Link href='/admin/integrations/marketplaces/category-mapper' className='text-amber-300 underline'>
                  Category Mapper
                </Link>
                .
              </span>
            ) : (
              <span>
                Found {activeCategoryMappings.length} active mapping(s),{' '}
                {mappedInternalCategoryCount} internal category(ies) and{' '}
                {mappedExternalCategoryCount} Base category(ies).
              </span>
            )}
          </div>
        </SectionPanel>

        <div>
          <Label className='text-xs text-gray-400'>Default Warehouse ID</Label>
          <div className='mt-2'>
            <UnifiedSelect
              value={exportWarehouseId || '__none__'}
              onValueChange={(v: string): void => setExportWarehouseId(v === '__none__' ? '' : v)}
              disabled={warehouseOptions.length === 0}
              options={[
                { value: '__none__', label: 'Skip stock export' },
                ...warehouseOptions.map((warehouse: WarehouseOption) => ({
                  value: warehouse.id,
                  label: `${warehouse.name} (${warehouse.id})${showAllWarehouses && !inventoryWarehouseIds.has(warehouse.id) ? ' (not in inventory)' : ''}`
                }))
              ]}
              placeholder={warehouseOptions.length === 0 ? 'Load warehouses first' : 'Skip stock export'}
              triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
            />
          </div>
          <p className='mt-1 text-xs text-gray-500'>
            Used for exporting stock quantities to Base.com. Leave blank to skip
            stock.
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
          {allWarehouses.length > 0 &&
          allWarehouses.length > warehouses.length ? (
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
                Show all warehouses (may include ones not assigned to the
                inventory)
                </Label>
              </div>
            ) : null}
        </div>

        <SectionPanel variant='subtle' className='p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-white'>
                Image retry presets
              </h3>
              <p className='mt-1 text-xs text-gray-500'>
                Used by Retry image export and Re-export images only actions.
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleResetImageRetryPresets}
              disabled={!imageRetryPresetsLoaded}
              className='border'
            >
              Reset defaults
            </Button>
          </div>
          {!imageRetryPresetsLoaded ? (
            <p className='mt-3 text-xs text-gray-500'>Loading presets...</p>
          ) : (
            <div className='mt-3 space-y-3'>
              {imageRetryPresets.map((preset: ImageRetryPreset) => (
                <SectionPanel
                  key={preset.id}
                  variant='subtle-compact'
                  className='p-3'
                >
                  <div className='text-xs font-semibold text-gray-200'>
                    {preset.label}
                  </div>
                  <div className='mt-1 text-[11px] text-gray-500'>
                    {preset.description}
                  </div>
                  <div className='mt-2 grid gap-3 md:grid-cols-2'>
                    <div>
                      <Label className='text-[10px] text-gray-500'>
                        Max dimension (px)
                      </Label>
                      <Input
                        type='number'
                        min={1}
                        value={preset.transform.maxDimension ?? ''}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ): void => {
                          const raw = event.target.value;
                          updateImageRetryPreset(preset.id, {
                            ...(raw ? { maxDimension: Number(raw) } : {}),
                          });
                        }}
                        className='mt-1 h-8'
                      />
                    </div>
                    <div>
                      <Label className='text-[10px] text-gray-500'>
                        JPEG quality
                      </Label>
                      <Input
                        type='number'
                        min={10}
                        max={100}
                        value={preset.transform.jpegQuality ?? ''}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ): void => {
                          const raw = event.target.value;
                          updateImageRetryPreset(preset.id, {
                            ...(raw ? { jpegQuality: Number(raw) } : {}),
                          });
                        }}
                        className='mt-1 h-8'
                      />
                    </div>
                  </div>
                  <div className='mt-2 flex items-center gap-2 text-[11px] text-gray-400'>
                    <Checkbox
                      checked={preset.transform.forceJpeg ?? true}
                      onCheckedChange={(
                        checked: boolean | 'indeterminate',
                      ): void =>
                        updateImageRetryPreset(preset.id, {
                          forceJpeg: Boolean(checked),
                        })
                      }
                      className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
                    />
                    <span>Force JPEG conversion</span>
                  </div>
                </SectionPanel>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel variant='subtle-compact' className='border-blue-900/50 bg-blue-900/20 p-4'>
          <h3 className='text-sm font-semibold text-blue-200'>
            Export Guidelines
          </h3>
          <ul className='mt-2 space-y-1 text-xs text-blue-300/70'>
            <li>
              • Exports use templates to map internal product fields to Base.com
              API parameters
            </li>
            <li>
              • Without a template, default field mappings are used (SKU, Name,
              Price, Stock, etc.)
            </li>
            <li>
              • Import and export templates are managed separately in the
              Templates tab
            </li>
            <li>
              • Export to Base.com from Product List → Integrations → List
              Products → Select Base.com
            </li>
            <li>
              • Track export jobs in the{' '}
              <Link
                href='/admin/ai-paths/queue?tab=paths-external#export-jobs'
                className='text-blue-400 underline'
              >
                Job Queue → External Runs
              </Link>{' '}
              tab
            </li>
          </ul>
        </SectionPanel>

        <SectionPanel variant='subtle' className='p-4'>
          <h3 className='text-sm font-semibold text-white mb-3'>
            Quick Actions
          </h3>
          <div className='flex flex-wrap gap-3'>
            <Button
              onClick={(): void => {
                handleLoadInventories().catch(() => {});
              }}
              disabled={loadingInventories}
              variant='outline'
              size='sm'
              className='border'
            >
              {loadingInventories ? 'Loading...' : 'Load Inventories'}
            </Button>
            <Button
              onClick={(): void => {
                handleLoadWarehouses().catch(() => {});
              }}
              disabled={loadingWarehouses}
              variant='outline'
              size='sm'
              className='border'
            >
              {loadingWarehouses ? 'Loading...' : 'Load Warehouses'}
            </Button>
            <Button
              onClick={(): void => {
                handleDebugWarehouses();
              }}
              disabled={loadingDebugWarehouses}
              variant='outline'
              size='sm'
              className='border'
            >
              {loadingDebugWarehouses ? 'Debugging...' : 'Debug Warehouses'}
            </Button>
            <div className='flex items-center gap-2 text-xs text-gray-400'>
              <Checkbox
                id='includeAllWarehouses'
                checked={includeAllWarehouses}
                onCheckedChange={(checked: boolean | 'indeterminate'): void =>
                  setIncludeAllWarehouses(Boolean(checked))
                }
                className='h-3 w-3 rounded border bg-gray-900 text-emerald-500'
              />
              <Label htmlFor='includeAllWarehouses'>
                Try loading global warehouses (if supported)
              </Label>
            </div>
            <Button
              onClick={(): void => {
                handleSaveExportSettings().catch(() => {});
              }}
              disabled={savingExportSettings}
              size='sm'
            >
              {savingExportSettings ? 'Saving...' : 'Save Export Settings'}
            </Button>
            <Link href='/admin/ai-paths/queue?tab=paths-external#export-jobs'>
              <Button variant='outline' size='sm' className='border'>
                View Export Jobs
              </Button>
            </Link>
            <Link href='/admin/products'>
              <Button variant='outline' size='sm' className='border'>
                Go to Products
              </Button>
            </Link>
          </div>
        </SectionPanel>
        {debugWarehouses ? (
          <div className='rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <span className='font-semibold text-gray-200'>
                Warehouse debug (raw IDs)
              </span>
              <Button
                type='button'
                onClick={(): void => setDebugWarehouses(null)}
                className='text-[11px] uppercase tracking-wide text-gray-500 hover:text-gray-200'
              >
                Clear
              </Button>
            </div>
            <div className='mt-2 space-y-2'>
              <div>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>
                  Selected inventory raw response
                </div>
                {debugWarehouses.inventoriesRaw ? (
                  <div className='mt-1 space-y-1 text-[11px] text-gray-400'>
                    <div>Method: {debugWarehouses.inventoriesRaw.method}</div>
                    <div>
                      Status: {debugWarehouses.inventoriesRaw.statusCode}
                    </div>
                    <div>
                      Ok: {debugWarehouses.inventoriesRaw.ok ? 'true' : 'false'}
                    </div>
                    {debugWarehouses.inventoriesRaw.error ? (
                      <div>Error: {debugWarehouses.inventoriesRaw.error}</div>
                    ) : null}
                    {((): React.JSX.Element | null => {
                      const payload = debugWarehouses.inventoriesRaw
                        ?.payload as Record<string, unknown> | null | undefined;
                      const inventories = payload
                        ? payload['inventories']
                        : null;
                      if (!Array.isArray(inventories)) return null;
                      const match = (
                        inventories as Array<Record<string, unknown>>
                      ).find((inv: Record<string, unknown>) => {
                        if (!inv || typeof inv !== 'object') return false;
                        const inventoryId = inv['inventory_id'];
                        return (
                          exportInventoryId &&
                          (typeof inventoryId === 'string' ||
                            typeof inventoryId === 'number') &&
                          String(inventoryId) === exportInventoryId
                        );
                      });
                      if (!match) {
                        return (
                          <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300'>
                            Selected inventory not found in response.
                          </div>
                        );
                      }
                      return (
                        <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300'>
                          <div className='text-[11px] uppercase tracking-wide text-gray-500'>
                            Selected inventory details
                          </div>
                          <pre className='mt-1 whitespace-pre-wrap'>
                            {JSON.stringify(match, null, 2)}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className='mt-1 text-gray-500'>No raw response.</div>
                )}
              </div>
              <div>
                <div className='text-[11px] uppercase tracking-wide text-gray-500'>
                  Inventory warehouses raw response
                </div>
                {debugWarehouses.inventoryRaw ? (
                  <div className='mt-1 space-y-1 text-[11px] text-gray-400'>
                    <div>Inventory ID: {exportInventoryId || '—'}</div>
                    <div>Method: {debugWarehouses.inventoryRaw.method}</div>
                    <div>Status: {debugWarehouses.inventoryRaw.statusCode}</div>
                    <div>
                      Ok: {debugWarehouses.inventoryRaw.ok ? 'true' : 'false'}
                    </div>
                    {debugWarehouses.inventoryRaw.error ? (
                      <div>Error: {debugWarehouses.inventoryRaw.error}</div>
                    ) : null}
                    <pre className='mt-2 max-h-64 overflow-auto rounded border border-border bg-card p-2 text-[10px] text-gray-300'>
                      {debugWarehouses.inventoryRaw.payload
                        ? JSON.stringify(
                          debugWarehouses.inventoryRaw.payload,
                          null,
                          2,
                        )
                        : 'No payload returned.'}
                    </pre>
                  </div>
                ) : (
                  <div className='mt-1 text-gray-500'>No raw response.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SectionPanel>
  );
}
