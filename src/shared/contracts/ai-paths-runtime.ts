import { z } from 'zod';

import { aiPathRunSchema, type AiNode, type Edge } from './ai-paths';

/**
 * AI Path Runtime DTOs
 */

export const aiPathRuntimeNodeStatusSchema = z.enum([
  'idle',
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
  'cancelled', // Legacy support
  'cached',
  'blocked',
  'skipped',
  'timeout',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export type AiPathRuntimeNodeStatusDto = z.infer<typeof aiPathRuntimeNodeStatusSchema>;
export type AiPathRuntimeNodeStatus = AiPathRuntimeNodeStatusDto;

export const NON_SETTLED_RUNTIME_NODE_STATUSES = new Set<AiPathRuntimeNodeStatusDto>([
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

export const TRANSIENT_RUNTIME_NODE_STATUSES = new Set<AiPathRuntimeNodeStatusDto>([
  'queued',
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export const IDLE_REHYDRATION_BLOCKED_NODE_STATUSES = new Set<AiPathRuntimeNodeStatusDto>([
  'completed',
  'cached',
  'canceled',
  'cancelled',
]);

export const aiPathRuntimeNodeStatusMapSchema = z.record(z.string(), aiPathRuntimeNodeStatusSchema);

export type AiPathRuntimeNodeStatusMapDto = z.infer<typeof aiPathRuntimeNodeStatusMapSchema>;
export type AiPathRuntimeNodeStatusMap = AiPathRuntimeNodeStatusMapDto;

export const aiPathRuntimeEventKindSchema = z.enum(['log', 'status', 'error', 'output']);
export type AiPathRuntimeEventKindDto = z.infer<typeof aiPathRuntimeEventKindSchema>;

export const aiPathRuntimeEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: aiPathRuntimeEventKindSchema,
  kind: z.string().optional(),
  source: z.enum(['local', 'server']).optional(),
  message: z.string(),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  nodeId: z.string().optional(),
  nodeType: z.string().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.union([aiPathRuntimeNodeStatusSchema, z.string()]).optional(),
  iteration: z.number().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathRuntimeEventDto = z.infer<typeof aiPathRuntimeEventSchema>;
export type AiPathRuntimeEvent = AiPathRuntimeEventDto;

export const runStatusSchema = z.enum(['idle', 'running', 'paused', 'stepping']);
export type RunStatusDto = z.infer<typeof runStatusSchema>;
export type RunStatus = RunStatusDto;

export const runtimeEventInputSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  source: z.enum(['local', 'server']),
  kind: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  message: z.string(),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.union([aiPathRuntimeNodeStatusSchema, z.string()]).optional(),
  iteration: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type RuntimeEventInputDto = z.infer<typeof runtimeEventInputSchema>;
export type RuntimeEventInput = RuntimeEventInputDto;

export const setNodeStatusInputSchema = z.object({
  nodeId: z.string(),
  status: aiPathRuntimeNodeStatusSchema,
  source: z.enum(['local', 'server']),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  iteration: z.number().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  kind: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type SetNodeStatusInputDto = z.infer<typeof setNodeStatusInputSchema>;
export type SetNodeStatusInput = SetNodeStatusInputDto;

export const pathExecutionModeSchema = z.enum(['local', 'server']);
export type PathExecutionModeDto = z.infer<typeof pathExecutionModeSchema>;
export type PathExecutionMode = PathExecutionModeDto;

export const pathRunModeSchema = z.enum(['manual', 'automatic', 'step']);
export type PathRunModeDto = z.infer<typeof pathRunModeSchema>;
export type PathRunMode = PathRunModeDto;

export const runtimePortValuesSchema = z.record(z.string(), z.unknown());
export type RuntimePortValuesDto = z.infer<typeof runtimePortValuesSchema>;
export type RuntimePortValues = RuntimePortValuesDto;

export const runtimeStateSchema = z.object({
  status: runStatusSchema,
  nodeStatuses: aiPathRuntimeNodeStatusMapSchema,
  nodeOutputs: z.record(z.string(), runtimePortValuesSchema),
  variables: z.record(z.string(), z.unknown()),
  events: z.array(aiPathRuntimeEventSchema),
  currentRun: aiPathRunSchema.nullable().optional(),
  // Backward-compat fields retained for legacy local execution paths.
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  inputs: z.record(z.string(), runtimePortValuesSchema),
  outputs: z.record(z.string(), runtimePortValuesSchema),
  history: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  hashes: z.record(z.string(), z.string()).optional(),
  hashTimestamps: z.record(z.string(), z.number()).optional(),
});

export type RuntimeStateDto = z.infer<typeof runtimeStateSchema>;
export type RuntimeState = RuntimeStateDto;

export const queuedRunSchema = z.object({
  triggerNodeId: z.string(),
  pathId: z.string().nullable(),
  contextOverride: z.record(z.string(), z.unknown()).nullable().optional(),
  queuedAt: z.string(),
});

export type QueuedRunDto = z.infer<typeof queuedRunSchema>;
export type QueuedRun = QueuedRunDto;

export const aiPathRuntimeProfileEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run'),
    phase: z.enum(['start', 'end']),
    runId: z.string(),
    runStartedAt: z.string(),
    nodeCount: z.number(),
    edgeCount: z.number(),
    durationMs: z.number().optional(),
    iterationCount: z.number().optional(),
  }),
  z.object({
    type: z.literal('iteration'),
    runId: z.string(),
    runStartedAt: z.string(),
    iteration: z.number(),
    durationMs: z.number(),
    changed: z.boolean(),
  }),
  z.object({
    type: z.literal('node'),
    runId: z.string(),
    runStartedAt: z.string(),
    nodeId: z.string(),
    nodeType: z.string(),
    iteration: z.number(),
    status: z.enum(['executed', 'cached', 'skipped', 'error']),
    durationMs: z.number(),
    hashMs: z.number().optional(),
    reason: z.string().optional(),
    requiredPorts: z.array(z.string()).optional(),
    optionalPorts: z.array(z.string()).optional(),
    waitingOnPorts: z.array(z.string()).optional(),
    sideEffectPolicy: z.enum(['per_run', 'per_activation']).optional(),
    sideEffectDecision: z
      .enum(['executed', 'skipped_duplicate', 'skipped_policy', 'skipped_missing_idempotency', 'failed'])
      .optional(),
    activationHash: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }),
]);

export type AiPathRuntimeProfileEventDto = z.infer<typeof aiPathRuntimeProfileEventSchema>;

export const runtimeProfileNodeStatsSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  count: z.number(),
  totalMs: z.number(),
  maxMs: z.number(),
  cachedCount: z.number(),
  skippedCount: z.number(),
  errorCount: z.number(),
  hashCount: z.number(),
  hashTotalMs: z.number(),
  hashMaxMs: z.number(),
});

export type RuntimeProfileNodeStatsDto = z.infer<typeof runtimeProfileNodeStatsSchema>;

export const runtimeProfileSummarySchema = z.object({
  runId: z.string(),
  durationMs: z.number(),
  iterationCount: z.number(),
  nodeCount: z.number(),
  edgeCount: z.number(),
  nodes: z.array(
    runtimeProfileNodeStatsSchema.extend({
      avgMs: z.number(),
      hashAvgMs: z.number(),
    })
  ),
  hottestNodes: z.array(
    runtimeProfileNodeStatsSchema.extend({
      avgMs: z.number(),
      hashAvgMs: z.number(),
    })
  ),
});

export type RuntimeProfileSummaryDto = z.infer<typeof runtimeProfileSummarySchema>;

export const runtimeProfileOptionsSchema = z.object({
  onEvent: z
    .function({
      input: [aiPathRuntimeProfileEventSchema],
      output: z.void(),
    })
    .optional(),
  onSummary: z
    .function({
      input: [runtimeProfileSummarySchema],
      output: z.void(),
    })
    .optional(),
});

export type RuntimeProfileOptionsDto = z.infer<typeof runtimeProfileOptionsSchema>;

/**
 * AI Path Queue SLO DTOs
 */

export const sloLevelSchema = z.enum(['ok', 'warning', 'critical']);
export type SloLevelDto = z.infer<typeof sloLevelSchema>;

export const queueSloThresholdsSchema = z.object({
  queueLagWarningMs: z.number(),
  queueLagCriticalMs: z.number(),
  successRateWarningPct: z.number(),
  successRateCriticalPct: z.number(),
  deadLetterRateWarningPct: z.number(),
  deadLetterRateCriticalPct: z.number(),
  brainErrorRateWarningPct: z.number(),
  brainErrorRateCriticalPct: z.number(),
  minTerminalSamples: z.number(),
  minBrainSamples: z.number(),
});
export type QueueSloThresholdsDto = z.infer<typeof queueSloThresholdsSchema>;

export const aiPathRunQueueSloStatusSchema = z.object({
  overall: sloLevelSchema,
  evaluatedAt: z.string(),
  thresholds: queueSloThresholdsSchema,
  indicators: z.object({
    workerHealth: z.object({
      level: sloLevelSchema,
      running: z.boolean(),
      healthy: z.boolean(),
      message: z.string(),
    }),
    queueLag: z.object({
      level: sloLevelSchema,
      valueMs: z.number().nullable(),
      message: z.string(),
    }),
    successRate24h: z.object({
      level: sloLevelSchema,
      valuePct: z.number(),
      sampleSize: z.number(),
      message: z.string(),
    }),
    deadLetterRate24h: z.object({
      level: sloLevelSchema,
      valuePct: z.number(),
      sampleSize: z.number(),
      message: z.string(),
    }),
    brainErrorRate24h: z.object({
      level: sloLevelSchema,
      valuePct: z.number(),
      sampleSize: z.number(),
      message: z.string(),
    }),
  }),
  breachCount: z.number(),
  breaches: z.array(
    z.object({
      indicator: z.string(),
      level: sloLevelSchema,
      message: z.string(),
    })
  ),
});
export type AiPathRunQueueSloStatusDto = z.infer<typeof aiPathRunQueueSloStatusSchema>;

/**
 * AI Path Runtime UI and Constants
 */

export const MAX_RUNTIME_EVENTS = 300;
export const LOCAL_RUN_STEP_CHUNK = 5;
export const AI_PATHS_ENTITY_STALE_MS = 30000;

export type ToastFn = (message: unknown, options?: unknown) => void;

/**
 * AI Path Execution Node Handler Types
 */

export interface NodeHandlerContext {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues;
  edges: Edge[];
  nodes: AiNode[];
  nodeById: Map<string, AiNode>;
  runId: string;
  runStartedAt: string;
  activePathId: string | null;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  now: string;
  abortSignal?: AbortSignal | undefined;
  allOutputs: Record<string, RuntimePortValues>;
  allInputs: Record<string, RuntimePortValues>;
  fetchEntityCached: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ) => void;
  toast: ToastFn;
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedEntity: Record<string, unknown> | null;
  fallbackEntityId: string | null;
  strictFlowMode: boolean;
  sideEffectControl?: {
    policy: 'per_run' | 'per_activation';
    decision: 'executed' | 'skipped_duplicate' | 'skipped_policy' | 'skipped_missing_idempotency' | 'failed';
    activationHash: string | null;
    idempotencyKey: string | null;
  } | undefined;
  executed: {
    notification: Set<string>;
    updater: Set<string>;
    http: Set<string>;
    delay: Set<string>;
    poll: Set<string>;
    ai: Set<string>;
    schema: Set<string>;
    mapper: Set<string>;
  };
}

export type NodeHandler = (context: NodeHandlerContext) => Promise<RuntimePortValues> | RuntimePortValues;
