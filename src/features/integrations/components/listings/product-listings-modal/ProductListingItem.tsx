'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { useImageRetryPresets } from '@/features/integrations/components/listings/useImageRetryPresets';
import {
  isTraderaBrowserIntegrationSlug,
  TRADERA_INTEGRATION_SLUGS,
} from '@/features/integrations/constants/slugs';
import { useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import type { ProductListingWithDetails, ProductListingExportEvent } from '@/shared/contracts/integrations';
import type { ImageRetryPresetDto as ImageRetryPreset } from '@/shared/contracts/integrations';
import {
  Button,
  Input,
  ActionMenu,
  DropdownMenuItem,
  Label,
  StatusBadge,
  Card,
} from '@/shared/ui';

const formatTimestamp = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date: Date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatListValue = (value: string | null | undefined): string =>
  value ? value : '—';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingItem({ listing }: { listing: ProductListingWithDetails }): React.JSX.Element {
  const {
    product,
    exportingListing,
    inventoryOverrides,
    setInventoryOverrides,
    historyOpenByListing,
    setHistoryOpenByListing,
    savingInventoryId,
    handleExportAgain,
    handleExportImagesOnly,
    handleSaveInventoryId,
    setListingToDelete,
    setListingToPurge,
    deletingFromBase,
    purgingListing,
    relistingListing,
    openingTraderaLogin,
    handleRelistTradera,
    handleOpenTraderaLogin,
  } = useProductListingsContext();

  const imageRetryPresets = useImageRetryPresets();
  const isBaseListing = ['baselinker', 'base-com', 'base'].includes(normalizeIntegrationSlug(listing.integration.slug));
  const isTraderaListing = TRADERA_INTEGRATION_SLUGS.has(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isTraderaBrowserListing = isTraderaBrowserIntegrationSlug(
    listing.integration.slug
  );
  const normalizedListingStatus = (listing.status ?? '').trim().toLowerCase();
  const isSuccessStatus = ['active', 'success', 'completed', 'listed', 'ok'].includes(normalizedListingStatus);
  const isExportRunningStatus = ['running', 'processing', 'in_progress', 'pending', 'queued'].includes(normalizedListingStatus);
  const canRetryExport = isBaseListing && !isExportRunningStatus;
  const traderaFailureReason = (listing.failureReason ?? '').trim().toLowerCase();
  const traderaNeedsManualLogin =
    isTraderaBrowserListing &&
    ['failed', 'needs_login', 'auth_required'].includes(
      normalizedListingStatus
    ) &&
    (
      traderaFailureReason.includes('login') ||
      traderaFailureReason.includes('verification') ||
      traderaFailureReason.includes('captcha') ||
      traderaFailureReason.includes('auth')
    );

  const getExportFieldsLabel = (): string => {
    const fields: string[] = [];
    if (product.sku) fields.push('SKU');
    if (product.ean) fields.push('EAN');
    if (product.weight !== null && product.weight !== undefined) fields.push('Weight');
    if (product.name_en) fields.push('Name');
    if (product.description_en) fields.push('Description');
    if (product.price !== null && product.price !== undefined) fields.push('Price');
    if (product.stock !== null && product.stock !== undefined) fields.push('Stock');
    return fields.length > 0 ? fields.join(', ') : 'No exportable fields detected';
  };

  return (
    <Card variant='subtle' padding='md' className='flex items-center justify-between'>
      <div className='flex-1'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-white'>
            {listing.integration.name}
          </span>
          <StatusBadge status={listing.status} />
        </div>
        <p className='mt-1 text-xs text-gray-400'>
          Account: {listing.connection.name}
        </p>
        {listing.externalListingId && (
          <p className='text-xs text-gray-500'>
            External ID: {listing.externalListingId}
          </p>
        )}
        {listing.inventoryId && (
          <p className='text-xs text-gray-500'>
            Inventory ID: {listing.inventoryId}
          </p>
        )}
        <div className='mt-2 space-y-1 text-xs text-gray-500'>
          <p>Last export: {formatTimestamp(listing.listedAt)}</p>
          {isTraderaListing && (
            <>
              <p>Expires: {formatTimestamp(listing.expiresAt)}</p>
              <p>Next relist: {formatTimestamp(listing.nextRelistAt)}</p>
              <p>Relist attempts: {listing.relistAttempts ?? 0}</p>
            </>
          )}
          <p>Created: {formatTimestamp(listing.createdAt)}</p>
          <p>Updated: {formatTimestamp(listing.updatedAt)}</p>
          {listing.failureReason ? (
            <p className='text-red-300/90'>Failure: {listing.failureReason}</p>
          ) : null}
          {isBaseListing && (
            <p>Exported fields: {getExportFieldsLabel()}</p>
          )}
        </div>
        {listing.exportHistory && listing.exportHistory.length > 0 ? (
          <Card variant='subtle-compact' padding='sm' className='mt-3 bg-card/50'>
            <div className='flex items-center justify-between'>
              <p className='text-[10px] uppercase tracking-wide text-gray-500'>
                Export history
              </p>
              <Button
                type='button'
                variant='ghost'
                size='xs'
                onClick={(): void =>
                  setHistoryOpenByListing((prev) => ({
                    ...prev,
                    [listing.id]: !(prev[listing.id] ?? false),
                  }))
                }
                className='text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-200'
              >
                {(historyOpenByListing[listing.id] ?? false)
                  ? 'Hide'
                  : 'Show'}
              </Button>
            </div>
            {(historyOpenByListing[listing.id] ?? false) ? (
              <div className='mt-2 space-y-2 text-xs text-gray-400'>
                {listing.exportHistory.slice(0, 5).map((event: ProductListingExportEvent, index: number) => (
                  <div key={`${listing.id}-export-${index}`} className='grid gap-1'>
                    <div className='flex items-center justify-between text-gray-300'>
                      <span>{formatTimestamp(event.exportedAt)}</span>
                      <span className='uppercase text-[10px] text-gray-500'>
                        {event.status ?? 'success'}
                      </span>
                    </div>
                    <div className='grid gap-1'>
                      <span>Inventory: {formatListValue(event.inventoryId)}</span>
                      <span>Template: {formatListValue(event.templateId)}</span>
                      <span>Warehouse: {formatListValue(event.warehouseId)}</span>
                      {event.externalListingId && (
                        <span>External ID: {event.externalListingId}</span>
                      )}
                      {event.fields && event.fields.length > 0 ? (
                        <span>Fields: {event.fields.join(', ')}</span>
                      ) : (
                        <span>Fields: &mdash;</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : (
          <p className='mt-2 text-xs text-gray-600'>No export history recorded.</p>
        )}
      </div>
      <div className='ml-4 flex flex-col gap-2'>
        {isBaseListing && (
          <>
            {canRetryExport && (
              <Button
                type='button'
                variant='success'
                size='sm'
                onClick={(): void => { void handleExportAgain(listing.id); }}
                disabled={exportingListing === listing.id}
              >
                {isSuccessStatus ? 'Re-export product' : 'Export again'}
              </Button>
            )}
            <ActionMenu
              trigger='Re-export images only'
              variant='info'
              size='sm'
              disabled={
                exportingListing === listing.id ||
                !listing.externalListingId
              }
              triggerClassName='px-3 py-1.5 h-auto w-auto'
              align='start'
            >
              <DropdownMenuItem
                onSelect={(): void => { void handleExportImagesOnly(listing.id); }}
                className='text-gray-200 focus:bg-card/60'
              >
                <div className='flex flex-col'>
                  <span className='text-sm'>No resize (base-only)</span>
                  <span className='text-xs text-gray-400'>
                    Re-send images without extra compression.
                  </span>
                </div>
              </DropdownMenuItem>
              {imageRetryPresets.map((preset: ImageRetryPreset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onSelect={(): void => {
                    void handleExportImagesOnly(listing.id, preset);
                  }}
                  className='text-gray-200 focus:bg-card/60'
                >
                  <div className='flex flex-col'>
                    <span className='text-sm'>{preset.label}</span>
                    <span className='text-xs text-gray-400'>
                      {preset.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </ActionMenu>
            {!listing.inventoryId && (
              <div className='space-y-1 text-xs text-gray-400'>
                <Label htmlFor={`inventory-${listing.id}`}>
                  Inventory ID
                </Label>
                <Input
                  id={`inventory-${listing.id}`}
                  value={inventoryOverrides[listing.id] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setInventoryOverrides((prev) => ({
                      ...prev,
                      [listing.id]: e.target.value,
                    }))
                  }
                  placeholder='Enter inventory ID'
                  className='h-7 border bg-card/60 text-gray-200'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={(): void => { void handleSaveInventoryId(listing.id); }}
                  disabled={savingInventoryId === listing.id}
                  className='h-7 border text-gray-200 hover:bg-muted/50'
                >
                  Save inventory ID
                </Button>
              </div>
            )}
            <Button
              type='button'
              variant='destructive'
              size='sm'
              onClick={(): void => setListingToDelete(listing.id)}
              disabled={deletingFromBase === listing.id || !listing.externalListingId}
            >
              Delete from Base.com
            </Button>
          </>
        )}
        {isTraderaListing && (
          <>
            {traderaNeedsManualLogin && (
              <Button
                type='button'
                variant='warning'
                size='sm'
                onClick={(): void => {
                  void handleOpenTraderaLogin(
                    listing.id,
                    listing.integrationId,
                    listing.connectionId
                  );
                }}
                disabled={openingTraderaLogin === listing.id}
              >
                {openingTraderaLogin === listing.id
                  ? 'Waiting for manual login...'
                  : 'Open login window'}
              </Button>
            )}
            <Button
              type='button'
              variant='success'
              size='sm'
              onClick={(): void => { void handleRelistTradera(listing.id); }}
              disabled={relistingListing === listing.id}
            >
              {relistingListing === listing.id ? 'Queuing relist...' : 'Relist now'}
            </Button>
          </>
        )}
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={(): void => setListingToPurge(listing.id)}
          disabled={purgingListing === listing.id}
          className='text-gray-400 hover:bg-muted/50 hover:text-red-400'
        >
          <Trash2 className='mr-1 size-3' />
          {isBaseListing ? 'Break connection' : 'Remove history'}
        </Button>
      </div>
    </Card>
  );
}
