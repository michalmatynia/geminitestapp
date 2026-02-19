import { z } from 'zod';

import { aiPathRunSchema } from './ai-paths';

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

export const aiPathRuntimeNodeStatusMapSchema = z.record(z.string(), aiPathRuntimeNodeStatusSchema);

export type AiPathRuntimeNodeStatusMapDto = z.infer<typeof aiPathRuntimeNodeStatusMapSchema>;

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

export const runStatusSchema = z.enum(['idle', 'running', 'paused', 'stepping']);
export type RunStatusDto = z.infer<typeof runStatusSchema>;

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

export const pathExecutionModeSchema = z.enum(['local', 'server']);
export type PathExecutionModeDto = z.infer<typeof pathExecutionModeSchema>;

export const pathRunModeSchema = z.enum(['manual', 'automatic', 'step']);
export type PathRunModeDto = z.infer<typeof pathRunModeSchema>;

export const runtimePortValuesSchema = z.record(z.string(), z.unknown());
export type RuntimePortValuesDto = z.infer<typeof runtimePortValuesSchema>;

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
  inputs: z.record(z.string(), runtimePortValuesSchema).optional(),
  outputs: z.record(z.string(), runtimePortValuesSchema).optional(),
  history: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  hashes: z.record(z.string(), z.string()).optional(),
  hashTimestamps: z.record(z.string(), z.number()).optional(),
});

export type RuntimeStateDto = z.infer<typeof runtimeStateSchema>;

export const queuedRunSchema = z.object({
  triggerNodeId: z.string(),
  pathId: z.string().nullable(),
  contextOverride: z.record(z.string(), z.unknown()).nullable().optional(),
  queuedAt: z.string(),
});

export type QueuedRunDto = z.infer<typeof queuedRunSchema>;

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
  onEvent: z.function().args(aiPathRuntimeProfileEventSchema).returns(z.void()).optional(),
  onSummary: z.function().args(runtimeProfileSummarySchema).returns(z.void()).optional(),
});

export type RuntimeProfileOptionsDto = z.infer<typeof runtimeProfileOptionsSchema>;
