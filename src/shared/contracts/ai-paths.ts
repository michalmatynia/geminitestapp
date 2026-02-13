import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * AI Path Node Types
 */
export const aiNodeTypeSchema = z.enum([
  'trigger',
  'simulation',
  'context',
  'audio_oscillator',
  'audio_speaker',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
]);

export type AiNodeTypeDto = z.infer<typeof aiNodeTypeSchema>;

/**
 * AI Path Node Contract
 */
export const aiNodeSchema = dtoBaseSchema.extend({
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
  config: z.record(z.string(), z.unknown()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
});

export type AiNodeDto = z.infer<typeof aiNodeSchema>;

export const createAiNodeSchema = aiNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiNodeDto = z.infer<typeof createAiNodeSchema>;
export type UpdateAiNodeDto = Partial<CreateAiNodeDto>;

/**
 * AI Path Edge Contract
 */
export const aiEdgeSchema = dtoBaseSchema.extend({
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export type AiEdgeDto = z.infer<typeof aiEdgeSchema>;

export const createAiEdgeSchema = aiEdgeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiEdgeDto = z.infer<typeof createAiEdgeSchema>;
export type UpdateAiEdgeDto = Partial<CreateAiEdgeDto>;

/**
 * AI Path Contract
 */
export const aiPathSchema = namedDtoSchema.extend({
  nodes: z.array(aiNodeSchema),
  edges: z.array(aiEdgeSchema),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  version: z.number(),
});

export type AiPathDto = z.infer<typeof aiPathSchema>;

export const createAiPathSchema = aiPathSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiPathDto = z.infer<typeof createAiPathSchema>;
export type UpdateAiPathDto = Partial<CreateAiPathDto>;

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

export type AiPathRunStatusDto = z.infer<typeof aiPathRunStatusSchema>;

/**
 * AI Path Run Contract
 */
export const aiPathRunSchema = dtoBaseSchema.extend({
  pathId: z.string().nullable().optional(),
  pathName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
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
 * AI Path Node Status
 */
export const aiPathNodeStatusSchema = z.enum([
  'idle',
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
  'skipped',
  'blocked',
  'pending',
]);

export type AiPathNodeStatusDto = z.infer<typeof aiPathNodeStatusSchema>;

/**
 * AI Path Run Node Contract
 */
export const aiPathRunNodeSchema = dtoBaseSchema.extend({
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable().optional(),
  status: aiPathNodeStatusSchema,
  attempt: z.number(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type AiPathRunNodeDto = z.infer<typeof aiPathRunNodeSchema>;

/**
 * AI Path Presets Contracts
 */
export const aiClusterPresetSchema = namedDtoSchema.extend({
  bundlePorts: z.array(z.string()),
  template: z.string(),
});

export type AiClusterPresetDto = z.infer<typeof aiClusterPresetSchema>;

export const aiDbQueryPresetSchema = namedDtoSchema.extend({
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
});

export type AiDbQueryPresetDto = z.infer<typeof aiDbQueryPresetSchema>;

export const aiDbNodePresetSchema = namedDtoSchema.extend({
  config: z.record(z.string(), z.unknown()),
});

export type AiDbNodePresetDto = z.infer<typeof aiDbNodePresetSchema>;

/**
 * Execution Contract
 */
export const executeAiPathSchema = z.object({
  pathId: z.string(),
  triggerNodeId: z.string().optional(),
  triggerEvent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAiPathDto = z.infer<typeof executeAiPathSchema>;
