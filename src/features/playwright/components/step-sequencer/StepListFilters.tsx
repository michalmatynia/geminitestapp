'use client';

import { Search, X } from 'lucide-react';

import { PLAYWRIGHT_STEP_TYPE_LABELS, type PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { Badge } from '@/shared/ui/primitives.public';
import { Button } from '@/shared/ui/primitives.public';
import { Input } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [PlaywrightStepType, string][];

export function StepListFilters(): React.JSX.Element {
  const {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterSharedOnly,
    setFilterSharedOnly,
    activeTab,
  } = usePlaywrightStepSequencer();

  const hasActiveFilters = Boolean(searchQuery || filterType || filterSharedOnly);

  return (
    <div className='space-y-2'>
      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'steps' ? 'Search steps…' : 'Search step sets…'}
          className='pl-8 pr-8 h-8 text-sm'
          aria-label='Search'
        />
        {searchQuery ? (
          <button
            type='button'
            onClick={() => setSearchQuery('')}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            aria-label='Clear search'
          >
            <X className='size-3.5' />
          </button>
        ) : null}
      </div>

      {/* Type filter — only relevant for steps tab */}
      {activeTab === 'steps' ? (
        <div className='flex flex-wrap gap-1.5'>
          {STEP_TYPES.map(([type, label]) => (
            <button
              key={type}
              type='button'
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                filterType === type
                  ? 'border-sky-500/60 bg-sky-500/20 text-sky-300'
                  : 'border-border/50 bg-card/30 text-muted-foreground hover:border-sky-500/40 hover:text-sky-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Shared only toggle */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setFilterSharedOnly(!filterSharedOnly)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
            filterSharedOnly
              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
              : 'border-border/50 bg-card/30 text-muted-foreground hover:border-emerald-500/40'
          )}
        >
          Shared only
        </button>

        {hasActiveFilters ? (
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-[11px] text-muted-foreground'
            onClick={() => {
              setSearchQuery('');
              setFilterType(null);
              setFilterSharedOnly(false);
            }}
          >
            Clear filters
          </Button>
        ) : null}

        {hasActiveFilters ? (
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            filtered
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
