import React from 'react';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import type { RunHistoryFilterView } from './run-history-panel';
import { RunHistoryPillButton } from './RunHistoryPillButton';

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
          <RunHistoryPillButton
            onClick={onRefresh}
            disabled={isRefreshing}
            inactiveClassName='text-gray-200 hover:bg-muted/60'
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </RunHistoryPillButton>
        </div>
        <div className='flex items-center gap-2 text-[10px]'>
          <RunHistoryPillButton
            active={compareMode}
            activeClassName='border-sky-500/60 bg-sky-500/10 text-sky-100'
            onClick={onToggleCompareMode}
          >
            {compareMode ? 'Exit compare' : 'Compare runs'}
          </RunHistoryPillButton>
        </div>
      </div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'failed', label: 'Failed' },
          { id: 'canceled', label: 'Canceled' },
        ].map(
          (filter: { id: string; label: string }): React.JSX.Element => (
            <RunHistoryPillButton
              key={filter.id}
              active={runFilter === filter.id}
              onClick={(): void => onSetRunFilter(filter.id as RunHistoryFilterView)}
            >
              {filter.label}
            </RunHistoryPillButton>
          )
        )}
      </div>
    </>
  );
}
