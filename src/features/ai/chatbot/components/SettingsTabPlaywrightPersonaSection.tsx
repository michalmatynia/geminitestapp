'use client';

import Link from 'next/link';
import * as React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { Button } from '@/shared/ui/primitives.public';
import {
  SelectSimple,
  FormSection,
  FormField,
} from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const PLAYWRIGHT_PERSONA_CUSTOM_OPTION: LabeledOptionDto<string> = {
  value: 'custom',
  label: 'Custom',
};

interface PlaywrightPersonaDetailsProps {
  persona: PlaywrightPersona | null;
}

function PlaywrightPersonaDetails({ persona }: PlaywrightPersonaDetailsProps): React.JSX.Element {
  return (
    <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
      {persona !== null ? (
        <>
          <p className='text-xs font-semibold text-gray-200'>{persona.name}</p>
          <p className='mt-1'>
            {typeof persona.description === 'string' && persona.description !== ''
              ? persona.description
              : 'No description provided.'}
          </p>
        </>
      ) : (
        <>
          <p className='text-xs font-semibold text-gray-200'>Custom settings</p>
          <p className='mt-1'>Pick a persona or keep your own agent preferences.</p>
        </>
      )}
    </FormSection>
  );
}

function usePlaywrightPersonaOptions(
  playwrightPersonas: PlaywrightPersona[]
): Array<LabeledOptionDto<string>> {
  return React.useMemo<Array<LabeledOptionDto<string>>>(
    () => [
      PLAYWRIGHT_PERSONA_CUSTOM_OPTION,
      ...playwrightPersonas.map((persona: PlaywrightPersona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [playwrightPersonas]
  );
}

interface PlaywrightPersonaSectionProps {
  playwrightPersonaId: string | null;
  handlePersonaChange: (value: string) => void;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
}

export function PlaywrightPersonaSection({
  playwrightPersonaId,
  handlePersonaChange,
  playwrightPersonas,
  playwrightPersonasLoading,
}: PlaywrightPersonaSectionProps): React.JSX.Element {
  const selectedPersona = React.useMemo<PlaywrightPersona | null>(
    () =>
      playwrightPersonas.find(
        (item: PlaywrightPersona): boolean => item.id === playwrightPersonaId
      ) ?? null,
    [playwrightPersonas, playwrightPersonaId]
  );

  const playwrightPersonaOptions = usePlaywrightPersonaOptions(playwrightPersonas);

  if (playwrightPersonasLoading) {
    return (
      <FormSection title='Playwright persona' variant='subtle' className='p-4'>
        <p className='text-xs text-gray-500 mt-4'>Loading personas...</p>
      </FormSection>
    );
  }

  return (
    <FormSection
      title='Playwright persona'
      description='Choose a shared automation profile for agent runs.'
      variant='subtle'
      className='p-4'
      actions={
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/settings/playwright'>Manage personas</Link>
        </Button>
      }
    >
      {playwrightPersonas.length === 0 ? (
        <p className='text-xs text-gray-500 mt-4'>No personas yet. Create one in settings.</p>
      ) : (
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
          <FormField label='Persona'>
            <SelectSimple
              size='sm'
              value={playwrightPersonaId ?? 'custom'}
              onValueChange={handlePersonaChange}
              options={playwrightPersonaOptions}
              placeholder='Select persona'
              ariaLabel='Select persona'
              title='Select persona'
            />
          </FormField>
          <PlaywrightPersonaDetails persona={selectedPersona} />
        </div>
      )}
    </FormSection>
  );
}
