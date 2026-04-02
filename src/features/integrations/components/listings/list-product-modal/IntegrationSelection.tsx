'use client';

import React, { useMemo } from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';
import type {
  IntegrationWithConnections,
  IntegrationConnectionBasic,
} from '@/shared/contracts/integrations';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormField, FormSection } from '@/shared/ui';
import { SelectSimple } from '@/shared/ui';

import {
  resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy,
  resolveIntegrationSelectionLoadingMessage,
  resolveListProductIntegrationSelectionCopy,
} from '../product-listings-copy';

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
  const {
    sectionTitle,
    marketplaceLabel,
    marketplacePlaceholder,
    accountLabel,
    accountPlaceholder,
    accountDescription,
  } = resolveListProductIntegrationSelectionCopy({
    selectedIntegrationName: selectedIntegration?.name?.trim() || null,
  });
  const { message: emptyStateMessage, detail: emptyStateDetail } =
    resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy();

  if (loading) {
    return (
      <p className='text-sm text-gray-400'>{resolveIntegrationSelectionLoadingMessage()}</p>
    );
  }

  if (integrationsWithConnections.length === 0) {
    return (
      <FormSection
        variant='subtle'
        className='border-yellow-500/40 bg-yellow-500/10 p-6 text-center'
      >
        <p className='text-sm text-yellow-200'>{emptyStateMessage}</p>
        <p className='mt-2 text-xs text-yellow-300/70'>{emptyStateDetail}</p>
      </FormSection>
    );
  }

  return (
    <FormSection title={sectionTitle} className='p-4 space-y-4'>
      <FormField label={marketplaceLabel}>
        <SelectSimple
          value={selectedIntegrationId || undefined}
          onValueChange={setSelectedIntegrationId}
          options={integrationOptions}
          placeholder={marketplacePlaceholder}
         ariaLabel={marketplacePlaceholder} title={marketplacePlaceholder}/>
      </FormField>

      {selectedIntegration && (
        <FormField
          label={accountLabel}
          description={accountDescription ?? undefined}
        >
          <SelectSimple
            value={selectedConnectionId || undefined}
            onValueChange={setSelectedConnectionId}
            options={connectionOptions}
            placeholder={accountPlaceholder}
           ariaLabel={accountPlaceholder} title={accountPlaceholder}/>
        </FormField>
      )}
    </FormSection>
  );
}
