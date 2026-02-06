'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

import type {
  RuntimeState,
  RuntimePortValues,
  ParserSampleState,
  UpdaterSampleState,
  PathDebugSnapshot,
  RuntimeHistoryEntry,
} from '@/features/ai/ai-paths/lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LastErrorInfo {
  message: string;
  time: string;
  pathId?: string | null;
}

export interface RuntimeStateData {
  // Core runtime state
  runtimeState: RuntimeState;

  // Sample states for testing
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;

  // Debug snapshots
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;

  // Execution tracking
  lastRunAt: string | null;
  lastError: LastErrorInfo | null;

  // Loading states
  parserSampleLoading: boolean;
  updaterSampleLoading: boolean;
  sendingToAi: boolean;
}

export interface RuntimeActions {
  // Runtime state actions
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  updateNodeInputs: (nodeId: string, inputs: RuntimePortValues) => void;
  updateNodeOutputs: (nodeId: string, outputs: RuntimePortValues) => void;
  clearNodeRuntime: (nodeId: string) => void;
  clearAllRuntime: () => void;

  // History actions
  appendHistory: (nodeId: string, entry: RuntimeHistoryEntry) => void;
  clearHistory: () => void;
  clearNodeHistory: (nodeId: string) => void;

  // Sample state actions
  setParserSamples: (samples: Record<string, ParserSampleState> | ((prev: Record<string, ParserSampleState>) => Record<string, ParserSampleState>)) => void;
  setUpdaterSamples: (samples: Record<string, UpdaterSampleState> | ((prev: Record<string, UpdaterSampleState>) => Record<string, UpdaterSampleState>)) => void;
  updateParserSample: (nodeId: string, sample: ParserSampleState) => void;
  updateUpdaterSample: (nodeId: string, sample: UpdaterSampleState) => void;

  // Debug snapshot actions
  setPathDebugSnapshots: (snapshots: Record<string, PathDebugSnapshot> | ((prev: Record<string, PathDebugSnapshot>) => Record<string, PathDebugSnapshot>)) => void;
  updatePathDebugSnapshot: (pathId: string, snapshot: PathDebugSnapshot) => void;

  // Execution tracking actions
  setLastRunAt: (timestamp: string | null) => void;
  setLastError: (error: LastErrorInfo | null) => void;

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
};

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

  // Sample states
  const [parserSamples, setParserSamplesInternal] = useState<Record<string, ParserSampleState>>({});
  const [updaterSamples, setUpdaterSamplesInternal] = useState<Record<string, UpdaterSampleState>>({});

  // Debug snapshots
  const [pathDebugSnapshots, setPathDebugSnapshotsInternal] = useState<Record<string, PathDebugSnapshot>>({});

  // Execution tracking
  const [lastRunAt, setLastRunAtInternal] = useState<string | null>(null);
  const [lastError, setLastErrorInternal] = useState<LastErrorInfo | null>(null);

  // Loading states
  const [parserSampleLoading, setParserSampleLoadingInternal] = useState(false);
  const [updaterSampleLoading, setUpdaterSampleLoadingInternal] = useState(false);
  const [sendingToAi, setSendingToAiInternal] = useState(false);

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
      const { [nodeId]: _removedInputs, ...restInputs } = prev.inputs;
      const { [nodeId]: _removedOutputs, ...restOutputs } = prev.outputs;
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

  // Actions are stable
  const actions = useMemo<RuntimeActions>(
    () => ({
      // Runtime state actions
      setRuntimeState: setRuntimeStateInternal,
      updateNodeInputs,
      updateNodeOutputs,
      clearNodeRuntime,
      clearAllRuntime,

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

      // Loading state actions
      setParserSampleLoading: setParserSampleLoadingInternal,
      setUpdaterSampleLoading: setUpdaterSampleLoadingInternal,
      setSendingToAi: setSendingToAiInternal,
    }),
    [
      updateNodeInputs,
      updateNodeOutputs,
      clearNodeRuntime,
      clearAllRuntime,
      appendHistory,
      clearHistory,
      clearNodeHistory,
      updateParserSample,
      updateUpdaterSample,
      updatePathDebugSnapshot,
    ]
  );

  const state = useMemo<RuntimeStateData>(
    () => ({
      runtimeState,
      parserSamples,
      updaterSamples,
      pathDebugSnapshots,
      lastRunAt,
      lastError,
      parserSampleLoading,
      updaterSampleLoading,
      sendingToAi,
    }),
    [
      runtimeState,
      parserSamples,
      updaterSamples,
      pathDebugSnapshots,
      lastRunAt,
      lastError,
      parserSampleLoading,
      updaterSampleLoading,
      sendingToAi,
    ]
  );

  return (
    <RuntimeActionsContext.Provider value={actions}>
      <RuntimeStateContext.Provider value={state}>
        {children}
      </RuntimeStateContext.Provider>
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
    throw new Error('useRuntimeState must be used within a RuntimeProvider');
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
    throw new Error('useRuntimeActions must be used within a RuntimeProvider');
  }
  return context;
}

/**
 * Combined hook for components that need both state and actions.
 */
export function useRuntime(): RuntimeStateData & RuntimeActions {
  const state = useRuntimeState();
  const actions = useRuntimeActions();
  return { ...state, ...actions };
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
    inputs: runtimeState.inputs[nodeId],
    outputs: runtimeState.outputs[nodeId],
    history: runtimeState.history?.[nodeId],
  };
}
