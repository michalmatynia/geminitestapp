'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormField, SelectSimple } from '@/shared/ui';

type IntegrationSelectorFieldsProps = {
  marketplaceLabel: string;
  marketplacePlaceholder: string;
  selectedIntegrationId: string | null | undefined;
  onIntegrationChange: (value: string) => void;
  integrationOptions: Array<LabeledOptionDto<string>>;
  showAccountField: boolean;
  accountLabel: string;
  accountPlaceholder: string;
  selectedConnectionId: string | null | undefined;
  onConnectionChange: (value: string) => void;
  connectionOptions: Array<LabeledOptionDto<string>>;
  accountDescription?: string | null | undefined;
};

export function IntegrationSelectorFields({
  marketplaceLabel,
  marketplacePlaceholder,
  selectedIntegrationId,
  onIntegrationChange,
  integrationOptions,
  showAccountField,
  accountLabel,
  accountPlaceholder,
  selectedConnectionId,
  onConnectionChange,
  connectionOptions,
  accountDescription,
}: IntegrationSelectorFieldsProps): React.JSX.Element {
  return (
    <>
      <FormField label={marketplaceLabel}>
        <SelectSimple
          value={selectedIntegrationId ?? undefined}
          onValueChange={onIntegrationChange}
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
            onValueChange={onConnectionChange}
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
