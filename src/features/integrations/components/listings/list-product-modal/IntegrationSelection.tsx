import React from 'react';

import type { IntegrationWithConnections, IntegrationConnectionBasic } from '@/features/integrations/types/listings';
import { FormField, FormSection } from '@/shared/ui';
import { UnifiedSelect } from '@/shared/ui';

type IntegrationSelectionProps = {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedIntegrationId: string | null;
  selectedConnectionId: string | null;
  selectedIntegration: IntegrationWithConnections | null;
  onIntegrationChange: (value: string) => void;
  onConnectionChange: (value: string) => void;
};

export function IntegrationSelection({
  integrations,
  loading,
  selectedIntegrationId,
  selectedConnectionId,
  selectedIntegration,
  onIntegrationChange,
  onConnectionChange,
}: IntegrationSelectionProps): React.JSX.Element {
  const integrationsWithConnections = integrations.filter((i: IntegrationWithConnections) => i.connections.length > 0);

  if (loading) {
    return <p className='text-sm text-gray-400'>Loading integrations...</p>;
  }

  if (integrationsWithConnections.length === 0) {
    return (
      <FormSection variant='subtle' className='border-yellow-500/40 bg-yellow-500/10 p-6 text-center'>
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
        <UnifiedSelect
          value={selectedIntegrationId}
          onValueChange={onIntegrationChange}
          options={integrationsWithConnections
            .filter((integration: IntegrationWithConnections): boolean => !!integration.id)
            .map((integration: IntegrationWithConnections) => ({
              value: integration.id,
              label: integration.name,
            }))}
          placeholder='Select a marketplace...'
        />
      </FormField>

      {selectedIntegration && (
        <FormField
          label='Account'
          description={`Choose which account to use for listing this product on ${selectedIntegration.name}.`}
        >
          <UnifiedSelect
            value={selectedConnectionId}
            onValueChange={onConnectionChange}
            options={selectedIntegration.connections
              .filter((connection: IntegrationConnectionBasic): boolean => !!connection.id)
              .map((connection: IntegrationConnectionBasic) => ({
                value: connection.id,
                label: connection.name,
              }))}
            placeholder='Select an account...'
          />
        </FormField>
      )}
    </FormSection>
  );
}
