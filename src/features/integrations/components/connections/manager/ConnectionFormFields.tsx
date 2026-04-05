'use client';

import React from 'react';

import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import type { ConnectionFormState } from '@/features/integrations/context/integrations-context-types';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { Button, Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const TRADERA_BROWSER_MODE_OPTIONS = [
  { value: 'builtin', label: 'Built-in form automation' },
  { value: 'scripted', label: 'Playwright script' },
] as const;

type ConnectionFormFieldsProps = {
  integrationSlug: string;
  form: ConnectionFormState;
  setForm: React.Dispatch<React.SetStateAction<ConnectionFormState>>;
  mode: 'create' | 'edit';
  selectedConnection?: IntegrationConnection | null;
  idPrefix?: string;
};

export function ConnectionFormFields(props: ConnectionFormFieldsProps): React.JSX.Element {
  const {
    integrationSlug,
    form,
    setForm,
    mode,
    selectedConnection = null,
    idPrefix = 'connection-form',
  } = props;

  const isCreateMode = mode === 'create';
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaApi = isTraderaApiIntegrationSlug(integrationSlug);
  const isTraderaBrowser = isTradera && !isTraderaApi;
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const isLinkedIn = isLinkedInIntegrationSlug(integrationSlug);

  const connectionNamePlaceholder = isAllegro
    ? 'Integration name (e.g. Allegro Main)'
    : isLinkedIn
      ? 'Integration name (e.g. LinkedIn Main)'
    : isBaselinker
      ? 'Integration name (e.g. Main Baselinker)'
      : 'Integration name (e.g. John\'s Tradera)';

  const usernameLabel = isAllegro
    ? 'Allegro client ID'
    : isLinkedIn
      ? 'LinkedIn client ID'
    : isBaselinker
      ? 'Account name (optional)'
      : isTraderaApi
        ? 'Tradera username/alias'
        : 'Tradera username';

  const usernamePlaceholder = isAllegro
    ? 'Allegro client ID'
    : isLinkedIn
      ? 'LinkedIn client ID'
    : isBaselinker
      ? 'Account name (for reference)'
      : isTraderaApi
        ? 'Tradera username/alias'
        : 'Tradera username';

  const passwordLabel = isAllegro
    ? 'Allegro client secret'
    : isLinkedIn
      ? 'LinkedIn client secret'
    : isBaselinker
      ? 'Baselinker API token'
      : isTraderaApi
        ? 'Fallback secret'
        : 'Tradera password';

  const passwordPlaceholder = isCreateMode
    ? isAllegro
      ? 'Allegro client secret'
      : isLinkedIn
        ? 'LinkedIn client secret'
      : isBaselinker
        ? 'Baselinker API token'
        : isTraderaApi
          ? 'Fallback secret (required)'
          : 'Tradera password'
    : isAllegro
      ? 'New client secret (leave blank to keep)'
      : isLinkedIn
        ? 'New client secret (leave blank to keep)'
      : isTraderaApi
        ? 'New fallback secret (leave blank to keep)'
        : 'New password (leave blank to keep)';

  return (
    <>
      <FormField label='Connection name'>
        <Input
          variant='subtle'
          size='sm'
          placeholder={connectionNamePlaceholder}
          value={form.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              name: event.target.value,
            }))
          }
         aria-label={connectionNamePlaceholder} title={connectionNamePlaceholder}/>
      </FormField>
      <FormField label={usernameLabel}>
        <Input
          variant='subtle'
          size='sm'
          placeholder={usernamePlaceholder}
          value={form.username}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              username: event.target.value,
            }))
          }
         aria-label={usernamePlaceholder} title={usernamePlaceholder}/>
      </FormField>
      <FormField label={passwordLabel}>
        <Input
          variant='subtle'
          size='sm'
          type='password'
          placeholder={passwordPlaceholder}
          value={form.password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              password: event.target.value,
            }))
          }
         aria-label={passwordPlaceholder} title={passwordPlaceholder}/>
      </FormField>
      {isTradera && (
        <>
          {isTraderaBrowser && (
            <>
              <FormField label='Browser automation mode'>
                <SelectSimple
                  id={`${idPrefix}-traderaBrowserMode`}
                  value={form.traderaBrowserMode}
                  onValueChange={(nextValue): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaBrowserMode: nextValue === 'scripted' ? 'scripted' : 'builtin',
                    }))
                  }
                  options={[...TRADERA_BROWSER_MODE_OPTIONS]}
                  ariaLabel='Browser automation mode'
                  placeholder='Browser automation mode'
                />
              </FormField>
              {form.traderaBrowserMode === 'scripted' && (
                <FormField label='Playwright listing script'>
                  <Textarea
                    variant='subtle'
                    rows={14}
                    value={form.playwrightListingScript}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                      setForm((prev) => ({
                        ...prev,
                        playwrightListingScript: event.target.value,
                      }))
                    }
                    placeholder={DEFAULT_TRADERA_QUICKLIST_SCRIPT}
                    aria-label='Playwright listing script'
                    title='Playwright listing script'
                  />
                  <div className='mt-2 flex justify-end gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='xs'
                      onClick={(): void =>
                        setForm((prev) => ({
                          ...prev,
                          playwrightListingScript: '',
                        }))
                      }
                    >
                      Reset to managed default
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='xs'
                      onClick={(): void =>
                        setForm((prev) => ({
                          ...prev,
                          playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
                        }))
                      }
                    >
                      Load default Tradera script
                    </Button>
                  </div>
                </FormField>
              )}
            </>
          )}
          <FormField label='Default template ID (optional)'>
            <Input
              variant='subtle'
              size='sm'
              placeholder='tradera-template-1'
              value={form.traderaDefaultTemplateId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  traderaDefaultTemplateId: event.target.value,
                }))
              }
             aria-label='tradera-template-1' title='tradera-template-1'/>
          </FormField>
          <FormField label='Default duration (hours)'>
            <Input
              variant='subtle'
              size='sm'
              type='number'
              min={1}
              max={720}
              value={String(form.traderaDefaultDurationHours)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  traderaDefaultDurationHours: Math.max(
                    1,
                    Math.min(720, Math.floor(Number(event.target.value) || 1))
                  ),
                }))
              }
             aria-label='Default duration (hours)' title='Default duration (hours)'/>
          </FormField>
          <FormField label='Auto relist lead (minutes)'>
            <Input
              variant='subtle'
              size='sm'
              type='number'
              min={0}
              max={10080}
              value={String(form.traderaAutoRelistLeadMinutes)}
              disabled={!form.traderaAutoRelistEnabled}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  traderaAutoRelistLeadMinutes: Math.max(
                    0,
                    Math.min(10080, Math.floor(Number(event.target.value) || 0))
                  ),
                }))
              }
             aria-label='Auto relist lead (minutes)' title='Auto relist lead (minutes)'/>
          </FormField>
          <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} py-1`}>
            <Checkbox
              id={`${idPrefix}-traderaAutoRelistEnabled`}
              checked={form.traderaAutoRelistEnabled}
              onCheckedChange={(checked: boolean): void =>
                setForm((prev) => ({
                  ...prev,
                  traderaAutoRelistEnabled: checked,
                }))
              }
            />
            <Label
              htmlFor={`${idPrefix}-traderaAutoRelistEnabled`}
              className='text-xs font-medium text-gray-300'
            >
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
                  value={form.traderaApiAppId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiAppId: event.target.value,
                    }))
                  }
                 aria-label='5683' title='5683'/>
              </FormField>
              <FormField label='Tradera API App Key'>
                <Input
                  variant='subtle'
                  size='sm'
                  type='password'
                  placeholder={
                    isCreateMode ? 'Application key' : 'New application key (leave blank to keep)'
                  }
                  value={form.traderaApiAppKey}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiAppKey: event.target.value,
                    }))
                  }
                 aria-label={isCreateMode ? 'Application key' : 'New application key (leave blank to keep)'} title={isCreateMode ? 'Application key' : 'New application key (leave blank to keep)'}/>
                {!isCreateMode &&
                  !form.traderaApiAppKey.trim() &&
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
                  value={form.traderaApiPublicKey}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiPublicKey: event.target.value,
                    }))
                  }
                 aria-label='Public key' title='Public key'/>
              </FormField>
              <FormField label='Tradera API User ID'>
                <Input
                  variant='subtle'
                  size='sm'
                  placeholder='Numeric user ID'
                  inputMode='numeric'
                  value={form.traderaApiUserId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiUserId: event.target.value,
                    }))
                  }
                 aria-label='Numeric user ID' title='Numeric user ID'/>
              </FormField>
              <FormField label='Tradera API Token'>
                <Input
                  variant='subtle'
                  size='sm'
                  type='password'
                  placeholder={isCreateMode ? 'Access token' : 'New token (leave blank to keep)'}
                  value={form.traderaApiToken}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiToken: event.target.value,
                    }))
                  }
                 aria-label={isCreateMode ? 'Access token' : 'New token (leave blank to keep)'} title={isCreateMode ? 'Access token' : 'New token (leave blank to keep)'}/>
                {!isCreateMode &&
                  !form.traderaApiToken.trim() &&
                  selectedConnection?.hasTraderaApiToken && (
                  <p className='mt-1 text-xs text-emerald-300'>
                      Stored token retained. Leave blank to keep it.
                  </p>
                )}
              </FormField>
              <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} py-1`}>
                <Checkbox
                  id={`${idPrefix}-traderaApiSandbox`}
                  checked={form.traderaApiSandbox}
                  onCheckedChange={(checked: boolean): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaApiSandbox: checked,
                    }))
                  }
                />
                <Label
                  htmlFor={`${idPrefix}-traderaApiSandbox`}
                  className='text-xs font-medium text-gray-300'
                >
                  Use Tradera sandbox
                </Label>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
