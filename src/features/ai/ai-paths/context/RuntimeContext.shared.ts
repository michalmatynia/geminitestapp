'use client';

import type { MouseEvent, ReactNode } from 'react';

import type {
  LastErrorInfo,
  RuntimeRunStatus,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
} from '@/shared/contracts/ai-paths';
import { internalError } from '@/shared/errors/app-error';
import type { AiNode, PathDebugSnapshot, ParserSampleState, UpdaterSampleState } from '@/shared/contracts/ai-paths';
import type { RuntimeState, RuntimePortValues, RuntimeHistoryEntry, AiPathRuntimeNodeStatusMap, AiPathRuntimeEvent } from '@/shared/contracts/ai-paths-runtime';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type { LastErrorInfo, RuntimeRunStatus, RuntimeControlHandlers, RuntimeNodeConfigHandlers };

export interface RuntimeStatusState {
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  lastRunAt: string | null;
  lastError: LastErrorInfo | null;
  runtimeRunStatus: RuntimeRunStatus;
  currentRunId: string | null;
}

export interface RuntimeDataState {
  runtimeState: RuntimeState;
  runtimeEvents: AiPathRuntimeEvent[];
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;
  nodeDurations: Record<string, number>;
  eventsOverflowed: boolean;
}

export interface RuntimeUiState {
  parserSampleLoading: boolean;
  updaterSampleLoading: boolean;
  sendingToAi: boolean;
}

export type RuntimeStateData = RuntimeStatusState & RuntimeDataState & RuntimeUiState;

export interface RuntimeActions {
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  updateNodeInputs: (nodeId: string, inputs: RuntimePortValues) => void;
  updateNodeOutputs: (nodeId: string, outputs: RuntimePortValues) => void;
  clearNodeRuntime: (nodeId: string) => void;
  clearAllRuntime: () => void;
  setRuntimeNodeStatuses: (
    statuses:
      | AiPathRuntimeNodeStatusMap
      | ((prev: AiPathRuntimeNodeStatusMap) => AiPathRuntimeNodeStatusMap)
  ) => void;
  addRuntimeEvent: (event: AiPathRuntimeEvent) => void;
  setRuntimeEvents: (events: AiPathRuntimeEvent[]) => void;
  clearRuntimeEvents: () => void;
  clearEventsOverflow: () => void;
  setNodeDurations: (
    durations: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  appendHistory: (nodeId: string, entry: RuntimeHistoryEntry) => void;
  clearHistory: () => void;
  clearNodeHistory: (nodeId: string) => void;
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
  setPathDebugSnapshots: (
    snapshots:
      | Record<string, PathDebugSnapshot>
      | ((prev: Record<string, PathDebugSnapshot>) => Record<string, PathDebugSnapshot>)
  ) => void;
  updatePathDebugSnapshot: (pathId: string, snapshot: PathDebugSnapshot) => void;
  setLastRunAt: (timestamp: string | null) => void;
  setLastError: (error: LastErrorInfo | null) => void;
  setCurrentRunId: (id: string | null) => void;
  setRuntimeRunStatus: (
    status: RuntimeRunStatus | ((prev: RuntimeRunStatus) => RuntimeRunStatus)
  ) => void;
  setRunControlHandlers: (handlers: RuntimeControlHandlers) => void;
  resetRuntimeDiagnostics: () => void;
  fireTrigger: (node: AiNode, event?: MouseEvent<Element>) => Promise<void>;
  fireTriggerPersistent: (node: AiNode, event?: MouseEvent<Element>) => Promise<void>;
  pauseActiveRun: () => void;
  continueActiveRun: () => void;
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
  setParserSampleLoading: (loading: boolean) => void;
  setUpdaterSampleLoading: (loading: boolean) => void;
  setSendingToAi: (sending: boolean) => void;
}

export interface RuntimeProviderProps {
  children: ReactNode;
  initialRuntimeState?: RuntimeState;
}

export const INITIAL_RUNTIME_STATE: RuntimeState = {
  inputs: {},
  outputs: {},
};

export const MAX_RUNTIME_EVENTS = 300;

const {
  Context: RuntimeStatusStateContext,
  useStrictContext: useRuntimeStatusState,
} = createStrictContext<RuntimeStatusState>({
  hookName: 'useRuntimeStatusState',
  providerName: 'a RuntimeProvider',
  errorFactory: internalError,
});

const {
  Context: RuntimeDataStateContext,
  useStrictContext: useRuntimeDataState,
} = createStrictContext<RuntimeDataState>({
  hookName: 'useRuntimeDataState',
  providerName: 'a RuntimeProvider',
  errorFactory: internalError,
});

const {
  Context: RuntimeUiStateContext,
  useStrictContext: useRuntimeUiState,
} = createStrictContext<RuntimeUiState>({
  hookName: 'useRuntimeUiState',
  providerName: 'a RuntimeProvider',
  errorFactory: internalError,
});

const {
  Context: RuntimeStateContext,
  useStrictContext: useRuntimeState,
} = createStrictContext<RuntimeStateData>({
  hookName: 'useRuntimeState',
  providerName: 'a RuntimeProvider',
  errorFactory: internalError,
});

const {
  Context: RuntimeActionsContext,
  useStrictContext: useRuntimeActions,
} = createStrictContext<RuntimeActions>({
  hookName: 'useRuntimeActions',
  providerName: 'a RuntimeProvider',
  errorFactory: internalError,
});

export {
  RuntimeStatusStateContext,
  RuntimeDataStateContext,
  RuntimeUiStateContext,
  RuntimeStateContext,
  RuntimeActionsContext,
  useRuntimeStatusState,
  useRuntimeDataState,
  useRuntimeUiState,
  useRuntimeState,
  useRuntimeActions,
};
