'use client';

import React from 'react';

import type { AiPathRunRecord } from '@/shared/lib/ai-paths';
import { Card } from '@/shared/ui';
import { RunComparisonTool } from './RunComparisonTool';
import { RunHistoryFilterControls } from './RunHistoryFilterControls';
import { RunHistoryList } from './RunHistoryList';
import { useRunHistoryActions, useRunHistoryState } from '../context';
import { useRunComparison } from '../hooks/useRunComparison';

export type RunHistoryFilterView = 'all' | 'active' | 'failed' | 'dead';

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
    resumeRun,
    handoffRun,
    retryRunNode,
    cancelRun,
    requeueDeadLetter,
  } = useRunHistoryActions();

  const [handoffStateByRunId, setHandoffStateByRunId] = React.useState<
    Record<string, 'pending' | 'success'>
  >({});
  const handoffResetTimeoutsRef = React.useRef<Record<string, number>>({});

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

  React.useEffect(() => {
    return () => {
      Object.values(handoffResetTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      handoffResetTimeoutsRef.current = {};
    };
  }, []);

  const handleRefresh = (): void => {
    void refreshRuns().catch(() => {});
  };
  const handleOpenRunDetail = (runId: string): void => {
    openRunDetail(runId);
  };
  const handleResumeRun = (runId: string, mode: 'resume' | 'replay'): void => {
    void resumeRun(runId, mode).catch(() => {});
  };
  const handleHandoffRun = (runId: string): void => {
    setHandoffStateByRunId((prev) => ({
      ...prev,
      [runId]: 'pending',
    }));
    void handoffRun(runId)
      .then((ok: boolean) => {
        if (!ok) {
          const existingTimeoutId = handoffResetTimeoutsRef.current[runId];
          if (typeof existingTimeoutId === 'number') {
            window.clearTimeout(existingTimeoutId);
            delete handoffResetTimeoutsRef.current[runId];
          }
          setHandoffStateByRunId((prev) => {
            const next = { ...prev };
            delete next[runId];
            return next;
          });
          return;
        }
        setHandoffStateByRunId((prev) => ({
          ...prev,
          [runId]: 'success',
        }));
        const existingTimeoutId = handoffResetTimeoutsRef.current[runId];
        if (typeof existingTimeoutId === 'number') {
          window.clearTimeout(existingTimeoutId);
        }
        handoffResetTimeoutsRef.current[runId] = window.setTimeout(() => {
          setHandoffStateByRunId((prev) => {
            if (prev[runId] !== 'success') return prev;
            const next = { ...prev };
            delete next[runId];
            return next;
          });
          delete handoffResetTimeoutsRef.current[runId];
        }, 4000);
      })
      .catch(() => {
        const existingTimeoutId = handoffResetTimeoutsRef.current[runId];
        if (typeof existingTimeoutId === 'number') {
          window.clearTimeout(existingTimeoutId);
          delete handoffResetTimeoutsRef.current[runId];
        }
        setHandoffStateByRunId((prev) => {
          const next = { ...prev };
          delete next[runId];
          return next;
        });
      });
  };
  const handleRetryRunNode = (runId: string, nodeId: string): void => {
    void retryRunNode(runId, nodeId).catch(() => {});
  };
  const handleCancelRun = (runId: string): void => {
    void cancelRun(runId).catch(() => {});
  };
  const handleRequeueDeadLetter = (runId: string): void => {
    void requeueDeadLetter(runId).catch(() => {});
  };
  const rawRunFilter = runHistoryState.runFilter as string;

  const runFilter: RunHistoryFilterView = React.useMemo((): RunHistoryFilterView => {
    if (rawRunFilter === 'active' || rawRunFilter === 'running' || rawRunFilter === 'queued') {
      return 'active';
    }
    if (rawRunFilter === 'failed') return 'failed';
    if (rawRunFilter === 'dead') return 'dead';
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
        (run: AiPathRunRecord): boolean =>
          run.status === 'queued' ||
          run.status === 'running' ||
          run.status === 'blocked_on_lease'
      );
    }
    if (runFilter === 'failed') {
      return resolvedRuns.filter(
        (run: AiPathRunRecord): boolean =>
          run.status === 'failed' ||
          run.status === 'paused' ||
          run.status === 'handoff_ready'
      );
    }
    return resolvedRuns.filter((run: AiPathRunRecord): boolean => run.status === 'dead_lettered');
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
        onResumeRun={handleResumeRun}
        onHandoffRun={handleHandoffRun}
        handoffStateByRunId={handoffStateByRunId}
        onCancelRun={handleCancelRun}
        onRequeueDeadLetter={handleRequeueDeadLetter}
        onRetryRunNode={handleRetryRunNode}
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
