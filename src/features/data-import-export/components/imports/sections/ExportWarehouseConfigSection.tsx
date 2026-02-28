'use client';

import React from 'react';
import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { Label, SelectSimple, Checkbox } from '@/shared/ui';
import type { WarehouseOption } from '@/shared/contracts/data-import-export';

export function ExportWarehouseConfigSection(): React.JSX.Element {
  const {
    exportWarehouseId,
    setExportWarehouseId,
    warehouses: warehouseOptions,
    showAllWarehouses,
    setShowAllWarehouses,
    exportStockFallbackEnabled,
    setExportStockFallbackEnabled,
    allWarehouses,
    warehouses,
  } = useImportExport();

  const exportStockFallbackLoaded = true;
  const inventoryWarehouseIds = new Set(warehouses.map((w: WarehouseOption) => w.id));

  return (
    <div>
      <Label className='text-xs text-gray-400'>Default Warehouse ID</Label>
      <div className='mt-2'>
        <SelectSimple
          size='sm'
          value={exportWarehouseId || '__none__'}
          onValueChange={(v: string): void => setExportWarehouseId(v === '__none__' ? '' : v)}
          disabled={warehouseOptions.length === 0}
          options={[
            { value: '__none__', label: 'Skip stock export' },
            ...warehouseOptions.map((warehouse: WarehouseOption) => ({
              value: warehouse.id,
              label: `${warehouse.name} (${warehouse.id})${showAllWarehouses && !inventoryWarehouseIds.has(warehouse.id) ? ' (not in inventory)' : ''}`,
            })),
          ]}
          placeholder={
            warehouseOptions.length === 0 ? 'Load warehouses first' : 'Skip stock export'
          }
          triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
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
