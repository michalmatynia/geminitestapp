'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection, TestLogEntry } from '@/features/integrations/types/integrations-ui';
import { Button, Input,  StatusBadge, FormSection, FormField } from '@/shared/ui';

const NEW_CONNECTION_DRAFT_ID = '__new_connection__';

export function ConnectionManager(): React.JSX.Element {
  const {
    activeIntegration,
    connections,
    editingConnectionId,
    setEditingConnectionId,
    connectionForm,
    setConnectionForm,
    handleSaveConnection,
    handleDeleteConnection,
    handleTestConnection,
    handleBaselinkerTest,
    handleAllegroTest,
    handleTraderaManualLogin,
    isTesting,
    testLog,
    setSelectedStep,
    setShowTestLogModal,
  } = useIntegrationsContext();

  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isTradera = integrationSlug === 'tradera';
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const showPlaywright = isTradera;
  const isCreateMode =
    !editingConnectionId || editingConnectionId === NEW_CONNECTION_DRAFT_ID;

  const connectionNamePlaceholder = isAllegro
    ? 'Integration name (e.g. Allegro Main)'
    : isBaselinker
      ? 'Integration name (e.g. Main Baselinker)'
      : 'Integration name (e.g. John\'s Tradera)';
  
  const usernameLabel = isAllegro
    ? 'Allegro client ID'
    : isBaselinker
      ? 'Account name (optional)'
      : 'Tradera username';
  
  const usernamePlaceholder = isAllegro
    ? 'Allegro client ID'
    : isBaselinker
      ? 'Account name (for reference)'
      : 'Tradera username';
  
  const passwordLabel = isAllegro
    ? 'Allegro client secret'
    : isBaselinker
      ? 'Baselinker API token'
      : 'Tradera password';

  const passwordPlaceholder = isCreateMode
    ? isAllegro
      ? 'Allegro client secret'
      : isBaselinker
        ? 'Baselinker API token'
        : 'Tradera password'
    : isAllegro
      ? 'New client secret (leave blank to keep)'
      : 'New password (leave blank to keep)';

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <FormSection
        title={isCreateMode ? 'Add connection' : 'Connection details'}
        className='p-4'
      >
        <div className='space-y-3'>
          <FormField label='Connection name'>
            <Input
              className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
              placeholder={connectionNamePlaceholder}
              value={connectionForm.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setConnectionForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label={usernameLabel}>
            <Input
              className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
              placeholder={usernamePlaceholder}
              value={connectionForm.username}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setConnectionForm((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label={passwordLabel}>
            <Input
              className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
              type='password'
              placeholder={passwordPlaceholder}
              value={connectionForm.password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setConnectionForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />
          </FormField>
          {isTradera && (
            <>
              <FormField label='Default template ID (optional)'>
                <Input
                  className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                  placeholder='tradera-template-1'
                  value={connectionForm.traderaDefaultTemplateId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setConnectionForm((prev) => ({
                      ...prev,
                      traderaDefaultTemplateId: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label='Default duration (hours)'>
                <Input
                  className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                  type='number'
                  min={1}
                  max={720}
                  value={String(connectionForm.traderaDefaultDurationHours)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setConnectionForm((prev) => ({
                      ...prev,
                      traderaDefaultDurationHours: Math.max(
                        1,
                        Math.min(720, Math.floor(Number(event.target.value) || 1))
                      ),
                    }))
                  }
                />
              </FormField>
              <FormField label='Auto relist lead (minutes)'>
                <Input
                  className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                  type='number'
                  min={0}
                  max={10080}
                  value={String(connectionForm.traderaAutoRelistLeadMinutes)}
                  disabled={!connectionForm.traderaAutoRelistEnabled}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setConnectionForm((prev) => ({
                      ...prev,
                      traderaAutoRelistLeadMinutes: Math.max(
                        0,
                        Math.min(10080, Math.floor(Number(event.target.value) || 0))
                      ),
                    }))
                  }
                />
              </FormField>
              <label className='flex items-center gap-2 text-sm text-gray-300'>
                <input
                  type='checkbox'
                  checked={connectionForm.traderaAutoRelistEnabled}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setConnectionForm((prev) => ({
                      ...prev,
                      traderaAutoRelistEnabled: event.target.checked,
                    }))
                  }
                />
                Enable auto relist by default
              </label>
            </>
          )}
          <Button
            className='w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
            type='button'
            onClick={() => { void handleSaveConnection(); }}
          >
            {isCreateMode ? 'Save connection' : 'Update connection'}
          </Button>
          <Button
            className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-card/80'
            type='button'
            onClick={(): void => {
              setEditingConnectionId(NEW_CONNECTION_DRAFT_ID);
              setConnectionForm({
                name: '',
                username: '',
                password: '',
                traderaDefaultTemplateId: '',
                traderaDefaultDurationHours: 72,
                traderaAutoRelistEnabled: true,
                traderaAutoRelistLeadMinutes: 180,
              });
            }}
          >
            New connection
          </Button>
        </div>
      </FormSection>

      <FormSection title='Existing connection' className='p-4'>
        {connections.length === 0 ? (
          <p className='mt-3 text-sm text-gray-400'>No connections yet.</p>
        ) : (
          <div className='mt-3 space-y-3'>
            {connections.map((connection: IntegrationConnection) => (
              <div
                key={connection.id}
                className='flex items-center justify-between rounded-md border border-border/60 bg-card/30 p-3'
              >
                <div>
                  <p className='text-sm font-semibold text-white'>
                    {connection.name}
                  </p>
                  <p className='text-xs text-gray-400'>{connection.username}</p>
                  {editingConnectionId === connection.id && (
                    <p className='text-[10px] uppercase tracking-wide text-emerald-300'>Selected for editing</p>
                  )}
                </div>
                <div className='flex items-center gap-3'>
                  <Button
                    className='text-xs text-gray-200 hover:text-white'
                    type='button'
                    onClick={(): void => {
                      setEditingConnectionId(connection.id);
                      setConnectionForm({
                        name: connection.name,
                        username: connection.username ?? '',
                        password: '',
                        traderaDefaultTemplateId:
                          connection.traderaDefaultTemplateId ?? '',
                        traderaDefaultDurationHours:
                          connection.traderaDefaultDurationHours ?? 72,
                        traderaAutoRelistEnabled:
                          connection.traderaAutoRelistEnabled ?? true,
                        traderaAutoRelistLeadMinutes:
                          connection.traderaAutoRelistLeadMinutes ?? 180,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    className={`text-xs ${
                      isBaselinker
                        ? 'text-purple-300 hover:text-purple-200'
                        : isAllegro
                          ? 'text-amber-300 hover:text-amber-200'
                          : 'text-sky-300 hover:text-sky-200'
                    }`}
                    type='button'
                    onClick={(): void => {
                      if (isBaselinker) void handleBaselinkerTest(connection);
                      else if (isAllegro) void handleAllegroTest(connection);
                      else void handleTestConnection(connection);
                    }}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </Button>
                  {isTradera && (
                    <Button
                      className='text-xs text-emerald-300 hover:text-emerald-200'
                      type='button'
                      onClick={(): void => {
                        void handleTraderaManualLogin(connection);
                      }}
                      disabled={isTesting}
                    >
                      {isTesting ? 'Starting...' : 'Login window'}
                    </Button>
                  )}
                  <Button
                    className='text-xs text-red-400 hover:text-red-300'
                    type='button'
                    onClick={(): void => handleDeleteConnection(connection)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {showPlaywright && (
          <FormSection
            title='Playwright live update'
            variant='subtle-compact'
            className='mt-4 p-3'
          >
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-500'>
                {isTesting ? 'Running...' : 'Idle'}
              </span>
            </div>

            {testLog.length === 0 ? (
              <p className='mt-2 text-xs text-gray-500'>
                Run a connection test to see live updates.
              </p>
            ) : (
              <div className='mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-gray-400'>
                {testLog.map((entry: TestLogEntry, index: number) => (
                  <div
                    key={`${entry.step}-${index}`}
                    className='flex items-center justify-between gap-3'
                  >
                    <p>{entry.step}</p>
                    {entry.status !== 'pending' && (
                      <StatusBadge
                        status={entry.status === 'ok' ? 'OK' : 'FAILED'}
                        onClick={(): void => {
                          setSelectedStep(
                            entry.status !== 'pending'
                              ? (entry as TestLogEntry & { status: 'ok' | 'failed' })
                              : null
                          );
                          setShowTestLogModal(true);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        )}
      </FormSection>
    </div>
  );
}
