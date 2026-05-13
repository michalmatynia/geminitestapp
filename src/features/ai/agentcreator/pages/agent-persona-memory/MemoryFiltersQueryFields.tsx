'use client';

import type React from 'react';

import { Input } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

import type { MemoryPageFiltersState } from './use-memory-page-filters';

type MemoryFiltersQueryFieldsProps = {
  filters: MemoryPageFiltersState;
};

export function MemoryFiltersQueryFields({ filters }: MemoryFiltersQueryFieldsProps): React.JSX.Element {
  return (
    <>
      <FormField label='Search memory'>
        <Input
          size='sm'
          value={filters.query}
          onChange={(event) => filters.setQuery(event.target.value)}
          placeholder='topic or phrase'
          className='h-8'
          aria-label='topic or phrase'
          title='topic or phrase'
        />
      </FormField>
      <FormField label='Tag'>
        <Input
          size='sm'
          value={filters.tag}
          onChange={(event) => filters.setTag(event.target.value)}
          placeholder='tag name'
          className='h-8'
          aria-label='tag name'
          title='tag name'
        />
      </FormField>
      <FormField label='Topic'>
        <Input
          size='sm'
          value={filters.topic}
          onChange={(event) => filters.setTopic(event.target.value)}
          placeholder='fractions'
          className='h-8'
          aria-label='fractions'
          title='fractions'
        />
      </FormField>
    </>
  );
}
