'use client';

import { ArrowLeft, ArrowRight, Check, Play, RefreshCw, X } from 'lucide-react';
import React from 'react';

import { useProductBaseSyncPreview, useRunProductBaseSyncMutation } from '@/features/product-sync/hooks/useProductBaseSync';
import {
  useProductListingsData,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import type {
  ProductSyncDirection,
  ProductSyncFieldPreview,
  ProductSyncPreview,
  ProductSyncTargetSource,
  ProductSyncPreviewValue,
} from '@/shared/contracts/product-sync';
import { Button, Card, Badge, useToast } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import {
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const directionLabel = (direction: ProductSyncDirection): string => {
  if (direction === 'app_to_base') return 'App -> Base';
  if (direction === 'base_to_app') return 'Base -> App';
  return 'Disabled';
};

const directionIcon = (direction: ProductSyncDirection): React.JSX.Element => {
  if (direction === 'app_to_base') return <ArrowRight className='size-3 text-blue-400' />;
  if (direction === 'base_to_app') return <ArrowLeft className='size-3 text-purple-400' />;
  return <X className='size-3 text-gray-500' />;
};

const formatFieldValue = (value: ProductSyncPreviewValue, appField: string): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (appField === 'price') return value.toFixed(2);
    return `${value}`;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) return '—';
  return normalizedValue;
};

const renderFieldActionHint = (field: ProductSyncFieldPreview): string | null => {
  if (field.willWriteToApp) {
    if (field.baseValue === null) {
      return 'Next sync clears the app value because Base.com is blank.';
    }
    return 'Next sync writes Base.com value into the app.';
  }
  if (field.willWriteToBase) {
    if (field.appValue === null) {
      return 'Next sync clears the Base.com value because the app field is blank.';
    }
    return 'Next sync pushes the app value to Base.com.';
  }
  if (field.hasDifference && field.direction === 'disabled') {
    return 'Values differ, but this field is disabled in the active sync profile.';
  }
  return null;
};

const resolveSyncToastMessage = (
  localChanges: string[],
  baseChanges: string[],
  message: string | null
): string => {
  if (localChanges.length === 0 && baseChanges.length === 0) {
    return message ?? 'No field changes detected.';
  }

  const parts: string[] = [];
  if (localChanges.length > 0) parts.push(`${localChanges.length} app update(s)`);
  if (baseChanges.length > 0) parts.push(`${baseChanges.length} Base.com update(s)`);
  return `Synchronization completed: ${parts.join(', ')}.`;
};

const formatLastRunAt = (value: string | null | undefined): string => {
  const normalizedValue = (value ?? '').trim();
  if (!normalizedValue) return 'Never';

  const timestamp = Date.parse(normalizedValue);
  if (!Number.isFinite(timestamp)) return normalizedValue;

  return new Date(timestamp).toLocaleString();
};

const resolveConnectionLabel = (
  connectionId: string,
  connectionName: string | null | undefined
): { primary: string; secondary: string | null } => {
  const normalizedName = (connectionName ?? '').trim();
  const normalizedId = connectionId.trim();

  if (!normalizedName) {
    return {
      primary: normalizedId,
      secondary: null,
    };
  }

  return {
    primary: normalizedName,
    secondary: normalizedName === normalizedId ? null : normalizedId,
  };
};

const resolveTargetSourceLabel = (source: ProductSyncTargetSource): string | null => {
  if (source === 'product') return 'Saved Link';
  if (source === 'listing') return 'Listing Link';
  if (source === 'sku_backfill') return 'Import SKU';
  return null;
};

const renderTargetSourceHint = (source: ProductSyncTargetSource): string | null => {
  if (source === 'listing') {
    return 'Target resolved from an existing Base listing link. The first successful sync will save the Base ID on this product.';
  }
  if (source === 'sku_backfill') {
    return 'Target resolved from the product SKU in the active Base inventory. The first successful sync will save the Base ID and Base listing link locally.';
  }
  return null;
};

const resolveSyncDisabledHint = (
  preview: ProductSyncPreview,
  syncableFieldCount: number,
  outOfSyncFieldCount: number
): string | null => {
  if (!preview.canSync) {
    return preview.disabledReason ?? 'Base.com sync is not available for this product.';
  }
  if (outOfSyncFieldCount === 0) {
    return 'All field rules are already aligned between the app and Base.com.';
  }
  if (syncableFieldCount === 0) {
    return 'The out-of-sync fields are disabled in the active sync profile.';
  }
  return null;
};

export function ProductListingsSyncPanel(): React.JSX.Element {
  const { toast } = useToast();
  const { product, listings } = useProductListingsData();
  const { syncingImages } = useProductListingsUIState();
  const { setIsSyncImagesConfirmOpen } = useProductListingsModals();
  const previewQuery = useProductBaseSyncPreview(product.id);
  const runSyncMutation = useRunProductBaseSyncMutation();
  const [previewOverride, setPreviewOverride] = React.useState<ProductSyncPreview | null>(null);

  const baseListing = listings.find((listing) =>
    ['baselinker', 'base-com', 'base'].includes(normalizeIntegrationSlug(listing.integration.slug))
  );
  const normalizedBaseListingStatus = (baseListing?.status ?? '').trim().toLowerCase();
  const isBaseListingExportBusy = [
    'queued',
    'queued_relist',
    'running',
    'processing',
    'pending',
    'in_progress',
  ].includes(normalizedBaseListingStatus);

  React.useEffect(() => {
    setPreviewOverride(null);
  }, [product.id]);

  const preview = previewOverride ?? previewQuery.data ?? null;
  const isCheckingPreview = previewQuery.isFetching === true;
  const isLoadingPreview = !preview && (previewQuery.isLoading === true || isCheckingPreview);
  const outOfSyncFields =
    preview?.fields.filter((field: ProductSyncFieldPreview) => field.hasDifference) ?? [];
  const visibleFields = preview?.fields ?? [];
  const activeFieldCount =
    preview?.fields.filter((field: ProductSyncFieldPreview) => field.direction !== 'disabled')
      .length ?? 0;
  const disabledFieldCount =
    preview?.fields.filter((field: ProductSyncFieldPreview) => field.direction === 'disabled')
      .length ?? 0;
  const inSyncFieldCount =
    visibleFields.filter((field: ProductSyncFieldPreview) => !field.hasDifference).length;
  const syncableFieldCount =
    preview?.fields.filter(
      (field: ProductSyncFieldPreview) => field.willWriteToApp || field.willWriteToBase
    ).length ?? 0;
  const imageLinkCount = Array.isArray(product.imageLinks) ? product.imageLinks.length : 0;
  const uploadCount = Array.isArray(product.images) ? product.images.length : 0;
  const connectionLabel = preview?.profile
    ? resolveConnectionLabel(preview.profile.connectionId, preview.profile.connectionName)
    : null;
  const targetSourceLabel = preview ? resolveTargetSourceLabel(preview.resolvedTargetSource) : null;
  const targetSourceHint = preview ? renderTargetSourceHint(preview.resolvedTargetSource) : null;
  const syncDisabledHint = preview
    ? resolveSyncDisabledHint(preview, syncableFieldCount, outOfSyncFields.length)
    : null;
  const canRunSync =
    Boolean(preview?.canSync) &&
    syncableFieldCount > 0 &&
    !runSyncMutation.isPending &&
    !isCheckingPreview;

  const handleRefreshPreview = async (): Promise<void> => {
    try {
      setPreviewOverride(null);
      const result = await previewQuery.refetch();
      setPreviewOverride(result.data ?? null);
    } catch (error) {
      logClientError(error);
      setPreviewOverride(null);
    }
  };

  const handleRunSync = async (): Promise<void> => {
    try {
      const response = await runSyncMutation.mutateAsync({ productId: product.id });
      setPreviewOverride(response.preview);
      const toastMessage = resolveSyncToastMessage(
        response.result.localChanges,
        response.result.baseChanges,
        response.result.message
      );
      toast(toastMessage, {
        variant:
          response.result.status === 'failed'
            ? 'error'
            : response.result.status === 'skipped'
              ? 'warning'
              : 'success',
      });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to synchronize with Base.com.', {
        variant: 'error',
      });
    }
  };

  return (
    <Card variant='subtle' padding='md' className='bg-card/40 space-y-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400'>Field Sync</h4>
          <p className='text-[11px] text-gray-500'>
            Uses the global Base.com synchronization-engine profile selected for the BL modal.
          </p>
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleRefreshPreview();
            }}
            disabled={isCheckingPreview || runSyncMutation.isPending}
            loading={isCheckingPreview}
            className='min-w-[140px]'
          >
            <RefreshCw className='mr-2 size-3.5' />
            {isCheckingPreview ? 'Refreshing...' : 'Refresh'}
          </Button>
          {preview?.profile && (
            <Badge variant='outline' className='text-[10px]'>
              {preview.profile.name}
            </Badge>
          )}
          {preview?.linkedBaseProductId && (
            <Badge variant='outline' className='text-[10px] font-mono'>
              Base ID: {preview.linkedBaseProductId}
            </Badge>
          )}
          {targetSourceLabel && (
            <Badge variant='outline' className='text-[10px]'>
              {targetSourceLabel}
            </Badge>
          )}
        </div>
      </div>

      {isLoadingPreview ? (
        <Card variant='glass' padding='md' className='bg-white/5 text-[12px] text-gray-400'>
          Loading live Base.com sync status...
        </Card>
      ) : previewQuery.error && !preview ? (
        <Hint variant='warning'>
          {previewQuery.error.message || 'Failed to load Base.com sync preview.'}
        </Hint>
      ) : preview ? (
        <>
          {preview.profile && (
            <Card variant='glass' padding='md' className='bg-white/5 space-y-2'>
              <div className='grid gap-2 md:grid-cols-3'>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Connection</div>
                  <div className='mt-1 text-[11px] text-gray-200 break-words'>
                    {connectionLabel?.primary ?? preview.profile.connectionId}
                  </div>
                  {connectionLabel?.secondary && (
                    <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                      {connectionLabel.secondary}
                    </div>
                  )}
                </div>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Inventory</div>
                  <div className='mt-1 text-[11px] font-mono text-gray-200 break-words'>
                    {preview.profile.inventoryId}
                  </div>
                </div>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Last Run</div>
                  <div className='mt-1 text-[11px] text-gray-200 break-words'>
                    {formatLastRunAt(preview.profile.lastRunAt)}
                  </div>
                </div>
              </div>
              {targetSourceHint && <div className='text-[10px] text-gray-400'>{targetSourceHint}</div>}
            </Card>
          )}

          {visibleFields.length > 0 && (
            <div className='space-y-2'>
              {visibleFields.map((field: ProductSyncFieldPreview) => {
              const fieldActionHint = renderFieldActionHint(field);
              return (
                <Card
                  key={field.appField}
                  variant='glass'
                  padding='md'
                  className={cn(
                    'bg-white/5 space-y-2',
                    field.direction === 'disabled' && 'opacity-80'
                  )}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='text-xs font-semibold text-gray-200'>
                        {field.appFieldLabel}
                      </div>
                      <div className='text-[10px] text-gray-400 break-words'>
                        Base.com field: {field.baseFieldLabel}
                      </div>
                      {field.baseFieldDescription && (
                        <div className='text-[10px] text-gray-500 break-words'>
                          {field.baseFieldDescription}
                        </div>
                      )}
                      {field.baseFieldLabel !== field.baseField && (
                        <div className='text-[10px] font-mono text-gray-500 break-words'>
                          {field.baseField}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] gap-1',
                        field.direction === 'app_to_base' && 'text-blue-300 border-blue-500/30',
                        field.direction === 'base_to_app' &&
                          'text-purple-300 border-purple-500/30'
                      )}
                    >
                      {directionIcon(field.direction)}
                      {directionLabel(field.direction)}
                    </Badge>
                  </div>

                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                    {field.hasDifference ? 'Out of sync' : 'In sync'}
                  </div>

                  <div className='grid gap-2 md:grid-cols-2'>
                    <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2'>
                      <div className='text-[10px] uppercase tracking-wide text-gray-500'>App</div>
                      <div
                        className='mt-1 text-[11px] font-mono text-gray-200 break-words'
                        title={formatFieldValue(field.appValue, field.appField)}
                      >
                        {formatFieldValue(field.appValue, field.appField)}
                      </div>
                    </div>
                    <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2'>
                      <div className='text-[10px] uppercase tracking-wide text-gray-500'>Base</div>
                      <div
                        className='mt-1 text-[11px] font-mono text-gray-200 break-words'
                        title={formatFieldValue(field.baseValue, field.appField)}
                      >
                        {formatFieldValue(field.baseValue, field.appField)}
                      </div>
                    </div>
                  </div>

                  {fieldActionHint && (
                    <div className='text-[10px] text-gray-400'>{fieldActionHint}</div>
                  )}
                  {!fieldActionHint && field.direction !== 'disabled' && (
                    <div className='text-[10px] text-gray-500'>
                      This field is already aligned between the app and Base.com.
                    </div>
                  )}
                  {!fieldActionHint && field.direction === 'disabled' && (
                    <div className='text-[10px] text-gray-500'>
                      This field is disabled in the active sync profile.
                    </div>
                  )}
                </Card>
              );
              })}
            </div>
          )}

          <div className='border-t border-white/5 pt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-1'>
              <Hint size='xxs' uppercase>
                {activeFieldCount} of {preview.fields.length} fields enabled
              </Hint>
              <div className={cn(UI_CENTER_ROW_SPACED_CLASSNAME, 'text-[10px] text-gray-500')}>
                <div className='flex items-center gap-1'>
                  <Check className='size-3 text-emerald-400' />
                  <span>
                    {outOfSyncFields.length} field(s) out of sync, {inSyncFieldCount} already aligned, {disabledFieldCount} disabled
                  </span>
                </div>
              </div>
            </div>

            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={(): void => {
                void handleRunSync();
              }}
              disabled={!canRunSync}
              loading={runSyncMutation.isPending}
              className='min-w-[140px]'
            >
              <Play className='mr-2 size-3.5' />
              {runSyncMutation.isPending ? 'Syncing...' : 'Sync'}
            </Button>
          </div>

          {syncDisabledHint && (
            <Hint variant='warning'>{syncDisabledHint}</Hint>
          )}
        </>
      ) : (
        <Hint variant='warning'>Base.com sync preview is unavailable for this product.</Hint>
      )}

      <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
        <div className='flex items-center justify-between'>
          <h5 className='text-xs font-bold uppercase tracking-wider text-gray-300'>Images</h5>
          <div className='flex gap-2'>
            <Badge variant='outline' className='text-[9px]'>
              Links: {imageLinkCount}
            </Badge>
            <Badge variant='outline' className='text-[9px]'>
              Files: {uploadCount}
            </Badge>
          </div>
        </div>
        <p className='text-[11px] text-gray-400 leading-relaxed'>
          Sync Base.com image URLs into product links to keep backups even if local uploads go
          missing.
        </p>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={!baseListing || syncingImages === baseListing.id || isBaseListingExportBusy}
          onClick={(): void => setIsSyncImagesConfirmOpen(true)}
          className='w-full'
          loading={syncingImages === baseListing?.id}
        >
          Sync Image URLs
        </Button>
        {!baseListing && (
          <Hint variant='warning' className='text-center'>
            Connect to Base.com to enable image sync.
          </Hint>
        )}
      </Card>
    </Card>
  );
}
