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
 * AFTER: 7 props (only data source and callbacks)
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

import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { RunHistoryPanel } from '../run-history-panel';

/**
 * Props for RunHistoryPanelMigrated.
 * Data source and orchestration callbacks remain as props.
 */
export type RunHistoryPanelMigratedProps = {
  /** List of runs - from query data */
  runs?: AiPathRunRecord[] | undefined;
  /** Whether the query is refreshing */
  isRefreshing?: boolean | undefined;
  /** Callback to refresh the query */
  onRefresh?: (() => void) | undefined;
  /** Callback to open run detail */
  onOpenRunDetail?: ((runId: string) => void) | undefined;
  /** Callback to resume a run */
  onResumeRun?: ((runId: string, mode: 'resume' | 'replay') => void) | undefined;
  /** Callback to cancel a run */
  onCancelRun?: ((runId: string) => void) | undefined;
  /** Callback to requeue a dead-lettered run */
  onRequeueDeadLetter?: ((runId: string) => void) | undefined;
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
}: RunHistoryPanelMigratedProps): React.JSX.Element {
  const {
    runList,
    runsQuery,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
  } = useAiPathsSettingsOrchestrator();

  return (
    <RunHistoryPanel
      // Data from props (query-based)
      runs={runs ?? runList}
      isRefreshing={isRefreshing ?? runsQuery.isFetching}
      onRefresh={onRefresh ?? (() => { runsQuery.refetch().catch(() => {}); })}
      // Callback props passed through
      onOpenRunDetail={onOpenRunDetail ?? ((runId: string) => { handleOpenRunDetail(runId).catch(() => {}); })}
      onResumeRun={onResumeRun ?? ((runId: string, mode: 'resume' | 'replay') => { handleResumeRun(runId, mode).catch(() => {}); })}
      onCancelRun={onCancelRun ?? ((runId: string) => { handleCancelRun(runId).catch(() => {}); })}
      onRequeueDeadLetter={onRequeueDeadLetter ?? ((runId: string) => { handleRequeueDeadLetter(runId).catch(() => {}); })}
    />
  );
}
