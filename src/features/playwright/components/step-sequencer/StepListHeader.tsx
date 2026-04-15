'use client';

import { Layers, ListChecks, Plus } from 'lucide-react';

import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

export function StepListHeader(): React.JSX.Element {
  const {
    activeTab,
    setActiveTab,
    steps,
    stepSets,
    setIsCreateStepOpen,
    setIsCreateSetOpen,
  } = usePlaywrightStepSequencer();

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
            {steps.length}
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
            {stepSets.length}
          </span>
        </button>
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
