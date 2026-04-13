'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { useImageRetryPresets } from '@/features/integrations/components/listings/useImageRetryPresets';
import { useTraderaLiveExecution } from '@/features/integrations/hooks/useTraderaLiveExecution';
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
import { isTraderaStatusCheckPending } from '@/features/integrations/utils/tradera-status-check';
import {
  resolveDuplicateLinkedFromListing,
  resolveDuplicateLinkedFromRunResult,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import { Button, DropdownMenuItem, Label, Input } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
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
    syncingTraderaListing,
    checkingTraderaStatusListing,
    relistingListing,
    relistingBrowserMode,
    openingTraderaLogin,
  } = useProductListingsUIState();

  const {
    handleExportAgain,
    handleExportImagesOnly,
    handleSaveInventoryId,
    handleSyncTradera,
    handleCheckTraderaStatus,
    handleRelistTradera,
    handleRecoverTraderaListing,
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
  const liveTraderaExecution = useTraderaLiveExecution(isTraderaListing ? listing : null);

  const normalizedListingStatus = (listing.status ?? '').trim().toLowerCase();
  const isSuccessStatus = ['active', 'success', 'completed', 'listed', 'ok'].includes(
    normalizedListingStatus
  );
  const isExportingCurrentListing = exportingListing === listing.id;
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
  const traderaLastExecutionAction = (readString(traderaLastExecution['action']) ?? '').trim().toLowerCase();
  const traderaExecutionError = readString(traderaLastExecution['error']);
  const traderaFailureReason = (listing.failureReason ?? '').trim().toLowerCase();
  const isLiveTraderaRunActive =
    liveTraderaExecution?.status === 'queued' || liveTraderaExecution?.status === 'running';
  const liveTraderaAction = liveTraderaExecution?.action ?? null;
  const isTraderaDuplicateLinked =
    isTraderaListing &&
    (resolveDuplicateLinkedFromListing(listing) ||
      resolveDuplicateLinkedFromRunResult(
        liveTraderaExecution?.rawResult,
        liveTraderaExecution?.latestStage
      ));
  const effectiveTraderaAction = liveTraderaAction ?? traderaLastExecutionAction;
  const checkStatusRetryPreferred = effectiveTraderaAction === 'check_status';
  const traderaNeedsManualLogin =
    isTraderaBrowserListing &&
    !isTraderaDuplicateLinked &&
    (['failed', 'needs_login', 'auth_required'].includes(normalizedListingStatus) ||
      checkStatusRetryPreferred) &&
    (traderaErrorCategory === 'auth' ||
      hasTraderaAuthSignal(traderaFailureReason) ||
      hasTraderaAuthSignal(traderaExecutionError));
  const isRelistingCurrentListing = relistingListing === listing.id;
  const isSyncingCurrentListing = syncingTraderaListing === listing.id;
  const isCheckingCurrentListing = checkingTraderaStatusListing === listing.id;
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
  const persistedTraderaPendingSkipImages = traderaPendingExecution['skipImages'] === true;
  const persistedTraderaPendingAction = (readString(traderaPendingExecution['action']) ?? '').trim().toLowerCase();
  const isQueuedTraderaStatusCheck =
    isTraderaBrowserListing && isTraderaStatusCheckPending(listing);
  const isPersistedTraderaQueueState =
    isTraderaBrowserListing &&
    ['queued', 'queued_relist', 'running', 'processing', 'pending', 'in_progress'].includes(
      normalizedListingStatus
    ) &&
    Boolean(persistedTraderaPendingBrowserMode || persistedTraderaPendingAction);
  const isQueuedTraderaSync =
    !isSyncingCurrentListing &&
    isPersistedTraderaQueueState &&
    persistedTraderaPendingAction === 'sync';
  const isQueuedTraderaSyncHeaded =
    isQueuedTraderaSync && persistedTraderaPendingBrowserMode === 'headed' && !persistedTraderaPendingSkipImages;
  const isQueuedTraderaSyncHeadless =
    isQueuedTraderaSync && persistedTraderaPendingBrowserMode === 'headless' && !persistedTraderaPendingSkipImages;
  const isQueuedTraderaSyncFieldsOnly =
    isQueuedTraderaSync && persistedTraderaPendingSkipImages;
  const syncRetryPreferred = persistedTraderaPendingAction === 'sync' || traderaLastExecutionAction === 'sync';
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
    <div className='flex w-full flex-col gap-2 sm:ml-4 sm:w-auto sm:shrink-0'>
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
              disabled={isExportingCurrentListing}
            >
              {isExportingCurrentListing
                ? isSuccessStatus
                  ? 'Queuing re-export...'
                  : 'Queuing export...'
                : isSuccessStatus
                  ? 'Re-export product'
                  : 'Export again'}
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
                void handleRecoverTraderaListing({
                  listingId: listing.id,
                  integrationId: listing.integrationId,
                  connectionId: listing.connectionId,
                  action: checkStatusRetryPreferred
                    ? 'check_status'
                    : syncRetryPreferred
                      ? 'sync'
                      : 'relist',
                  browserMode: 'headed',
                });
              }}
              disabled={openingTraderaLogin === listing.id}
            >
              {openingTraderaLogin === listing.id
                ? 'Waiting for manual login...'
                : checkStatusRetryPreferred
                  ? 'Login and retry status check'
                  : syncRetryPreferred
                  ? 'Login and retry sync'
                  : 'Login and retry relist'}
            </Button>
          )}
          {isTraderaBrowserListing && (
            <ActionMenu
              trigger={
                isQueuedTraderaSyncFieldsOnly
                  ? 'Queued fields-only sync'
                  : isQueuedTraderaSyncHeaded
                    ? 'Queued headed sync'
                    : isQueuedTraderaSyncHeadless
                      ? 'Queued headless sync'
                      : isQueuedTraderaSync
                        ? 'Queued sync'
                        : isSyncingCurrentListing
                          ? 'Queuing sync...'
                          : 'Sync with Tradera'
              }
              ariaLabel={
                isQueuedTraderaSyncFieldsOnly
                  ? 'Queued fields-only sync'
                  : isQueuedTraderaSyncHeaded
                    ? 'Queued headed sync'
                    : isQueuedTraderaSyncHeadless
                      ? 'Queued headless sync'
                      : isQueuedTraderaSync
                        ? 'Queued sync'
                        : isSyncingCurrentListing
                          ? 'Queuing sync'
                          : 'Sync with Tradera'
              }
              variant='outline'
              size='sm'
              disabled={
                isSyncingCurrentListing ||
                isLiveTraderaRunActive ||
                isPersistedTraderaQueueState ||
                isCheckingCurrentListing ||
                isQueuedTraderaStatusCheck
              }
              triggerClassName='px-3 py-1.5 h-auto w-auto'
              align='start'
            >
              <DropdownMenuItem
                onSelect={(): void => {
                  void handleSyncTradera(listing.id, {
                    integrationId: listing.integrationId,
                    connectionId: listing.connectionId,
                  });
                }}
                className='text-gray-200 focus:bg-card/60'
              >
                <div className='flex flex-col'>
                  <span className='text-sm'>Sync (default)</span>
                  <span className='text-xs text-gray-400'>Use connection default browser mode.</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(): void => {
                  void handleSyncTradera(listing.id, {
                    integrationId: listing.integrationId,
                    connectionId: listing.connectionId,
                    browserMode: 'headed',
                  });
                }}
                className='text-gray-200 focus:bg-card/60'
              >
                <div className='flex flex-col'>
                  <span className='text-sm'>Sync headed</span>
                  <span className='text-xs text-gray-400'>Opens a visible browser window.</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(): void => {
                  void handleSyncTradera(listing.id, {
                    integrationId: listing.integrationId,
                    connectionId: listing.connectionId,
                    browserMode: 'headless',
                  });
                }}
                className='text-gray-200 focus:bg-card/60'
              >
                <div className='flex flex-col'>
                  <span className='text-sm'>Sync headless</span>
                  <span className='text-xs text-gray-400'>Runs silently in the background.</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(): void => {
                  void handleSyncTradera(listing.id, {
                    integrationId: listing.integrationId,
                    connectionId: listing.connectionId,
                    skipImages: true,
                  });
                }}
                className='text-gray-200 focus:bg-card/60'
              >
                <div className='flex flex-col'>
                  <span className='text-sm'>Sync fields only</span>
                  <span className='text-xs text-gray-400'>
                    Updates title, price and description. Keeps existing Tradera images.
                  </span>
                </div>
              </DropdownMenuItem>
            </ActionMenu>
          )}
          {isTraderaBrowserListing && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(): void => {
                void handleCheckTraderaStatus(listing.id);
              }}
              disabled={
                isCheckingCurrentListing ||
                isLiveTraderaRunActive ||
                isQueuedTraderaStatusCheck ||
                isPersistedTraderaQueueState ||
                isSyncingCurrentListing ||
                isRelistingCurrentListing
              }
            >
              {isQueuedTraderaStatusCheck
                ? 'Checking status...'
                : isCheckingCurrentListing
                  ? 'Queuing status check...'
                  : 'Check Status'}
            </Button>
          )}
          <Button
            type='button'
            variant='success'
            size='sm'
            onClick={(): void => {
              void handleRelistTradera(listing.id);
            }}
            disabled={
              relistingListing === listing.id ||
              isLiveTraderaRunActive ||
              isPersistedTraderaQueueState ||
              isSyncingCurrentListing ||
              isCheckingCurrentListing ||
              isQueuedTraderaStatusCheck
            }
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
