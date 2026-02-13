import React from 'react';

import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/features/integrations/types/listings';
import { FormField, FormSection, SectionPanel, UnifiedSelect } from '@/shared/ui';

import { BaseListingSettings } from '../BaseListingSettings';

type IntegrationSettingsSectionProps = {
  loadingIntegrations: boolean;
  integrations: IntegrationWithConnections[];
  selectedIntegrationId: string | null;
  selectedConnectionId: string | null;
  selectedIntegration: IntegrationWithConnections | null;
  isBaseComIntegration: boolean;
  error: string | null;
  onIntegrationChange: (value: string) => void;
  onConnectionChange: (value: string) => void;
};

export function IntegrationSettingsSection({
  loadingIntegrations,
  integrations,
  selectedIntegrationId,
  selectedConnectionId,
  selectedIntegration,
  isBaseComIntegration,
  error,
  onIntegrationChange,
  onConnectionChange,
}: IntegrationSettingsSectionProps): React.JSX.Element {
  const integrationsWithConnections = integrations.filter((i: IntegrationWithConnections) => i.connections.length > 0);

  return (
    <div className='space-y-4'>
      <FormSection title='2. Integration Settings' variant='subtle' className='p-4 space-y-4'>
        {loadingIntegrations ? (
          <p className='text-xs text-gray-500'>Loading integrations...</p>
        ) : (
          <>
            <FormField label='Marketplace'>
              <UnifiedSelect
                value={selectedIntegrationId}
                onValueChange={onIntegrationChange}
                options={integrationsWithConnections.map((i) => ({ value: i.id, label: i.name }))}
                placeholder='Select marketplace...'
              />
            </FormField>

            {selectedIntegration && (
              <FormField label='Account'>
                <UnifiedSelect
                  value={selectedConnectionId}
                  onValueChange={onConnectionChange}
                  options={selectedIntegration.connections.map((c: IntegrationConnectionBasic) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder='Select account...'
                />
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

      {error && (
        <SectionPanel variant='subtle-compact' className='border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200'>
          {error}
        </SectionPanel>
      )}
    </div>
  );
}
