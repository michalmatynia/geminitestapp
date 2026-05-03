'use client';

import { memo } from 'react';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/skeleton';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/ui/primitives.public';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { ActionConstructorEngine } from './ActionConstructorEngine';
import { ImportExportMenu } from './ImportExportMenu';
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-9 w-full' />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrphanBanner(): React.JSX.Element | null {
  const {
    orphanedStepIds,
    orphanedActionStepIds,
    orphanedStepSetIds,
    handleCleanOrphanedSteps,
    handleCleanOrphanedStepSets,
    isSaving,
  } = usePlaywrightStepSequencer();

  const hasOrphanedSteps = orphanedStepIds.size > 0;
  const hasOrphanedActionSteps = orphanedActionStepIds.size > 0;
  const hasOrphanedStepSets = orphanedStepSetIds.size > 0;
  if (!hasOrphanedSteps && !hasOrphanedActionSteps && !hasOrphanedStepSets) return null;

  return (
    <div className='flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5'>
      <AlertTriangle className='size-4 shrink-0 text-amber-400' />
      <div className='flex-1 text-xs text-amber-300'>
        {hasOrphanedSteps && (
          <span>
            {orphanedStepIds.size} deleted step{orphanedStepIds.size !== 1 ? 's' : ''} referenced in step sets.{' '}
          </span>
        )}
        {hasOrphanedActionSteps && (
          <span>
            {orphanedActionStepIds.size} deleted step{orphanedActionStepIds.size !== 1 ? 's' : ''} referenced directly in actions.{' '}
          </span>
        )}
        {hasOrphanedStepSets && (
          <span>
            {orphanedStepSetIds.size} deleted step set{orphanedStepSetIds.size !== 1 ? 's' : ''} referenced in actions.{' '}
          </span>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {hasOrphanedSteps ? (
          <Button
            size='sm'
            variant='outline'
            className='h-6 border-amber-500/40 px-2 text-[11px] text-amber-300 hover:border-amber-400/60'
            onClick={() => {
              handleCleanOrphanedSteps().catch(() => undefined);
            }}
            disabled={isSaving}
          >
            Fix step sets
          </Button>
        ) : null}
        {hasOrphanedStepSets ? (
          <Button
            size='sm'
            variant='outline'
            className='h-6 border-amber-500/40 px-2 text-[11px] text-amber-300 hover:border-amber-400/60'
            onClick={() => {
              handleCleanOrphanedStepSets().catch(() => undefined);
            }}
            disabled={isSaving}
          >
            Fix actions
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PlaywrightStepSequencerContent(): React.JSX.Element {
  const { isLoading } = usePlaywrightStepSequencer();

  if (isLoading) return <PlaywrightStepSequencerSkeleton />;

  return (
    <div className='space-y-6'>
      {/* ---- Page-level toolbar ---- */}
      <div className='flex justify-end'>
        <ImportExportMenu />
      </div>

      {/* ---- Orphan warning banner ---- */}
      <OrphanBanner />

      {/* ---- Websites & Flows management ---- */}
      <div className='rounded-lg border border-white/10 bg-black/10 p-4'>
        <WebsiteFlowManagerPanel />
      </div>

      {/* ---- Action Constructor Engine (top section) ---- */}
      <section className='space-y-2'>
        <div className='space-y-0.5'>
          <h2 className='text-sm font-semibold text-foreground'>Action Constructor</h2>
          <p className='text-xs text-muted-foreground'>
            Assemble named actions from direct steps and reusable step sets.
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
