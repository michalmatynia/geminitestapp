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
  message: z.string(),
  nodeId: z.string().optional(),
  nodeType: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AiPathRuntimeEventDto = z.infer<typeof aiPathRuntimeEventSchema>;

export const pathExecutionModeSchema = z.enum(['local', 'server']);
export type PathExecutionModeDto = z.infer<typeof pathExecutionModeSchema>;

export const pathRunModeSchema = z.enum(['manual', 'automatic', 'step']);
export type PathRunModeDto = z.infer<typeof pathRunModeSchema>;

export const runtimePortValuesSchema = z.record(z.string(), z.unknown());
export type RuntimePortValuesDto = z.infer<typeof runtimePortValuesSchema>;

export const runtimeStateSchema = z.object({
  status: z.enum(['idle', 'running', 'paused', 'stepping']),
  nodeStatuses: aiPathRuntimeNodeStatusMapSchema,
  nodeOutputs: z.record(z.string(), runtimePortValuesSchema),
  variables: z.record(z.string(), z.unknown()),
  events: z.array(aiPathRuntimeEventSchema),
  currentRun: aiPathRunSchema.nullable().optional(),
});

export type RuntimeStateDto = z.infer<typeof runtimeStateSchema>;

export const queuedRunSchema = z.object({
  triggerNodeId: z.string(),
  pathId: z.string().nullable(),
  contextOverride: z.record(z.string(), z.unknown()).nullable().optional(),
  queuedAt: z.string(),
});

export type QueuedRunDto = z.infer<typeof queuedRunSchema>;
