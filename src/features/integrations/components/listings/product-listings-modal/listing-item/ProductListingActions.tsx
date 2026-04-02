'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { useImageRetryPresets } from '@/features/integrations/components/listings/useImageRetryPresets';
import {
  PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  TRADERA_INTEGRATION_SLUGS,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useProductListingsActions,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import { Button, ActionMenu, DropdownMenuItem, Label, Input } from '@/shared/ui';
import type { ProductListingWithDetailsProps } from './types';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const hasTraderaAuthSignal = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('login') ||
    normalized.includes('verification') ||
    normalized.includes('captcha') ||
    normalized.includes('auth') ||
    normalized.includes('session expired')
  );
};

type ProductListingActionsProps = ProductListingWithDetailsProps;

export function ProductListingActions(props: ProductListingActionsProps): React.JSX.Element {
  const { listing } = props;
  const {
    exportingListing,
    inventoryOverrides,
    setInventoryOverrides,
    savingInventoryId,
    deletingFromBase,
    purgingListing,
    relistingListing,
    relistingBrowserMode,
    openingTraderaLogin,
  } = useProductListingsUIState();

  const {
    handleExportAgain,
    handleExportImagesOnly,
    handleSaveInventoryId,
    handleRelistTradera,
    handleOpenTraderaLogin,
  } = useProductListingsActions();

  const { setListingToDelete, setListingToPurge } = useProductListingsModals();

  const imageRetryPresets = useImageRetryPresets();
  const isBaseListing = ['baselinker', 'base-com', 'base'].includes(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isTraderaListing = TRADERA_INTEGRATION_SLUGS.has(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isTraderaBrowserListing = isTraderaBrowserIntegrationSlug(listing.integration.slug);
  const isPlaywrightListing =
    normalizeIntegrationSlug(listing.integration.slug) === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG;

  const normalizedListingStatus = (listing.status ?? '').trim().toLowerCase();
  const isSuccessStatus = ['active', 'success', 'completed', 'listed', 'ok'].includes(
    normalizedListingStatus
  );
  const isExportRunningStatus = [
    'running',
    'processing',
    'in_progress',
    'pending',
    'queued',
  ].includes(normalizedListingStatus);
  const canRetryExport = isBaseListing && !isExportRunningStatus;

  const traderaMarketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(traderaMarketplaceData['tradera']);
  const traderaLastExecution = toRecord(traderaData['lastExecution']);
  const traderaPendingExecution = toRecord(traderaData['pendingExecution']);
  const playwrightData = toRecord(traderaMarketplaceData['playwright']);
  const playwrightPendingExecution = toRecord(playwrightData['pendingExecution']);
  const traderaErrorCategory = (
    readString(traderaLastExecution['errorCategory']) ?? readString(traderaData['lastErrorCategory']) ?? ''
  ).trim().toLowerCase();
  const traderaExecutionError = readString(traderaLastExecution['error']);
  const traderaFailureReason = (listing.failureReason ?? '').trim().toLowerCase();
  const traderaNeedsManualLogin =
    isTraderaBrowserListing &&
    ['failed', 'needs_login', 'auth_required'].includes(normalizedListingStatus) &&
    (traderaErrorCategory === 'auth' ||
      hasTraderaAuthSignal(traderaFailureReason) ||
      hasTraderaAuthSignal(traderaExecutionError));
  const isRelistingCurrentListing = relistingListing === listing.id;
  const isRelistingPlaywrightHeadless =
    isRelistingCurrentListing && relistingBrowserMode === 'headless';
  const isRelistingPlaywrightHeaded =
    isRelistingCurrentListing && relistingBrowserMode === 'headed';
  const isRelistingTraderaHeadless =
    isRelistingCurrentListing && isTraderaBrowserListing && relistingBrowserMode === 'headless';
  const isRelistingTraderaHeaded =
    isRelistingCurrentListing && isTraderaBrowserListing && relistingBrowserMode === 'headed';
  const persistedTraderaPendingBrowserMode = readString(
    traderaPendingExecution['requestedBrowserMode']
  );
  const isPersistedTraderaQueueState =
    isTraderaBrowserListing &&
    ['queued', 'queued_relist', 'running', 'processing', 'pending', 'in_progress'].includes(
      normalizedListingStatus
    ) &&
    Boolean(persistedTraderaPendingBrowserMode);
  const isQueuedTraderaHeadless =
    !isRelistingCurrentListing &&
    isPersistedTraderaQueueState &&
    persistedTraderaPendingBrowserMode === 'headless';
  const isQueuedTraderaHeaded =
    !isRelistingCurrentListing &&
    isPersistedTraderaQueueState &&
    persistedTraderaPendingBrowserMode === 'headed';
  const persistedPlaywrightPendingBrowserMode = readString(
    playwrightPendingExecution['requestedBrowserMode']
  );
  const isPersistedPlaywrightQueueState =
    isPlaywrightListing &&
    ['queued', 'queued_relist', 'running', 'processing', 'pending', 'in_progress'].includes(
      normalizedListingStatus
    ) &&
    Boolean(persistedPlaywrightPendingBrowserMode);
  const isQueuedPlaywrightHeadless =
    !isRelistingCurrentListing &&
    isPersistedPlaywrightQueueState &&
    persistedPlaywrightPendingBrowserMode === 'headless';
  const isQueuedPlaywrightHeaded =
    !isRelistingCurrentListing &&
    isPersistedPlaywrightQueueState &&
    persistedPlaywrightPendingBrowserMode === 'headed';
  const isPlaywrightRelistUnavailable = isRelistingCurrentListing || isPersistedPlaywrightQueueState;

  return (
    <div className='ml-4 flex flex-col gap-2'>
      {isBaseListing && (
        <>
          {canRetryExport && (
            <Button
              type='button'
              variant='success'
              size='sm'
              onClick={(): void => {
                void handleExportAgain(listing.id);
              }}
              disabled={exportingListing === listing.id}
            >
              {isSuccessStatus ? 'Re-export product' : 'Export again'}
            </Button>
          )}
          <ActionMenu
            trigger='Re-export images only'
            variant='outline'
            size='sm'
            disabled={exportingListing === listing.id || !listing.externalListingId}
            triggerClassName='px-3 py-1.5 h-auto w-auto'
            align='start'
          >
            <DropdownMenuItem
              onSelect={(): void => {
                void handleExportImagesOnly(listing.id);
              }}
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
                  <span className='text-xs text-gray-400'>{preset.description}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </ActionMenu>
          {!listing.inventoryId && (
            <div className='space-y-1 text-xs text-gray-400'>
              <Label htmlFor={`inventory-${listing.id}`}>Inventory ID</Label>
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
               aria-label='Enter inventory ID' title='Enter inventory ID'/>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={(): void => {
                  void handleSaveInventoryId(listing.id);
                }}
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
                void (async (): Promise<void> => {
                  const recovered = await handleOpenTraderaLogin(
                    listing.id,
                    listing.integrationId,
                    listing.connectionId
                  );
                  if (recovered) {
                    await handleRelistTradera(listing.id, {
                      skipSessionPreflight: true,
                      browserMode: 'headed',
                    });
                  }
                })();
              }}
              disabled={openingTraderaLogin === listing.id}
            >
              {openingTraderaLogin === listing.id
                ? 'Waiting for manual login...'
                : 'Login and retry relist'}
            </Button>
          )}
          <Button
            type='button'
            variant='success'
            size='sm'
            onClick={(): void => {
              void handleRelistTradera(listing.id);
            }}
            disabled={relistingListing === listing.id || isPersistedTraderaQueueState}
          >
            {isRelistingTraderaHeaded
              ? 'Queuing headed relist...'
              : isRelistingTraderaHeadless
                ? 'Queuing headless relist...'
                : isQueuedTraderaHeaded
                  ? 'Queued headed relist'
                  : isQueuedTraderaHeadless
                    ? 'Queued headless relist'
                    : isPersistedTraderaQueueState
                      ? 'Queued relist'
                      : relistingListing === listing.id
                        ? 'Queuing relist...'
                        : 'Relist now'}
          </Button>
        </>
      )}
      {isPlaywrightListing && (
        <>
          <Button
            type='button'
            variant='success'
            size='sm'
            onClick={(): void => {
              void handleRelistTradera(listing.id, {
                browserMode: 'headless',
              });
            }}
            disabled={isPlaywrightRelistUnavailable}
          >
            {isRelistingPlaywrightHeadless
              ? 'Queuing headless relist...'
              : isQueuedPlaywrightHeadless
                ? 'Queued headless relist'
                : 'Relist headless'}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => {
              void handleRelistTradera(listing.id, {
                browserMode: 'headed',
              });
            }}
            disabled={isPlaywrightRelistUnavailable}
          >
            {isRelistingPlaywrightHeaded
              ? 'Queuing headed relist...'
              : isQueuedPlaywrightHeaded
                ? 'Queued headed relist'
                : 'Relist headed'}
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
  );
}
