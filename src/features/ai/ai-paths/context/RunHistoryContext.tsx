'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

import type {
  AiPathRunRecord,
  AiPathRunEventRecord,
} from '@/shared/lib/ai-paths';
import type {
  RunDetail as RunDetailData,
  StreamConnectionStatus as RunStreamStatus,
} from '../components/job-queue-panel-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunHistoryFilter =
  | 'all'
  | 'active'
  | 'failed'
  | 'dead'
  | 'completed'
  | 'running'
  | 'queued';

export type { RunDetailData, RunStreamStatus };

export interface RunHistoryOperationHandlers {
  refreshRuns?: (() => Promise<void> | void) | undefined;
  resumeRun?: ((runId: string, mode: 'resume' | 'replay') => Promise<void> | void) | undefined;
  cancelRun?: ((runId: string) => Promise<void> | void) | undefined;
  requeueDeadLetter?: ((runId: string) => Promise<void> | void) | undefined;
}

export interface RunHistoryState {
  // Runs list state
  runList: AiPathRunRecord[];
  runsRefreshing: boolean;

  // Detail panel state
  runDetailOpen: boolean;
  runDetailLoading: boolean;
  runDetail: RunDetailData | null;

  // Filter & UI state
  runFilter: RunHistoryFilter;
  expandedRunHistory: Record<string, boolean>;
  runHistorySelection: Record<string, string>;

  // History node selection
  runHistoryNodeId: string | null;

  // Streaming state
  runStreamStatus: RunStreamStatus;
  runStreamPaused: boolean;
  runEventsOverflow: boolean;
  runEventsBatchLimit: number | null;
}

export interface RunHistoryActions {
  // Runs list actions
  setRunList: (
    runList: AiPathRunRecord[] | ((prev: AiPathRunRecord[]) => AiPathRunRecord[])
  ) => void;
  setRunsRefreshing: (refreshing: boolean) => void;
  refreshRuns: () => Promise<void>;
  resumeRun: (runId: string, mode: 'resume' | 'replay') => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  requeueDeadLetter: (runId: string) => Promise<void>;
  setRunOperationHandlers: (handlers: RunHistoryOperationHandlers | null) => void;

  // Detail panel actions
  setRunDetailOpen: (open: boolean) => void;
  setRunDetailLoading: (loading: boolean) => void;
  setRunDetail: (
    detail: RunDetailData | null | ((prev: RunDetailData | null) => RunDetailData | null)
  ) => void;
  clearRunDetail: () => void;

  // Filter actions
  setRunFilter: (filter: RunHistoryFilter | ((prev: RunHistoryFilter) => RunHistoryFilter)) => void;

  // Expansion state
  setExpandedRunHistory: (
    expanded: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  toggleRunExpanded: (runId: string) => void;

  // Selection state
  setRunHistorySelection: (
    selection: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;

  // History node selection
  setRunHistoryNodeId: (nodeId: string | null) => void;

  // Streaming state
  setRunStreamStatus: (status: RunStreamStatus) => void;
  setRunStreamPaused: (paused: boolean) => void;
  setRunEventsOverflow: (overflow: boolean) => void;
  setRunEventsBatchLimit: (limit: number | null) => void;

  // Utility for merging events
  mergeRunEvents: (incoming: AiPathRunEventRecord[]) => void;

  /**
   * Open the run detail panel for a specific run ID.
   * The implementation must be registered via `setOpenRunDetailHandler`.
   */
  openRunDetail: (runId: string) => void;
  /**
   * Register the function that fetches and opens the run detail panel.
   * Call this once from the component that owns the actual logic.
   */
  setOpenRunDetailHandler: (fn: ((runId: string) => void) | null) => void;
}

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const RunHistoryStateContext = createContext<RunHistoryState | null>(null);
const RunHistoryActionsContext = createContext<RunHistoryActions | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface RunHistoryProviderProps {
  children: ReactNode;
}

export function RunHistoryProvider({ children }: RunHistoryProviderProps): React.ReactNode {
  // Runs list state
  const [runList, setRunListInternal] = useState<AiPathRunRecord[]>([]);
  const [runsRefreshing, setRunsRefreshingInternal] = useState(false);

  // Detail panel state
  const [runDetailOpen, setRunDetailOpenInternal] = useState(false);
  const [runDetailLoading, setRunDetailLoadingInternal] = useState(false);
  const [runDetail, setRunDetailInternal] = useState<RunDetailData | null>(null);

  // Filter & UI state
  const [runFilter, setRunFilterInternal] = useState<RunHistoryFilter>('all');
  const [expandedRunHistory, setExpandedRunHistoryInternal] = useState<Record<string, boolean>>({});
  const [runHistorySelection, setRunHistorySelectionInternal] = useState<Record<string, string>>(
    {}
  );

  // History node selection
  const [runHistoryNodeId, setRunHistoryNodeIdInternal] = useState<string | null>(null);

  // Streaming state
  const [runStreamStatus, setRunStreamStatusInternal] = useState<RunStreamStatus>('stopped');
  const [runStreamPaused, setRunStreamPausedInternal] = useState(false);
  const [runEventsOverflow, setRunEventsOverflowInternal] = useState(false);
  const [runEventsBatchLimit, setRunEventsBatchLimitInternal] = useState<number | null>(null);

  // Injectable run detail opener
  const openRunDetailHandlerRef = useRef<((runId: string) => void) | null>(null);
  const runOperationHandlersRef = useRef<RunHistoryOperationHandlers>({});

  const setOpenRunDetailHandler = useCallback((fn: ((runId: string) => void) | null) => {
    openRunDetailHandlerRef.current = fn;
  }, []);

  const setRunOperationHandlers = useCallback((handlers: RunHistoryOperationHandlers | null) => {
    runOperationHandlersRef.current = handlers ?? {};
  }, []);

  const openRunDetail = useCallback((runId: string) => {
    openRunDetailHandlerRef.current?.(runId);
  }, []);

  const refreshRuns = useCallback(async (): Promise<void> => {
    await runOperationHandlersRef.current.refreshRuns?.();
  }, []);

  const resumeRun = useCallback(async (runId: string, mode: 'resume' | 'replay'): Promise<void> => {
    await runOperationHandlersRef.current.resumeRun?.(runId, mode);
  }, []);

  const cancelRun = useCallback(async (runId: string): Promise<void> => {
    await runOperationHandlersRef.current.cancelRun?.(runId);
  }, []);

  const requeueDeadLetter = useCallback(async (runId: string): Promise<void> => {
    await runOperationHandlersRef.current.requeueDeadLetter?.(runId);
  }, []);

  // Actions are stable
  const actions = useMemo<RunHistoryActions>(
    () => ({
      // Runs list actions
      setRunList: setRunListInternal,
      setRunsRefreshing: setRunsRefreshingInternal,
      refreshRuns,
      resumeRun,
      cancelRun,
      requeueDeadLetter,
      setRunOperationHandlers,

      // Detail panel actions
      setRunDetailOpen: setRunDetailOpenInternal,
      setRunDetailLoading: setRunDetailLoadingInternal,
      setRunDetail: setRunDetailInternal,
      clearRunDetail: () => {
        setRunDetailInternal(null);
        setRunDetailOpenInternal(false);
        setRunDetailLoadingInternal(false);
        setRunStreamStatusInternal('stopped');
        setRunHistoryNodeIdInternal(null);
        setRunEventsOverflowInternal(false);
        setRunEventsBatchLimitInternal(null);
      },

      // Filter actions
      setRunFilter: setRunFilterInternal,

      // Expansion state
      setExpandedRunHistory: setExpandedRunHistoryInternal,
      toggleRunExpanded: (runId: string) => {
        setExpandedRunHistoryInternal((prev) => ({
          ...prev,
          [runId]: !prev[runId],
        }));
      },

      // Selection state
      setRunHistorySelection: setRunHistorySelectionInternal,

      // History node selection
      setRunHistoryNodeId: setRunHistoryNodeIdInternal,

      // Streaming state
      setRunStreamStatus: setRunStreamStatusInternal,
      setRunStreamPaused: setRunStreamPausedInternal,
      setRunEventsOverflow: setRunEventsOverflowInternal,
      setRunEventsBatchLimit: setRunEventsBatchLimitInternal,

      // Utility for merging events
      mergeRunEvents: (incoming: AiPathRunEventRecord[]) => {
        setRunDetailInternal((prev) => {
          if (!prev) return prev;
          const existingIds = new Set(prev.events.map((event) => event.id));
          const merged = [...prev.events];
          incoming.forEach((event) => {
            if (!existingIds.has(event.id)) {
              merged.push(event);
            }
          });
          merged.sort((a, b) => {
            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return aTime - bTime;
          });
          return { ...prev, events: merged };
        });
      },

      // Run detail opener
      openRunDetail,
      setOpenRunDetailHandler,
    }),
    [
      cancelRun,
      openRunDetail,
      refreshRuns,
      requeueDeadLetter,
      resumeRun,
      setOpenRunDetailHandler,
      setRunOperationHandlers,
    ]
  );

  const state = useMemo<RunHistoryState>(
    () => ({
      runList,
      runsRefreshing,
      runDetailOpen,
      runDetailLoading,
      runDetail,
      runFilter,
      expandedRunHistory,
      runHistorySelection,
      runHistoryNodeId,
      runStreamStatus,
      runStreamPaused,
      runEventsOverflow,
      runEventsBatchLimit,
    }),
    [
      runList,
      runsRefreshing,
      runDetailOpen,
      runDetailLoading,
      runDetail,
      runFilter,
      expandedRunHistory,
      runHistorySelection,
      runHistoryNodeId,
      runStreamStatus,
      runStreamPaused,
      runEventsOverflow,
      runEventsBatchLimit,
    ]
  );

  return (
    <RunHistoryActionsContext.Provider value={actions}>
      <RunHistoryStateContext.Provider value={state}>{children}</RunHistoryStateContext.Provider>
    </RunHistoryActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current run history state.
 * Components using this will re-render when run history state changes.
 */
export function useRunHistoryState(): RunHistoryState {
  const context = useContext(RunHistoryStateContext);
  if (!context) {
    throw new Error('useRunHistoryState must be used within a RunHistoryProvider');
  }
  return context;
}

/**
 * Get run history actions.
 * Components using this will NOT re-render when state changes.
 */
export function useRunHistoryActions(): RunHistoryActions {
  const context = useContext(RunHistoryActionsContext);
  if (!context) {
    throw new Error('useRunHistoryActions must be used within a RunHistoryProvider');
  }
  return context;
}
