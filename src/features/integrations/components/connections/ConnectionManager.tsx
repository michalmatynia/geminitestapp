'use client';

import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection, TestLogEntry } from '@/shared/contracts/integrations';
import { Button, Input,  StatusBadge, FormSection, FormField, SimpleSettingsList } from '@/shared/ui';

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
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaApi = isTraderaApiIntegrationSlug(integrationSlug);
  const isTraderaBrowser = isTradera && !isTraderaApi;
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const showPlaywright = isTraderaBrowser;
  const isCreateMode =
    !editingConnectionId || editingConnectionId === NEW_CONNECTION_DRAFT_ID;
  const selectedConnection =
    (editingConnectionId && editingConnectionId !== NEW_CONNECTION_DRAFT_ID
      ? connections.find((connection: IntegrationConnection) => connection.id === editingConnectionId)
      : connections[0]) ?? null;

  const connectionNamePlaceholder = isAllegro
    ? 'Integration name (e.g. Allegro Main)'
    : isBaselinker
      ? 'Integration name (e.g. Main Baselinker)'
      : 'Integration name (e.g. John\'s Tradera)';
  
  const usernameLabel = isAllegro
    ? 'Allegro client ID'
    : isBaselinker
      ? 'Account name (optional)'
      : isTraderaApi
        ? 'Tradera username/alias'
        : 'Tradera username';
  
  const usernamePlaceholder = isAllegro
    ? 'Allegro client ID'
    : isBaselinker
      ? 'Account name (for reference)'
      : isTraderaApi
        ? 'Tradera username/alias'
        : 'Tradera username';
  
  const passwordLabel = isAllegro
    ? 'Allegro client secret'
    : isBaselinker
      ? 'Baselinker API token'
      : isTraderaApi
        ? 'Fallback secret'
        : 'Tradera password';

  const passwordPlaceholder = isCreateMode
    ? isAllegro
      ? 'Allegro client secret'
      : isBaselinker
        ? 'Baselinker API token'
        : isTraderaApi
          ? 'Fallback secret (required)'
          : 'Tradera password'
    : isAllegro
      ? 'New client secret (leave blank to keep)'
      : isTraderaApi
        ? 'New fallback secret (leave blank to keep)'
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
              {isTraderaApi && (
                <>
                  <FormField label='Tradera API App ID'>
                    <Input
                      className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                      placeholder='5683'
                      inputMode='numeric'
                      value={connectionForm.traderaApiAppId}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiAppId: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label='Tradera API App Key'>
                    <Input
                      className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                      type='password'
                      placeholder={
                        isCreateMode
                          ? 'Application key'
                          : 'New application key (leave blank to keep)'
                      }
                      value={connectionForm.traderaApiAppKey}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiAppKey: event.target.value,
                        }))
                      }
                    />
                    {!isCreateMode &&
                      !connectionForm.traderaApiAppKey.trim() &&
                      selectedConnection?.hasTraderaApiAppKey && (
                      <p className='mt-1 text-xs text-emerald-300'>
                        Stored app key retained. Leave blank to keep it.
                      </p>
                    )}
                  </FormField>
                  <FormField label='Tradera API Public Key (optional)'>
                    <Input
                      className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                      placeholder='Public key'
                      value={connectionForm.traderaApiPublicKey}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiPublicKey: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label='Tradera API User ID'>
                    <Input
                      className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                      placeholder='Numeric user ID'
                      inputMode='numeric'
                      value={connectionForm.traderaApiUserId}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiUserId: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label='Tradera API Token'>
                    <Input
                      className='w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white'
                      type='password'
                      placeholder={
                        isCreateMode
                          ? 'Access token'
                          : 'New token (leave blank to keep)'
                      }
                      value={connectionForm.traderaApiToken}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiToken: event.target.value,
                        }))
                      }
                    />
                    {!isCreateMode &&
                      !connectionForm.traderaApiToken.trim() &&
                      selectedConnection?.hasTraderaApiToken && (
                      <p className='mt-1 text-xs text-emerald-300'>
                        Stored token retained. Leave blank to keep it.
                      </p>
                    )}
                  </FormField>
                  <label className='flex items-center gap-2 text-sm text-gray-300'>
                    <input
                      type='checkbox'
                      checked={connectionForm.traderaApiSandbox}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        setConnectionForm((prev) => ({
                          ...prev,
                          traderaApiSandbox: event.target.checked,
                        }))
                      }
                    />
                    Use Tradera sandbox
                  </label>
                </>
              )}
            </>
          )}
          <Button
            className='w-full font-semibold'
            type='button'
            variant='solid'
            onClick={() => { void handleSaveConnection(); }}
          >
            {isCreateMode ? 'Save connection' : 'Update connection'}
          </Button>
          <Button
            className='w-full font-semibold'
            type='button'
            variant='outline'
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
                traderaApiAppId: '',
                traderaApiAppKey: '',
                traderaApiPublicKey: '',
                traderaApiUserId: '',
                traderaApiToken: '',
                traderaApiSandbox: false,
              });
            }}
          >
            New connection
          </Button>
        </div>
      </FormSection>

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
