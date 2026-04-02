'use client';

import Link from 'next/link';
import React from 'react';

import { useIntegrationSelection } from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import {
  useProductListingsData,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import { useProductListingsViewContext } from '@/features/integrations/components/listings/product-listings-modal/context/ProductListingsViewContext';
import { readPersistedTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';
import { Button, Alert, LoadingState, IntegrationSelector, Card } from '@/shared/ui';

export function ProductListingsStartPanel(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { onStartListing, recoveryContext } = useProductListingsModals();
  const { filterIntegrationSlug, statusTargetLabel } = useProductListingsViewContext();
  const persistedTraderaFeedback =
    recoveryContext?.source === 'tradera_quick_export_auth_required' ||
    recoveryContext?.source === 'tradera_quick_export_failed'
      ? readPersistedTraderaQuickListFeedback(product.id)
      : null;
  const {
    integrations,
    loading: loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection(
    recoveryContext?.integrationId ?? persistedTraderaFeedback?.integrationId ?? null,
    recoveryContext?.connectionId ?? persistedTraderaFeedback?.connectionId ?? null,
    { filterIntegrationSlug }
  );
  const isScopedMarketplaceFlow = Boolean(filterIntegrationSlug);

  if (loadingIntegrations) {
    return (
      <div className='flex items-center justify-center py-8'>
        <LoadingState message='Loading integrations...' size='sm' />
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <Alert variant='warning'>
        {isScopedMarketplaceFlow ? `No connected ${statusTargetLabel} accounts.` : 'No connected integrations.'}{' '}
        <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
          Set up {isScopedMarketplaceFlow ? `${statusTargetLabel} integration` : 'an integration'}
        </Link>
        .
      </Alert>
    );
  }

  return (
    <Card variant='subtle' padding='md' className='bg-card/40'>
      <div className='space-y-4'>
        {isScopedMarketplaceFlow && (
          <div className='space-y-1 text-center'>
            <div className='text-sm font-semibold text-white'>{statusTargetLabel} options</div>
            <p className='text-xs text-gray-300'>
              Continue with a {statusTargetLabel} account only.
            </p>
          </div>
        )}
        <IntegrationSelector
          integrations={integrations}
          selectedIntegrationId={selectedIntegrationId}
          onIntegrationChange={setSelectedIntegrationId}
          selectedConnectionId={selectedConnectionId}
          onConnectionChange={setSelectedConnectionId}
        />

        <div className='flex justify-center'>
          <Button
            onClick={(): void => {
              if (onStartListing && selectedIntegrationId && selectedConnectionId) {
                onStartListing(selectedIntegrationId, selectedConnectionId);
              }
            }}
            disabled={!selectedIntegrationId || !selectedConnectionId || !onStartListing}
          >
            List Product
          </Button>
        </div>
      </div>
    </Card>
  );
}
