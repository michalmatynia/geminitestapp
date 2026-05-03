'use client';

import { Box, Grid, List, Filter, X, Upload } from 'lucide-react';
import React from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Badge } from '@/shared/ui/primitives.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';

export function Admin3DAssetsFilters({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  selectedCategory,
  selectedTags,
  clearFilters,
  viewMode,
  setViewMode,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showFilters: boolean;
  setShowFilters: (s: boolean) => void;
  hasActiveFilters: boolean;
  selectedCategory: string | null;
  selectedTags: string[];
  clearFilters: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3'>
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery('')}
        placeholder='Search assets...'
        size='sm'
        containerClassName='flex-1 min-w-[200px] max-w-md'
      />

      <Button
        variant={showFilters ? 'default' : 'outline'}
        size='sm'
        onClick={() => setShowFilters(!showFilters)}
        className='gap-2 h-8 text-xs'
      >
        <Filter className='h-3.5 w-3.5' />
        Filters
        {hasActiveFilters && (
          <Badge
            variant='active'
            className='ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px] font-bold'
          >
            {(selectedCategory !== null && selectedCategory !== '' ? 1 : 0) + selectedTags.length}
          </Badge>
        )}
      </Button>

      {hasActiveFilters && (
        <Button variant='ghost' size='sm' onClick={clearFilters} className='gap-1 h-8 text-xs'>
          <X className='h-3.5 w-3.5' />
          Clear
        </Button>
      )}

      <div className='ml-auto flex items-center overflow-hidden rounded-md border border-border bg-muted/20'>
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
    </div>
  );
}

export function Admin3DAssetsEmptyState({
  hasActiveFilters,
  setShowUploader,
  handleReindex,
  isReindexing,
}: {
  hasActiveFilters: boolean;
  setShowUploader: (s: boolean) => void;
  handleReindex: () => void;
  isReindexing: boolean;
}) {
  return (
    <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
      {!hasActiveFilters ? (
        <>
          <Button onClick={() => setShowUploader(true)} size='sm'>
            <Upload className='mr-2 h-4 w-4' />
            Upload Asset
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleReindex}
            disabled={isReindexing}
            loading={isReindexing}
          >
            Reindex Local Files
          </Button>
        </>
      ) : null}
    </div>
  );
}
