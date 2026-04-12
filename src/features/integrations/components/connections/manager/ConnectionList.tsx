'use client';

import React from 'react';

import {
  is1688IntegrationSlug,
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
  useIntegrationsTesting,
} from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';

import { ConnectionEditModal } from './ConnectionEditModal';

export function ConnectionList(): React.JSX.Element {
  const [connectionToEdit, setConnectionToEdit] = React.useState<IntegrationConnection | null>(
    null
  );

  const { activeIntegration, connections } = useIntegrationsData();
  const { editingConnectionId, setEditingConnectionId } = useIntegrationsForm();
  const { isTesting } = useIntegrationsTesting();
  const {
    handleDeleteConnection,
    handleTestConnection,
    handleBaselinkerTest,
    handleAllegroTest,
    handleTraderaManualLogin,
    handleVintedManualLogin,
    handle1688ManualLogin,
  } = useIntegrationsActions();

  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isTraderaBrowser = isTraderaBrowserIntegrationSlug(integrationSlug);
  const isVinted = isVintedIntegrationSlug(integrationSlug);
  const is1688 = is1688IntegrationSlug(integrationSlug);
  const isBrowserAutomation = isTraderaBrowser || isVinted || is1688;
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';

  return (
    <FormSection title='Existing connection' className='p-4'>
      <SimpleSettingsList
        items={connections.map((connection: IntegrationConnection) => ({
          id: connection.id,
          title: connection.name,
          subtitle:
            connection.username?.trim() ||
            (isVinted || is1688 ? 'Session-based browser login' : undefined),
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
            {isBrowserAutomation && (
              <Button
                variant='outline'
                size='xs'
                className='h-7 text-[10px] uppercase font-bold text-emerald-300 hover:text-emerald-200'
                type='button'
                onClick={(): void => {
                  if (is1688) void handle1688ManualLogin(item.original);
                  else if (isVinted) void handleVintedManualLogin(item.original);
                  else void handleTraderaManualLogin(item.original);
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
