'use client';

import React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/shared/ui';
import { StudioCard } from '../StudioCard';
import { useSequencingPanelContext } from './SequencingPanelContext';

export function SequenceRunCard(): React.JSX.Element {
  const {
    handleStartSequence,
    handleCancelSequence,
    handleRetryPendingSlotSync,
    isSequenceRunning,
    projectId,
    workingSlotPresent,
    sequencingEnabled,
    enabledStepsCount,
    activeSequenceRunId,
    activeSequenceStatus,
    displayState,
    activeStepLabel,
    slotSyncWarning,
    pendingTerminalSlotId,
    sequenceError,
    sequenceLog,
  } = useSequencingPanelContext();

  return (
    <StudioCard label='Run' className='shrink-0'>
      <div className='space-y-2'>
        <div className='flex gap-2'>
          <Button
            size='xs'
            type='button'
            className='flex-1'
            onClick={handleStartSequence}
            disabled={
              isSequenceRunning ||
              !projectId ||
              !workingSlotPresent ||
              !sequencingEnabled ||
              enabledStepsCount === 0
            }
            loading={isSequenceRunning}
          >
            <Play className='mr-2 size-4' />
            {isSequenceRunning ? 'Running Sequence...' : 'Start Sequence'}
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={handleCancelSequence}
            disabled={!isSequenceRunning || !activeSequenceRunId}
          >
            <Square className='mr-2 size-4' />
            Cancel
          </Button>
        </div>

        {activeSequenceRunId ? (
          <div className='text-[11px] text-gray-400'>
            Run: {activeSequenceRunId} ({activeSequenceStatus ?? 'unknown'})
          </div>
        ) : null}
        {displayState !== 'idle' ? (
          <div className='text-[11px] text-gray-500'>
            Sync state: {displayState.replaceAll('_', ' ')}
          </div>
        ) : null}
        {activeStepLabel ? (
          <div className='text-[11px] text-gray-400'>Active step: {activeStepLabel}</div>
        ) : null}
        {slotSyncWarning ? (
          <div className='text-[11px] text-amber-300'>{slotSyncWarning}</div>
        ) : null}
        {pendingTerminalSlotId ? (
          <div className='flex justify-start'>
            <Button
              size='xs'
              type='button'
              variant='outline'
              onClick={handleRetryPendingSlotSync}
              disabled={displayState === 'resolving_terminal_slot'}
            >
              Retry Sync Output
            </Button>
          </div>
        ) : null}
        {sequenceError ? <div className='text-[11px] text-red-300'>{sequenceError}</div> : null}

        <div className='max-h-44 overflow-y-auto rounded border border-border/50 bg-card/40 p-2 text-[11px] text-gray-300'>
          {sequenceLog.length > 0 ? (
            sequenceLog.map((entry) => (
              <div key={entry} className='leading-5'>
                {entry}
              </div>
            ))
          ) : (
            <div className='text-gray-500'>Sequence logs will appear here.</div>
          )}
        </div>
      </div>
    </StudioCard>
  );
}
