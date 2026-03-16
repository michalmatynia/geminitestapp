import React, { useMemo } from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import type {
  IntegrationWithConnections,
  IntegrationConnectionBasic,
} from '@/shared/contracts/integrations';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormField, FormSection } from '@/shared/ui';
import { SelectSimple } from '@/shared/ui';

export function IntegrationSelection(): React.JSX.Element {
  const {
    integrations,
    loadingIntegrations: loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useListingSelection();
  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );
  const integrationOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      integrationsWithConnections
        .filter((integration: IntegrationWithConnections): boolean => Boolean(integration.id))
        .map((integration: IntegrationWithConnections) => ({
          value: integration.id,
          label: integration.name,
        })),
    [integrationsWithConnections]
  );
  const connectionOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      (selectedIntegration?.connections ?? [])
        .filter((connection: IntegrationConnectionBasic): boolean => Boolean(connection.id))
        .map((connection: IntegrationConnectionBasic) => ({
          value: connection.id,
          label: connection.name,
        })),
    [selectedIntegration]
  );

  if (loading) {
    return <p className='text-sm text-gray-400'>Loading integrations...</p>;
  }

  if (integrationsWithConnections.length === 0) {
    return (
      <FormSection
        variant='subtle'
        className='border-yellow-500/40 bg-yellow-500/10 p-6 text-center'
      >
        <p className='text-sm text-yellow-200'>No integrations with configured accounts found.</p>
        <p className='mt-2 text-xs text-yellow-300/70'>
          Please set up an integration with at least one account first.
        </p>
      </FormSection>
    );
  }

  return (
    <FormSection title='Integration Target' className='p-4 space-y-4'>
      <FormField label='Marketplace / Integration'>
        <SelectSimple
          value={selectedIntegrationId || undefined}
          onValueChange={setSelectedIntegrationId}
          options={integrationOptions}
          placeholder='Select a marketplace...'
         ariaLabel='Select a marketplace...' title='Select a marketplace...'/>
      </FormField>

      {selectedIntegration && (
        <FormField
          label='Account'
          description={`Choose which account to use for listing this product on ${selectedIntegration.name}.`}
        >
          <SelectSimple
            value={selectedConnectionId || undefined}
            onValueChange={setSelectedConnectionId}
            options={connectionOptions}
            placeholder='Select an account...'
           ariaLabel='Select an account...' title='Select an account...'/>
        </FormField>
      )}
    </FormSection>
  );
}
