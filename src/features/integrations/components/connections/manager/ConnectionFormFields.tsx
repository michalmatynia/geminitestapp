'use client';

import React from 'react';

import {
  is1688IntegrationSlug,
  isJobSearchPlatformIntegrationSlug,
  isTraderaIntegrationSlug,
  isLinkedInIntegrationSlug,
  isPracujPlIntegrationSlug,
  isScrapedSourceIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import type { ConnectionFormState } from '@/features/integrations/context/integrations-context-types';
import { Button, Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { ConnectionPersonProfileField } from './ConnectionPersonProfileField';

const TRADERA_CATEGORY_STRATEGY_OPTIONS = [
  { value: 'mapper', label: 'Category mapper (strict mapped category)' },
  { value: 'top_suggested', label: 'Top suggested by Tradera (automatic)' },
] as const;

const TRADERA_BROWSER_MODE_OPTIONS = [
  { value: 'builtin', label: 'Built-in form automation' },
  { value: 'scripted', label: 'Playwright script' },
] as const;

const SCANNER_1688_LOGIN_MODE_OPTIONS = [
  { value: 'session_required', label: 'Stored session required' },
  { value: 'manual_login', label: 'Manual login window' },
] as const;

const SCANNER_1688_SEARCH_MODE_OPTIONS = [
  { value: 'local_image', label: 'Local image upload only' },
  { value: 'image_url_fallback', label: 'Allow image URL fallback' },
] as const;

type ConnectionFormFieldsProps = {
  integrationSlug: string;
  form: ConnectionFormState;
  setForm: React.Dispatch<React.SetStateAction<ConnectionFormState>>;
  mode: 'create' | 'edit';
  idPrefix?: string;
};

type ConnectionFormLabels = {
  connectionNamePlaceholder: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  browserSessionCredentialDescription?: string;
};

const getConnectionFormLabels = (
  integrationSlug: string,
  isCreateMode: boolean
): ConnectionFormLabels => {
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const isLinkedIn = isLinkedInIntegrationSlug(integrationSlug);
  const isVinted = isVintedIntegrationSlug(integrationSlug);
  const is1688 = is1688IntegrationSlug(integrationSlug);
  const isPracuj = isPracujPlIntegrationSlug(integrationSlug);
  const isScrapedSource = isScrapedSourceIntegrationSlug(integrationSlug);

  if (isAllegro) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. Allegro Main)',
      usernameLabel: 'Allegro client ID',
      usernamePlaceholder: 'Allegro client ID',
      passwordLabel: 'Allegro client secret',
      passwordPlaceholder: isCreateMode
        ? 'Allegro client secret'
        : 'New client secret (leave blank to keep)',
    };
  }

  if (isLinkedIn) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. LinkedIn Main)',
      usernameLabel: 'LinkedIn client ID',
      usernamePlaceholder: 'LinkedIn client ID',
      passwordLabel: 'LinkedIn client secret',
      passwordPlaceholder: isCreateMode
        ? 'LinkedIn client secret'
        : 'New client secret (leave blank to keep)',
    };
  }

  if (isVinted) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. Vinted Browser)',
      usernameLabel: 'Vinted email (optional)',
      usernamePlaceholder: 'Vinted email (optional)',
      passwordLabel: 'Vinted password (optional)',
      passwordPlaceholder: isCreateMode
        ? 'Vinted password (optional)'
        : 'New Vinted password (leave blank to keep)',
      browserSessionCredentialDescription:
        'Optional. Leave blank if you will sign in through the login window and reuse the stored browser session.',
    };
  }

  if (is1688) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. 1688 Main)',
      usernameLabel: '1688 account label (optional)',
      usernamePlaceholder: '1688 account label (optional)',
      passwordLabel: '1688 password (optional)',
      passwordPlaceholder: isCreateMode
        ? '1688 password (optional)'
        : 'New 1688 password (leave blank to keep)',
      browserSessionCredentialDescription:
        'Optional. Leave blank if you will sign in through the login window and reuse the stored browser session.',
    };
  }

  if (isPracuj) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. Pracuj.pl Profile)',
      usernameLabel: 'Pracuj.pl email (optional)',
      usernamePlaceholder: 'Pracuj.pl email (optional)',
      passwordLabel: 'Pracuj.pl password (optional)',
      passwordPlaceholder: isCreateMode
        ? 'Pracuj.pl password (optional)'
        : 'New Pracuj.pl password (leave blank to keep)',
      browserSessionCredentialDescription:
        'Optional. Leave blank if you will sign in through the login window and reuse the stored browser session.',
    };
  }

  if (isScrapedSource) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. BattleStock)',
      usernameLabel: 'Source account email (optional)',
      usernamePlaceholder: 'Source account email (optional)',
      passwordLabel: 'Source account password (optional)',
      passwordPlaceholder: isCreateMode
        ? 'Source account password (optional)'
        : 'New source account password (leave blank to keep)',
      browserSessionCredentialDescription:
        'Optional. Used by scraped-item purchase runs to sign in before cart and checkout review.',
    };
  }

  if (isBaselinker) {
    return {
      connectionNamePlaceholder: 'Integration name (e.g. Main Baselinker)',
      usernameLabel: 'Account name (optional)',
      usernamePlaceholder: 'Account name (for reference)',
      passwordLabel: 'Baselinker API token',
      passwordPlaceholder: isCreateMode
        ? 'Baselinker API token'
        : 'New password (leave blank to keep)',
    };
  }

  return {
    connectionNamePlaceholder: 'Integration name (e.g. John\'s Tradera)',
    usernameLabel: 'Tradera username',
    usernamePlaceholder: 'Tradera username',
    passwordLabel: 'Tradera password',
    passwordPlaceholder: isCreateMode
      ? 'Tradera password'
      : 'New password (leave blank to keep)',
  };
};

export function ConnectionFormFields(props: ConnectionFormFieldsProps): React.JSX.Element {
  const {
    integrationSlug,
    form,
    setForm,
    mode,
    idPrefix = 'connection-form',
  } = props;

  const isCreateMode = mode === 'create';
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaBrowser = isTradera;
  const is1688 = is1688IntegrationSlug(integrationSlug);
  const isJobSearchPlatform = isJobSearchPlatformIntegrationSlug(integrationSlug);
  const labels = getConnectionFormLabels(integrationSlug, isCreateMode);

  const traderaCategoryStrategyDescription =
    form.traderaCategoryStrategy === 'top_suggested'
      ? 'Lets Tradera choose the category automatically during listing.'
      : 'Uses the synced Category Mapper match and stops the listing if that Tradera category cannot be selected.';

  return (
    <>
      <FormField label='Connection name'>
        <Input
          variant='subtle'
          size='sm'
          placeholder={labels.connectionNamePlaceholder}
          value={form.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              name: event.target.value,
            }))
          }
          aria-label={labels.connectionNamePlaceholder}
          title={labels.connectionNamePlaceholder}
        />
      </FormField>
      <FormField
        label={labels.usernameLabel}
        description={labels.browserSessionCredentialDescription}
      >
        <Input
          variant='subtle'
          size='sm'
          placeholder={labels.usernamePlaceholder}
          value={form.username}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              username: event.target.value,
            }))
          }
          aria-label={labels.usernamePlaceholder}
          title={labels.usernamePlaceholder}
        />
      </FormField>
      <FormField
        label={labels.passwordLabel}
        description={labels.browserSessionCredentialDescription}
      >
        <Input
          variant='subtle'
          size='sm'
          type='password'
          placeholder={labels.passwordPlaceholder}
          value={form.password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setForm((prev) => ({
              ...prev,
              password: event.target.value,
            }))
          }
          aria-label={labels.passwordPlaceholder}
          title={labels.passwordPlaceholder}
        />
      </FormField>
      {isJobSearchPlatform && (
        <ConnectionPersonProfileField
          idPrefix={idPrefix}
          value={form.jobApplicationPersonId}
          selectedLabel={form.jobApplicationPersonName}
          onChange={(personId, personName): void =>
            setForm((prev) => ({
              ...prev,
              jobApplicationPersonId: personId,
              jobApplicationPersonName: personName,
            }))
          }
        />
      )}
      {is1688 && (
        <>
          <FormField
            label='1688 start URL'
            description='Used for login/session refresh and as the default starting page for this profile.'
          >
            <Input
              variant='subtle'
              size='sm'
              placeholder='https://www.1688.com/'
              value={form.scanner1688StartUrl}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688StartUrl: event.target.value,
                }))
              }
              aria-label='1688 start URL'
              title='1688 start URL'
            />
          </FormField>
          <FormField label='Login mode'>
            <SelectSimple
              id={`${idPrefix}-scanner1688LoginMode`}
              value={form.scanner1688LoginMode}
              onValueChange={(nextValue): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688LoginMode:
                    nextValue === 'manual_login' ? 'manual_login' : 'session_required',
                }))
              }
              options={[...SCANNER_1688_LOGIN_MODE_OPTIONS]}
              ariaLabel='1688 login mode'
              placeholder='1688 login mode'
            />
          </FormField>
          <FormField label='Search mode'>
            <SelectSimple
              id={`${idPrefix}-scanner1688DefaultSearchMode`}
              value={form.scanner1688DefaultSearchMode}
              onValueChange={(nextValue): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688DefaultSearchMode:
                    nextValue === 'image_url_fallback' ? 'image_url_fallback' : 'local_image',
                  scanner1688AllowUrlImageSearchFallback:
                    nextValue === 'image_url_fallback',
                }))
              }
              options={[...SCANNER_1688_SEARCH_MODE_OPTIONS]}
              ariaLabel='1688 search mode'
              placeholder='1688 search mode'
            />
          </FormField>
          <FormField label='Candidate cap override (optional)'>
            <Input
              variant='subtle'
              size='sm'
              type='number'
              min={1}
              value={form.scanner1688CandidateResultLimit}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688CandidateResultLimit: event.target.value,
                }))
              }
              aria-label='1688 candidate cap override'
              title='1688 candidate cap override'
            />
          </FormField>
          <FormField label='Minimum score override (optional)'>
            <Input
              variant='subtle'
              size='sm'
              type='number'
              min={1}
              value={form.scanner1688MinimumCandidateScore}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688MinimumCandidateScore: event.target.value,
                }))
              }
              aria-label='1688 minimum score override'
              title='1688 minimum score override'
            />
          </FormField>
          <FormField label='Max extracted images override (optional)'>
            <Input
              variant='subtle'
              size='sm'
              type='number'
              min={1}
              value={form.scanner1688MaxExtractedImages}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688MaxExtractedImages: event.target.value,
                }))
              }
              aria-label='1688 max extracted images override'
              title='1688 max extracted images override'
            />
          </FormField>
          <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} py-1`}>
            <Checkbox
              id={`${idPrefix}-scanner1688AllowUrlImageSearchFallback`}
              checked={form.scanner1688AllowUrlImageSearchFallback}
              onCheckedChange={(checked: boolean): void =>
                setForm((prev) => ({
                  ...prev,
                  scanner1688AllowUrlImageSearchFallback: checked,
                  scanner1688DefaultSearchMode: checked ? 'image_url_fallback' : 'local_image',
                }))
              }
            />
            <Label
              htmlFor={`${idPrefix}-scanner1688AllowUrlImageSearchFallback`}
              className='text-xs font-medium text-gray-300'
            >
              Allow image URL fallback for 1688 search
            </Label>
          </div>
        </>
      )}
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
              <FormField
                label='Category selection strategy'
                description={traderaCategoryStrategyDescription}
              >
                <SelectSimple
                  id={`${idPrefix}-traderaCategoryStrategy`}
                  value={form.traderaCategoryStrategy}
                  onValueChange={(nextValue): void =>
                    setForm((prev) => ({
                      ...prev,
                      traderaCategoryStrategy: nextValue === 'top_suggested' ? 'top_suggested' : 'mapper',
                    }))
                  }
                  options={[...TRADERA_CATEGORY_STRATEGY_OPTIONS]}
                  ariaLabel='Category selection strategy'
                  placeholder='Category selection strategy'
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
        </>
      )}
    </>
  );
}
