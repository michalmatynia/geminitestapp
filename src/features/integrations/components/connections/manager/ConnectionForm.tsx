'use client';

import React from 'react';
import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { IntegrationConnection } from '@/shared/contracts/integrations';
import { Button, Input, FormSection, FormField, Checkbox, Label } from '@/shared/ui';

const NEW_CONNECTION_DRAFT_ID = '__new_connection__';

export function ConnectionForm(): React.JSX.Element {
  const {
    activeIntegration,
    connections,
    editingConnectionId,
    setEditingConnectionId,
    connectionForm,
    setConnectionForm,
    handleSaveConnection,
  } = useIntegrationsContext();

  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaApi = isTraderaApiIntegrationSlug(integrationSlug);
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  
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

  const resetForm = (): void => {
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
  };

  return (
    <FormSection
      title={isCreateMode ? 'Add connection' : 'Connection details'}
      className='p-4'
    >
      <div className='space-y-3'>
        <FormField label='Connection name'>
          <Input
            variant='subtle'
            size='sm'
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
            variant='subtle'
            size='sm'
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
            variant='subtle'
            size='sm'
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
                variant='subtle'
                size='sm'
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
                variant='subtle'
                size='sm'
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
                variant='subtle'
                size='sm'
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
            <div className='flex items-center gap-3 py-1'>
              <Checkbox
                id='traderaAutoRelistEnabled'
                checked={connectionForm.traderaAutoRelistEnabled}
                onCheckedChange={(checked: boolean): void =>
                  setConnectionForm((prev) => ({
                    ...prev,
                    traderaAutoRelistEnabled: checked,
                  }))
                }
              />
              <Label htmlFor='traderaAutoRelistEnabled' className='text-xs font-medium text-gray-300'>
                Enable auto relist by default
              </Label>
            </div>
            {isTraderaApi && (
              <>
                <FormField label='Tradera API App ID'>
                  <Input
                    variant='subtle'
                    size='sm'
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
                    variant='subtle'
                    size='sm'
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
                    variant='subtle'
                    size='sm'
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
                    variant='subtle'
                    size='sm'
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
                    variant='subtle'
                    size='sm'
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
                <div className='flex items-center gap-3 py-1'>
                  <Checkbox
                    id='traderaApiSandbox'
                    checked={connectionForm.traderaApiSandbox}
                    onCheckedChange={(checked: boolean): void =>
                      setConnectionForm((prev) => ({
                        ...prev,
                        traderaApiSandbox: checked,
                      }))
                    }
                  />
                  <Label htmlFor='traderaApiSandbox' className='text-xs font-medium text-gray-300'>
                    Use Tradera sandbox
                  </Label>
                </div>
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
          onClick={resetForm}
        >
          New connection
        </Button>
      </div>
    </FormSection>
  );
}
