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
  const runHistoryState = useRunHistoryState();
  const {
    runList: resolvedRuns,
    runsRefreshing: resolvedIsRefreshing,
    expandedRunHistory,
    runHistorySelection,
  } = runHistoryState;
  const {
    setRunFilter: setRunFilterContext,
    setExpandedRunHistory,
    setRunHistorySelection,
    refreshRuns,
    openRunDetail,
    cancelRun,
  } = useRunHistoryActions();

  const {
    compareMode,
    toggleCompareMode,
    primaryRunId,
    setPrimaryRunId,
    secondaryRunId,
    setSecondaryRunId,
    compareInspectorRowKey,
    setCompareInspectorRowKey,
    compareResumeChangesOnly,
    setCompareResumeChangesOnly,
    primaryRun,
    secondaryRun,
    traceComparison,
    displayedComparisonRows,
  } = useRunComparison(resolvedRuns);

  const handleRefresh = (): void => {
    void refreshRuns().catch(() => {});
  };

  const handleOpenRunDetail = (runId: string): void => {
    openRunDetail(runId);
  };

  const handleCancelRun = (runId: string): void => {
    void cancelRun(runId).catch(() => {});
  };

  const rawRunFilter = runHistoryState.runFilter as string;

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

  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
      <RunHistoryFilterControls
        runFilter={runFilter}
        onSetRunFilter={setRunFilter}
        compareMode={compareMode}
        onToggleCompareMode={toggleCompareMode}
        isRefreshing={resolvedIsRefreshing}
        onRefresh={handleRefresh}
      />

      <RunHistoryList
        runs={filteredRunList}
        compareMode={compareMode}
        primaryRunId={primaryRunId}
        secondaryRunId={secondaryRunId}
        onSetPrimaryRunId={setPrimaryRunId}
        onSetSecondaryRunId={setSecondaryRunId}
        onOpenRunDetail={handleOpenRunDetail}
        onExpandedRunHistory={setExpandedRunHistory}
        expandedRunHistory={expandedRunHistory}
        runHistorySelection={runHistorySelection}
        onSetRunHistorySelection={setRunHistorySelection}
        onCancelRun={handleCancelRun}
      />

      {compareMode && primaryRun && secondaryRun && (
        <RunComparisonTool
          primaryRun={primaryRun}
          secondaryRun={secondaryRun}
          traceComparison={traceComparison}
          displayedComparisonRows={displayedComparisonRows}
          compareResumeChangesOnly={compareResumeChangesOnly}
          compareInspectorRowKey={compareInspectorRowKey}
          onSetCompareInspectorRowKey={setCompareInspectorRowKey}
          onToggleResumeChangesOnly={(): void => setCompareResumeChangesOnly((prev) => !prev)}
        />
      )}
    </Card>
  );
}
