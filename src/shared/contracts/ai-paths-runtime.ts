import { z } from 'zod';
import { dtoBaseSchema } from './base';
import type { AiNode, Edge } from './ai-paths-core';

/**
 * AI Path Node Status
 */
export const aiPathNodeStatusSchema = z.enum([
  'idle',
  'queued',
  'running',
  'completed',
  'cached',
  'failed',
  'canceled',
  'cancelled', // Legacy support
  'skipped',
  'blocked',
  'pending',
  'processing',
  'polling',
  'waiting_callback',
  'advance_pending',
  'timeout',
]);

export type AiPathNodeStatus = z.infer<typeof aiPathNodeStatusSchema>;
export type AiPathNodeStatusDto = AiPathNodeStatus;

// Alias for compatibility
export const aiPathRuntimeNodeStatusSchema = aiPathNodeStatusSchema;
export type AiPathRuntimeNodeStatus = AiPathNodeStatus;

export const NON_SETTLED_RUNTIME_NODE_STATUSES = new Set<AiPathRuntimeNodeStatus>([
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

export const TRANSIENT_RUNTIME_NODE_STATUSES = new Set<AiPathRuntimeNodeStatus>([
  'queued',
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export const IDLE_REHYDRATION_BLOCKED_NODE_STATUSES = new Set<AiPathRuntimeNodeStatus>([
  'completed',
  'cached',
  'canceled',
  'cancelled',
]);

export const aiPathRuntimeNodeStatusMapSchema = z.record(z.string(), aiPathNodeStatusSchema);

export type AiPathRuntimeNodeStatusMap = z.infer<typeof aiPathRuntimeNodeStatusMapSchema>;

/**
 * AI Path Run Status
 */
export const aiPathRunStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);

export type AiPathRunStatus = z.infer<typeof aiPathRunStatusSchema>;
export type AiPathRunStatusDto = AiPathRunStatus;

/**
 * AI Path Run Contract
 */
export const aiPathRunSchema = dtoBaseSchema.extend({
  pathId: z.string().nullable().optional(),
  pathName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  status: aiPathRunStatusSchema,
  triggerNodeId: z.string().nullable().optional(),
  triggerEvent: z.string().nullable().optional(),
  triggerContext: z.record(z.string(), z.unknown()).nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  tools: z.array(z.string()).optional(),
  searchProvider: z.string().nullable().optional(),
  agentBrowser: z.string().nullable().optional(),
  runHeadless: z.boolean().optional(),
  logLines: z.array(z.string()).optional(),
  requiresHumanIntervention: z.boolean().optional(),
  memoryKey: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  deadLetteredAt: z.string().nullable().optional(),
  retryCount: z.number().nullable().optional(),
  maxAttempts: z.number().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  entityId: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
});

export type AiPathRunDto = z.infer<typeof aiPathRunSchema>;

/**
 * AI Path Runtime Event Contract
 */
export const aiPathRuntimeEventKindSchema = z.enum(['log', 'status', 'error', 'output']);
export type AiPathRuntimeEventKind = z.infer<typeof aiPathRuntimeEventKindSchema>;

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
  status: z.union([aiPathNodeStatusSchema, z.string()]).optional(),
  iteration: z.number().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathRuntimeEvent = z.infer<typeof aiPathRuntimeEventSchema>;

export const runStatusSchema = z.enum([
  'idle',
  'running',
  'paused',
  'stepping',
  'completed',
  'failed',
]);
export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunStatusDto = RunStatus;

export const runtimeEventInputSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  type: aiPathRuntimeEventKindSchema.optional(),
  source: z.enum(['local', 'server']),
  kind: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  message: z.string(),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.union([aiPathNodeStatusSchema, z.string()]).optional(),
  iteration: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type RuntimeEventInput = z.infer<typeof runtimeEventInputSchema>;
export type RuntimeEventInputDto = RuntimeEventInput;

export const setNodeStatusInputSchema = z.object({
  nodeId: z.string(),
  status: aiPathNodeStatusSchema,
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

export type SetNodeStatusInput = z.infer<typeof setNodeStatusInputSchema>;
export type SetNodeStatusInputDto = SetNodeStatusInput;

export const pathExecutionModeSchema = z.enum(['local', 'server']);
export type PathExecutionMode = z.infer<typeof pathExecutionModeSchema>;

export const pathRunModeSchema = z.enum(['manual', 'automatic', 'step']);
export type PathRunMode = z.infer<typeof pathRunModeSchema>;

export const runtimePortValuesSchema = z.record(z.string(), z.unknown());
export type RuntimePortValues = z.infer<typeof runtimePortValuesSchema>;

export const runtimeHistoryLinkSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string().nullable(),
  nodeTitle: z.string().nullable(),
  fromPort: z.string().nullable(),
  toPort: z.string().nullable(),
});

export type RuntimeHistoryLink = z.infer<typeof runtimeHistoryLinkSchema>;

export const runtimeHistoryEntrySchema = z.object({
  timestamp: z.string(),
  runId: z.string().nullable().optional(),
  runStartedAt: z.string().nullable().optional(),
  pathId: z.string().nullable(),
  pathName: z.string().nullable(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable(),
  status: z.string(),
  iteration: z.number(),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  inputHash: z.string().nullable(),
  skipReason: z.string().optional(),
  requiredPorts: z.array(z.string()).optional(),
  optionalPorts: z.array(z.string()).optional(),
  waitingOnPorts: z.array(z.string()).optional(),
  sideEffectPolicy: z.enum(['per_run', 'per_activation']).optional(),
  sideEffectDecision: z.string().optional(),
  activationHash: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  error: z.string().optional(),
  inputsFrom: z.array(runtimeHistoryLinkSchema).optional().default([]),
  outputsTo: z.array(runtimeHistoryLinkSchema).optional().default([]),
  delayMs: z.number().nullable().optional(),
  durationMs: z.number().nullable().optional(),
});

export type RuntimeHistoryEntry = z.infer<typeof runtimeHistoryEntrySchema>;

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
  history: z.record(z.string(), z.array(runtimeHistoryEntrySchema)).optional(),
  hashes: z.record(z.string(), z.string()).optional(),
  hashTimestamps: z.record(z.string(), z.number()).optional(),
  nodeDurations: z.record(z.string(), z.number()).optional(),
});

export type RuntimeState = z.infer<typeof runtimeStateSchema> & {
  history?: Record<string, RuntimeHistoryEntry[]> | undefined;
  hashes?: Record<string, string> | undefined;
  hashTimestamps?: Record<string, number> | undefined;
  /** Engine-measured execution duration (ms) per node ID for the last run */
  nodeDurations?: Record<string, number> | undefined;
};

export const queuedRunSchema = z.object({
  triggerNodeId: z.string(),
  pathId: z.string().nullable(),
  contextOverride: z.record(z.string(), z.unknown()).nullable().optional(),
  queuedAt: z.string(),
});

export type QueuedRun = z.infer<typeof queuedRunSchema>;
export type QueuedRunDto = QueuedRun;

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
      .enum([
        'executed',
        'skipped_duplicate',
        'skipped_policy',
        'skipped_missing_idempotency',
        'failed',
      ])
      .optional(),
    activationHash: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }),
]);

export type AiPathRuntimeProfileEvent = z.infer<typeof aiPathRuntimeProfileEventSchema>;

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

export type RuntimeProfileNodeStats = z.infer<typeof runtimeProfileNodeStatsSchema>;

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

export type RuntimeProfileSummary = z.infer<typeof runtimeProfileSummarySchema>;
export type AiPathRuntimeProfileEventDto = AiPathRuntimeProfileEvent;
export type RuntimeProfileNodeStatsDto = RuntimeProfileNodeStats;
export type RuntimeProfileSummaryDto = RuntimeProfileSummary;

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

export type RuntimeProfileOptions = z.infer<typeof runtimeProfileOptionsSchema>;

/**
 * AI Path Queue SLO DTOs
 */

export const sloLevelSchema = z.enum(['ok', 'warning', 'critical']);
export type SloLevel = z.infer<typeof sloLevelSchema>;

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
export type QueueSloThresholds = z.infer<typeof queueSloThresholdsSchema>;

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
export type AiPathRunQueueSloStatus = z.infer<typeof aiPathRunQueueSloStatusSchema>;
export type SloLevelDto = SloLevel;
export type QueueSloThresholdsDto = QueueSloThresholds;
export type AiPathRunQueueSloStatusDto = AiPathRunQueueSloStatus;

/**
 * AI Path Queue Health & Status DTOs
 */

export type AiPathRunQueueBaseStatus = {
  running: boolean;
  healthy: boolean;
  activeCount: number;
  activeRuns: number;
  waitingCount: number;
  failedCount: number;
  completedCount: number;
  delayedCount: number;
  pausedCount: number;
  queuedCount: number;
  oldestQueuedAt: string | number | null;
  queueLagMs: number | null;
  completedLastMinute: number;
  throughputPerMinute: number;
  avgRuntimeMs: number | null;
  p50RuntimeMs: number | null;
  p95RuntimeMs: number | null;
  runtimeAnalytics: {
    enabled: boolean;
    storage: string;
  } | null;
  brainQueue: {
    running: boolean;
    healthy: boolean;
    processing: boolean;
    activeJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
};

export type AiPathRunQueueStatus = AiPathRunQueueBaseStatus & {
  lastCheckedAt: string;
  lastPollTime: number;
  isStale: boolean;
  sloStatus: AiPathRunQueueSloStatus;
  brainAnalytics24h: {
    analyticsReports: number;
    logReports: number;
    totalReports: number;
    warningReports: number;
    errorReports: number;
  };
};

/**
 * AI Path Runtime UI and Constants
 */

export const MAX_RUNTIME_EVENTS = 300;
export const LOCAL_RUN_STEP_CHUNK = 5;
export const AI_PATHS_ENTITY_STALE_MS = 30000;

export type ToastFn = (message: string, options?: Record<string, unknown>) => void;

/**
 * AI Path Execution Node Handler Types
 */

export interface NodeHandlerContext {
  node: AiNode;
  nodeInputs: Record<string, unknown>; // RuntimePortValues
  prevOutputs: Record<string, unknown>; // RuntimePortValues
  edges: Edge[];
  nodes: AiNode[];
  nodeById: Map<string, AiNode>;
  runId: string;
  runStartedAt: string;
  runMeta?: Record<string, unknown> | null | undefined;
  activePathId: string | null;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  now: string;
  abortSignal?: AbortSignal | undefined;
  allOutputs: Record<string, Record<string, unknown>>;
  allInputs: Record<string, Record<string, unknown>>;
  fetchEntityCached: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => void;
  toast: ToastFn;
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedEntity: Record<string, unknown> | null;
  fallbackEntityId: string | null;
  strictFlowMode: boolean;
  sideEffectControl?:
    | {
        policy: 'per_run' | 'per_activation';
        decision:
          | 'executed'
          | 'skipped_duplicate'
          | 'skipped_policy'
          | 'skipped_missing_idempotency'
          | 'failed';
        activationHash: string | null;
        idempotencyKey: string | null;
      }
    | undefined;
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
  variables: Record<string, unknown>;
  setVariable: (key: string, value: unknown) => void;
}

export type NodeHandler = (
  context: NodeHandlerContext
) => Promise<Record<string, unknown>> | Record<string, unknown>;
