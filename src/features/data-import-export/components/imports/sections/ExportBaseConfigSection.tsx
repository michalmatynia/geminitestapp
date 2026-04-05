'use client';

import React from 'react';

import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { IntegrationConnectionBasic } from '@/shared/contracts/integrations/domain';
import type { InventoryOption, Template } from '@/shared/contracts/integrations/import-export';
import { Label } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

const BASE_CONNECTION_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select a connection...',
};

const DEFAULT_INVENTORY_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select default inventory...',
};

const EXPORT_TEMPLATE_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'No template (use defaults)',
};

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
  const baseConnectionOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      BASE_CONNECTION_PLACEHOLDER_OPTION,
      ...baseConnections.map((connection: IntegrationConnectionBasic) => ({
        value: connection.id,
        label: connection.name,
      })),
    ],
    [baseConnections]
  );
  const inventoryOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      DEFAULT_INVENTORY_PLACEHOLDER_OPTION,
      ...inventories.map((inv: InventoryOption) => ({ value: inv.id, label: inv.name })),
    ],
    [inventories]
  );
  const exportTemplateOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      EXPORT_TEMPLATE_PLACEHOLDER_OPTION,
      ...exportTemplates.map((tpl: Template) => ({ value: tpl.id, label: tpl.name })),
    ],
    [exportTemplates]
  );

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
            options={baseConnectionOptions}
            placeholder={
              baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'
            }
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
           ariaLabel={baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'} title={baseConnections.length === 0 ? 'No connections loaded' : 'Select a connection...'}/>
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
            options={inventoryOptions}
            placeholder={
              inventories.length === 0
                ? exportInventoryId
                  ? `Saved inventory (${exportInventoryId})`
                  : 'No inventories loaded'
                : 'Select default inventory...'
            }
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
           ariaLabel={inventories.length === 0
                ? exportInventoryId
                  ? `Saved inventory (${exportInventoryId})`
                  : 'No inventories loaded'
                : 'Select default inventory...'} title={inventories.length === 0
                ? exportInventoryId
                  ? `Saved inventory (${exportInventoryId})`
                  : 'No inventories loaded'
                : 'Select default inventory...'}/>
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
            options={exportTemplateOptions}
            placeholder='No template (use defaults)'
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
           ariaLabel='No template (use defaults)' title='No template (use defaults)'/>
        </div>
        <p className='mt-1 text-xs text-gray-500'>Template for field mapping on export</p>
      </div>
    </div>
  );
}
