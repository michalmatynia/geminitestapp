'use client';

import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';

import type {
  AiNode,
  ParserSampleState,
  PathDebugSnapshot,
  UpdaterSampleState,
} from '@/shared/contracts/ai-paths';
import type {
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  RuntimeHistoryEntry,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  INITIAL_RUNTIME_STATE,
  MAX_RUNTIME_EVENTS,
  RuntimeActionsContext,
  RuntimeDataStateContext,
  RuntimeStateContext,
  RuntimeStatusStateContext,
  RuntimeUiStateContext,
  type LastErrorInfo,
  type RuntimeActions,
  type RuntimeControlHandlers,
  type RuntimeDataState,
  type RuntimeNodeConfigHandlers,
  type RuntimeProviderProps,
  type RuntimeRunStatus,
  type RuntimeStateData,
  type RuntimeStatusState,
  type RuntimeUiState,
} from './RuntimeContext.shared';

export type {
  LastErrorInfo,
  RuntimeActions,
  RuntimeDataState,
  RuntimeStateData,
  RuntimeRunStatus,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
  RuntimeStatusState,
  RuntimeUiState,
} from './RuntimeContext.shared';

// ---------------------------------------------------------------------------
// Status reducer (single dispatch path for currentRunId / lastError / lastRunAt
// / runtimeRunStatus). Previously lived in `RuntimeContext.status-reducer.ts`.
// ---------------------------------------------------------------------------

type StatusReducerState = Pick<
  RuntimeStatusState,
  'currentRunId' | 'lastError' | 'lastRunAt' | 'runtimeRunStatus'
>;

type StatusReducerAction =
  | { type: 'setCurrentRunId'; value: string | null }
  | { type: 'setLastError'; value: LastErrorInfo | null }
  | { type: 'setLastRunAt'; value: string | null }
  | { type: 'setRuntimeRunStatus'; value: RuntimeRunStatus };

export const INITIAL_STATUS_STATE: StatusReducerState = {
  currentRunId: null,
  lastError: null,
  lastRunAt: null,
  runtimeRunStatus: 'idle',
};

export function statusReducer(
  state: StatusReducerState,
  action: StatusReducerAction
): StatusReducerState {
  switch (action.type) {
    case 'setCurrentRunId':
      return state.currentRunId === action.value ? state : { ...state, currentRunId: action.value };
    case 'setLastError':
      return state.lastError === action.value ? state : { ...state, lastError: action.value };
    case 'setLastRunAt':
      return state.lastRunAt === action.value ? state : { ...state, lastRunAt: action.value };
    case 'setRuntimeRunStatus':
      return state.runtimeRunStatus === action.value
        ? state
        : { ...state, runtimeRunStatus: action.value };
  }
}

// ---------------------------------------------------------------------------
// Imperative handler dispatch (run controls + node-config handlers).
// Previously lived in `RuntimeContext.external-actions.ts`. Inlined here so all
// runtime mutations and handler dispatches share one module.
// ---------------------------------------------------------------------------

function useHandlerDispatch({
  runControlHandlersRef,
  runtimeNodeConfigHandlersRef,
  setLastError,
  setRuntimeRunStatus,
}: {
  runControlHandlersRef: MutableRefObject<RuntimeControlHandlers>;
  runtimeNodeConfigHandlersRef: MutableRefObject<RuntimeNodeConfigHandlers>;
  setLastError: (value: LastErrorInfo | null) => void;
  setRuntimeRunStatus: (
    value: RuntimeRunStatus | ((prev: RuntimeRunStatus) => RuntimeRunStatus)
  ) => void;
}) {
  const reportMissingRunControlHandler = useCallback(
    (action: string, options?: { nodeId?: string | null; markFailed?: boolean }): void => {
      const message = `AI Paths runtime handler "${action}" is not initialized. Reload the page and try again.`;
      setLastError({ message, time: new Date().toISOString() });
      if (options?.markFailed) setRuntimeRunStatus('failed');
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
    [setLastError, setRuntimeRunStatus]
  );

  const reportMissingRuntimeNodeConfigHandler = useCallback(
    (action: string, options?: { nodeId?: string | null }): void => {
      const message = `AI Paths runtime node-config handler "${action}" is not initialized. Reload the page and try again.`;
      setLastError({ message, time: new Date().toISOString() });
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
    [setLastError]
  );

  const setRunControlHandlers = useCallback(
    (handlers: RuntimeControlHandlers) => {
      runControlHandlersRef.current = handlers;
    },
    [runControlHandlersRef]
  );

  const fireTrigger = useCallback(
    async (node: AiNode, event?: MouseEvent<Element>) => {
      const handler = runControlHandlersRef.current.fireTrigger;
      if (!handler) {
        reportMissingRunControlHandler('fireTrigger', { nodeId: node.id, markFailed: true });
        return;
      }
      await handler(node, event);
    },
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const fireTriggerPersistent = useCallback(
    async (node: AiNode, event?: MouseEvent<Element>) => {
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
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const pauseActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.pauseActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('pauseActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const continueActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.continueActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('continueActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const stepActiveRun = useCallback(
    (triggerNode?: AiNode) => {
      const handler = runControlHandlersRef.current.stepActiveRun;
      if (!handler) {
        reportMissingRunControlHandler('stepActiveRun', { nodeId: triggerNode?.id ?? null });
        return;
      }
      handler(triggerNode);
    },
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const cancelActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.cancelActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('cancelActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

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
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const resetRuntimeDiagnostics = useCallback(() => {
    runControlHandlersRef.current.resetRuntimeDiagnostics?.();
  }, [runControlHandlersRef]);

  const setRuntimeNodeConfigHandlers = useCallback(
    (handlers: RuntimeNodeConfigHandlers) => {
      runtimeNodeConfigHandlersRef.current = handlers;
    },
    [runtimeNodeConfigHandlersRef]
  );

  const fetchParserSample = useCallback(
    async (nodeId: string, entityType: string, entityId: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.fetchParserSample;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('fetchParserSample', { nodeId });
        return;
      }
      await handler(nodeId, entityType, entityId);
    },
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
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
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
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
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
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
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
  );

  return {
    setRunControlHandlers,
    fireTrigger,
    fireTriggerPersistent,
    pauseActiveRun,
    continueActiveRun,
    stepActiveRun,
    cancelActiveRun,
    clearWires,
    resetRuntimeDiagnostics,
    setRuntimeNodeConfigHandlers,
    fetchParserSample,
    fetchUpdaterSample,
    runSimulation,
    sendToAi,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function RuntimeProvider({
  children,
  initialRuntimeState = INITIAL_RUNTIME_STATE,
}: RuntimeProviderProps): ReactNode {
  const [runtimeState, setRuntimeStateInternal] = useState(initialRuntimeState);
  const [runtimeNodeStatuses, setRuntimeNodeStatusesInternal] =
    useState<AiPathRuntimeNodeStatusMap>({});
  const [runtimeEvents, setRuntimeEventsInternal] = useState<AiPathRuntimeEvent[]>([]);
  const [parserSamples, setParserSamplesInternal] = useState<Record<string, ParserSampleState>>({});
  const [updaterSamples, setUpdaterSamplesInternal] = useState<Record<string, UpdaterSampleState>>(
    {}
  );
  const [pathDebugSnapshots, setPathDebugSnapshotsInternal] = useState<
    Record<string, PathDebugSnapshot>
  >({});
  const [
    { currentRunId, lastError, lastRunAt, runtimeRunStatus },
    dispatchStatus,
  ] = useReducer(statusReducer, INITIAL_STATUS_STATE);
  const [nodeDurations, setNodeDurationsInternal] = useState<Record<string, number>>({});
  const [parserSampleLoading, setParserSampleLoadingInternal] = useState(false);
  const [updaterSampleLoading, setUpdaterSampleLoadingInternal] = useState(false);
  const [sendingToAi, setSendingToAiInternal] = useState(false);
  const [eventsOverflowed, setEventsOverflowedInternal] = useState(false);
  const runControlHandlersRef = useRef<RuntimeControlHandlers>({});
  const runtimeNodeConfigHandlersRef = useRef<RuntimeNodeConfigHandlers>({});
  const runtimeStatusRef = useRef<StatusReducerState>(INITIAL_STATUS_STATE);

  runtimeStatusRef.current = { currentRunId, lastError, lastRunAt, runtimeRunStatus };

  const setLastRunAt = useCallback((value: string | null): void => {
    dispatchStatus({ type: 'setLastRunAt', value });
  }, []);

  const setLastError = useCallback((value: LastErrorInfo | null): void => {
    dispatchStatus({ type: 'setLastError', value });
  }, []);

  const setCurrentRunId = useCallback((value: string | null): void => {
    dispatchStatus({ type: 'setCurrentRunId', value });
  }, []);

  const setRuntimeRunStatus = useCallback(
    (value: RuntimeRunStatus | ((prev: RuntimeRunStatus) => RuntimeRunStatus)): void => {
      dispatchStatus({
        type: 'setRuntimeRunStatus',
        value:
          typeof value === 'function' ? value(runtimeStatusRef.current.runtimeRunStatus) : value,
      });
    },
    []
  );

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
      return { ...prev, inputs: restInputs, outputs: restOutputs, history: newHistory };
    });
  }, []);

  const clearAllRuntime = useCallback(() => {
    setRuntimeStateInternal(INITIAL_RUNTIME_STATE);
    setRuntimeNodeStatusesInternal({});
    setRuntimeEventsInternal([]);
    setNodeDurationsInternal({});
    setEventsOverflowedInternal(false);
    setCurrentRunId(null);
  }, [setCurrentRunId]);

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
        history: { ...existingHistory, [nodeId]: [...nodeHistory, entry] },
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRuntimeStateInternal((prev) => ({ ...prev, history: undefined }));
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

  const {
    setRunControlHandlers,
    fireTrigger,
    fireTriggerPersistent,
    pauseActiveRun,
    continueActiveRun,
    stepActiveRun,
    cancelActiveRun,
    clearWires,
    resetRuntimeDiagnostics,
    setRuntimeNodeConfigHandlers,
    fetchParserSample,
    fetchUpdaterSample,
    runSimulation,
    sendToAi,
  } = useHandlerDispatch({
    runControlHandlersRef,
    runtimeNodeConfigHandlersRef,
    setLastError,
    setRuntimeRunStatus,
  });

  const actions = useMemo<RuntimeActions>(
    () => ({
      setRuntimeState: setRuntimeStateInternal,
      updateNodeInputs,
      updateNodeOutputs,
      clearNodeRuntime,
      clearAllRuntime,
      setRuntimeNodeStatuses: setRuntimeNodeStatusesInternal,
      addRuntimeEvent,
      setRuntimeEvents,
      clearRuntimeEvents,
      clearEventsOverflow,
      setNodeDurations: setNodeDurationsInternal,
      appendHistory,
      clearHistory,
      clearNodeHistory,
      setParserSamples: setParserSamplesInternal,
      setUpdaterSamples: setUpdaterSamplesInternal,
      updateParserSample,
      updateUpdaterSample,
      setPathDebugSnapshots: setPathDebugSnapshotsInternal,
      updatePathDebugSnapshot,
      setLastRunAt,
      setLastError,
      setCurrentRunId,
      setRuntimeRunStatus,
      setRunControlHandlers,
      resetRuntimeDiagnostics,
      fireTrigger,
      fireTriggerPersistent,
      pauseActiveRun,
      continueActiveRun,
      stepActiveRun,
      cancelActiveRun,
      clearWires,
      setRuntimeNodeConfigHandlers,
      fetchParserSample,
      fetchUpdaterSample,
      runSimulation,
      sendToAi,
      setParserSampleLoading: setParserSampleLoadingInternal,
      setUpdaterSampleLoading: setUpdaterSampleLoadingInternal,
      setSendingToAi: setSendingToAiInternal,
    }),
    [
      addRuntimeEvent,
      appendHistory,
      clearAllRuntime,
      clearEventsOverflow,
      clearHistory,
      clearNodeHistory,
      clearNodeRuntime,
      clearRuntimeEvents,
      clearWires,
      cancelActiveRun,
      fetchParserSample,
      fetchUpdaterSample,
      fireTrigger,
      fireTriggerPersistent,
      pauseActiveRun,
      resetRuntimeDiagnostics,
      continueActiveRun,
      runSimulation,
      sendToAi,
      setCurrentRunId,
      setRunControlHandlers,
      setRuntimeNodeConfigHandlers,
      setRuntimeEvents,
      setRuntimeRunStatus,
      setLastError,
      setLastRunAt,
      stepActiveRun,
      updateNodeInputs,
      updateNodeOutputs,
      updateParserSample,
      updatePathDebugSnapshot,
      updateUpdaterSample,
    ]
  );

  const statusState = useMemo<RuntimeStatusState>(
    () => ({
      runtimeNodeStatuses,
      lastRunAt,
      lastError,
      runtimeRunStatus,
      currentRunId,
    }),
    [currentRunId, lastError, lastRunAt, runtimeNodeStatuses, runtimeRunStatus]
  );

  const dataState = useMemo<RuntimeDataState>(
    () => ({
      runtimeState,
      runtimeEvents,
      parserSamples,
      updaterSamples,
      pathDebugSnapshots,
      nodeDurations,
      eventsOverflowed,
    }),
    [
      eventsOverflowed,
      nodeDurations,
      parserSamples,
      pathDebugSnapshots,
      runtimeEvents,
      runtimeState,
      updaterSamples,
    ]
  );

  const uiState = useMemo<RuntimeUiState>(
    () => ({
      parserSampleLoading,
      updaterSampleLoading,
      sendingToAi,
    }),
    [parserSampleLoading, sendingToAi, updaterSampleLoading]
  );

  const state = useMemo<RuntimeStateData>(
    () => ({ ...statusState, ...dataState, ...uiState }),
    [dataState, statusState, uiState]
  );

  return (
    <RuntimeActionsContext.Provider value={actions}>
      <RuntimeStatusStateContext.Provider value={statusState}>
        <RuntimeDataStateContext.Provider value={dataState}>
          <RuntimeUiStateContext.Provider value={uiState}>
            <RuntimeStateContext.Provider value={state}>{children}</RuntimeStateContext.Provider>
          </RuntimeUiStateContext.Provider>
        </RuntimeDataStateContext.Provider>
      </RuntimeStatusStateContext.Provider>
    </RuntimeActionsContext.Provider>
  );
}

export {
  useNodeRuntime,
  useRuntimeActions,
  useRuntimeDataState,
  useRuntimeState,
  useRuntimeStatusState,
  useRuntimeUiState,
} from './RuntimeContext.hooks';
