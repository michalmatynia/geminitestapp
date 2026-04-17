'use client';

import Link from 'next/link';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { Button, CollapsibleSection } from '@/shared/ui/primitives.public';
import {
  FormField,
  FormSection,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { DynamicPlaywrightSettingsForm } from './DynamicPlaywrightSettingsForm';

const CUSTOM_PERSONA_OPTION: LabeledOptionDto<string> = {
  value: 'custom',
  label: 'Custom',
};

export type PlaywrightLegacyFallbackSectionProps = {
  description: string;
  title: string;
  playwrightPersonaId: string | null;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  collapsible: boolean;
  onSelectPersona: (value: string | null) => void;
};

const buildPersonaOptions = (
  playwrightPersonas: PlaywrightPersona[]
): Array<LabeledOptionDto<string>> => [
  CUSTOM_PERSONA_OPTION,
  ...playwrightPersonas.map((persona) => ({
    value: persona.id,
    label: persona.name,
  })),
];

function PersonaDescription({
  playwrightPersonaId,
  playwrightPersonas,
}: Pick<
  PlaywrightLegacyFallbackSectionProps,
  'playwrightPersonaId' | 'playwrightPersonas'
>): React.JSX.Element {
  const selectedPersona =
    playwrightPersonas.find((persona) => persona.id === playwrightPersonaId) ?? null;
  const selectedPersonaDescription =
    selectedPersona !== null &&
    typeof selectedPersona.description === 'string' &&
    selectedPersona.description.trim().length > 0
      ? selectedPersona.description
      : 'No description provided.';

  if (selectedPersona === null) {
    return (
      <>
        <p className='text-xs font-semibold text-gray-200'>Custom fallback settings</p>
        <p className='mt-1'>
          These connection-level overrides only apply when the selected runtime action leaves a
          value unset.
        </p>
      </>
    );
  }

  return (
    <>
      <p className='text-xs font-semibold text-gray-200'>{selectedPersona.name}</p>
      <p className='mt-1'>{selectedPersonaDescription}</p>
    </>
  );
}

function LegacyPersonaSelectionGrid({
  playwrightPersonaId,
  playwrightPersonas,
  onSelectPersona,
}: Pick<
  PlaywrightLegacyFallbackSectionProps,
  'playwrightPersonaId' | 'playwrightPersonas' | 'onSelectPersona'
>): React.JSX.Element {
  const personaOptions = React.useMemo(
    () => buildPersonaOptions(playwrightPersonas),
    [playwrightPersonas]
  );

  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-4 md:grid-cols-2`}>
      <FormField
        label='Persona'
        description='Selecting a persona overwrites the fallback settings below.'
      >
        <SelectSimple
          value={playwrightPersonaId ?? 'custom'}
          onValueChange={(value: string): void => {
            onSelectPersona(value === 'custom' ? null : value);
          }}
          options={personaOptions}
          placeholder='Select persona'
          variant='subtle'
          size='sm'
          ariaLabel='Select persona'
          title='Select persona'
        />
      </FormField>
      <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
        <PersonaDescription
          playwrightPersonaId={playwrightPersonaId}
          playwrightPersonas={playwrightPersonas}
        />
      </FormSection>
    </div>
  );
}

function LegacyPersonaSummary({
  playwrightPersonaId,
  playwrightPersonas,
  playwrightPersonasLoading,
  onSelectPersona,
}: Omit<
  PlaywrightLegacyFallbackSectionProps,
  'description' | 'title' | 'collapsible'
>): React.JSX.Element {
  let content: React.ReactNode;

  if (playwrightPersonasLoading) {
    content = <p className='mt-4 text-xs text-gray-500'>Loading personas...</p>;
  } else if (playwrightPersonas.length === 0) {
    content = <p className='mt-4 text-xs text-gray-500'>No personas yet. Create one in settings.</p>;
  } else {
    content = (
      <LegacyPersonaSelectionGrid
        playwrightPersonaId={playwrightPersonaId}
        playwrightPersonas={playwrightPersonas}
        onSelectPersona={onSelectPersona}
      />
    );
  }

  return (
    <FormSection
      title='Fallback persona'
      description='Persona presets still apply to connection-owned fallback settings.'
      actions={
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/settings/playwright'>Manage personas</Link>
        </Button>
      }
      className='p-4'
    >
      {content}
    </FormSection>
  );
}

function LegacyFallbackContent(
  props: Omit<PlaywrightLegacyFallbackSectionProps, 'description' | 'title' | 'collapsible'>
): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <LegacyPersonaSummary {...props} />
      <DynamicPlaywrightSettingsForm />
    </div>
  );
}

export function PlaywrightLegacyFallbackSection({
  description,
  title,
  collapsible,
  ...contentProps
}: PlaywrightLegacyFallbackSectionProps): React.JSX.Element {
  const content = <LegacyFallbackContent {...contentProps} />;

  if (!collapsible) {
    return (
      <FormSection title={title} description={description} className='p-4'>
        <div className='mt-4'>{content}</div>
      </FormSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      description={description}
      variant='subtle'
      className='border-border/60'
      contentClassName='pt-2'
    >
      {content}
    </CollapsibleSection>
  );
}
