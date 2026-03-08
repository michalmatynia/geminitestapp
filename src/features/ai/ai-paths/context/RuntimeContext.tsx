'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import type {
  AiNode,
  RuntimeState,
  RuntimePortValues,
  ParserSampleState,
  UpdaterSampleState,
  PathDebugSnapshot,
  RuntimeHistoryEntry,
  AiPathRuntimeNodeStatusMap,
  AiPathRuntimeEvent,
} from '@/shared/lib/ai-paths';
import type {
  LastErrorInfo,
  RuntimeRunStatus,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
} from '@/shared/contracts/ai-paths';
import { internalError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { LastErrorInfo, RuntimeRunStatus, RuntimeControlHandlers, RuntimeNodeConfigHandlers };

// ---------------------------------------------------------------------------
// Context Value
// ---------------------------------------------------------------------------

export interface RuntimeStateData {
  // Core runtime state
  runtimeState: RuntimeState;
  /** Map of node IDs to their current runtime status */
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  /** List of runtime events (e.g., node started, node finished) */
  runtimeEvents: AiPathRuntimeEvent[];

  // Sample states for testing
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;

  // Debug snapshots
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;

  // Execution tracking
  lastRunAt: string | null;
  lastError: LastErrorInfo | null;
  runtimeRunStatus: RuntimeRunStatus;

  /** The run ID of the currently active server run, or null when idle */
  currentRunId: string | null;

  // Node execution timing
  /** Map of node IDs to their last execution duration in ms */
  nodeDurations: Record<string, number>;

  // Loading states
  parserSampleLoading: boolean;
  updaterSampleLoading: boolean;
  sendingToAi: boolean;

  /** True when runtimeEvents have been trimmed due to the MAX_RUNTIME_EVENTS cap */
  eventsOverflowed: boolean;
}

export interface RuntimeActions {
  // Runtime state actions
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  updateNodeInputs: (nodeId: string, inputs: RuntimePortValues) => void;
  updateNodeOutputs: (nodeId: string, outputs: RuntimePortValues) => void;
  clearNodeRuntime: (nodeId: string) => void;
  clearAllRuntime: () => void;

  /** Set the map of node statuses */
  setRuntimeNodeStatuses: (
    statuses:
      | AiPathRuntimeNodeStatusMap
      | ((prev: AiPathRuntimeNodeStatusMap) => AiPathRuntimeNodeStatusMap)
  ) => void;
  /** Add a new runtime event */
  addRuntimeEvent: (event: AiPathRuntimeEvent) => void;
  /** Replace the full runtime events array */
  setRuntimeEvents: (events: AiPathRuntimeEvent[]) => void;
  /** Clear all runtime events */
  clearRuntimeEvents: () => void;
  /** Dismiss the events overflow indicator */
  clearEventsOverflow: () => void;
  /** Set node execution durations map */
  setNodeDurations: (
    durations: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;

  // History actions
  appendHistory: (nodeId: string, entry: RuntimeHistoryEntry) => void;
  clearHistory: () => void;
  clearNodeHistory: (nodeId: string) => void;

  // Sample state actions
  setParserSamples: (
    samples:
      | Record<string, ParserSampleState>
      | ((prev: Record<string, ParserSampleState>) => Record<string, ParserSampleState>)
  ) => void;
  setUpdaterSamples: (
    samples:
      | Record<string, UpdaterSampleState>
      | ((prev: Record<string, UpdaterSampleState>) => Record<string, UpdaterSampleState>)
  ) => void;
  updateParserSample: (nodeId: string, sample: ParserSampleState) => void;
  updateUpdaterSample: (nodeId: string, sample: UpdaterSampleState) => void;

  // Debug snapshot actions
  setPathDebugSnapshots: (
    snapshots:
      | Record<string, PathDebugSnapshot>
      | ((prev: Record<string, PathDebugSnapshot>) => Record<string, PathDebugSnapshot>)
  ) => void;
  updatePathDebugSnapshot: (pathId: string, snapshot: PathDebugSnapshot) => void;

  // Execution tracking actions
  setLastRunAt: (timestamp: string | null) => void;
  setLastError: (error: LastErrorInfo | null) => void;
  /** Track the active server run ID in state (null when idle) */
  setCurrentRunId: (id: string | null) => void;
  setRuntimeRunStatus: (
    status: RuntimeRunStatus | ((prev: RuntimeRunStatus) => RuntimeRunStatus)
  ) => void;
  setRunControlHandlers: (handlers: RuntimeControlHandlers) => void;
  resetRuntimeDiagnostics: () => void;
  fireTrigger: (node: AiNode, event?: React.MouseEvent<Element>) => Promise<void>;
  fireTriggerPersistent: (node: AiNode, event?: React.MouseEvent<Element>) => Promise<void>;
  pauseActiveRun: () => void;
  resumeActiveRun: () => void;
  stepActiveRun: (triggerNode?: AiNode) => void;
  cancelActiveRun: () => void;
  clearWires: () => void;
  setRuntimeNodeConfigHandlers: (handlers: RuntimeNodeConfigHandlers) => void;
  fetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  fetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  runSimulation: (node: AiNode, triggerEvent?: string) => Promise<void>;
  sendToAi: (databaseNodeId: string, prompt: string) => Promise<void>;

  // Loading state actions
  setParserSampleLoading: (loading: boolean) => void;
  setUpdaterSampleLoading: (loading: boolean) => void;
  setSendingToAi: (sending: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_RUNTIME_STATE: RuntimeState = {
  inputs: {},
  outputs: {},
} as RuntimeState;

// Max number of runtime events to keep in state
const MAX_RUNTIME_EVENTS = 300;

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const RuntimeStateContext = createContext<RuntimeStateData | null>(null);
const RuntimeActionsContext = createContext<RuntimeActions | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface RuntimeProviderProps {
  children: ReactNode;
  initialRuntimeState?: RuntimeState | undefined;
}

export function RuntimeProvider({
  children,
  initialRuntimeState = INITIAL_RUNTIME_STATE,
}: RuntimeProviderProps): React.ReactNode {
  // Core runtime state
  const [runtimeState, setRuntimeStateInternal] = useState<RuntimeState>(initialRuntimeState);
  const [runtimeNodeStatuses, setRuntimeNodeStatusesInternal] =
    useState<AiPathRuntimeNodeStatusMap>({});
  const [runtimeEvents, setRuntimeEventsInternal] = useState<AiPathRuntimeEvent[]>([]);

  // Sample states
  const [parserSamples, setParserSamplesInternal] = useState<Record<string, ParserSampleState>>({});
  const [updaterSamples, setUpdaterSamplesInternal] = useState<Record<string, UpdaterSampleState>>(
    {}
  );

  // Debug snapshots
  const [pathDebugSnapshots, setPathDebugSnapshotsInternal] = useState<
    Record<string, PathDebugSnapshot>
  >({});

  // Execution tracking
  const [lastRunAt, setLastRunAtInternal] = useState<string | null>(null);
  const [lastError, setLastErrorInternal] = useState<LastErrorInfo | null>(null);
  const [runtimeRunStatus, setRuntimeRunStatusInternal] = useState<RuntimeRunStatus>('idle');
  const [currentRunId, setCurrentRunIdInternal] = useState<string | null>(null);

  // Node execution timing
  const [nodeDurations, setNodeDurationsInternal] = useState<Record<string, number>>({});

  // Loading states
  const [parserSampleLoading, setParserSampleLoadingInternal] = useState(false);
  const [updaterSampleLoading, setUpdaterSampleLoadingInternal] = useState(false);
  const [sendingToAi, setSendingToAiInternal] = useState(false);
  const [eventsOverflowed, setEventsOverflowedInternal] = useState(false);
  const runControlHandlersRef = useRef<RuntimeControlHandlers>({});
  const runtimeNodeConfigHandlersRef = useRef<RuntimeNodeConfigHandlers>({});

  const reportMissingRunControlHandler = useCallback(
    (action: string, options?: { nodeId?: string | null; markFailed?: boolean }): void => {
      const message = `AI Paths runtime handler "${action}" is not initialized. Reload the page and try again.`;
      setLastErrorInternal({
        message,
        time: new Date().toISOString(),
      });
      if (options?.markFailed) {
        setRuntimeRunStatusInternal('failed');
      }
      logClientError(new Error(message), {
        context: {
          source: 'ai-paths.runtime-context',
          action,
          feature: 'ai-paths',
          category: 'AI',
          level: 'error',
          nodeId: options?.nodeId ?? null,
        },
      });
    },
    []
  );

  const reportMissingRuntimeNodeConfigHandler = useCallback(
    (action: string, options?: { nodeId?: string | null }): void => {
      const message = `AI Paths runtime node-config handler "${action}" is not initialized. Reload the page and try again.`;
      setLastErrorInternal({
        message,
        time: new Date().toISOString(),
      });
      logClientError(new Error(message), {
        context: {
          source: 'ai-paths.runtime-context',
          action,
          feature: 'ai-paths',
          category: 'AI',
          level: 'error',
          nodeId: options?.nodeId ?? null,
        },
      });
    },
    []
  );

  // Memoized update operations
  const updateNodeInputs = useCallback((nodeId: string, inputs: RuntimePortValues) => {
    setRuntimeStateInternal((prev) => ({
      ...prev,
      inputs: { ...prev.inputs, [nodeId]: inputs },
    }));
  }, []);

  const updateNodeOutputs = useCallback((nodeId: string, outputs: RuntimePortValues) => {
    setRuntimeStateInternal((prev) => ({
      ...prev,
      outputs: { ...prev.outputs, [nodeId]: outputs },
    }));
  }, []);

  const clearNodeRuntime = useCallback((nodeId: string) => {
    setRuntimeStateInternal((prev) => {
      const { [nodeId]: _removedInputs, ...restInputs } = prev.inputs ?? {};
      const { [nodeId]: _removedOutputs, ...restOutputs } = prev.outputs ?? {};
      const newHistory = prev.history ? { ...prev.history } : undefined;
      if (newHistory) {
        delete newHistory[nodeId];
      }
      return {
        ...prev,
        inputs: restInputs,
        outputs: restOutputs,
        history: newHistory,
      };
    });
  }, []);

  const clearAllRuntime = useCallback(() => {
    setRuntimeStateInternal(INITIAL_RUNTIME_STATE);
    setRuntimeNodeStatusesInternal({});
    setRuntimeEventsInternal([]);
    setNodeDurationsInternal({});
    setEventsOverflowedInternal(false);
    setCurrentRunIdInternal(null);
  }, []);

  const addRuntimeEvent = useCallback((event: AiPathRuntimeEvent) => {
    setRuntimeEventsInternal((prev) => {
      const next = [...prev, event];
      if (next.length > MAX_RUNTIME_EVENTS) {
        setEventsOverflowedInternal(true);
        return next.slice(next.length - MAX_RUNTIME_EVENTS);
      }
      return next;
    });
  }, []);

  const setRuntimeEvents = useCallback((events: AiPathRuntimeEvent[]) => {
    setRuntimeEventsInternal(events);
  }, []);

  const clearRuntimeEvents = useCallback(() => {
    setRuntimeEventsInternal([]);
    setEventsOverflowedInternal(false);
  }, []);

  const clearEventsOverflow = useCallback(() => {
    setEventsOverflowedInternal(false);
  }, []);

  const appendHistory = useCallback((nodeId: string, entry: RuntimeHistoryEntry) => {
    setRuntimeStateInternal((prev) => {
      const existingHistory = prev.history ?? {};
      const nodeHistory = existingHistory[nodeId] ?? [];
      return {
        ...prev,
        history: {
          ...existingHistory,
          [nodeId]: [...nodeHistory, entry],
        },
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRuntimeStateInternal((prev) => ({
      ...prev,
      history: undefined,
    }));
  }, []);

  const clearNodeHistory = useCallback((nodeId: string) => {
    setRuntimeStateInternal((prev) => {
      if (!prev.history) return prev;
      const { [nodeId]: _removed, ...restHistory } = prev.history;
      return {
        ...prev,
        history: Object.keys(restHistory).length > 0 ? restHistory : undefined,
      };
    });
  }, []);

  const updateParserSample = useCallback((nodeId: string, sample: ParserSampleState) => {
    setParserSamplesInternal((prev) => ({ ...prev, [nodeId]: sample }));
  }, []);

  const updateUpdaterSample = useCallback((nodeId: string, sample: UpdaterSampleState) => {
    setUpdaterSamplesInternal((prev) => ({ ...prev, [nodeId]: sample }));
  }, []);

  const updatePathDebugSnapshot = useCallback((pathId: string, snapshot: PathDebugSnapshot) => {
    setPathDebugSnapshotsInternal((prev) => ({ ...prev, [pathId]: snapshot }));
  }, []);

  const setRunControlHandlers = useCallback((handlers: RuntimeControlHandlers) => {
    runControlHandlersRef.current = handlers;
  }, []);

  const fireTrigger = useCallback(
    async (node: AiNode, event?: React.MouseEvent<Element>) => {
      const handler = runControlHandlersRef.current.fireTrigger;
      if (!handler) {
        reportMissingRunControlHandler('fireTrigger', { nodeId: node.id, markFailed: true });
        return;
      }
      await handler(node, event);
    },
    [reportMissingRunControlHandler]
  );

  const fireTriggerPersistent = useCallback(
    async (node: AiNode, event?: React.MouseEvent<Element>) => {
      const handler = runControlHandlersRef.current.fireTriggerPersistent;
      if (!handler) {
        reportMissingRunControlHandler('fireTriggerPersistent', {
          nodeId: node.id,
          markFailed: true,
        });
        return;
      }
      await handler(node, event);
    },
    [reportMissingRunControlHandler]
  );

  const pauseActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.pauseActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('pauseActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler]);

  const resumeActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.resumeActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('resumeActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler]);

  const stepActiveRun = useCallback(
    (triggerNode?: AiNode) => {
      const handler = runControlHandlersRef.current.stepActiveRun;
      if (!handler) {
        reportMissingRunControlHandler('stepActiveRun', { nodeId: triggerNode?.id ?? null });
        return;
      }
      handler(triggerNode);
    },
    [reportMissingRunControlHandler]
  );

  const cancelActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.cancelActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('cancelActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler]);

  const clearWires = useCallback(() => {
    const handler = runControlHandlersRef.current.clearWires;
    if (!handler) {
      reportMissingRunControlHandler('clearWires');
      return;
    }
    const result = handler();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<unknown>).catch(() => {});
    }
  }, [reportMissingRunControlHandler]);

  const resetRuntimeDiagnostics = useCallback(() => {
    const handler = runControlHandlersRef.current.resetRuntimeDiagnostics;
    if (!handler) return;
    handler();
  }, []);

  const setRuntimeNodeConfigHandlers = useCallback((handlers: RuntimeNodeConfigHandlers) => {
    runtimeNodeConfigHandlersRef.current = handlers;
  }, []);

  const fetchParserSample = useCallback(
    async (nodeId: string, entityType: string, entityId: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.fetchParserSample;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('fetchParserSample', { nodeId });
        return;
      }
      await handler(nodeId, entityType, entityId);
    },
    [reportMissingRuntimeNodeConfigHandler]
  );

  const fetchUpdaterSample = useCallback(
    async (
      nodeId: string,
      entityType: string,
      entityId: string,
      options?: { notify?: boolean }
    ): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.fetchUpdaterSample;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('fetchUpdaterSample', { nodeId });
        return;
      }
      await handler(nodeId, entityType, entityId, options);
    },
    [reportMissingRuntimeNodeConfigHandler]
  );

  const runSimulation = useCallback(
    async (node: AiNode, triggerEvent?: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.runSimulation;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('runSimulation', { nodeId: node.id });
        return;
      }
      const result = handler(node, triggerEvent);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>);
      }
    },
    [reportMissingRuntimeNodeConfigHandler]
  );

  const sendToAi = useCallback(
    async (databaseNodeId: string, prompt: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.sendToAi;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('sendToAi', { nodeId: databaseNodeId });
        return;
      }
      await handler(databaseNodeId, prompt);
    },
    [reportMissingRuntimeNodeConfigHandler]
  );

  // Actions are stable
  const actions = useMemo<RuntimeActions>(
    () => ({
      // Runtime state actions
      setRuntimeState: setRuntimeStateInternal,
      updateNodeInputs,
      updateNodeOutputs,
      clearNodeRuntime,
      clearAllRuntime,

      setRuntimeNodeStatuses: setRuntimeNodeStatusesInternal,
      addRuntimeEvent,
      setRuntimeEvents,
      clearRuntimeEvents,
      setNodeDurations: setNodeDurationsInternal,

      // History actions
      appendHistory,
      clearHistory,
      clearNodeHistory,

      // Sample state actions
      setParserSamples: setParserSamplesInternal,
      setUpdaterSamples: setUpdaterSamplesInternal,
      updateParserSample,
      updateUpdaterSample,

      // Debug snapshot actions
      setPathDebugSnapshots: setPathDebugSnapshotsInternal,
      updatePathDebugSnapshot,

      // Execution tracking actions
      setLastRunAt: setLastRunAtInternal,
      setLastError: setLastErrorInternal,
      setCurrentRunId: setCurrentRunIdInternal,
      setRuntimeRunStatus: setRuntimeRunStatusInternal,
      setRunControlHandlers,
      fireTrigger,
      fireTriggerPersistent,
      pauseActiveRun,
      resumeActiveRun,
      stepActiveRun,
      cancelActiveRun,
      clearWires,
      resetRuntimeDiagnostics,
      setRuntimeNodeConfigHandlers,
      fetchParserSample,
      fetchUpdaterSample,
      runSimulation,
      sendToAi,

      // Loading state actions
      setParserSampleLoading: setParserSampleLoadingInternal,
      setUpdaterSampleLoading: setUpdaterSampleLoadingInternal,
      setSendingToAi: setSendingToAiInternal,
      clearEventsOverflow,
    }),
    [
      updateNodeInputs,
      updateNodeOutputs,
      clearNodeRuntime,
      clearAllRuntime,
      setRuntimeNodeStatusesInternal,
      addRuntimeEvent,
      setRuntimeEvents,
      clearRuntimeEvents,
      clearEventsOverflow,
      appendHistory,
      clearHistory,
      clearNodeHistory,
      updateParserSample,
      updateUpdaterSample,
      updatePathDebugSnapshot,
      setRunControlHandlers,
      fireTrigger,
      fireTriggerPersistent,
      pauseActiveRun,
      resumeActiveRun,
      stepActiveRun,
      cancelActiveRun,
      clearWires,
      resetRuntimeDiagnostics,
      setRuntimeNodeConfigHandlers,
      fetchParserSample,
      fetchUpdaterSample,
      runSimulation,
      sendToAi,
    ]
  );

  const state = useMemo<RuntimeStateData>(
    () => ({
      runtimeState,
      runtimeNodeStatuses,
      runtimeEvents,
      nodeDurations,
      parserSamples,
      updaterSamples,
      pathDebugSnapshots,
      lastRunAt,
      lastError,
      runtimeRunStatus,
      currentRunId,
      parserSampleLoading,
      updaterSampleLoading,
      sendingToAi,
      eventsOverflowed,
    }),
    [
      runtimeState,
      runtimeNodeStatuses,
      runtimeEvents,
      nodeDurations,
      parserSamples,
      updaterSamples,
      pathDebugSnapshots,
      lastRunAt,
      lastError,
      runtimeRunStatus,
      currentRunId,
      parserSampleLoading,
      updaterSampleLoading,
      sendingToAi,
      eventsOverflowed,
    ]
  );

  return (
    <RuntimeActionsContext.Provider value={actions}>
      <RuntimeStateContext.Provider value={state}>{children}</RuntimeStateContext.Provider>
    </RuntimeActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current runtime state.
 * Components using this will re-render when runtime state changes.
 */
export function useRuntimeState(): RuntimeStateData {
  const context = useContext(RuntimeStateContext);
  if (!context) {
    throw internalError('useRuntimeState must be used within a RuntimeProvider');
  }
  return context;
}

/**
 * Get runtime actions.
 * Components using this will NOT re-render when state changes.
 */
export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw internalError('useRuntimeActions must be used within a RuntimeProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Selector Hooks (for fine-grained subscriptions)
// ---------------------------------------------------------------------------

/**
 * Get runtime inputs/outputs for a specific node.
 */
export function useNodeRuntime(nodeId: string): {
  inputs: RuntimePortValues | undefined;
  outputs: RuntimePortValues | undefined;
  history: RuntimeHistoryEntry[] | undefined;
} {
  const { runtimeState } = useRuntimeState();
  return {
    inputs: runtimeState.inputs?.[nodeId],
    outputs: runtimeState.outputs?.[nodeId],
    history: runtimeState.history?.[nodeId],
  };
}
