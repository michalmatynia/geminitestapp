'use client';

import React from 'react';

import { useIntegrationSelection } from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { useProductListingsModals } from '@/features/integrations/context/ProductListingsContext';
import { useProductListingsViewContext } from '@/features/integrations/components/listings/product-listings-modal/context/ProductListingsViewContext';
import { Button, Card } from '@/shared/ui/primitives.public';

import { ConnectedIntegrationSelector } from '../ConnectedIntegrationSelector';
import { resolveIntegrationSelectionEmptyStateCopy } from '../product-listings-copy';

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
  const shouldAutoSubmitRecoveryRestart =
    Boolean(recoveryContext?.integrationId && recoveryContext?.connectionId) &&
    recoveryContext?.integrationId === selectedIntegrationId &&
    recoveryContext?.connectionId === selectedConnectionId;
  const selector = (
    <ConnectedIntegrationSelector
      integrations={integrations}
      loading={loadingIntegrations}
      selectedIntegrationId={selectedIntegrationId}
      selectedConnectionId={selectedConnectionId}
      setSelectedIntegrationId={setSelectedIntegrationId}
      setSelectedConnectionId={setSelectedConnectionId}
      emptyStateVariant='alert-link'
      emptyStateMessage={emptyStateMessage}
      emptyStateSetupLabel={setupLabel}
      loadingVariant='loading-state'
      loadingContainerClassName='flex items-center justify-center py-8'
      loadingSize='sm'
    />
  );

  if (loadingIntegrations || integrations.length === 0) {
    return selector;
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
        {selector}

        <div className='flex justify-center'>
          <Button
            onClick={(): void => {
              if (onStartListing && selectedIntegrationId && selectedConnectionId) {
                onStartListing(selectedIntegrationId, selectedConnectionId, {
                  autoSubmit: shouldAutoSubmitRecoveryRestart,
                });
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
