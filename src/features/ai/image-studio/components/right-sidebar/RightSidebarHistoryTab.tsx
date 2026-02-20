import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ProjectGenerationHistoryTab } from '../ProjectGenerationHistoryTab';

type ActionHistoryEntrySummary = {
  id: string;
  label: string;
  createdAt: string;
};

type ActionHistoryItem = {
  entry: ActionHistoryEntrySummary;
  index: number;
};

type RightSidebarHistoryTabProps = {
  actionHistoryEntriesLength: number;
  actionHistoryItems: ActionHistoryItem[];
  actionHistoryMaxSteps: number;
  activeActionHistoryIndex: number;
  historyMode: 'actions' | 'runs';
  onHistoryModeChange: (mode: 'actions' | 'runs') => void;
  onRestoreActionStep: (targetIndex: number) => void;
};

export const RightSidebarHistoryTab = React.memo(function RightSidebarHistoryTab({
  actionHistoryEntriesLength,
  actionHistoryItems,
  actionHistoryMaxSteps,
  activeActionHistoryIndex,
  historyMode,
  onHistoryModeChange,
  onRestoreActionStep,
}: RightSidebarHistoryTabProps): React.JSX.Element {
  return (
    <div className='min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-3'>
      <div className='mb-3 grid grid-cols-2 gap-2'>
        <Button
          size='xs'
          type='button'
          variant='ghost'
          className={cn(
            'h-7 rounded border border-border/60 px-2 text-[11px]',
            historyMode === 'actions'
              ? 'border-blue-400/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/10'
              : 'text-gray-400 hover:text-gray-200',
          )}
          onClick={() => onHistoryModeChange('actions')}
        >
          Action Steps
        </Button>
        <Button
          size='xs'
          type='button'
          variant='ghost'
          className={cn(
            'h-7 rounded border border-border/60 px-2 text-[11px]',
            historyMode === 'runs'
              ? 'border-blue-400/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/10'
              : 'text-gray-400 hover:text-gray-200',
          )}
          onClick={() => onHistoryModeChange('runs')}
        >
          Generation Runs
        </Button>
      </div>
      {historyMode === 'actions' ? (
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='mb-2 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
            Tracks editor state changes (up to {actionHistoryMaxSteps} steps). Click any step to restore it.
          </div>
          {actionHistoryItems.length > 0 ? (
            <div className='space-y-2'>
              {actionHistoryItems.map(({ entry, index }) => {
                const isActiveStep = index === activeActionHistoryIndex;
                return (
                  <button
                    key={entry.id}
                    type='button'
                    onClick={() => onRestoreActionStep(index)}
                    className={cn(
                      'w-full rounded border px-2 py-2 text-left transition-colors',
                      isActiveStep
                        ? 'border-blue-400/70 bg-blue-500/10'
                        : 'border-border/60 bg-card/30 hover:border-border/80 hover:bg-card/50',
                    )}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <span className={cn('text-xs', isActiveStep ? 'text-blue-100' : 'text-gray-200')}>
                        {entry.label}
                      </span>
                      <span className='text-[10px] text-gray-500'>
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className='mt-1 text-[10px] text-gray-500'>
                      Step {index + 1} of {actionHistoryEntriesLength}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-500'>
              No editor actions recorded yet.
            </div>
          )}
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <ProjectGenerationHistoryTab />
        </div>
      )}
    </div>
  );
});
