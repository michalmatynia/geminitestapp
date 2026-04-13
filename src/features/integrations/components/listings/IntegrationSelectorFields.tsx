'use client';

import React from 'react';

import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { useIntegrationSelectorProps } from './hooks/useIntegrationSelectorProps';

export function IntegrationSelectorFields(): React.JSX.Element {
  const {
    marketplaceLabel,
    marketplacePlaceholder,
    selectedIntegrationId,
    setSelectedIntegrationId,
    integrationOptions,
    showAccountField,
    accountLabel,
    accountPlaceholder,
    selectedConnectionId,
    setSelectedConnectionId,
    connectionOptions,
    accountDescription,
  } = useIntegrationSelectorProps();

  return (
    <>
      <FormField label={marketplaceLabel}>
        <SelectSimple
          value={selectedIntegrationId ?? undefined}
          onValueChange={setSelectedIntegrationId}
          options={integrationOptions}
          placeholder={marketplacePlaceholder}
          ariaLabel={marketplacePlaceholder}
          title={marketplacePlaceholder}
        />
      </FormField>

      {showAccountField && (
        <FormField label={accountLabel} description={accountDescription ?? undefined}>
          <SelectSimple
            value={selectedConnectionId ?? undefined}
            onValueChange={setSelectedConnectionId}
            options={connectionOptions}
            placeholder={accountPlaceholder}
            ariaLabel={accountPlaceholder}
            title={accountPlaceholder}
          />
        </FormField>
      )}
    </>
  );
}
