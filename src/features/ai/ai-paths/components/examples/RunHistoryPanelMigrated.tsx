'use client';

/**
 * RunHistoryPanelMigrated - Context-based wrapper for RunHistoryPanel.
 *
 * BEFORE: 12 props
 * ```tsx
 * <RunHistoryPanel
 *   runs={runList}
 *   isRefreshing={runsQuery.isFetching}
 *   onRefresh={() => runsQuery.refetch()}
 *   runFilter={runFilter}
 *   setRunFilter={setRunFilter}
 *   expandedRunHistory={expandedRunHistory}
 *   setExpandedRunHistory={setExpandedRunHistory}
 *   runHistorySelection={runHistorySelection}
 *   setRunHistorySelection={setRunHistorySelection}
 *   onOpenRunDetail={...}
 *   onResumeRun={...}
 *   onCancelRun={...}
 *   onRequeueDeadLetter={...}
 * />
 * ```
 *
 * AFTER: 6 props (only data source and callbacks)
 * ```tsx
 * <RunHistoryPanelMigrated
 *   runs={runList}
 *   isRefreshing={runsQuery.isFetching}
 *   onRefresh={() => runsQuery.refetch()}
 *   onOpenRunDetail={...}
 *   onResumeRun={...}
 *   onCancelRun={...}
 *   onRequeueDeadLetter={...}
 * />
 * ```
 *
 * State props eliminated (5 props removed, 42% reduction):
 * - runFilter, setRunFilter → RunHistoryContext
 * - expandedRunHistory, setExpandedRunHistory → RunHistoryContext
 * - runHistorySelection, setRunHistorySelection → RunHistoryContext
 */

import type { AiPathRunRecord } from '@/features/ai/ai-paths/lib';

import { useRunHistoryState, useRunHistoryActions } from '../../context/RunHistoryContext';
import { RunHistoryPanel, type RunHistoryFilter } from '../run-history-panel';

/**
 * Props for RunHistoryPanelMigrated.
 * Data source and orchestration callbacks remain as props.
 */
export type RunHistoryPanelMigratedProps = {
  /** List of runs - from query data */
  runs: AiPathRunRecord[];
  /** Whether the query is refreshing */
  isRefreshing: boolean;
  /** Callback to refresh the query */
  onRefresh: () => void;
  /** Callback to open run detail */
  onOpenRunDetail: (runId: string) => void;
  /** Callback to resume a run */
  onResumeRun: (runId: string, mode: 'resume' | 'replay') => void;
  /** Callback to cancel a run */
  onCancelRun: (runId: string) => void;
  /** Callback to requeue a dead-lettered run */
  onRequeueDeadLetter: (runId: string) => void;

  runFilter?: RunHistoryFilter;
  setRunFilter?: React.Dispatch<React.SetStateAction<RunHistoryFilter>>;
  expandedRunHistory?: Record<string, boolean>;
  setExpandedRunHistory?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  runHistorySelection?: Record<string, string>;
  setRunHistorySelection?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

/**
 * RunHistoryPanelMigrated - Context-based wrapper.
 */
export function RunHistoryPanelMigrated({
  runs,
  isRefreshing,
  onRefresh,
  onOpenRunDetail,
  onResumeRun,
  onCancelRun,
  onRequeueDeadLetter,
  runFilter: runFilterProp,
  setRunFilter: setRunFilterProp,
  expandedRunHistory: expandedRunHistoryProp,
  setExpandedRunHistory: setExpandedRunHistoryProp,
  runHistorySelection: runHistorySelectionProp,
  setRunHistorySelection: setRunHistorySelectionProp,
}: RunHistoryPanelMigratedProps): React.JSX.Element {
  // Read state from RunHistoryContext
  const { runFilter: runFilterContext, expandedRunHistory: expandedRunHistoryContext, runHistorySelection: runHistorySelectionContext } = useRunHistoryState();
  const { setRunFilter: setRunFilterContext, setExpandedRunHistory: setExpandedRunHistoryContext, setRunHistorySelection: setRunHistorySelectionContext } = useRunHistoryActions();

  return (
    <RunHistoryPanel
      // Data from props (query-based)
      runs={runs}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      // State from props or RunHistoryContext
      runFilter={(runFilterProp ?? runFilterContext) as RunHistoryFilter}
      setRunFilter={(setRunFilterProp ?? setRunFilterContext) as React.Dispatch<React.SetStateAction<RunHistoryFilter>>}
      expandedRunHistory={expandedRunHistoryProp ?? expandedRunHistoryContext}
      setExpandedRunHistory={setExpandedRunHistoryProp ?? setExpandedRunHistoryContext}
      runHistorySelection={runHistorySelectionProp ?? runHistorySelectionContext}
      setRunHistorySelection={setRunHistorySelectionProp ?? setRunHistorySelectionContext}
      // Callback props passed through
      onOpenRunDetail={onOpenRunDetail}
      onResumeRun={onResumeRun}
      onCancelRun={onCancelRun}
      onRequeueDeadLetter={onRequeueDeadLetter}
    />
  );
}
