'use client';

import { Grid, List } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button } from '@/shared/ui/primitives.public';
import { FilterPanel } from '@/shared/ui/templates.public';

const ALL_CATEGORIES_OPTION: LabeledOptionDto<string> = {
  value: '__all__',
  label: 'All categories',
};

interface Asset3DListFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  categories: string[];
  allTags: string[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

function Asset3DViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center overflow-hidden rounded-md border border-border bg-muted/20'>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size='icon'
        className='h-8 w-8 rounded-none'
        onClick={() => setViewMode('grid')}
        aria-label='Grid view'
        title='Grid view'
      >
        <Grid className='h-4 w-4' />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size='icon'
        className='h-8 w-8 rounded-none'
        onClick={() => setViewMode('list')}
        aria-label='List view'
        title='List view'
      >
        <List className='h-4 w-4' />
      </Button>
    </div>
  );
}

function Asset3DTagFilters({
  allTags,
  selectedTags,
  setSelectedTags,
}: {
  allTags: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
}): React.JSX.Element | null {
  if (allTags.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-2 pt-2'>
      {allTags.slice(0, 5).map((tag) => (
        <Button
          key={tag}
          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
          size='xs'
          onClick={() =>
            setSelectedTags((prev) =>
              prev.includes(tag) ? prev.filter((currentTag) => currentTag !== tag) : [...prev, tag]
            )
          }
          className='h-7 px-2 text-[10px]'
        >
          {tag}
        </Button>
      ))}
    </div>
  );
}

export function Asset3DListFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedTags,
  setSelectedTags,
  categories,
  allTags,
  viewMode,
  setViewMode,
}: Asset3DListFiltersProps): React.JSX.Element {
  const categoryOptions = React.useMemo(
    () => [ALL_CATEGORIES_OPTION, ...categories.map((cat: string) => ({ value: cat, label: cat }))],
    [categories]
  );

  const categoryFilters = React.useMemo(
    () =>
      categories.length > 0
        ? [
            {
              key: 'category',
              label: 'Category',
              type: 'select' as const,
              options: categoryOptions,
              width: '180px',
            },
          ]
        : [],
    [categories.length, categoryOptions]
  );

  return (
    <div className='space-y-3'>
      <FilterPanel
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search assets...'
        values={{ category: selectedCategory ?? '__all__' }}
        onFilterChange={(key, val) => {
          if (key === 'category') setSelectedCategory(val === '__all__' ? null : (val as string));
        }}
        filters={categoryFilters}
        headerAction={<Asset3DViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />}
      />
      <Asset3DTagFilters
        allTags={allTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
      />
    </div>
  );
}
