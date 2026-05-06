'use client';

import React from 'react';

import {
  is1688IntegrationSlug,
  isBrowserAutomationIntegrationSlug,
  isPracujPlIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
  useIntegrationsTesting,
} from '@/features/integrations/context/IntegrationsContext';
import { type IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';

import { ConnectionEditModal } from './ConnectionEditModal';

const resolveConnectionPersonLabel = (connection: IntegrationConnection): string => {
  const personName = connection.jobApplicationPersonName?.trim() ?? '';
  if (personName.length > 0) return personName;
  return connection.jobApplicationPersonId?.trim() ?? '';
};

const resolveConnectionDescription = (
  connection: IntegrationConnection,
  activeConnectionId: string | null
): React.ReactNode => {
  const personLabel = resolveConnectionPersonLabel(connection);
  const isActive = activeConnectionId === connection.id;
  const isDisabled = connection.enabled === false;
  if (personLabel.length === 0 && !isActive && !isDisabled) return undefined;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {isDisabled && (
        <span className='text-[10px] uppercase tracking-wide text-rose-300 font-bold'>
          Disabled
        </span>
      )}
      {personLabel.length > 0 && (
        <span className='text-[10px] uppercase tracking-wide text-sky-300 font-bold'>
          Person: {personLabel}
        </span>
      )}
      {isActive && (
        <span className='text-[10px] uppercase tracking-wide text-emerald-300 font-bold'>
          Active connection
        </span>
      )}
    </div>
  );
};

const runConnectionAction = (action: () => Promise<void> | void): void => {
  const result = action();
  if (result !== undefined) {
    result.catch(() => undefined);
  }
};

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
    handlePracujManualLogin,
  } = useIntegrationsActions();

  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isVinted = isVintedIntegrationSlug(integrationSlug);
  const is1688 = is1688IntegrationSlug(integrationSlug);
  const isPracuj = isPracujPlIntegrationSlug(integrationSlug);
  const isBrowserAutomation = isBrowserAutomationIntegrationSlug(integrationSlug);
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
            (isVinted || is1688 || isPracuj ? 'Session-based browser login' : undefined),
          description: resolveConnectionDescription(connection, editingConnectionId),
          original: connection,
        }))}
        emptyMessage='No connections yet.'
        renderActions={(item) => {
          const isConnectionDisabled = item.original.enabled === false;
          const isActionDisabled = isTesting || isConnectionDisabled;

          return (
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
                  if (isBaselinker) {
                    runConnectionAction(() => handleBaselinkerTest(item.original));
                  } else if (isAllegro) {
                    runConnectionAction(() => handleAllegroTest(item.original));
                  } else {
                    runConnectionAction(() => handleTestConnection(item.original));
                  }
                }}
                disabled={isActionDisabled}
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
                    if (is1688) {
                      runConnectionAction(() => handle1688ManualLogin(item.original));
                    } else if (isVinted) {
                      runConnectionAction(() => handleVintedManualLogin(item.original));
                    } else if (isPracuj) {
                      runConnectionAction(() => handlePracujManualLogin(item.original));
                    } else {
                      runConnectionAction(() => handleTraderaManualLogin(item.original));
                    }
                  }}
                  disabled={isActionDisabled}
                >
                  {isTesting ? 'Starting...' : 'Login window'}
                </Button>
              )}
            </div>
          );
        }}
        onDelete={(item) => handleDeleteConnection(item.original)}
      />
      <ConnectionEditModal
        connection={connectionToEdit}
        onClose={() => setConnectionToEdit(null)}
      />
    </FormSection>
  );
}
