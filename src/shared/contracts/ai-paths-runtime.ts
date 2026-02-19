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
