'use client';

import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  AiPathsValidationConfig,
  Edge,
  PathConfig,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  ParserSampleState,
  QueuedRunDto,
  RuntimeEventInputDto,
  RuntimeState,
  RunStatusDto,
  SetNodeStatusInputDto,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';


/**
 * The actual UI toast function type used in runtime hooks.
 * Different from ToastFn in @/shared/contracts/ai-paths-runtime which is the
 * shadcn-style API used inside NodeHandlerContext by engine handlers.
 */
export type UiToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning'; duration?: number; error?: unknown }
) => void;

export type QueuedRun = QueuedRunDto;

/**
 * Args required by useAiPathsServerExecution
 */
export interface ServerExecutionArgs {
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  aiPathsValidation?: AiPathsValidationConfig | undefined;
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeStateRef: MutableRefObject<RuntimeState>;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setRuntimeEvents: Dispatch<SetStateAction<AiPathRuntimeEvent[]>>;
  setPathConfigs: Dispatch<SetStateAction<Record<string, PathConfig>>>;
  appendRuntimeEvent: (input: RuntimeEventInputDto) => void;
  setNodeStatus: (input: SetNodeStatusInputDto) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  settleTransientNodeStatuses: (
    terminalStatus: 'completed' | 'failed' | 'canceled',
    currentOutputs?: Record<string, unknown>
  ) => void;
  setLastRunAt: (at: string | null) => void;
  toast: UiToastFn;
  currentRunIdRef?: MutableRefObject<string | null>;
  currentRunStartedAtRef?: MutableRefObject<string | null>;
}

/**
 * Args required by useAiPathsLocalExecution
 */
export interface LocalExecutionArgs {
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
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  onCanonicalEdgesDetected?: (edges: Edge[]) => void;
  pathName: string;
  pathDescription: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  sessionUser: { id: string; name: string | null; email: string | null } | null;
  runtimeStateRef: MutableRefObject<RuntimeState>;
  currentRunIdRef: MutableRefObject<string | null>;
  currentRunStartedAtRef: MutableRefObject<string | null>;
  currentRunStartedAtMsRef: MutableRefObject<number | null>;
  lastTriggerNodeIdRef: MutableRefObject<string | null>;
  lastTriggerEventRef: MutableRefObject<string | null>;
  triggerContextRef: MutableRefObject<Record<string, unknown> | null>;
  runLoopActiveRef: MutableRefObject<boolean>;
  runInFlightRef: MutableRefObject<boolean>;
  abortControllerRef: MutableRefObject<AbortController | null>;
  pauseRequestedRef: MutableRefObject<boolean>;
  queuedRunsRef: MutableRefObject<QueuedRunDto[]>;
  serverRunActiveRef: MutableRefObject<boolean>;
  setRunStatus: (status: RunStatusDto) => void;
  appendRuntimeEvent: (input: RuntimeEventInputDto) => void;
  setNodeStatus: (input: SetNodeStatusInputDto) => void;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setPathConfigs: Dispatch<SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: Dispatch<SetStateAction<Record<string, PathDebugSnapshot>>>;
  setLastRunAt: (at: string | null) => void;
  settleTransientNodeStatuses: (
    terminalStatus: 'completed' | 'failed' | 'canceled',
    currentOutputs?: Record<string, unknown>
  ) => void;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  hasPendingIteratorAdvance: (state: RuntimeState) => boolean;
  fetchEntityByType: (entityType: string, entityId: string) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, fallbackMessage?: string) => void;
  toast: UiToastFn;
  stopServerRunStream: () => void;
  runServerStream: (
    triggerNode: AiNode,
    triggerEvent: string,
    triggerContext: Record<string, unknown>
  ) => Promise<void>;
}

export interface UseAiPathsRuntimeArgs {
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  activeTab: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  isPathActive: boolean;
  nodes: AiNode[];
  edges: Edge[];
  onCanonicalEdgesDetected?: (edges: Edge[]) => void;
  runtimeState: RuntimeState;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setPathConfigs: Dispatch<SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: Dispatch<SetStateAction<Record<string, PathDebugSnapshot>>>;
  setLastRunAt: (at: string | null) => void;
  lastRunAt?: string | null;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, fallbackMessage?: string) => void;
  toast: UiToastFn;
}

export interface UseAiPathsRuntimeResult {
  handleRunSimulation: (triggerNode: AiNode, triggerEvent?: string) => Promise<void>;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (triggerNode: AiNode, event?: React.MouseEvent) => Promise<void>;
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
  resetRuntimeDiagnostics: () => void;
}
