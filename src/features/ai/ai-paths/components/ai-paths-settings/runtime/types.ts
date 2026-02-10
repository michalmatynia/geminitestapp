'use client';

import type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatusMap,
  Edge,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  RuntimeState,
  RuntimePortValues,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';

export const AI_PATHS_SESSION_STALE_MS = 30_000;
export const AI_PATHS_ENTITY_STALE_MS = 10_000;
export const LOCAL_RUN_STEP_CHUNK = 25;
export const MAX_RUNTIME_EVENTS = 300;

export const NON_SETTLED_RUNTIME_NODE_STATUSES = new Set<string>([
  'idle',
  'queued',
  'completed',
  'failed',
  'canceled',
  'cancelled',
  'cached',
  'blocked',
  'skipped',
  'timeout',
]);

export const TRANSIENT_RUNTIME_NODE_STATUSES = new Set<string>([
  'queued',
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export const IDLE_REHYDRATION_BLOCKED_NODE_STATUSES = new Set<string>([
  'completed',
  'cached',
  'canceled',
  'cancelled',
]);

export type ToastFn = (message: string, options?: Partial<{ variant: 'success' | 'error' | 'info'; duration: number }>) => void;

export type QueuedRun = {
  triggerNodeId: string;
  pathId: string | null;
  contextOverride?: Record<string, unknown> | null;
  queuedAt: string;
};

export type RuntimeEventInput = Omit<AiPathRuntimeEvent, 'id' | 'timestamp'> & {
  id?: string | undefined;
  timestamp?: string | undefined;
};

export type UseAiPathsRuntimeArgs = {
  activePathId: string | null;
  activeTab: 'canvas' | 'paths' | 'docs';
  isPathActive: boolean;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  edges: Edge[];
  nodes: AiNode[];
  pathDescription: string;
  pathName: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  setLastRunAt: (value: string | null) => void;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: React.Dispatch<
    React.SetStateAction<Record<string, PathDebugSnapshot>>
  >;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  toast: ToastFn;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

export type RunStatus = 'idle' | 'running' | 'paused' | 'stepping';

export type UseAiPathsRuntimeResult = {
  handleRunSimulation: (simulationNode: AiNode, triggerEvent?: string) => Promise<void>;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ) => Promise<void>;
  handlePauseRun: () => void;
  handleResumeRun: () => void;
  handleStepRun: (triggerNode?: AiNode) => void;
  handleCancelRun: () => void;
  runStatus: RunStatus;
  handleSendToAi: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[];
  clearNodeCache: (nodeId: string) => void;
};

export type LocalExecutionArgs = UseAiPathsRuntimeArgs & {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  // State refs shared with orchestrator
  runInFlightRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  pauseRequestedRef: React.MutableRefObject<boolean>;
  runLoopActiveRef: React.MutableRefObject<boolean>;
  runtimeStateRef: React.MutableRefObject<RuntimeState>;
  queuedRunsRef: React.MutableRefObject<QueuedRun[]>;
  currentRunIdRef: React.MutableRefObject<string | null>;
  currentRunStartedAtRef: React.MutableRefObject<string | null>;
  currentRunStartedAtMsRef: React.MutableRefObject<number | null>;
  lastTriggerNodeIdRef: React.MutableRefObject<string | null>;
  lastTriggerEventRef: React.MutableRefObject<string | null>;
  triggerContextRef: React.MutableRefObject<Record<string, unknown> | null>;
  pendingSimulationContextRef: React.MutableRefObject<Record<string, unknown> | null>;
  serverRunActiveRef: React.MutableRefObject<boolean>;
  sessionUser: { id: string; name: string | null; email: string | null } | null;
  // From useAiPathsRuntimeState
  appendRuntimeEvent: (input: RuntimeEventInput) => void;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  setNodeStatus: (input: any) => void;
  settleTransientNodeStatuses: (terminalStatus: 'completed' | 'failed' | 'canceled', currentOutputs?: any) => void;
  setRunStatus: (status: RunStatus) => void;
  formatStatusLabel: (status: any) => string;
  normalizeNodeStatus: (value: unknown) => any;
  // Callbacks
  stopServerRunStream: () => void;
  fetchEntityByType: (entityType: string, entityId: string) => Promise<Record<string, unknown> | null>;
  hasPendingIteratorAdvance: (state: RuntimeState) => boolean;
  seedImmediateDownstreamInputs: (inputs: Record<string, RuntimePortValues>, allOutputs: Record<string, RuntimePortValues>, fromNodeId: string) => Record<string, RuntimePortValues>;
};

export type ServerExecutionArgs = UseAiPathsRuntimeArgs & {
  normalizedNodes: AiNode[];
  sanitizedEdges: Edge[];
  runtimeStateRef: React.MutableRefObject<RuntimeState>;
  currentRunIdRef: React.MutableRefObject<string | null>;
  currentRunStartedAtRef: React.MutableRefObject<string | null>;
  // From useAiPathsRuntimeState
  appendRuntimeEvent: (input: RuntimeEventInput) => void;
  resetRuntimeNodeStatuses: (next?: AiPathRuntimeNodeStatusMap) => void;
  setNodeStatus: (input: any) => void;
  settleTransientNodeStatuses: (terminalStatus: 'completed' | 'failed' | 'canceled', currentOutputs?: any) => void;
  normalizeNodeStatus: (value: unknown) => any;
  formatStatusLabel: (status: any) => string;
  runtimeNodeStatusesRef: React.MutableRefObject<AiPathRuntimeNodeStatusMap>;
  setRuntimeNodeStatuses: React.Dispatch<React.SetStateAction<AiPathRuntimeNodeStatusMap>>;
  setRuntimeEvents: React.Dispatch<React.SetStateAction<AiPathRuntimeEvent[]>>;
};