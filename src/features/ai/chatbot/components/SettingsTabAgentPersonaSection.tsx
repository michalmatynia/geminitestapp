'use client';

import Link from 'next/link';
import * as React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AgentPersona } from '@/shared/contracts/agents';
import { Button } from '@/shared/ui/primitives.public';
import {
  SelectSimple,
  FormSection,
  FormField,
} from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const AGENT_PERSONA_NONE_OPTION: LabeledOptionDto<string> = {
  value: 'none',
  label: 'None',
};

interface AgentPersonaDetailsProps {
  persona: AgentPersona | null;
}

function AgentPersonaDetails({ persona }: AgentPersonaDetailsProps): React.JSX.Element {
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
          <p className='text-xs font-semibold text-gray-200'>No persona attached</p>
          <p className='mt-1'>
            Chat sessions will run without a persona memory bank until one is selected.
          </p>
        </>
      )}
    </FormSection>
  );
}

function useAgentPersonaOptions(agentPersonas: AgentPersona[]): Array<LabeledOptionDto<string>> {
  return React.useMemo<Array<LabeledOptionDto<string>>>(
    () => [
      AGENT_PERSONA_NONE_OPTION,
      ...agentPersonas.map((persona: AgentPersona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [agentPersonas]
  );
}

interface AgentPersonaSectionProps {
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
  agentPersonas: AgentPersona[];
  agentPersonasLoading: boolean;
}

export function AgentPersonaSection({
  personaId,
  setPersonaId,
  agentPersonas,
  agentPersonasLoading,
}: AgentPersonaSectionProps): React.JSX.Element {
  const selectedAgentPersona = React.useMemo<AgentPersona | null>(
    () => agentPersonas.find((item: AgentPersona): boolean => item.id === personaId) ?? null,
    [agentPersonas, personaId]
  );

  const agentPersonaOptions = useAgentPersonaOptions(agentPersonas);

  if (agentPersonasLoading) {
    return (
      <FormSection title='Agent persona' variant='subtle' className='p-4'>
        <p className='text-xs text-gray-500 mt-4'>Loading personas...</p>
      </FormSection>
    );
  }

  return (
    <FormSection
      title='Agent persona'
      description='Attach a tutor persona with shared memory and mood context to new chatbot sessions.'
      variant='subtle'
      className='p-4'
      actions={
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/agentcreator/personas'>Manage personas</Link>
        </Button>
      }
    >
      {agentPersonas.length === 0 ? (
        <p className='text-xs text-gray-500 mt-4'>
          No agent personas yet. Create one in Agent Creator.
        </p>
      ) : (
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
          <FormField label='Persona'>
            <SelectSimple
              size='sm'
              value={personaId ?? 'none'}
              onValueChange={(value: string): void => setPersonaId(value === 'none' ? null : value)}
              options={agentPersonaOptions}
              placeholder='Select persona'
              ariaLabel='Select persona'
              title='Select persona'
            />
          </FormField>
          <AgentPersonaDetails persona={selectedAgentPersona} />
        </div>
      )}
    </FormSection>
  );
}
