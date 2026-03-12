'use client';

import React from 'react';

import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import type { IntegrationConnectionBasic } from '@/shared/contracts/integrations';
import type { InventoryOption, Template } from '@/shared/contracts/integrations';
import { Label, SelectSimple } from '@/shared/ui';

export function ExportBaseConfigSection(): React.JSX.Element {
  const { baseConnections, inventories, exportTemplates, loadingExportTemplates } =
    useImportExportData();
  const {
    selectedBaseConnectionId,
    setSelectedBaseConnectionId,
    exportInventoryId,
    setExportInventoryId,
    exportWarehouseId,
    setExportWarehouseId,
    exportActiveTemplateId,
    setExportActiveTemplateId,
  } = useImportExportState();
  const { applyTemplate } = useImportExportActions();

  return (
    <div className='grid grid-cols-2 gap-4'>
      <div className='col-span-2'>
        <Label className='text-xs text-gray-400'>
          Default Base connection (OneClick + inventory tools)
        </Label>
        <div className='mt-2'>
          <SelectSimple
            size='sm'
            value={selectedBaseConnectionId || '__none__'}
            onValueChange={(v: string): void => {
              const nextConnectionId = v === '__none__' ? '' : v;
              if (nextConnectionId !== selectedBaseConnectionId) {
                if (exportInventoryId) setExportInventoryId('');
                if (exportWarehouseId) setExportWarehouseId('');
                if (exportActiveTemplateId) setExportActiveTemplateId('');
              }
              setSelectedBaseConnectionId(nextConnectionId);
            }}
            disabled={baseConnections.length === 0}
            options={[
              { value: '__none__', label: 'Select a connection...' },
              ...baseConnections.map((connection: IntegrationConnectionBasic) => ({
                value: connection.id,
                label: connection.name,
              })),
            ]}
            placeholder={
              baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'
            }
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
          <SelectSimple
            size='sm'
            value={exportInventoryId || '__none__'}
            onValueChange={(v: string): void => setExportInventoryId(v === '__none__' ? '' : v)}
            disabled={inventories.length === 0 && !exportInventoryId}
            options={[
              { value: '__none__', label: 'Select default inventory...' },
              ...inventories.map((inv: InventoryOption) => ({ value: inv.id, label: inv.name })),
            ]}
            placeholder={
              inventories.length === 0
                ? exportInventoryId
                  ? `Saved inventory (${exportInventoryId})`
                  : 'No inventories loaded'
                : 'Select default inventory...'
            }
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
          />
        </div>
        <p className='mt-1 text-xs text-gray-500'>Default inventory for product exports</p>
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Default Export Template</Label>
        <div className='mt-2'>
          <SelectSimple
            size='sm'
            value={exportActiveTemplateId || '__none__'}
            onValueChange={(nextId: string): void => {
              const val = nextId === '__none__' ? '' : nextId;
              const selected = exportTemplates.find((template: Template) => template.id === val);
              if (selected) {
                applyTemplate(selected, 'export');
              } else {
                setExportActiveTemplateId(val);
              }
            }}
            disabled={loadingExportTemplates || exportTemplates.length === 0}
            options={[
              { value: '__none__', label: 'No template (use defaults)' },
              ...exportTemplates.map((tpl: Template) => ({ value: tpl.id, label: tpl.name })),
            ]}
            placeholder='No template (use defaults)'
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
          />
        </div>
        <p className='mt-1 text-xs text-gray-500'>Template for field mapping on export</p>
      </div>
    </div>
  );
}
