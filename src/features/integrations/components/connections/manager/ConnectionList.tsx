'use client';

import React from 'react';
import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection } from '@/shared/contracts/integrations';
import { Button, FormSection, SimpleSettingsList } from '@/shared/ui';

import { ConnectionEditModal } from './ConnectionEditModal';

export function ConnectionList(): React.JSX.Element {
  const [connectionToEdit, setConnectionToEdit] = React.useState<IntegrationConnection | null>(
    null
  );

  const {
    activeIntegration,
    connections,
    editingConnectionId,
    setEditingConnectionId,
    handleDeleteConnection,
    handleTestConnection,
    handleBaselinkerTest,
    handleAllegroTest,
    handleTraderaManualLogin,
    isTesting,
  } = useIntegrationsContext();

  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaBrowser = isTradera && integrationSlug !== 'tradera-api';
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';

  return (
    <FormSection title='Existing connection' className='p-4'>
      <SimpleSettingsList
        items={connections.map((connection: IntegrationConnection) => ({
          id: connection.id,
          title: connection.name,
          subtitle: connection.username,
          description:
            editingConnectionId === connection.id ? (
              <span className='text-[10px] uppercase tracking-wide text-emerald-300 font-bold'>
                Active connection
              </span>
            ) : undefined,
          original: connection,
        }))}
        emptyMessage='No connections yet.'
        renderActions={(item) => (
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='xs'
              className='h-7 text-[10px] uppercase font-bold text-gray-200 hover:text-white'
              type='button'
              onClick={(): void => {
                setEditingConnectionId(item.original.id);
                setConnectionToEdit(item.original);
              }}
            >
              Edit
            </Button>
            <Button
              variant='outline'
              size='xs'
              className={`h-7 text-[10px] uppercase font-bold ${
                isBaselinker
                  ? 'text-purple-300 hover:text-purple-200'
                  : isAllegro
                    ? 'text-amber-300 hover:text-amber-200'
                    : 'text-sky-300 hover:text-sky-200'
              }`}
              type='button'
              onClick={(): void => {
                if (isBaselinker) void handleBaselinkerTest(item.original);
                else if (isAllegro) void handleAllegroTest(item.original);
                else void handleTestConnection(item.original);
              }}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
            {isTraderaBrowser && (
              <Button
                variant='outline'
                size='xs'
                className='h-7 text-[10px] uppercase font-bold text-emerald-300 hover:text-emerald-200'
                type='button'
                onClick={(): void => {
                  void handleTraderaManualLogin(item.original);
                }}
                disabled={isTesting}
              >
                {isTesting ? 'Starting...' : 'Login window'}
              </Button>
            )}
          </div>
        )}
        onDelete={(item) => handleDeleteConnection(item.original)}
      />
      <ConnectionEditModal
        connection={connectionToEdit}
        onClose={() => setConnectionToEdit(null)}
      />
    </FormSection>
  );
}
