import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import type {
  IntegrationConnectionBasic,
  IntegrationWithConnections,
} from '@/shared/contracts/integrations';
import { FormField, FormSection, SelectSimple, Alert, LoadingState } from '@/shared/ui';

import { BaseListingSettings } from '../BaseListingSettings';
import { useSelectProductForListingModalContext } from './context/SelectProductForListingModalContext';

export function IntegrationSettingsSection(): React.JSX.Element {
  const {
    integrations,
    loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useListingSelection();
  const { error } = useSelectProductForListingModalContext();
  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );

  return (
    <div className='space-y-4'>
      <FormSection title='2. Integration Settings' variant='subtle' className='p-4 space-y-4'>
        {loadingIntegrations ? (
          <LoadingState message='Loading integrations...' size='sm' className='py-4' />
        ) : (
          <>
            <FormField label='Marketplace'>
              <SelectSimple
                value={selectedIntegrationId ?? undefined}
                onValueChange={setSelectedIntegrationId}
                options={integrationsWithConnections.map((i) => ({ value: i.id, label: i.name }))}
                placeholder='Select marketplace...'
               ariaLabel='Select marketplace...' title='Select marketplace...'/>
            </FormField>

            {selectedIntegration && (
              <FormField label='Account'>
                <SelectSimple
                  value={selectedConnectionId ?? undefined}
                  onValueChange={setSelectedConnectionId}
                  options={selectedIntegration.connections.map((c: IntegrationConnectionBasic) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder='Select account...'
                 ariaLabel='Select account...' title='Select account...'/>
              </FormField>
            )}

            {isBaseComIntegration && selectedConnectionId && (
              <div className='pt-4 border-t border-border'>
                <BaseListingSettings />
              </div>
            )}
          </>
        )}
      </FormSection>

      {error && <Alert variant='error'>{error}</Alert>}
    </div>
  );
}
