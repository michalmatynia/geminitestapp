import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { Toast } from '@/shared/contracts/ui';
import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  AiPathsValidationConfig,
  Edge,
  PathBlockedRunPolicy,
  PathExecutionMode,
  PathRunMode,
  ParserSampleState,
  QueuedRun,
  RuntimeEventInput,
  RuntimeState,
  RunStatus,
  SetNodeStatusInput,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
export type { QueuedRun } from '@/shared/lib/ai-paths';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type * as React from 'react';

/**
 * The actual UI toast function type used in runtime hooks.
 * Different from Toast in @/shared/contracts/ai-paths-runtime which is the
 * shadcn-style API used inside NodeHandlerContext by engine handlers.
 */
export type UiToastFn = Toast;

/**
 * Args required by useAiPathsServerExecution
 */
export interface ServerExecutionArgs {
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  runtimeKernelConfig?: Record<string, unknown> | undefined;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation?: AiPathsValidationConfig | undefined;
  historyRetentionPasses?: number;
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeStateRef: MutableRefObject<RuntimeState>;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setRuntimeEvents: Dispatch<SetStateAction<AiPathRuntimeEvent[]>>;
  appendRuntimeEvent: (input: RuntimeEventInput) => void;
  setNodeStatus: (input: SetNodeStatusInput) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  settleTransientNodeStatuses: (
    terminalStatus: 'completed' | 'failed' | 'canceled',
    currentOutputs?: Record<string, unknown>,
    options?: {
      settleQueued?: boolean;
    }
  ) => void;
  setRunStatus: (status: RunStatus) => void;
  setLastRunAt: (at: string | null) => void;
  toast: UiToastFn;
  currentRunIdRef?: MutableRefObject<string | null>;
  currentRunStartedAtRef?: MutableRefObject<string | null>;
  /** Persists the active server run ID into RuntimeContext state (null when idle) */
  setCurrentRunId?: (id: string | null) => void;
  /** Opens the run detail panel for the given run ID (injected from RunHistoryContext) */
  openRunDetail?: (runId: string) => void;
}

/**
 * Args required by useAiPathsLocalExecution
 */
export interface LocalExecutionArgs {
  activePathId: string | null;
  activeTab: string;
  activeTrigger: string;
  contextRegistry?: ContextRegistryConsumerEnvelope | null | undefined;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  isPathActive: boolean;
  edges: Edge[];
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  onCanonicalEdgesDetected?: (edges: Edge[]) => void;
  pathName: string;
  pathDescription: string;
  runtimeKernelConfig?: Record<string, unknown> | undefined;
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
  queuedRunsRef: MutableRefObject<QueuedRun[]>;
  serverRunActiveRef: MutableRefObject<boolean>;
  setRunStatus: (status: RunStatus) => void;
  appendRuntimeEvent: (input: RuntimeEventInput) => void;
  setNodeStatus: (input: SetNodeStatusInput) => void;
  setRuntimeState: Dispatch<SetStateAction<RuntimeState>>;
  setLastRunAt: (at: string | null) => void;
  settleTransientNodeStatuses: (
    terminalStatus: 'completed' | 'failed' | 'canceled',
    currentOutputs?: Record<string, unknown>,
    options?: {
      settleQueued?: boolean;
    }
  ) => void;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  normalizeNodeStatus: (value: unknown) => AiPathRuntimeNodeStatus | null;
  formatStatusLabel: (status: AiPathRuntimeNodeStatus) => string;
  hasPendingIteratorAdvance: (state: RuntimeState) => boolean;
  fetchEntityByType: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
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
  runtimeKernelConfig?: Record<string, unknown> | undefined;
  activeTab: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  isPathActive: boolean;
  nodes: AiNode[];
  edges: Edge[];
  onCanonicalEdgesDetected?: (edges: Edge[]) => void;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
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
  runStatus: RunStatus;
  handleSendToAi: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[];
  nodeDurations: Record<string, number>;
  clearNodeCache: (nodeId: string) => void;
  resetRuntimeDiagnostics: () => void;
}
