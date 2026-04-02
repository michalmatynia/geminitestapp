import React from 'react';

import {
  useProductListingsActions,
  useProductListingsData,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import { readPersistedTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';
import { EmptyState, Card } from '@/shared/ui';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export function ProductListingsEmpty(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { filterIntegrationSlug, statusTargetLabel, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { onStartListing, recoveryContext } = useProductListingsModals();
  const { handleOpenTraderaLogin } = useProductListingsActions();
  const { openingTraderaLogin } = useProductListingsUIState();
  const isFailedBaseQuickExportRecovery = recoveryContext?.source === 'base_quick_export_failed';
  const isTraderaQuickExportRecovery =
    recoveryContext?.source === 'tradera_quick_export_auth_required' ||
    recoveryContext?.source === 'tradera_quick_export_failed';
  const recoveryRecord =
    recoveryContext && typeof recoveryContext === 'object'
      ? (recoveryContext as Record<string, unknown>)
      : null;
  const persistedTraderaFeedback = isTraderaQuickExportRecovery
    ? readPersistedTraderaQuickListFeedback(product.id)
    : null;
  const recoveryRequestId =
    readOptionalString(recoveryRecord?.['requestId']) ?? persistedTraderaFeedback?.requestId ?? null;
  const recoveryIntegrationId =
    readOptionalString(recoveryRecord?.['integrationId']) ??
    persistedTraderaFeedback?.integrationId ??
    null;
  const recoveryConnectionId =
    readOptionalString(recoveryRecord?.['connectionId']) ??
    persistedTraderaFeedback?.connectionId ??
    null;
  const canOpenTraderaRecoveryLogin =
    isTraderaQuickExportRecovery && Boolean(recoveryIntegrationId && recoveryConnectionId);
  const openingRecoveryLogin = openingTraderaLogin === 'recovery';

  return (
    <div className='space-y-4'>
      {isFailedBaseQuickExportRecovery && (
        <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
          <div className='space-y-1 text-center'>
            <div className='text-sm font-semibold text-white'>Previous Base.com export failed</div>
            <p className='text-xs text-gray-300'>
              The one-click export did not create a saved marketplace listing. Review the last
              failure details below, then use the options above to retry with a connection.
            </p>
          </div>
          <div className='grid gap-2 text-xs text-gray-300 sm:grid-cols-2'>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Status
              </div>
              <div className='font-mono text-white'>{recoveryContext.status}</div>
            </div>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Run ID
              </div>
              <div className='font-mono text-white'>{recoveryContext.runId ?? 'Unavailable'}</div>
            </div>
          </div>
        </Card>
      )}
      {isTraderaQuickExportRecovery && (
        <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
          <div className='space-y-1 text-center'>
            <div className='text-sm font-semibold text-white'>
              Tradera quick export needs recovery
            </div>
            <p className='text-xs text-gray-300'>
              The one-click Tradera export did not leave behind a usable listing record yet. Open
              the Tradera login window if needed, then continue directly into the Tradera listing
              flow from this modal.
            </p>
          </div>
          <div className='grid gap-2 text-xs text-gray-300 sm:grid-cols-2'>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Status
              </div>
              <div className='font-mono text-white'>{recoveryContext.status}</div>
            </div>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Queue job
              </div>
              <div className='font-mono text-white'>{recoveryRequestId ?? 'Unavailable'}</div>
            </div>
          </div>
          {canOpenTraderaRecoveryLogin && (
            <div className='flex justify-center'>
              <button
                type='button'
                className='inline-flex h-9 items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/10 px-4 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={(): void => {
                  void (async (): Promise<void> => {
                    const recovered = await handleOpenTraderaLogin(
                      'recovery',
                      recoveryIntegrationId!,
                      recoveryConnectionId!
                    );
                    if (recovered) {
                      onStartListing?.(recoveryIntegrationId!, recoveryConnectionId!, {
                        autoSubmit: true,
                      });
                    }
                  })();
                }}
                disabled={openingRecoveryLogin}
              >
                {openingRecoveryLogin
                  ? 'Waiting for manual login...'
                  : 'Login and continue listing'}
              </button>
            </div>
          )}
        </Card>
      )}
      {filterIntegrationSlug ? (
        <Card variant='subtle' padding='lg' className='bg-card/50 text-center space-y-3'>
          <div className='text-sm text-gray-300'>{statusTargetLabel} status</div>
          <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-400'>
            Not connected.
          </Card>
          {showSync && isBaseFilter && <ProductListingsSyncPanel />}
        </Card>
      ) : (
        <EmptyState
          title='No listings found'
          description={
            isFailedBaseQuickExportRecovery
              ? 'The last Base.com one-click export failed before a listing record was created. Use the options above to retry or choose a different connection.'
              : isTraderaQuickExportRecovery
                ? 'The last Tradera quick export stopped before a stable listing record was available. Open the Tradera login window if needed, then continue the Tradera listing flow from this modal.'
              : 'This product is not listed on any marketplace yet. Use the + button in the header to list products on a marketplace.'
          }
          className='py-12'
        />
      )}
    </div>
  );
}
