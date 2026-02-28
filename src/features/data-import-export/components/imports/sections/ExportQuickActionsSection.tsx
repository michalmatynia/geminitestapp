'use client';

import React from 'react';
import Link from 'next/link';
import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { Button, SectionHeader, Hint, ToggleRow, MetadataItem, Card } from '@/shared/ui';

export function ExportQuickActionsSection(): React.JSX.Element {
  const {
    exportInventoryId,
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
