'use client';

import Link from 'next/link';
import React from 'react';

import { useIntegrationSelection } from '@/shared/lib/integrations/components/listings/hooks/useIntegrationSelection';
import { useProductListingsContext } from '@/shared/lib/integrations/context/ProductListingsContext';
import { Button, Alert, LoadingState, IntegrationSelector, Card } from '@/shared/ui';

export function ProductListingsStartPanel(): React.JSX.Element {
  const { onStartListing } = useProductListingsContext();
  const {
    integrations,
    loading: loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

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
        No connected integrations.{' '}
        <Link href='/admin/integrations' className='underline hover:text-yellow-100'>
          Set up an integration
        </Link>
        .
      </Alert>
    );
  }

  return (
    <Card variant='subtle' padding='md' className='bg-card/40'>
      <div className='space-y-4'>
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
