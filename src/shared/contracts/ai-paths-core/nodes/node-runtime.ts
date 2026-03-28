import { z } from 'zod';

export const nodeCacheModeSchema = z.enum(['auto', 'force', 'disabled']);
export type NodeCacheModeDto = z.infer<typeof nodeCacheModeSchema>;
export type NodeCacheMode = NodeCacheModeDto;

export const nodeCacheScopeSchema = z.enum(['run', 'activation', 'session']);
export type NodeCacheScopeDto = z.infer<typeof nodeCacheScopeSchema>;
export type NodeCacheScope = NodeCacheScopeDto;

export const nodeSideEffectPolicySchema = z.enum(['per_run', 'per_activation']);
export type NodeSideEffectPolicyDto = z.infer<typeof nodeSideEffectPolicySchema>;
export type NodeSideEffectPolicy = NodeSideEffectPolicyDto;

export const nodePortCardinalitySchema = z.enum(['single', 'many']);
export type NodePortCardinalityDto = z.infer<typeof nodePortCardinalitySchema>;
export type NodePortCardinality = NodePortCardinalityDto;

export const nodePortValueKindSchema = z.enum([
  'unknown',
  'string',
  'number',
  'boolean',
  'json',
  'image_url',
  'bundle',
  'job_envelope',
]);
export type NodePortValueKindDto = z.infer<typeof nodePortValueKindSchema>;
export type NodePortValueKind = NodePortValueKindDto;

export const NODE_PORT_VALUE_KIND_VALUES: readonly NodePortValueKind[] =
  nodePortValueKindSchema.options;

const NODE_PORT_VALUE_KIND_SET: ReadonlySet<NodePortValueKind> = new Set(
  NODE_PORT_VALUE_KIND_VALUES
);

export const normalizeNodePortValueKind = (value: unknown): NodePortValueKind | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_') as NodePortValueKind;
  return NODE_PORT_VALUE_KIND_SET.has(normalized) ? normalized : null;
};

export const nodePortContractSchema = z.object({
  required: z.boolean().optional(),
  cardinality: nodePortCardinalitySchema.optional(),
  kind: nodePortValueKindSchema.optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  schemaRef: z.string().optional(),
});
export type NodePortContractDto = z.infer<typeof nodePortContractSchema>;
export type NodePortContract = NodePortContractDto;

export const nodeRuntimeConfigSchema = z.object({
  cache: z
    .object({
      mode: nodeCacheModeSchema.optional(),
      scope: nodeCacheScopeSchema.optional(),
      ttlMs: z.number().optional(),
    })
    .optional(),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  inputCardinality: z.record(z.string(), nodePortCardinalitySchema).optional(),
  waitForInputs: z.boolean().optional(),
  sideEffectPolicy: nodeSideEffectPolicySchema.optional(),
  timeoutMs: z.number().optional(),
  retry: z
    .object({
      attempts: z.number().optional(),
      backoffMs: z.number().optional(),
    })
    .optional(),
});

export type NodeRuntimeConfigDto = z.infer<typeof nodeRuntimeConfigSchema>;
