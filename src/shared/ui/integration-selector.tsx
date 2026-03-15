'use client';

import type { IntegrationWithConnections } from '@/shared/contracts';

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

export function IntegrationSelector(props: IntegrationSelectorProps) {
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

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);

  return (
    <div className={className}>
      <div>
        <Label className='mb-2 block text-sm font-medium text-gray-300'>Integration</Label>
        <SelectSimple
          size='sm'
          value={selectedIntegrationId}
          onValueChange={onIntegrationChange}
          disabled={disabled || loading}
          options={integrations
            .filter((integration) => !!integration.id)
            .map((integration) => ({
              value: integration.id,
              label: integration.name,
            }))}
          placeholder='Select an integration...'
         ariaLabel='Select an integration...' title='Select an integration...'/>
      </div>

      {selectedIntegration && selectedIntegration.connections.length > 0 && (
        <div>
          <Label className='mb-2 block text-sm font-medium text-gray-300'>
            Account / Connection
          </Label>
          <SelectSimple
            size='sm'
            value={selectedConnectionId}
            onValueChange={onConnectionChange}
            disabled={disabled || loading}
            options={selectedIntegration.connections
              .filter((connection) => !!connection.id)
              .map((connection) => ({
                value: connection.id,
                label: connection.name,
              }))}
            placeholder='Select an account...'
           ariaLabel='Select an account...' title='Select an account...'/>
        </div>
      )}
    </div>
  );
}
