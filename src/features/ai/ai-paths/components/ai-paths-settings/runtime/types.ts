'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';

import type {
  AiNode,
  Edge,
  PathConfig,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  AiPathsValidationConfig,
  ParserSampleState,
  UpdaterSampleState,
  RuntimeState,
  RuntimePortValues,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  AiPathRuntimeEvent,
  ToastFn,
  RunStatusDto,
  RuntimeEventInputDto,
  SetNodeStatusInputDto,
  QueuedRunDto,
} from '@/features/ai/ai-paths/lib';

export type QueuedRun = QueuedRunDto;

// ---------------------------------------------------------------------------
// Args passed from useAiPathsSettingsState → useAiPathsRuntime
// ---------------------------------------------------------------------------
export interface UseAiPathsRuntimeArgs {
  activePathId: string | null;
  activeTab: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  isPathActive: boolean;
  edges: Edge[];
  nodes: AiNode[];
  pathDescription: string;
  pathName: string;
  parserSamples: ParserSampleState[];
  updaterSamples: UpdaterSampleState[];
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  setLastRunAt: (at: string | null) => void;
  setPathConfigs: (
    updater:
      | Record<string, PathConfig>
      | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
  ) => void;
  setPathDebugSnapshots: (
    updater:
      | Record<string, PathDebugSnapshot>
      | ((prev: Record<string, PathDebugSnapshot>) => Record<string, PathDebugSnapshot>)
  ) => void;
  setRuntimeState: (
    updater: RuntimeState | ((prev: RuntimeState) => RuntimeState)
  ) => void;
  toast: ToastFn;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
}

// ---------------------------------------------------------------------------
// Return value of useAiPathsRuntime
// ---------------------------------------------------------------------------
export interface UseAiPathsRuntimeResult {
  handleRunSimulation: (simulationNode: AiNode, triggerEvent?: string) => Promise<void>;
  handleFireTrigger: (triggerNode: AiNode, event?: ReactMouseEvent) => void;
  handleFireTriggerPersistent: (
    triggerNode: AiNode,
    event?: ReactMouseEvent
  ) => Promise<void>;
  handlePauseRun: () => void;
  handleResumeRun: () => void;
  handleStepRun: (triggerNode?: AiNode) => void;
  handleCancelRun: () => void;
  runStatus: RunStatusDto;
  handleSendToAi: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[];
  nodeDurations: Record<string, number>;
  clearNodeCache: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Args for useAiPathsServerExecution
// ---------------------------------------------------------------------------
export interface ServerExecutionArgs {
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  aiPathsValidation: AiPathsValidationConfig;
  parserSamples: ParserSampleState[];
  updaterSamples: UpdaterSampleState[];
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  setNodeStatus: (input: SetNodeStatusInputDto) => void;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  setRuntimeState: (
    updater: RuntimeState | ((prev: RuntimeState) => RuntimeState)
  ) => void;
  runtimeStateRef: { current: RuntimeState };
  setRuntimeEvents: (
    updater:
      | AiPathRuntimeEvent[]
      | ((prev: AiPathRuntimeEvent[]) => AiPathRuntimeEvent[])
  ) => void;
  appendRuntimeEvent: (input: RuntimeEventInputDto) => void;
  setPathConfigs: (
    updater:
      | Record<string, PathConfig>
      | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
  ) => void;
  settleTransientNodeStatuses: (
    status: 'completed' | 'failed' | 'canceled'
  ) => void;
  setLastRunAt: (at: string | null) => void;
  currentRunIdRef: { current: string | null };
  currentRunStartedAtRef: { current: string | null };
}

// ---------------------------------------------------------------------------
// Args for useAiPathsLocalExecution
// ---------------------------------------------------------------------------
export interface LocalExecutionArgs extends UseAiPathsRuntimeArgs {
  // Runtime state helpers
  setRunStatus: (status: RunStatusDto) => void;
  runStatusRef: { current: RunStatusDto };
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeNodeStatusesRef: { current: AiPathRuntimeNodeStatusMap };
  setRuntimeNodeStatuses: (next: AiPathRuntimeNodeStatusMap) => void;
  runtimeEvents: AiPathRuntimeEvent[];
  setRuntimeEvents: (
    updater:
      | AiPathRuntimeEvent[]
      | ((prev: AiPathRuntimeEvent[]) => AiPathRuntimeEvent[])
  ) => void;
  appendRuntimeEvent: (input: RuntimeEventInputDto) => void;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  setNodeStatus: (input: SetNodeStatusInputDto) => void;
  settleTransientNodeStatuses: (
    status: 'completed' | 'failed' | 'canceled',
    currentOutputs?: Record<string, unknown>
  ) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  nodeDurations: Record<string, number>;
  nodeStartTimesRef: { current: Record<string, number> };
  // Server execution delegation
  serverRunActiveRef: { current: boolean };
  runServerStream: (
    triggerNode: AiNode,
    triggerEvent: string,
    triggerContext: Record<string, unknown>
  ) => Promise<void>;
  stopServerRunStream: () => void;
  // Pre-computed graph shapes
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  // Shared refs
  runtimeStateRef: { current: RuntimeState };
  runInFlightRef: { current: boolean };
  abortControllerRef: { current: AbortController | null };
  pauseRequestedRef: { current: boolean };
  runLoopActiveRef: { current: boolean };
  queuedRunsRef: { current: QueuedRun[] };
  currentRunIdRef: { current: string | null };
  currentRunStartedAtRef: { current: string | null };
  currentRunStartedAtMsRef: { current: number | null };
  lastTriggerNodeIdRef: { current: string | null };
  lastTriggerEventRef: { current: string | null };
  triggerContextRef: { current: Record<string, unknown> | null };
  pendingSimulationContextRef: { current: Record<string, unknown> | null };
  sessionUser: unknown | null;
  // Computation helpers
  hasPendingIteratorAdvance: (rtState: RuntimeState) => boolean;
  seedImmediateDownstreamInputs: (
    inputs: Record<string, RuntimePortValues>,
    allOutputs: Record<string, RuntimePortValues>,
    fromNodeId: string
  ) => Record<string, RuntimePortValues>;
  fetchEntityByType: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
}
