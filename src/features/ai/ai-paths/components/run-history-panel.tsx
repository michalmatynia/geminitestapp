'use client';

import React from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { Card } from '@/shared/ui/primitives.public';
import { RunComparisonTool } from './RunComparisonTool';
import { RunHistoryFilterControls } from './RunHistoryFilterControls';
import { RunHistoryList } from './RunHistoryList';
import { useRunHistoryActions, useRunHistoryState } from '../context';
import { useRunComparison } from '../hooks/useRunComparison';

export type RunHistoryFilterView = 'all' | 'active' | 'failed' | 'canceled';

export function RunHistoryPanel(): React.JSX.Element {
  const {
    runList: resolvedRuns,
    runsRefreshing: resolvedIsRefreshing,
    expandedRunHistory,
    runHistorySelection,
    runFilter: rawRunFilter,
  } = useRunHistoryState();
  const {
    setRunFilter: setRunFilterContext,
    setExpandedRunHistory,
    setRunHistorySelection,
    refreshRuns,
    openRunDetail,
    cancelRun,
  } = useRunHistoryActions();

  const comparison = useRunComparison(resolvedRuns);

  const { runFilter, setRunFilter, filteredRunList } = useFilteredRunList(
    rawRunFilter as string,
    resolvedRuns,
    setRunFilterContext
  );

  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
      <RunHistoryFilterControls
        runFilter={runFilter}
        onSetRunFilter={setRunFilter}
        compareMode={comparison.compareMode}
        onToggleCompareMode={comparison.toggleCompareMode}
        isRefreshing={resolvedIsRefreshing}
        onRefresh={() => void refreshRuns().catch(() => {})}
      />

      <RunHistoryList
        runs={filteredRunList}
        compareMode={comparison.compareMode}
        primaryRunId={comparison.primaryRunId}
        secondaryRunId={comparison.secondaryRunId}
        onSetPrimaryRunId={comparison.setPrimaryRunId}
        onSetSecondaryRunId={comparison.setSecondaryRunId}
        onOpenRunDetail={openRunDetail}
        onExpandedRunHistory={setExpandedRunHistory}
        expandedRunHistory={expandedRunHistory}
        runHistorySelection={runHistorySelection}
        onSetRunHistorySelection={setRunHistorySelection}
        onCancelRun={(runId) => void cancelRun(runId).catch(() => {})}
      />

      {comparison.compareMode && comparison.primaryRun && comparison.secondaryRun && (
        <RunComparisonTool
          primaryRun={comparison.primaryRun}
          secondaryRun={comparison.secondaryRun}
          traceComparison={comparison.traceComparison}
          displayedComparisonRows={comparison.displayedComparisonRows}
          compareInspectorRowKey={comparison.compareInspectorRowKey}
          onSetCompareInspectorRowKey={comparison.setCompareInspectorRowKey}
        />
      )}
    </Card>
  );
}

function useFilteredRunList(
  rawRunFilter: string,
  resolvedRuns: AiPathRunRecord[],
  setRunFilterContext: (next: string) => void
) {
  const runFilter: RunHistoryFilterView = React.useMemo((): RunHistoryFilterView => {
    if (rawRunFilter === 'active' || rawRunFilter === 'running' || rawRunFilter === 'queued') {
      return 'active';
    }
    if (rawRunFilter === 'failed') return 'failed';
    if (rawRunFilter === 'canceled') return 'canceled';
    return 'all';
  }, [rawRunFilter]);

  const setRunFilter = React.useCallback(
    (nextFilter: RunHistoryFilterView): void => {
      setRunFilterContext(nextFilter);
    },
    [setRunFilterContext]
  );

  const filteredRunList = React.useMemo((): AiPathRunRecord[] => {
    if (runFilter === 'all') return resolvedRuns;
    if (runFilter === 'active') {
      return resolvedRuns.filter(
        (run: AiPathRunRecord): boolean => run.status === 'queued' || run.status === 'running'
      );
    }
    if (runFilter === 'failed') {
      return resolvedRuns.filter((run: AiPathRunRecord): boolean => run.status === 'failed');
    }
    return resolvedRuns.filter((run: AiPathRunRecord): boolean => run.status === 'canceled');
  }, [runFilter, resolvedRuns]);

  return { runFilter, setRunFilter, filteredRunList };
}
