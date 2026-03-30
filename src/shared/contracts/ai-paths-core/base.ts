import { z } from 'zod';

/**
 * AI Path Node Types
 */
export const aiNodeTypeSchema = z.enum([
  'trigger',
  'fetcher',
  'simulation',
  'context',
  'function',
  'state',
  'switch',
  'audio_oscillator',
  'audio_speaker',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'logical_condition',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'playwright',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'document',
  'scanfile',
  'viewer',
  'notification',
  'bounds_normalizer',
  'canvas_output',
  'subgraph',
]);

export type AiNodeTypeDto = z.infer<typeof aiNodeTypeSchema>;
export type NodeType = AiNodeTypeDto;

/**
 * Canvas UI Types
 */
export type SvgDetailLevel = 'full' | 'compact' | 'skeleton';

export const aiPathsValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type AiPathsValidationSeverity = z.infer<typeof aiPathsValidationSeveritySchema>;

export const aiPathsValidationModuleSchema = z.enum([
  'graph',
  'trigger',
  'simulation',
  'context',
  'parser',
  'database',
  'model',
  'poll',
  'router',
  'gate',
  'validation_pattern',
  'custom',
]);
export type AiPathsValidationModule = z.infer<typeof aiPathsValidationModuleSchema>;

export const aiPathsValidationOperatorSchema = z.enum([
  'exists',
  'non_empty',
  'equals',
  'in',
  'matches_regex',
  'wired_from',
  'wired_to',
  'has_incoming_port',
  'has_outgoing_port',
  'jsonpath_exists',
  'jsonpath_equals',
  'collection_exists',
  'entity_collection_resolves',
  'edge_endpoints_resolve',
  'edge_ports_declared',
  'node_types_known',
  'node_ids_unique',
  'edge_ids_unique',
  'node_positions_finite',
  'tooltip_exists',
]);
export type AiPathsValidationOperator = z.infer<typeof aiPathsValidationOperatorSchema>;

export const aiPathsValidationConditionSchema = z.object({
  id: z.string(),
  operator: aiPathsValidationOperatorSchema,
  field: z.string().optional(),
  valuePath: z.string().optional(),
  expected: z.unknown().optional(),
  list: z.array(z.string()).optional(),
  flags: z.string().optional(),
  port: z.string().optional(),
  fromPort: z.string().optional(),
  toPort: z.string().optional(),
  fromNodeType: z.string().optional(),
  toNodeType: z.string().optional(),
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  collectionMapKey: z.string().optional(),
  negate: z.boolean().optional(),
});
export type AiPathsValidationCondition = z.infer<typeof aiPathsValidationConditionSchema>;

export const aiPathsValidationStageSchema = z.enum([
  'graph_parse',
  'graph_bind',
  'node_pre_execute',
  'node_post_execute',
]);
export type AiPathsValidationStage = z.infer<typeof aiPathsValidationStageSchema>;

export const aiPathsValidationRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  severity: aiPathsValidationSeveritySchema,
  module: aiPathsValidationModuleSchema,
  appliesToNodeTypes: z.array(z.string()).optional(),
  appliesToStages: z.array(aiPathsValidationStageSchema).optional(),
  sequence: z.number().optional(),
  conditionMode: z.enum(['all', 'any']).optional(),
  conditions: z.array(aiPathsValidationConditionSchema).min(1),
  weight: z.number().optional(),
  forceProbabilityIfFailed: z.number().optional(),
  recommendation: z.string().optional(),
  docsBindings: z.array(z.string()).optional(),
  inference: z
    .object({
      sourceType: z.enum(['manual', 'central_docs']).optional(),
      status: z.enum(['candidate', 'approved', 'rejected', 'deprecated']).optional(),
      assertionId: z.string().optional(),
      sourcePath: z.string().optional(),
      sourceHash: z.string().optional(),
      docsSnapshotHash: z.string().optional(),
      confidence: z.number().optional(),
      compilerVersion: z.string().optional(),
      inferredAt: z.string().optional(),
      approvedAt: z.string().optional(),
      approvedBy: z.string().optional(),
      reviewNote: z.string().optional(),
      tags: z.array(z.string()).optional(),
      deprecates: z.array(z.string()).optional(),
    })
    .optional(),
});
export type AiPathsValidationRule = z.infer<typeof aiPathsValidationRuleSchema>;

/**
 * Audio Node Types
 */
export type AudioWaveform = 'sine' | 'square' | 'triangle' | 'sawtooth';
