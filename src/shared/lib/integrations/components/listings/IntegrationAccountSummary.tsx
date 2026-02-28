'use client';

import React from 'react';

import { useOptionalListingSettingsContext } from '@/shared/lib/integrations/context/ListingSettingsContext';
import type { IntegrationConnectionBasic } from '@/shared/contracts/integrations';

interface IntegrationAccountSummaryProps {
  integrationName?: string;
  connectionName?: string;
}

export function IntegrationAccountSummary({
  integrationName,
  connectionName,
}: IntegrationAccountSummaryProps): React.JSX.Element {
  const listingSettings = useOptionalListingSettingsContext();
  const selectedConnection = (listingSettings?.selectedIntegration?.connections ?? []).find(
    (connection: IntegrationConnectionBasic) =>
      connection.id === listingSettings?.selectedConnectionId
  );
  const resolvedIntegrationName = integrationName ?? listingSettings?.selectedIntegration?.name;
  const resolvedConnectionName = connectionName ?? selectedConnection?.name;

  return (
    <div className='rounded-md border bg-card/50 px-4 py-3'>
      <p className='text-sm text-gray-300'>
        <span className='text-gray-500'>Integration:</span>{' '}
        <span className='font-medium'>{resolvedIntegrationName || 'Loading...'}</span>
      </p>
      <p className='text-sm text-gray-300'>
        <span className='text-gray-500'>Account:</span>{' '}
        <span className='font-medium'>{resolvedConnectionName || 'Loading...'}</span>
      </p>
    </div>
  );
}
