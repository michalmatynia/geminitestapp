import Link from 'next/link';
import React from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import type { PlaywrightPersona } from '@/features/playwright';
import { Button, SelectSimple, FormSection, FormField } from '@/shared/ui';

import { DynamicPlaywrightSettingsForm } from './DynamicPlaywrightSettingsForm';

export function PlaywrightTabContent(): React.JSX.Element {
  const { playwrightPersonas, playwrightPersonasLoading, playwrightPersonaId, handleSelectPlaywrightPersona } =
    useIntegrationsContext();

  const selectedPersona =
    playwrightPersonas.find((persona: PlaywrightPersona) => persona.id === playwrightPersonaId) ?? null;

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
          <p className='mt-4 text-xs text-gray-500'>
            No personas yet. Create one in settings.
          </p>
        ) : (
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <FormField label='Persona' description='Selecting a persona overwrites the settings below.'>
              <SelectSimple
                value={playwrightPersonaId ?? 'custom'}
                onValueChange={(value: string): void => {
                  void handleSelectPlaywrightPersona(value === 'custom' ? null : value);
                }}
                options={[
                  { value: 'custom', label: 'Custom' },
                  ...playwrightPersonas.map((persona: PlaywrightPersona) => ({
                    value: persona.id,
                    label: persona.name,
                  })),
                ]}
                placeholder='Select persona'
              />
            </FormField>
            <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
              {selectedPersona ? (
                <>
                  <p className='text-xs font-semibold text-gray-200'>{selectedPersona.name}</p>
                  <p className='mt-1'>{selectedPersona.description || 'No description provided.'}</p>
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
    </>
  );
}
