'use client';

import Link from 'next/link';
import React from 'react';
import { useBaseImportQueueHealth } from '@/shared/lib/jobs/hooks/useJobQueries';
import { Button, Card } from '@/shared/ui/primitives.public';
import { FormField, FormSection, Hint, RefreshButton, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
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
  NO_TEMPLATE_OPTION,
  isImageMode,
  isImportMode,
} from './ImportsPage.Constants';

export function ImportBaseConnectionSection(): React.JSX.Element {
  const baseImportQueueHealthQuery = useBaseImportQueueHealth();
  const {
    inventories,
    isFetchingInventories: loadingInventories,
    catalogsData: catalogs,
    loadingCatalogs,
    importTemplates,
    loadingImportTemplates,
    activeImportRunId,
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
    uniqueOnly,
    setUniqueOnly,
    allowDuplicateSku,
    setAllowDuplicateSku,
    importDirectTargetType,
    importDirectTargetValue,
    saveImportSettings,
    hasUnsavedImportSettingsChanges,
  } = useImportExportState();
  const {
    handleLoadInventories,
    handleClearInventory,
    handleClearSavedImportSettings,
    handleSaveImportSettings,
    savingDefaultConnection,
    handleSaveDefaultBaseConnection,
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
    (): Array<LabeledOptionDto<string>> =>
      catalogs.map((cat: CatalogOption) => ({
        value: cat.id,
        label: `${cat.name}${cat.isDefault ? ' (Default)' : ''}`,
      })),
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
  const canSaveImportSettings = !saveImportSettings || hasUnsavedImportSettingsChanges;
  const normalizedDirectTargetValue = importDirectTargetValue.trim();
  const hasDirectTarget = normalizedDirectTargetValue.length > 0;
  const directTargetLabel = hasDirectTarget
    ? importDirectTargetType === 'sku'
      ? `SKU ${normalizedDirectTargetValue}`
      : `Base Product ID ${normalizedDirectTargetValue}`
    : null;
  const baseImportQueueHealth = baseImportQueueHealthQuery.data ?? null;
  const baseImportQueue = baseImportQueueHealth?.queues.baseImport ?? null;
  const baseImportRuntimeMode = baseImportQueueHealthQuery.isLoading
    ? 'Scanning...'
    : (baseImportQueueHealth?.mode ?? 'Unknown');
  const baseImportWorkerStatus = baseImportQueueHealthQuery.isLoading
    ? 'Checking'
    : baseImportQueueHealth?.mode === 'inline'
      ? 'Inline'
      : baseImportQueue?.running
        ? 'Running'
        : 'Offline';
  const runtimeQueueWarning = React.useMemo(() => {
    if (baseImportQueueHealthQuery.isLoading) return null;

    if (baseImportQueueHealth?.mode === 'inline') {
      return {
        title: 'Runtime queue is in inline fallback mode',
        message:
          'New imports will run inline and will not appear as BullMQ runtime jobs until Redis queueing is available again.',
      };
    }

    if (baseImportQueueHealth?.redisAvailable && !baseImportQueue?.running) {
      return {
        title: 'Base import worker is offline',
        message:
          'Redis is available, but the base-import worker is not running. New imports may queue without being processed until the worker is restored.',
      };
    }

    return null;
  }, [
    baseImportQueue?.running,
    baseImportQueueHealth?.mode,
    baseImportQueueHealth?.redisAvailable,
    baseImportQueueHealthQuery.isLoading,
  ]);
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
          <FormField label='Catalog' description='Required target catalog for imported products.'>
            <SelectSimple
              size='sm'
              value={catalogId}
              onValueChange={setCatalogId}
              options={catalogOptions}
              disabled={loadingCatalogs || catalogOptions.length === 0}
              placeholder={
                loadingCatalogs
                  ? 'Loading catalogs...'
                  : catalogOptions.length === 0
                    ? 'No catalogs available'
                    : 'Select catalog'
              }
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
            description={
              hasDirectTarget
                ? `Exact target ${directTargetLabel} is active. This run will always create a new detached product.`
                : 'Choose how Base products should be matched.'
            }
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
              disabled={hasDirectTarget}
              ariaLabel='Import mode'
            />
            <Hint className='mt-2'>
              {hasDirectTarget
                ? 'Exact target imports bypass upsert matching and always create a new product.'
                : 'Upsert by Base ID will update existing products tied to a Base.com product id.'}
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
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-white'>Import Options</h3>
              <p className='text-xs text-gray-500'>
                Control execution behavior for this import run.
              </p>
              <p className='mt-2 text-xs text-gray-400'>
                {saveImportSettings
                  ? hasUnsavedImportSettingsChanges
                    ? 'Saved import settings exist. You have unsaved changes.'
                    : 'Saved import settings will be restored on the next reload in this browser.'
                  : 'No saved import settings yet. Use Save Import Settings to retain this page configuration after reloads.'}
              </p>
            </div>
            <div className='ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:self-start'>
              <Button
                type='button'
                size='sm'
                variant={canSaveImportSettings ? 'success' : 'outline'}
                onClick={(): void => {
                  void handleSaveImportSettings();
                }}
                disabled={!canSaveImportSettings}
                className={cn(
                  canSaveImportSettings &&
                    'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.24),0_0_28px_rgba(16,185,129,0.18)] transition-all duration-200 hover:bg-emerald-500/25 hover:text-emerald-200 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.32),0_0_34px_rgba(16,185,129,0.24)]'
                )}
              >
                Save Import Settings
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                onClick={(): void => {
                  void handleClearSavedImportSettings();
                }}
                disabled={!saveImportSettings}
              >
                Clear Saved
              </Button>
            </div>
          </div>
          {runtimeQueueWarning ? (
            <Card variant='warning' padding='sm' className='mt-4'>
              <p className='text-xs font-semibold uppercase tracking-wider text-amber-200'>
                {runtimeQueueWarning.title}
              </p>
              <p className='mt-1 text-xs text-amber-100/90'>{runtimeQueueWarning.message}</p>
            </Card>
          ) : null}
          <div className='mt-4 grid gap-3 md:grid-cols-3'>
            <FormSection
              title='Runtime Queue'
              variant='subtle-compact'
              className='p-3'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Hint size='xxs' uppercase className='font-bold text-gray-500'>
                  Delivery
                </Hint>
                <StatusBadge
                  status={baseImportQueueHealth?.redisAvailable ? 'Redis Up' : 'No Redis'}
                  variant={baseImportQueueHealth?.redisAvailable ? 'success' : 'warning'}
                  className='text-[9px]'
                />
              </div>
              <div className='mt-2 text-xs font-medium text-gray-300'>{baseImportRuntimeMode}</div>
              <Hint className='mt-2 text-[11px] text-gray-500'>
                Base imports run on the separate <code>base-import</code> runtime queue.
              </Hint>
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <RefreshButton
                  onRefresh={(): void => {
                    void baseImportQueueHealthQuery.refetch();
                  }}
                  isRefreshing={Boolean(baseImportQueueHealthQuery.isFetching)}
                  label='Refresh'
                  size='xs'
                  variant='ghost'
                />
                <Link
                  href='/api/v2/integrations/queues/base-import'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <Button variant='outline' size='xs'>
                    Inspect runtime
                  </Button>
                </Link>
                <Link
                  href={
                    activeImportRunId
                      ? `/admin/ai-paths/queue?tab=product-imports&query=${encodeURIComponent(activeImportRunId)}`
                      : '/admin/ai-paths/queue?tab=product-imports'
                  }
                >
                  <Button variant='outline' size='xs'>
                    View Import Jobs
                  </Button>
                </Link>
              </div>
            </FormSection>
            <FormSection title='Worker Status' variant='subtle-compact' className='p-3'>
              <div className='flex items-center justify-between'>
                <Hint size='xxs' uppercase className='font-bold text-gray-500'>
                  Service
                </Hint>
                <StatusBadge
                  status={baseImportWorkerStatus}
                  variant={
                    baseImportWorkerStatus === 'Running'
                      ? 'success'
                      : baseImportWorkerStatus === 'Inline'
                        ? 'warning'
                        : 'error'
                  }
                  className='text-[9px]'
                />
              </div>
              <div className='mt-2 text-xs text-gray-400'>
                Waiting {baseImportQueue?.waitingCount ?? 0} | Active {baseImportQueue?.activeCount ?? 0}
              </div>
            </FormSection>
            <FormSection title='Failures' variant='subtle-compact' className='p-3'>
              <div className='flex items-center justify-between'>
                <Hint size='xxs' uppercase className='font-bold text-gray-500'>
                  Queue state
                </Hint>
                <div className='text-xs font-medium text-rose-300'>
                  {baseImportQueue?.failedCount ?? 0} failed
                </div>
              </div>
              <div className='mt-2 text-xs text-gray-400'>
                Completed {baseImportQueue?.completedCount ?? 0}
              </div>
            </FormSection>
          </div>
          <div className='mt-3 space-y-2'>
            <ToggleRow
              label='Unique products only'
              description='Apply unique-only filtering to both the import list preview and the import run.'
              checked={uniqueOnly}
              onCheckedChange={setUniqueOnly}
              disabled={hasDirectTarget}
              title={
                hasDirectTarget
                  ? 'Exact target imports ignore unique-only filtering.'
                  : undefined
              }
            />
            <ToggleRow
              label='Dry run (do not write to database)'
              description='Fetch and validate import data without saving.'
              checked={importDryRun}
              onCheckedChange={setImportDryRun}
            />
            <ToggleRow
              label='Allow duplicate SKUs'
              description={
                hasDirectTarget
                  ? 'Exact target imports already create a new product and generate a unique SKU if needed.'
                  : 'If enabled, duplicates are allowed to import.'
              }
              checked={allowDuplicateSku}
              onCheckedChange={setAllowDuplicateSku}
              disabled={hasDirectTarget}
              title={
                hasDirectTarget
                  ? 'Exact target imports ignore the duplicate-SKU toggle.'
                  : undefined
              }
            />
          </div>
        </Card>
      </div>
    </FormSection>
  );
}
