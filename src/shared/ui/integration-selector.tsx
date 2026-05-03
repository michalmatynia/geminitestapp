'use client';

import { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';

import { Label } from './label';
import { SelectSimple } from './select-simple';

interface IntegrationSelectorProps {
  integrations: IntegrationWithConnections[];
  selectedIntegrationId: string;
  onIntegrationChange: (id: string) => void;
  selectedConnectionId: string;
  onConnectionChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

type IntegrationSelectorFieldProps = {
  label: string;
  value: string;
  onValueChange: (id: string) => void;
  disabled: boolean;
  options: ReadonlyArray<LabeledOptionDto<string>>;
  placeholder: string;
  ariaLabel: string;
};

function IntegrationSelectorField({
  label,
  value,
  onValueChange,
  disabled,
  options,
  placeholder,
  ariaLabel,
}: IntegrationSelectorFieldProps): React.JSX.Element {
  return (
    <div>
      <Label className='mb-2 block text-sm font-medium text-gray-300'>{label}</Label>
      <SelectSimple
        size='sm'
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        options={options}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        title={ariaLabel}
      />
    </div>
  );
}

export function IntegrationSelector(props: IntegrationSelectorProps): React.JSX.Element {
  const {
    integrations,
    selectedIntegrationId,
    onIntegrationChange,
    selectedConnectionId,
    onConnectionChange,
    disabled = false,
    loading = false,
    className = 'space-y-4',
  } = props;
  const isDisabled = disabled || loading;

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);
  const integrationOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      integrations
        .filter((integration) => Boolean(integration.id))
        .map((integration) => ({
          value: integration.id,
          label: integration.name,
        })),
    [integrations]
  );
  const connectionOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      (selectedIntegration?.connections ?? [])
        .filter((connection) => Boolean(connection.id))
        .map((connection) => ({
          value: connection.id,
          label: connection.name,
        })),
    [selectedIntegration]
  );

  return (
    <div className={className}>
      <IntegrationSelectorField
        label='Integration'
        value={selectedIntegrationId}
        onValueChange={onIntegrationChange}
        disabled={isDisabled}
        options={integrationOptions}
        placeholder='Select an integration...'
        ariaLabel='Select an integration...'
      />

      {selectedIntegration && selectedIntegration.connections.length > 0 && (
        <IntegrationSelectorField
          label='Account / Connection'
          value={selectedConnectionId}
          onValueChange={onConnectionChange}
          disabled={isDisabled}
          options={connectionOptions}
          placeholder='Select an account...'
          ariaLabel='Select an account...'
        />
      )}
    </div>
  );
}
