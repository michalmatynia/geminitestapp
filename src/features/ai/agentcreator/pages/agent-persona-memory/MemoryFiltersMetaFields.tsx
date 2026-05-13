'use client';

import type React from 'react';

import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemorySourceType } from '@/shared/contracts/persona-memory';
import { Input } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  PERSONA_MEMORY_MOOD_OPTIONS,
  PERSONA_MEMORY_SOURCE_OPTIONS,
} from './agent-persona-memory-constants';
import { parseMemoryListLimitInput } from './parse-memory-list-limit';
import type { MemoryPageFiltersState } from './use-memory-page-filters';

type MemoryFiltersMetaFieldsProps = {
  filters: MemoryPageFiltersState;
};

export function MemoryFiltersMetaFields({ filters }: MemoryFiltersMetaFieldsProps): React.JSX.Element {
  return (
    <>
      <FormField label='Mood'>
        <SelectSimple
          size='sm'
          value={filters.mood}
          onValueChange={(value: string) => filters.setMood(value as AgentPersonaMoodId | 'all')}
          options={PERSONA_MEMORY_MOOD_OPTIONS}
          ariaLabel='Mood'
          title='Mood'
        />
      </FormField>
      <FormField label='Source type'>
        <SelectSimple
          size='sm'
          value={filters.sourceType}
          onValueChange={(value: string) =>
            filters.setSourceType(value as PersonaMemorySourceType | 'all')
          }
          options={PERSONA_MEMORY_SOURCE_OPTIONS}
          ariaLabel='Source type'
          title='Source type'
        />
      </FormField>
      <FormField label='Limit'>
        <Input
          size='sm'
          type='number'
          min={1}
          max={100}
          value={filters.limit}
          onChange={(event) => {
            filters.setLimit(parseMemoryListLimitInput(event.currentTarget.value));
          }}
          className='h-8'
          aria-label='Limit'
          title='Limit'
        />
      </FormField>
    </>
  );
}
