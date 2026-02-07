'use client';

import Link from 'next/link';
import React from 'react';

import { useIntegrationSelection } from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import {
  Button,
  SectionPanel,
  IntegrationSelector,
} from '@/shared/ui';

export function ProductListingsStartPanel({ 
  onStartListing 
}: { 
  onStartListing?: (integrationId: string, connectionId: string) => void 
}): React.JSX.Element {
  const {
    integrations,
    loading: loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

  if (loadingIntegrations) {
    return <p className="text-sm text-gray-400">Loading integrations...</p>;
  }

  if (integrations.length === 0) {
    return (
      <SectionPanel variant="subtle-compact" className="border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
        No connected integrations.{' '}
        <Link href="/admin/integrations" className="underline hover:text-yellow-100">
          Set up an integration
        </Link>
        .
      </SectionPanel>
    );
  }

  return (
    <SectionPanel variant="subtle" className="px-4 py-4">
      <div className="space-y-4">
        <IntegrationSelector
          integrations={integrations}
          selectedIntegrationId={selectedIntegrationId}
          onIntegrationChange={setSelectedIntegrationId}
          selectedConnectionId={selectedConnectionId}
          onConnectionChange={setSelectedConnectionId}
        />

        <div className="flex justify-center">
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
    </SectionPanel>
  );
}
