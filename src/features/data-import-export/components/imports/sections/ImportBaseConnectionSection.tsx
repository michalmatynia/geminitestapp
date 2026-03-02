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
  Card,
} from '@/shared/ui';
import type {
  InventoryOption,
  CatalogOption,
  Template,
} from '@/shared/contracts/data-import-export';

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
        {/* Connection Setup */}
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
                options={[
                  { value: '__none__', label: 'Select a connection...' },
                  ...baseConnections.map((connection) => ({
                    value: connection.id,
                    label: connection.name,
                  })),
                ]}
                placeholder={
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
                  options={inventories.map((inv: InventoryOption) => ({
                    value: inv.id,
                    label: inv.name,
                  }))}
                  placeholder={
                    inventories.length === 0 ? 'Load inventories first' : 'Select inventory'
                  }
                  className='flex-1'
                />
                <SelectSimple
                  size='sm'
                  value={limit}
                  onValueChange={setLimit}
                  options={[
                    { value: '1', label: '1' },
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                    { value: 'all', label: 'All' },
                  ]}
                  className='w-20'
                />
              </div>
              <div className='flex gap-2'>
                <Button
                  size='xs'
                  variant='secondary'
                  onClick={(): void => {
                    void handleLoadInventories();
                  }}
                  disabled={!selectedBaseConnectionId}
                  loading={loadingInventories}
                  loadingText='Loading...'
                  className='flex-1'
                >
                  Load inventories
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  onClick={(): void => {
                    void handleClearInventory();
                  }}
                  disabled={!inventoryId}
                >
                  Clear
                </Button>
              </div>
            </div>
          </FormField>
        </div>

        {/* Catalog & Template */}
        <Card variant='glass' padding='md' className='grid gap-6 md:grid-cols-2 bg-white/5'>
          <FormField label='Destination Catalog'>
            <SelectSimple
              size='sm'
              value={catalogId || '__none__'}
              onValueChange={(v: string): void => setCatalogId(v === '__none__' ? '' : v)}
              disabled={loadingCatalogs || catalogs.length === 0}
              options={[
                { value: '__none__', label: '— No catalog —' },
                ...catalogs.map((cat: CatalogOption) => ({
                  value: cat.id,
                  label: `${cat.name}${cat.isDefault ? ' (Default)' : ''}`,
                })),
              ]}
              placeholder={loadingCatalogs ? 'Loading catalogs...' : 'No catalogs'}
            />
          </FormField>
          <FormField label='Import Template (Optional)'>
            <SelectSimple
              size='sm'
              value={importTemplateId || '__none__'}
              onValueChange={(v: string): void => setImportTemplateId(v === '__none__' ? '' : v)}
              disabled={loadingImportTemplates || importTemplates.length === 0}
              options={[
                { value: '__none__', label: 'No template' },
                ...importTemplates.map((template: Template) => ({
                  value: template.id,
                  label: template.name,
                })),
              ]}
              placeholder='No template'
            />
          </FormField>
        </Card>

        {/* Import Settings */}
        <div className='grid gap-6 md:grid-cols-3'>
          <FormField label='Image Handling'>
            <SelectSimple
              size='sm'
              value={imageMode}
              onValueChange={(v: string): void => setImageMode(v as 'links' | 'download')}
              options={[
                { value: 'links', label: 'Import image links' },
                { value: 'download', label: 'Download product images' },
              ]}
            />
            <Hint className='mt-2'>
              Download stores images locally in your uploads folder.
            </Hint>
          </FormField>

          <FormField label='Import Strategy'>
            <SelectSimple
              size='sm'
              value={importMode}
              onValueChange={(value: string): void =>
                setImportMode(value as 'create_only' | 'upsert_on_base_id' | 'upsert_on_sku')
              }
              options={[
                { value: 'upsert_on_base_id', label: 'Upsert by Base ID' },
                { value: 'upsert_on_sku', label: 'Upsert by SKU' },
                { value: 'create_only', label: 'Create only' },
              ]}
            />
            <div className='mt-3'>
              <ToggleRow
                label='Dry-run mode'
                checked={importDryRun}
                onCheckedChange={setImportDryRun}
                className='border-none bg-transparent hover:bg-transparent p-0'
                labelClassName='text-[11px] font-medium'
              />
            </div>
          </FormField>

          <FormField label='Validation'>
            <ToggleRow
              label='Allow duplicate SKUs'
              checked={allowDuplicateSku}
              onCheckedChange={setAllowDuplicateSku}
              className='border-none bg-transparent hover:bg-transparent p-0'
              labelClassName='text-[11px] font-medium'
            />
            <Hint className='mt-2'>
              Existing SKUs will be skipped if unchecked.
            </Hint>
          </FormField>
        </div>

        {/* Actions */}
        <div className='flex items-center justify-between gap-4 border-t border-white/5 pt-6'>
          <Hint variant='warning'>Ensure catalog and price group are correctly configured.</Hint>
          <Button
            size='lg'
            onClick={(): void => {
              void handleImport();
            }}
            loading={importing}
            loadingText='Processing...'
            className='px-8 shadow-lg shadow-primary/20'
          >
            {importDryRun ? 'Run dry-run' : 'Import products'}
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
