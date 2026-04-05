'use client';

import React from 'react';
import { Button, Card } from '@/shared/ui/primitives.public';
import { FormField, FormSection, Hint, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { UI_GRID_RELAXED_CLASSNAME, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';
import {
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CatalogOption, InventoryOption, Template } from '@/shared/contracts/integrations/import-export';
import {
  BASE_CONNECTION_PLACEHOLDER_OPTION,
  IMAGE_MODE_OPTIONS,
  IMPORT_MODE_OPTIONS,
  LIMIT_OPTIONS,
  NO_CATALOG_OPTION,
  NO_TEMPLATE_OPTION,
  isImageMode,
  isImportMode,
} from './ImportsPage.Constants';

export function ImportBaseConnectionSection(): React.JSX.Element {
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
        <div className={cn(UI_GRID_ROOMY_CLASSNAME, 'md:grid-cols-2')}>
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
                      void handleClearInventory();
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

        <div className={cn(UI_GRID_ROOMY_CLASSNAME, 'md:grid-cols-2')}>
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

        <div className={cn(UI_GRID_RELAXED_CLASSNAME, 'md:grid-cols-2')}>
          <FormSection
            title='Import Mode'
            description='Choose how Base products should be matched.'
            className='p-4'
          >
            <SelectSimple
              size='sm'
              value={importMode}
              onValueChange={(value: string): void => {
                if (isImportMode(value)) {
                  setImportMode(value);
                }
              }}
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
              onValueChange={(value: string): void => {
                if (isImageMode(value)) {
                  setImageMode(value);
                }
              }}
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
