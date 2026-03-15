import React from 'react';

import { Button, Input } from '@/shared/ui';

import type { QuestionListFilter, QuestionListSort } from '../question-manager-view';

interface KangurQuestionsFilterTriageProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMode: QuestionListSort;
  onSortChange: (value: QuestionListSort) => void;
  listFilter: QuestionListFilter;
  onFilterChange: (value: QuestionListFilter) => void;
  filterOptions: Array<{ value: QuestionListFilter; label: string }>;
  sortOptions: Array<{ value: QuestionListSort; label: string }>;
}

export function KangurQuestionsFilterTriage({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  listFilter,
  onFilterChange,
  filterOptions,
  sortOptions,
}: KangurQuestionsFilterTriageProps): React.JSX.Element {
  return (
    <div className='rounded-[28px] border border-border/60 bg-card/25 p-4 sm:p-5'>
      <div className='mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
        Filter and triage
      </div>
      <div className='grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
        <Input
          type='search'
          value={searchQuery}
          onChange={(event): void => onSearchChange(event.target.value)}
          placeholder='Search prompts, answers, or audit flags...'
          aria-label='Search questions'
          className='h-10 text-sm'
          title='Search prompts, answers, or audit flags...'
        />
        <div className='grid gap-3 lg:min-w-[26rem] lg:grid-cols-2'>
          <div className='space-y-2'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
              Sort
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {sortOptions.map((option) => {
                const isActive = option.value === sortMode;
                return (
                  <Button
                    key={option.value}
                    type='button'
                    size='sm'
                    variant='outline'
                    className={
                      isActive
                        ? 'h-8 rounded-full border-cyan-400/50 bg-cyan-500/15 px-3 text-[11px] text-cyan-100'
                        : 'h-8 rounded-full px-3 text-[11px]'
                    }
                    onClick={(): void => onSortChange(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className='space-y-2'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
              Filter
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {filterOptions.map((option) => {
                const isActive = option.value === listFilter;
                return (
                  <Button
                    key={option.value}
                    type='button'
                    size='sm'
                    variant='outline'
                    className={
                      isActive
                        ? 'h-8 rounded-full border-sky-400/50 bg-sky-500/15 px-3 text-[11px] text-sky-100'
                        : 'h-8 rounded-full px-3 text-[11px]'
                    }
                    onClick={(): void => onFilterChange(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {listFilter !== 'all' || sortMode !== 'manual' ? (
        <div className='mt-3 text-[11px] text-muted-foreground'>
          Reorder questions in the Manual order / All view.
        </div>
      ) : null}
    </div>
  );
}
