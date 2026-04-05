'use client';

import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import { Alert } from '@/shared/ui/primitives.public';

import { ConnectedIntegrationFieldsSection } from '../ConnectedIntegrationFieldsSection';
import { useConnectedIntegrationSelectorOptions } from '../hooks/useConnectedIntegrationSelectorOptions';
import { IntegrationSpecificListingSettings } from '../IntegrationSpecificListingSettings';
import { resolveSelectProductIntegrationSettingsCopy } from '../product-listings-copy';
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
  const { integrationOptions, connectionOptions } = useConnectedIntegrationSelectorOptions(
    integrations,
    selectedIntegration?.connections ?? null
  );
  const {
    sectionTitle,
    marketplaceLabel,
    marketplacePlaceholder,
    accountLabel,
    accountPlaceholder,
  } = resolveSelectProductIntegrationSettingsCopy();

  return (
    <div className='space-y-4'>
      <ConnectedIntegrationFieldsSection
        title={sectionTitle}
        variant='subtle'
        className='p-4 space-y-4'
        loading={loadingIntegrations}
        loadingVariant='loading-state'
        loadingSize='sm'
        loadingClassName='py-4'
        marketplaceLabel={marketplaceLabel}
        marketplacePlaceholder={marketplacePlaceholder}
        selectedIntegrationId={selectedIntegrationId}
        onIntegrationChange={setSelectedIntegrationId}
        integrationOptions={integrationOptions}
        showAccountField={Boolean(selectedIntegration)}
        accountLabel={accountLabel}
        accountPlaceholder={accountPlaceholder}
        selectedConnectionId={selectedConnectionId}
        onConnectionChange={setSelectedConnectionId}
        connectionOptions={connectionOptions}
        footer={
          isBaseComIntegration ? (
            <IntegrationSpecificListingSettings includeTradera={false} />
          ) : null
        }
      />

      {error && <Alert variant='error'>{error}</Alert>}
    </div>
  );
}
