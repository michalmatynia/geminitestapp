import React from 'react';
import { Button, Hint, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui';
import type { RunHistoryFilterView } from './run-history-panel';

interface RunHistoryFilterControlsProps {
  runFilter: RunHistoryFilterView;
  onSetRunFilter: (filter: RunHistoryFilterView) => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function RunHistoryFilterControls(
  props: RunHistoryFilterControlsProps
): React.JSX.Element {
  const {
    runFilter,
    onSetRunFilter,
    compareMode,
    onToggleCompareMode,
    isRefreshing,
    onRefresh,
  } = props;
  return (
    <>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          <Hint size='xs' uppercase={false} className='font-semibold text-white'>
            Run History
          </Hint>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <div className='flex items-center gap-2 text-[10px]'>
          <Button
            type='button'
            className={`rounded-md border px-2 py-1 ${
              compareMode
                ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                : 'text-gray-300 hover:bg-muted/60'
            }`}
            onClick={onToggleCompareMode}
          >
            {compareMode ? 'Exit compare' : 'Compare runs'}
          </Button>
        </div>
      </div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'failed', label: 'Failed' },
          { id: 'dead', label: 'Dead-letter' },
        ].map(
          (filter: { id: string; label: string }): React.JSX.Element => (
            <Button
              key={filter.id}
              type='button'
              className={`rounded-md border px-2 py-1 text-[10px] ${
                runFilter === filter.id
                  ? 'border-emerald-500/50 text-emerald-200'
                  : 'text-gray-300 hover:bg-muted/60'
              }`}
              onClick={(): void => onSetRunFilter(filter.id as RunHistoryFilterView)}
            >
              {filter.label}
            </Button>
          )
        )}
      </div>
    </>
  );
}
