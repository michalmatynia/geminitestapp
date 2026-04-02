'use client';

import Link from 'next/link';
import React from 'react';

import { useIntegrationSelection } from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { useProductListingsModals } from '@/features/integrations/context/ProductListingsContext';
import { useProductListingsViewContext } from '@/features/integrations/components/listings/product-listings-modal/context/ProductListingsViewContext';
import { Button, Alert, LoadingState, IntegrationSelector, Card } from '@/shared/ui';

import {
  resolveIntegrationSelectionEmptyStateCopy,
  resolveIntegrationSelectionLoadingMessage,
} from '../product-listings-copy';

export function ProductListingsStartPanel(): React.JSX.Element {
  const { onStartListing, recoveryContext } = useProductListingsModals();
  const { filterIntegrationSlug, statusTargetLabel, isScopedMarketplaceFlow } =
    useProductListingsViewContext();
  const {
    integrations,
    loading: loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection(
    recoveryContext?.integrationId ?? null,
    recoveryContext?.connectionId ?? null,
    { filterIntegrationSlug }
  );
  const { message: emptyStateMessage, setupLabel } = resolveIntegrationSelectionEmptyStateCopy({
    isScopedMarketplaceFlow,
    statusTargetLabel,
  });

  if (loadingIntegrations) {
    return (
      <div className='flex items-center justify-center py-8'>
        <LoadingState message={resolveIntegrationSelectionLoadingMessage()} size='sm' />
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <Alert variant='warning'>
        {emptyStateMessage}{' '}
        <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
          {setupLabel}
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
