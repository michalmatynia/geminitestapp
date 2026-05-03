'use client';

import { Search, X } from 'lucide-react';
import React from 'react';

import { CategoryMapperCatalogSelector } from '@/features/integrations/components/marketplaces/category-mapper/CategoryMapperCatalogSelector';
import { SegmentedControl } from '@/shared/ui/forms-and-actions.public';
import { Button, Input } from '@/shared/ui/primitives.public';

import {
  CATEGORY_MAPPING_FILTER_OPTIONS,
  type CategoryMappingFilter,
} from './filtering';

type CategoryMapperTableFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  mappingFilter: CategoryMappingFilter;
  onMappingFilterChange: (filter: CategoryMappingFilter) => void;
};

export function CategoryMapperTableFilters({
  searchQuery,
  onSearchQueryChange,
  mappingFilter,
  onMappingFilterChange,
}: CategoryMapperTableFiltersProps): React.JSX.Element {
  const isSearchFilled = searchQuery.trim().length > 0;

  return (
    <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center'>
      <div className='min-w-0 sm:w-72'>
        <CategoryMapperCatalogSelector />
      </div>
      <SegmentedControl<CategoryMappingFilter>
        ariaLabel='Filter external categories by mapping status'
        size='xs'
        value={mappingFilter}
        onChange={onMappingFilterChange}
        options={CATEGORY_MAPPING_FILTER_OPTIONS}
        className='h-8 shrink-0'
      />
      <div className='relative min-w-0 flex-1'>
        <Search
          className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden='true'
        />
        <Input
          value={searchQuery}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onSearchQueryChange(event.target.value)
          }
          placeholder='Search external categories...'
          aria-label='Search external categories'
          size='sm'
          className='h-8 pl-8 pr-9'
        />
        {isSearchFilled ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md'
            aria-label='Clear external category search'
            title='Clear external category search'
            onClick={() => onSearchQueryChange('')}
          >
            <X className='h-3.5 w-3.5' aria-hidden='true' />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
