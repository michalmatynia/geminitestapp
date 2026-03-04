import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type {
  ParserSampleState,
  RuntimeState,
  PathDebugSnapshot,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import {
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context/SelectionContext';
import {
  useRuntimeActions,
  useRuntimeState,
} from '@/features/ai/ai-paths/context/RuntimeContext';
import {
  usePersistenceActions,
  usePersistenceState,
} from '@/features/ai/ai-paths/context/PersistenceContext';

type LastErrorInfo = {
  message: string;
  time: string;
  pathId?: string | null;
} | null;

export function useContextSettingsState() {
  const persistenceState = usePersistenceState();
  const persistenceActions = usePersistenceActions();

  const selectionState = useSelectionState();
  const selectionActions = useSelectionActions();
  const runtimeContextState = useRuntimeState();
  const runtimeContextActions = useRuntimeActions();

  const setRuntimeState = useCallback<Dispatch<SetStateAction<RuntimeState>>>(
    (next): void => {
      runtimeContextActions.setRuntimeState(next);
    },
    [runtimeContextActions]
  );

  const setParserSamples = useCallback<
    Dispatch<SetStateAction<Record<string, ParserSampleState>>>
  >(
    (next): void => {
      runtimeContextActions.setParserSamples(next);
    },
    [runtimeContextActions]
  );

  const setUpdaterSamples = useCallback<
    Dispatch<SetStateAction<Record<string, UpdaterSampleState>>>
  >(
    (next): void => {
      runtimeContextActions.setUpdaterSamples(next);
    },
    [runtimeContextActions]
  );

  const setPathDebugSnapshots = useCallback<
    Dispatch<SetStateAction<Record<string, PathDebugSnapshot>>>
  >(
    (next): void => {
      runtimeContextActions.setPathDebugSnapshots(next);
    },
    [runtimeContextActions]
  );

  const setLastRunAt = useCallback<Dispatch<SetStateAction<string | null>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(runtimeContextState.lastRunAt) : next;
      runtimeContextActions.setLastRunAt(resolved);
    },
    [runtimeContextActions, runtimeContextState.lastRunAt]
  );

  const setLastError = useCallback<Dispatch<SetStateAction<LastErrorInfo>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(runtimeContextState.lastError) : next;
      runtimeContextActions.setLastError(resolved);
    },
    [runtimeContextActions, runtimeContextState.lastError]
  );

  const setSelectedNodeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(selectionState.selectedNodeId) : (next ?? null);
      selectionActions.selectNode(resolved);
    },
    [selectionActions, selectionState.selectedNodeId]
  );

  const setConfigOpen = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(selectionState.configOpen) : next;
      selectionActions.setConfigOpen(resolved);
    },
    [selectionActions, selectionState.configOpen]
  );

  const setNodeConfigDirty = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(selectionState.nodeConfigDirty) : next;
      selectionActions.setNodeConfigDirty(resolved);
    },
    [selectionActions, selectionState.nodeConfigDirty]
  );

  const setSimulationOpenNodeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (next): void => {
      const resolved =
        typeof next === 'function' ? next(selectionState.simulationOpenNodeId) : (next ?? null);
      selectionActions.setSimulationOpenNodeId(resolved);
    },
    [selectionActions, selectionState.simulationOpenNodeId]
  );

  const setLoading = useCallback<Dispatch<SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(persistenceState.loading) : next;
      persistenceActions.setLoading(resolved);
    },
    [persistenceActions, persistenceState.loading]
  );

  const setLoadNonce = useCallback<Dispatch<SetStateAction<number>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(persistenceState.loadNonce) : next;
      persistenceActions.setLoadNonce(resolved);
    },
    [persistenceActions, persistenceState.loadNonce]
  );

  return {
    selectedNodeId: selectionState.selectedNodeId,
    configOpen: selectionState.configOpen,
    nodeConfigDirty: selectionState.nodeConfigDirty,
    simulationOpenNodeId: selectionState.simulationOpenNodeId,
    runtimeState: runtimeContextState.runtimeState,
    parserSamples: runtimeContextState.parserSamples,
    updaterSamples: runtimeContextState.updaterSamples,
    pathDebugSnapshots: runtimeContextState.pathDebugSnapshots,
    lastRunAt: runtimeContextState.lastRunAt,
    lastError: runtimeContextState.lastError,
    loading: persistenceState.loading,
    loadNonce: persistenceState.loadNonce,
    setRuntimeState,
    setParserSamples,
    setUpdaterSamples,
    setPathDebugSnapshots,
    setLastRunAt,
    setLastError,
    setSelectedNodeId,
    setConfigOpen,
    setNodeConfigDirty,
    setSimulationOpenNodeId,
    setLoading,
    setLoadNonce,
  };
}
