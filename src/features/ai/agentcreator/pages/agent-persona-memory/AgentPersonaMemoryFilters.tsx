'use client';

import type React from 'react';

import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { MemoryFiltersMetaFields } from './MemoryFiltersMetaFields';
import { MemoryFiltersQueryFields } from './MemoryFiltersQueryFields';
import type { MemoryPageFiltersState } from './use-memory-page-filters';

type AgentPersonaMemoryFiltersProps = {
  filters: MemoryPageFiltersState;
};

export function AgentPersonaMemoryFilters({ filters }: AgentPersonaMemoryFiltersProps): React.JSX.Element {
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-6`}>
      <MemoryFiltersQueryFields filters={filters} />
      <MemoryFiltersMetaFields filters={filters} />
    </div>
  );
}
