'use client';

import type React from 'react';

import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';
import { Card } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { hasPersonaMemoryMetadata } from './format-persona-memory';
import { PersonaMemoryProvenancePanel } from './PersonaMemoryProvenancePanel';

type AgentPersonaMemoryRowDetailsProps = {
  row: { original: PersonaMemoryRecord };
};

export function AgentPersonaMemoryRowDetails({
  row,
}: AgentPersonaMemoryRowDetailsProps): React.JSX.Element {
  const metadata = row.original.metadata;
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} bg-black/20 p-4 md:grid-cols-2`}>
      <div>
        <Hint size='xxs' uppercase className='mb-2'>
          Full content
        </Hint>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-black/40 whitespace-pre-wrap font-mono text-[11px] text-gray-300'
        >
          {row.original.content}
        </Card>
      </div>
      <div className='space-y-4'>
        <PersonaMemoryProvenancePanel record={row.original} />
        {hasPersonaMemoryMetadata(metadata) ? (
          <div>
            <Hint size='xxs' uppercase className='mb-2'>
              Metadata
            </Hint>
            <Card
              variant='subtle-compact'
              padding='sm'
              className='border-border/60 bg-black/40 whitespace-pre-wrap font-mono text-[10px] text-gray-400'
            >
              {JSON.stringify(metadata, null, 2)}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
