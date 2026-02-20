'use client';

import type {
  AiNode,
  AiPathRunEventDto as AiPathRuntimeEvent,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  Edge,
  AiPathsValidationConfig,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  RuntimeState,
  RuntimePortValues,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';

export const MAX_RUNTIME_EVENTS = 300;

export const LOCAL_RUN_STEP_CHUNK = 5;

export const AI_PATHS_ENTITY_STALE_MS = 30000;

export type ToastFn = (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;

export const NON_SETTLED_RUNTIME_NODE_STATUSES = new Set<AiPathRuntimeNodeStatus>([
  'pending',
  'running',
  'waiting',
]);

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface SetNodeStatusInput {
  nodeId: string;
  status: AiPathRuntimeNodeStatus;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

export interface RuntimeEventInput {
  id?: string;
  timestamp?: string;
  source: string;
  kind: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  runId?: string | null;
  runStartedAt?: string | null;
  nodeId?: string | null;
  nodeType?: string | null;
  nodeTitle?: string | null;
}

export interface LocalExecutionArgs {
  pathConfig: PathConfig;
  initialValues: RuntimePortValues;
  mode?: PathRunMode;
  onEvent?: (event: AiPathRuntimeEvent) => void;
  onNodeStatus?: (input: SetNodeStatusInput) => void;
}

export type {
  AiNode,
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  Edge,
  AiPathsValidationConfig,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  RuntimeState,
  RuntimePortValues,
  UpdaterSampleState,
};
