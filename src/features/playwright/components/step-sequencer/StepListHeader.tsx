'use client';

import { ArrowDownAZ, ArrowUpAZ, Layers, ListChecks, Plus } from 'lucide-react';

import { Button } from '@/shared/ui/primitives.public';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import type {
  PlaywrightStepSetSortField,
  PlaywrightStepSortField,
} from '../../context/PlaywrightStepSequencerContext.types';

const STEP_SORT_OPTIONS: { value: PlaywrightStepSortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'createdAt', label: 'Created' },
];

const SET_SORT_OPTIONS: { value: PlaywrightStepSetSortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'stepCount', label: 'Steps' },
  { value: 'createdAt', label: 'Created' },
];

export function StepListHeader(): React.JSX.Element {
  const {
    activeTab,
    setActiveTab,
    steps,
    stepSets,
    filteredSteps,
    filteredStepSets,
    setIsCreateStepOpen,
    setIsCreateSetOpen,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
  } = usePlaywrightStepSequencer();

  const sortOptions = activeTab === 'steps' ? STEP_SORT_OPTIONS : SET_SORT_OPTIONS;

  const stepsFiltered = filteredSteps.length !== steps.length;
  const setsFiltered = filteredStepSets.length !== stepSets.length;

  return (
    <div className='flex items-center justify-between gap-3'>
      {/* Tab switcher */}
      <div className='flex items-center gap-1 rounded-lg border border-border/50 bg-card/30 p-0.5'>
        <button
          type='button'
          onClick={() => setActiveTab('steps')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            activeTab === 'steps'
              ? 'bg-sky-600/25 text-sky-300 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ListChecks className='size-3.5' />
          Steps
          <span className='ml-0.5 rounded-full bg-white/10 px-1.5 text-[10px]'>
            {stepsFiltered ? `${filteredSteps.length}/${steps.length}` : steps.length}
          </span>
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('step_sets')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            activeTab === 'step_sets'
              ? 'bg-sky-600/25 text-sky-300 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className='size-3.5' />
          Step Sets
          <span className='ml-0.5 rounded-full bg-white/10 px-1.5 text-[10px]'>
            {setsFiltered ? `${filteredStepSets.length}/${stepSets.length}` : stepSets.length}
          </span>
        </button>
      </div>

      {/* Sort controls */}
      <div className='flex items-center gap-1'>
        <Select
          value={sortField}
          onValueChange={(v) =>
            setSortField(v as PlaywrightStepSortField | PlaywrightStepSetSortField)
          }
        >
          <SelectTrigger className='h-7 w-[90px] text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size='sm'
          variant='ghost'
          className='size-7 p-0'
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          title={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
          aria-label='Toggle sort direction'
        >
          {sortDirection === 'asc' ? (
            <ArrowDownAZ className='size-3.5' />
          ) : (
            <ArrowUpAZ className='size-3.5' />
          )}
        </Button>
      </div>

      {/* Add button */}
      <Button
        size='sm'
        variant='outline'
        className='h-7 gap-1 text-xs'
        onClick={() => {
          if (activeTab === 'steps') {
            setIsCreateStepOpen(true);
          } else {
            setIsCreateSetOpen(true);
          }
        }}
      >
        <Plus className='size-3.5' />
        {activeTab === 'steps' ? 'New Step' : 'New Set'}
      </Button>
    </div>
  );
}
