'use client';

import React from 'react';
import {
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection } from '@/shared/contracts/integrations';
import { Button, FormSection, SimpleSettingsList } from '@/shared/ui';

export function ConnectionList(): React.JSX.Element {
  const {
    activeIntegration,
    connections,
    editingConnectionId,
    setEditingConnectionId,
    setConnectionForm,
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
          description: editingConnectionId === connection.id ? (
            <span className='text-[10px] uppercase tracking-wide text-emerald-300 font-bold'>Selected for editing</span>
          ) : undefined,
          original: connection
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
                const connection = item.original;
                const preserveCurrentSecrets =
                  editingConnectionId === connection.id;
                setEditingConnectionId(connection.id);
                setConnectionForm((prev) => ({
                  name: connection.name,
                  username: connection.username ?? '',
                  password: preserveCurrentSecrets ? prev.password : '',
                  traderaDefaultTemplateId:
                    connection.traderaDefaultTemplateId ?? '',
                  traderaDefaultDurationHours:
                    connection.traderaDefaultDurationHours ?? 72,
                  traderaAutoRelistEnabled:
                    connection.traderaAutoRelistEnabled ?? true,
                  traderaAutoRelistLeadMinutes:
                    connection.traderaAutoRelistLeadMinutes ?? 180,
                  traderaApiAppId:
                    typeof connection.traderaApiAppId === 'number'
                      ? String(connection.traderaApiAppId)
                      : '',
                  traderaApiAppKey: preserveCurrentSecrets
                    ? prev.traderaApiAppKey
                    : '',
                  traderaApiPublicKey:
                    connection.traderaApiPublicKey ?? '',
                  traderaApiUserId:
                    typeof connection.traderaApiUserId === 'number'
                      ? String(connection.traderaApiUserId)
                      : '',
                  traderaApiToken: preserveCurrentSecrets
                    ? prev.traderaApiToken
                    : '',
                  traderaApiSandbox:
                    connection.traderaApiSandbox ?? false,
                }));
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
    </FormSection>
  );
}
