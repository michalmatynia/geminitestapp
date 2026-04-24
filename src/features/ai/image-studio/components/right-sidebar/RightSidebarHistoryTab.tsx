import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { ProjectGenerationHistoryTab } from '../ProjectGenerationHistoryTab';
import { useRightSidebarContext } from '../RightSidebarContext';

export const RightSidebarHistoryTab = React.memo((): React.JSX.Element => {
  const context = useRightSidebarContext();
  const { historyMode, setHistoryMode } = context;

  return (
    <div className='min-h-0 flex flex-1 flex-col overflow-hidden px-4 py-3'>
      <div className='mb-3 grid grid-cols-2 gap-2'>
        <HistoryModeButton
          label='Action Steps'
          active={historyMode === 'actions'}
          onClick={() => setHistoryMode('actions')}
        />
        <HistoryModeButton
          label='Generation Runs'
          active={historyMode === 'runs'}
          onClick={() => setHistoryMode('runs')}
        />
      </div>
      {historyMode === 'actions' ? (
        <ActionHistoryList context={context} />
      ) : (
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <ProjectGenerationHistoryTab />
        </div>
      )}
    </div>
  );
});

function HistoryModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size='xs'
      type='button'
      variant='ghost'
      className={cn(
        'h-7 rounded border border-border/60 px-2 text-[11px]',
        active
          ? 'border-blue-400/70 bg-blue-500/10 text-blue-200 hover:bg-blue-500/10'
          : 'text-gray-400 hover:text-gray-200'
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function ActionHistoryList({ context }: { context: ReturnType<typeof useRightSidebarContext> }) {
  const {
    actionHistoryEntriesLength,
    actionHistoryItems,
    actionHistoryMaxSteps,
    activeActionHistoryIndex,
    onRestoreActionStep,
  } = context;

  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <div className='mb-2 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
        Tracks editor state changes (up to {actionHistoryMaxSteps} steps). Click any step to restore
        it.
      </div>
      {actionHistoryItems.length > 0 ? (
        <div className='space-y-2'>
          {actionHistoryItems.map(({ entry, index }) => {
            const isActiveStep = index === activeActionHistoryIndex;
            return (
              <ActionHistoryItem
                key={entry.id}
                entry={entry}
                index={index}
                isActive={isActiveStep}
                totalSteps={actionHistoryEntriesLength}
                onRestore={() => onRestoreActionStep(index)}
              />
            );
          })}
        </div>
      ) : (
        <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-500'>
          No editor actions recorded yet.
        </div>
      )}
    </div>
  );
}

function ActionHistoryItem({
  entry,
  index,
  isActive,
  totalSteps,
  onRestore,
}: {
  entry: any;
  index: number;
  isActive: boolean;
  totalSteps: number;
  onRestore: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onRestore}
      className={cn(
        'w-full rounded border px-2 py-2 text-left transition-colors',
        isActive
          ? 'border-blue-400/70 bg-blue-500/10'
          : 'border-border/60 bg-card/30 hover:border-border/80 hover:bg-card/50'
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className={cn('text-xs', isActive ? 'text-blue-100' : 'text-gray-200')}>
          {entry.label}
        </span>
        <span className='text-[10px] text-gray-500'>
          {new Date(entry.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <div className='mt-1 text-[10px] text-gray-500'>
        Step {index + 1} of {totalSteps}
      </div>
    </button>
  );
}
