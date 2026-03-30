import { z } from 'zod';

export const constantConfigSchema = z.object({
  value: z.string().optional(),
  valueType: z.string().optional(),
});

export type ConstantConfigDto = z.infer<typeof constantConfigSchema>;
export type ConstantConfig = ConstantConfigDto;

export const delayConfigSchema = z.object({
  ms: z.number(),
});

export type DelayConfigDto = z.infer<typeof delayConfigSchema>;
export type DelayConfig = DelayConfigDto;

export const stateConfigSchema = z.object({
  key: z.string().optional(),
  mode: z.enum(['read', 'write', 'increment']).optional(),
  initialJson: z.string().optional(),
  maxValueBytes: z.number().int().min(1024).max(512_000).optional(),
  expectedType: z.enum(['string', 'number', 'boolean', 'object', 'array']).optional(),
});

export type StateConfigDto = z.infer<typeof stateConfigSchema>;
export type StateConfig = StateConfigDto;

export const subgraphConfigSchema = z.object({
  pathId: z.string().optional(),
  subgraphName: z.string().optional(),
  triggerNodeId: z.string().optional(),
  inputMappingJson: z.string().optional(),
  outputMappingJson: z.string().optional(),
});

export type SubgraphConfigDto = z.infer<typeof subgraphConfigSchema>;
export type SubgraphConfig = SubgraphConfigDto;

export const validationPatternConfigSchema = z.object({
  pattern: z.string().optional(),
  source: z.string().optional(),
  stackId: z.string().optional(),
  scope: z.string().optional(),
  includeLearnedRules: z.boolean().optional(),
  runtimeMode: z.string().optional(),
  failPolicy: z.string().optional(),
  inputPort: z.string().optional(),
  outputPort: z.string().optional(),
  maxAutofixPasses: z.number().optional(),
  includeRuleIds: z.array(z.string()).optional(),
  localListName: z.string().optional(),
  localListDescription: z.string().optional(),
  rules: z.array(z.unknown()).optional(),
  learnedRules: z.array(z.unknown()).optional(),
});

export type ValidationPatternConfigDto = z.infer<typeof validationPatternConfigSchema>;
export type ValidationPatternConfig = ValidationPatternConfigDto;

export const pollConfigSchema = z.object({
  intervalMs: z.number(),
  maxAttempts: z.number(),
  mode: z.enum(['job', 'database']).optional(),
  dbQuery: z.any().optional(), // To be typed if needed, circular with db-nodes
  successPath: z.string().optional(),
  successOperator: z.enum(['truthy', 'equals', 'contains', 'notEquals']).optional(),
  successValue: z.string().optional(),
  resultPath: z.string().optional(),
});

export type PollConfigDto = z.infer<typeof pollConfigSchema>;
export type PollConfig = PollConfigDto;
