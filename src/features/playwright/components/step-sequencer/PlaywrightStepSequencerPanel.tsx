'use client';

import { memo } from 'react';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/skeleton';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { ActionConstructorEngine } from './ActionConstructorEngine';
import { SavedActionsPanel } from './SavedActionsPanel';
import { StepFormModal } from './StepFormModal';
import { StepListFilters } from './StepListFilters';
import { StepListHeader } from './StepListHeader';
import { StepListTable } from './StepListTable';
import { StepSetFormModal } from './StepSetFormModal';
import { WebsiteFlowManagerPanel } from './WebsiteFlowManagerPanel';

function PlaywrightStepSequencerSkeleton(): React.JSX.Element {
  return (
    <div className='space-y-6'>
      {/* Action constructor skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-3 w-72' />
        <div className='flex gap-3'>
          <Skeleton className='h-[220px] w-[280px] rounded-lg' />
          <Skeleton className='h-[220px] flex-1 rounded-lg' />
        </div>
      </div>
      {/* List skeleton */}
      <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
        <div className='flex justify-between'>
          <div className='flex gap-1'>
            <Skeleton className='h-7 w-24' />
            <Skeleton className='h-7 w-24' />
          </div>
          <Skeleton className='h-7 w-20' />
        </div>
        <Skeleton className='h-8 w-full' />
        <div className='space-y-2 rounded-md border border-white/10 p-3'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-9 w-full' />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaywrightStepSequencerContent(): React.JSX.Element {
  const { isLoading } = usePlaywrightStepSequencer();

  if (isLoading) return <PlaywrightStepSequencerSkeleton />;

  return (
    <div className='space-y-6'>
      {/* ---- Websites & Flows management ---- */}
      <div className='rounded-lg border border-white/10 bg-black/10 p-4'>
        <WebsiteFlowManagerPanel />
      </div>

      {/* ---- Action Constructor Engine (top section) ---- */}
      <section className='space-y-2'>
        <div className='space-y-0.5'>
          <h2 className='text-sm font-semibold text-foreground'>Action Constructor</h2>
          <p className='text-xs text-muted-foreground'>
            Browse step sets from the tree and assemble them into a named action.
          </p>
        </div>
        <ActionConstructorEngine />
      </section>

      {/* ---- Saved actions (shown once any action is saved) ---- */}
      <SavedActionsPanel />

      {/* ---- Step / Step Set list (bottom section) ---- */}
      <section className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
        <StepListHeader />
        <StepListFilters />
        <StepListTable />
      </section>
    </div>
  );
}

export const PlaywrightStepSequencerPanel = memo(() => {
  return (
    <AppErrorBoundary source='playwright.PlaywrightStepSequencerPanel'>
      {/* Modals — rendered outside layout flow */}
      <StepFormModal />
      <StepSetFormModal />
      <PlaywrightStepSequencerContent />
    </AppErrorBoundary>
  );
});
