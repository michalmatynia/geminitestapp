'use client';

import React from 'react';
import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import {
  Button,
  SelectSimple,
  FormSection,
  StatusBadge,
  FormField,
  Hint,
  ToggleRow,
} from '@/shared/ui';
import type { InventoryOption, CatalogOption, Template } from '@/shared/contracts/data-import-export';

export function ImportBaseConnectionSection(): React.JSX.Element {
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
    selectedBaseConnectionId,
    setSelectedBaseConnectionId,
    savingDefaultConnection,
    handleSaveDefaultBaseConnection,
    isBaseConnected,
    baseConnections,
    imageMode,
    setImageMode,
    importMode,
    setImportMode,
    importDryRun,
    setImportDryRun,
    allowDuplicateSku,
    setAllowDuplicateSku,
    importing,
    handleImport,
  } = useImportExport();

  return (
    <FormSection
      title='Base.com'
      description='Connected via Integrations. Load inventories to start importing.'
      actions={
        <StatusBadge
          status={isBaseConnected ? 'Connected' : 'Disconnected'}
          variant={isBaseConnected ? 'success' : 'error'}
        />
      }
      className='p-4'
    >
      <div className='mt-4 space-y-4'>
        <FormField label='Base connection for import'>
          <SelectSimple size='sm'
            value={selectedBaseConnectionId || '__none__'}
            onValueChange={(v: string): void =>
              setSelectedBaseConnectionId(v === '__none__' ? '' : v)
            }
            disabled={baseConnections.length === 0}
            options={[
              { value: '__none__', label: 'Select a connection...' },
              ...baseConnections.map((connection) => ({
                value: connection.id,
                label: connection.name,
              })),
            ]}
            placeholder={
              baseConnections.length === 0
                ? 'No connections loaded'
                : 'Select a connection...'
            }
            triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
          />
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='secondary'
              onClick={(): void => {
                void handleSaveDefaultBaseConnection();
              }}
              disabled={!selectedBaseConnectionId}
              loading={savingDefaultConnection}
              loadingText='Saving...'
            >
              Set as default Base connection
            </Button>
            <Hint>
              Saves this connection for import/export tools and one-click export.
            </Hint>
          </div>
        </FormField>

        <div className='flex flex-wrap items-end gap-3'>
          <Button
            onClick={(): void => {
              void handleLoadInventories();
            }}
            disabled={!selectedBaseConnectionId}
            loading={loadingInventories}
            loadingText='Loading inventories...'
            className='h-9'
          >
            Load inventories
          </Button>
          <FormField label='Inventory' className='flex-1 min-w-[200px]'>
            <SelectSimple size='sm'
              value={inventoryId}
              onValueChange={setInventoryId}
              disabled={inventories.length === 0}
              options={inventories.map((inv: InventoryOption) => ({ value: inv.id, label: inv.name }))}
              placeholder={inventories.length === 0 ? 'Load inventories first' : 'Select inventory'}
              triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
            />
          </FormField>
          <Button
            type='button'
            variant='secondary'
            onClick={(): void => {
              void handleClearInventory();
            }}
            disabled={!inventoryId}
            className='h-9'
          >
            Clear inventory
          </Button>
          <FormField label='Limit' className='w-40'>
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
          </FormField>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Catalog'>
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
          </FormField>
          <FormField label='Import template'>
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
          </FormField>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <FormField label='Images'>
            <SelectSimple size='sm'
              value={imageMode}
              onValueChange={(v: string): void => setImageMode(v as 'links' | 'download')}
              options={[
                { value: 'links', label: 'Import image links' },
                { value: 'download', label: 'Download product images' }
              ]}
              triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
            />
            <Hint className='mt-2'>
              Image links keep Base.com URLs. Download stores images in your uploads folder.
            </Hint>
          </FormField>
          <FormField label='SKU Handling'>
            <ToggleRow
              label='Allow duplicate SKUs'
              checked={allowDuplicateSku}
              onCheckedChange={setAllowDuplicateSku}
              className='border-none bg-transparent hover:bg-transparent p-0'
            />
            <Hint className='mt-2'>
              When unchecked, products with existing SKUs will be skipped.
            </Hint>
          </FormField>
          <FormField label='Import behavior'>
            <SelectSimple size='sm'
              value={importMode}
              onValueChange={(value: string): void =>
                setImportMode(
                  value as 'create_only' | 'upsert_on_base_id' | 'upsert_on_sku'
                )
              }
              options={[
                {
                  value: 'upsert_on_base_id',
                  label: 'Upsert by Base ID',
                },
                {
                  value: 'upsert_on_sku',
                  label: 'Upsert by SKU',
                },
                {
                  value: 'create_only',
                  label: 'Create only',
                },
              ]}
              triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
            />
            <ToggleRow
              label='Dry-run only'
              checked={importDryRun}
              onCheckedChange={setImportDryRun}
              className='mt-3 border-none bg-transparent hover:bg-transparent p-0'
            />
          </FormField>
        </div>

        <div className='flex items-center justify-between gap-4'>
          <Hint>
            Default catalog and price group must be configured before import.
          </Hint>
          <Button
            onClick={(): void => {
              void handleImport();
            }}
            loading={importing}
            loadingText='Processing...'
          >
            {importDryRun ? 'Run dry-run' : 'Import products'}
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
