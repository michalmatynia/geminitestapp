'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { useCategoryMappingsByConnection } from '@/features/integrations/hooks/useMarketplaceQueries';
import type {
  InventoryOption,
  Template,
  WarehouseOption,
  ImageRetryPreset,
} from '@/shared/contracts/data-import-export';
import {
  getDefaultImageRetryPresets,
  withImageRetryPresetLabels,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { IntegrationConnectionBasic } from '@/features/integrations';
import {
  Button,
  Input,
  Checkbox,
  Label,
  SelectSimple,
  DocumentationSection,
  SectionHeader,
  Hint,
  FormField,
  ToggleRow,
  MetadataItem,
  Card,
} from '@/shared/ui';

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
    <Card className='border-border/60 bg-card/40 p-4'>
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
              Default Base connection (OneClick + inventory tools)
            </Label>
            <div className='mt-2'>
              <SelectSimple size='sm'
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
              Used by Product List OneClick export and for loading inventories/warehouses.
            </p>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Default Inventory</Label>
            <div className='mt-2'>
              <SelectSimple size='sm'
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
              <SelectSimple size='sm'
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

        <div className='rounded-md border border-border/60 bg-card/30 p-3'>
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
                <Link href='/admin/integrations/aggregators/base-com/category-mapping' className='text-amber-300 underline'>
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
        </div>

        <div>
          <Label className='text-xs text-gray-400'>Default Warehouse ID</Label>
          <div className='mt-2'>
            <SelectSimple size='sm'
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
                <div
                  key={preset.id}
                  className='rounded-md border border-border/60 bg-card/30 p-3'
                >
                  <div className='text-xs font-semibold text-gray-200'>
                    {preset.name}
                  </div>
                  <Hint className='mt-1'>
                    {preset.description}
                  </Hint>
                  <div className='mt-2 grid gap-3 md:grid-cols-2'>
                    <FormField label='Max dimension (px)'>
                      <Input
                        type='number'
                        min={1}
                        value={preset.transform?.maxDimension ?? ''}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ): void => {
                          const raw = event.target.value;
                          updateImageRetryPreset(preset.id, {
                            maxDimension: raw ? Number(raw) : undefined,
                            width: raw ? Number(raw) : undefined,
                            height: raw ? Number(raw) : undefined,
                          });
                        }}
                        className='h-8'
                      />
                    </FormField>
                    <FormField label='JPEG quality'>
                      <Input
                        type='number'
                        min={10}
                        max={100}
                        value={preset.transform?.jpegQuality ?? ''}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ): void => {
                          const raw = event.target.value;
                          updateImageRetryPreset(preset.id, {
                            jpegQuality: raw ? Number(raw) : undefined,
                            quality: raw ? Number(raw) : undefined,
                          });
                        }}
                        className='h-8'
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

        <DocumentationSection
          title='Export Guidelines'
          className='border-blue-900/50 bg-blue-900/20'
        >
          <ul className='list-disc space-y-1 pl-5 text-xs text-blue-300/70'>
            <li>
              Exports use templates to map internal product fields to Base.com
              API parameters
            </li>
            <li>
              Without a template, default field mappings are used (SKU, Name,
              Price, Stock, etc.)
            </li>
            <li>
              Import and export templates are managed separately in the
              Templates tab
            </li>
            <li>
              Export to Base.com from Product List → Integrations → List
              Products → Select Base.com
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

        <Card className='border-border/60 bg-card/40 p-4'>
          <SectionHeader
            title='Quick Actions'
            size='xs'
            className='mb-3'
          />
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
              <span className='font-semibold text-gray-200'>
                Warehouse debug (raw IDs)
              </span>
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
                <Hint uppercase className='mb-1'>Selected inventory raw response</Hint>
                {debugWarehouses.inventoriesRaw ? (
                  <div className='mt-1 space-y-1'>
                    <MetadataItem variant='minimal' label='Method' value={debugWarehouses.inventoriesRaw.method} />
                    <MetadataItem variant='minimal' label='Status' value={debugWarehouses.inventoriesRaw.statusCode} />
                    <MetadataItem variant='minimal' label='Ok' value={debugWarehouses.inventoriesRaw.ok ? 'true' : 'false'} />
                    {debugWarehouses.inventoriesRaw.error ? (
                      <MetadataItem variant='minimal' label='Error' value={debugWarehouses.inventoriesRaw.error} valueClassName='text-red-400' />
                    ) : null}
                    {((): React.JSX.Element | null => {
                      const payload = debugWarehouses.inventoriesRaw
                        ?.payload as { inventories?: Array<Record<string, unknown>> } | null | undefined;
                      const inventories = payload?.inventories;
                      if (!Array.isArray(inventories)) return null;
                      const match = inventories.find((inv: Record<string, unknown>) => {
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
                          <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300 mt-2'>
                            Selected inventory not found in response.
                          </div>
                        );
                      }
                      return (
                        <div className='rounded border border-border bg-card/60 p-2 text-[10px] text-gray-300 mt-2'>
                          <div className='text-[11px] uppercase tracking-wide text-gray-500 mb-1'>
                            Selected inventory details
                          </div>
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
                <Hint uppercase className='mb-1'>Inventory warehouses raw response</Hint>
                {debugWarehouses.inventoryRaw ? (
                  <div className='mt-1 space-y-1'>
                    <MetadataItem variant='minimal' label='Inventory ID' value={exportInventoryId || '—'} />
                    <MetadataItem variant='minimal' label='Method' value={debugWarehouses.inventoryRaw.method} />
                    <MetadataItem variant='minimal' label='Status' value={debugWarehouses.inventoryRaw.statusCode} />
                    <MetadataItem variant='minimal' label='Ok' value={debugWarehouses.inventoryRaw.ok ? 'true' : 'false'} />
                    {debugWarehouses.inventoryRaw.error ? (
                      <MetadataItem variant='minimal' label='Error' value={debugWarehouses.inventoryRaw.error} valueClassName='text-red-400' />
                    ) : null}
                    <pre className='mt-2 max-h-64 overflow-auto rounded border border-border bg-card p-2 text-[10px] text-gray-300 font-mono'>
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
                  <Hint italic>No raw response.</Hint>
                )}
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </Card>
  );
}
