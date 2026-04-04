'use client';

import Link from 'next/link';
import React from 'react';

import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { Button, SelectSimple, FormSection, FormField, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui';

import { DynamicPlaywrightSettingsForm } from './DynamicPlaywrightSettingsForm';

const CUSTOM_PERSONA_OPTION: LabeledOptionDto<string> = {
  value: 'custom',
  label: 'Custom',
};

export function PlaywrightTabContent(): React.JSX.Element {
  const { playwrightPersonas, playwrightPersonasLoading } = useIntegrationsData();
  const { playwrightPersonaId } = useIntegrationsForm();
  const { handleSelectPlaywrightPersona, handleResetListingScript } = useIntegrationsActions();
  const personaOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      CUSTOM_PERSONA_OPTION,
      ...playwrightPersonas.map((persona: PlaywrightPersona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [playwrightPersonas]
  );

  const selectedPersona =
    playwrightPersonas.find((persona: PlaywrightPersona) => persona.id === playwrightPersonaId) ??
    null;

  return (
    <>
      <FormSection
        title='Playwright persona'
        description='Apply shared automation presets to this connection.'
        actions={
          <Button variant='outline' size='sm' asChild>
            <Link href='/admin/settings/playwright'>Manage personas</Link>
          </Button>
        }
        className='p-4'
      >
        {playwrightPersonasLoading ? (
          <p className='mt-4 text-xs text-gray-500'>Loading personas...</p>
        ) : playwrightPersonas.length === 0 ? (
          <p className='mt-4 text-xs text-gray-500'>No personas yet. Create one in settings.</p>
        ) : (
          <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-4 md:grid-cols-2`}>
            <FormField
              label='Persona'
              description='Selecting a persona overwrites the settings below.'
            >
              <SelectSimple
                value={playwrightPersonaId ?? 'custom'}
                onValueChange={(value: string): void => {
                  void handleSelectPlaywrightPersona(value === 'custom' ? null : value);
                }}
                options={personaOptions}
                placeholder='Select persona'
                variant='subtle'
                size='sm'
               ariaLabel='Select persona' title='Select persona'/>
            </FormField>
            <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
              {selectedPersona ? (
                <>
                  <p className='text-xs font-semibold text-gray-200'>{selectedPersona.name}</p>
                  <p className='mt-1'>
                    {selectedPersona.description || 'No description provided.'}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-xs font-semibold text-gray-200'>Custom settings</p>
                  <p className='mt-1'>Adjust the form below or apply a persona.</p>
                </>
              )}
            </FormSection>
          </div>
        )}
      </FormSection>

      <DynamicPlaywrightSettingsForm />

      <FormSection
        title='Listing script'
        description='Reset the custom listing script so this connection uses the latest managed default.'
        className='p-4'
      >
        <div className='mt-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={(): void => {
              void handleResetListingScript();
            }}
          >
            Reset to managed default
          </Button>
        </div>
      </FormSection>
    </>
  );
}
