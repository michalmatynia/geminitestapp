export * from './base';
export * from './nodes';

import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { aiNodeTypeSchema } from './base';
import { nodeConfigSchema, nodePortContractSchema } from './nodes';

/**
 * AI Path Node Contract
 */
export const aiNodeSchema = dtoBaseSchema.extend({
  type: aiNodeTypeSchema,
  nodeTypeId: z.string().optional(),
  instanceId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).optional(),
  config: nodeConfigSchema.optional(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
});

export type AiNodeDto = z.infer<typeof aiNodeSchema>;
export type AiNode = AiNodeDto;

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

export const edgeSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  fromPort: z.string().nullable().optional(),
  toPort: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

export interface EdgeDto {
  id: string;
  createdAt?: string | undefined;
  updatedAt?: string | null | undefined;
  source?: string | undefined;
  target?: string | undefined;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
  type?: string | undefined;
  data?: Record<string, unknown> | undefined;
  from?: string | undefined;
  to?: string | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
  label?: string | null | undefined;
}

export type Edge = EdgeDto;

export const createAiEdgeSchema = aiEdgeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiEdgeDto = z.infer<typeof createAiEdgeSchema>;
export type UpdateAiEdgeDto = Partial<CreateAiEdgeDto>;

/**
 * AI Path Composite & Domain DTOs
 */

export const nodeDefinitionSchema = z.object({
  type: aiNodeTypeSchema,
  nodeTypeId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  inputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  outputContracts: z.record(z.string(), nodePortContractSchema).optional(),
  config: nodeConfigSchema.optional(),
});

export type NodeDefinitionDto = z.infer<typeof nodeDefinitionSchema>;
export type NodeDefinition = NodeDefinitionDto;
