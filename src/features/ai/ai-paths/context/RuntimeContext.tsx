'use client';

import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { RuntimePortValues, ParserSampleState, UpdaterSampleState, PathDebugSnapshot, RuntimeHistoryEntry, AiPathRuntimeNodeStatusMap, AiPathRuntimeEvent } from '@/shared/contracts/ai-paths-runtime';

import {
  INITIAL_RUNTIME_STATE,
  MAX_RUNTIME_EVENTS,
  RuntimeActionsContext,
  RuntimeDataStateContext,
  RuntimeStateContext,
  RuntimeStatusStateContext,
  RuntimeUiStateContext,
  type RuntimeActions,
  type RuntimeControlHandlers,
  type RuntimeDataState,
  type RuntimeStateData,
  type RuntimeNodeConfigHandlers,
  type RuntimeProviderProps,
  type RuntimeRunStatus,
  type RuntimeStatusState,
  type RuntimeUiState,
} from './RuntimeContext.shared';
import {
  INITIAL_RUNTIME_STATUS_STATE,
  runtimeStatusReducer,
  type RuntimeStatusReducerState,
} from './RuntimeContext.status-reducer';
import { useRuntimeExternalActions } from './RuntimeContext.external-actions';

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
  ] = useReducer(runtimeStatusReducer, INITIAL_RUNTIME_STATUS_STATE);
  const [nodeDurations, setNodeDurationsInternal] = useState<Record<string, number>>({});
  const [parserSampleLoading, setParserSampleLoadingInternal] = useState(false);
  const [updaterSampleLoading, setUpdaterSampleLoadingInternal] = useState(false);
  const [sendingToAi, setSendingToAiInternal] = useState(false);
  const [eventsOverflowed, setEventsOverflowedInternal] = useState(false);
  const runControlHandlersRef = useRef<RuntimeControlHandlers>({});
  const runtimeNodeConfigHandlersRef = useRef<RuntimeNodeConfigHandlers>({});
  const runtimeStatusRef = useRef<RuntimeStatusReducerState>(INITIAL_RUNTIME_STATUS_STATE);

  runtimeStatusRef.current = {
    currentRunId,
    lastError,
    lastRunAt,
    runtimeRunStatus,
  };

  const setLastRunAt = useCallback((value: string | null): void => {
    dispatchStatus({ type: 'setLastRunAt', value });
  }, []);

  const setLastError = useCallback((value: RuntimeStateData['lastError']): void => {
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
          typeof value === 'function'
            ? value(runtimeStatusRef.current.runtimeRunStatus)
            : value,
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
      if (!prev.history) {
        return prev;
      }
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
  } = useRuntimeExternalActions({
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
      resumeActiveRun,
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
      resumeActiveRun,
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
    () => ({
      ...statusState,
      ...dataState,
      ...uiState,
    }),
    [
      dataState,
      statusState,
      uiState,
    ]
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
