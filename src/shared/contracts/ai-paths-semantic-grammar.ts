import { z } from 'zod';

import { aiNodeTypeSchema, aiPathsValidationConfigSchema } from './ai-paths';

export const aiPathsSemanticSpecVersionSchema = z.literal('ai-paths.semantic-grammar.v1');
export type AiPathsSemanticSpecVersionDto = z.infer<typeof aiPathsSemanticSpecVersionSchema>;

export const semanticPortBindingSchema = z.object({
  edgeId: z.string().optional(),
  fromNodeId: z.string(),
  fromPort: z.string().nullable().optional(),
  toNodeId: z.string(),
  toPort: z.string().nullable().optional(),
});
export type SemanticPortBindingDto = z.infer<typeof semanticPortBindingSchema>;

export const semanticNodeConnectionsSchema = z.object({
  incoming: z.array(semanticPortBindingSchema),
  outgoing: z.array(semanticPortBindingSchema),
});
export type SemanticNodeConnectionsDto = z.infer<typeof semanticNodeConnectionsSchema>;

export const semanticNodeSchema = z.object({
  id: z.string(),
  type: aiNodeTypeSchema,
  title: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  config: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
  connections: semanticNodeConnectionsSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type SemanticNodeDto = z.infer<typeof semanticNodeSchema>;

export const semanticEdgeSchema = z.object({
  id: z.string(),
  fromNodeId: z.string(),
  toNodeId: z.string(),
  fromPort: z.string().nullable().optional(),
  toPort: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type SemanticEdgeDto = z.infer<typeof semanticEdgeSchema>;

export const semanticPathDescriptorSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  description: z.string(),
  trigger: z.string(),
  updatedAt: z.string(),
  executionMode: z.string().optional(),
  flowIntensity: z.string().optional(),
  runMode: z.string().optional(),
  strictFlowMode: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type SemanticPathDescriptorDto = z.infer<typeof semanticPathDescriptorSchema>;

export const semanticExecutionDescriptorSchema = z.object({
  parserSamples: z.record(z.string(), z.unknown()).optional(),
  updaterSamples: z.record(z.string(), z.unknown()).optional(),
  runtimeState: z.unknown().optional(),
  lastRunAt: z.string().nullable().optional(),
  runCount: z.number().optional(),
});
export type SemanticExecutionDescriptorDto = z.infer<typeof semanticExecutionDescriptorSchema>;

export const semanticProvenanceSchema = z.object({
  source: z.literal('ai-paths'),
  exportedAt: z.string(),
  pathId: z.string().optional(),
  exporterVersion: z.string().optional(),
  workspace: z.string().optional(),
});
export type SemanticProvenanceDto = z.infer<typeof semanticProvenanceSchema>;

export const semanticBoundarySchema = z.object({
  incoming: z.array(semanticPortBindingSchema),
  outgoing: z.array(semanticPortBindingSchema),
});
export type SemanticBoundaryDto = z.infer<typeof semanticBoundarySchema>;

export const canvasSemanticDocumentSchema = z.object({
  specVersion: aiPathsSemanticSpecVersionSchema,
  kind: z.literal('canvas'),
  path: semanticPathDescriptorSchema,
  nodes: z.array(semanticNodeSchema),
  edges: z.array(semanticEdgeSchema),
  execution: semanticExecutionDescriptorSchema.optional(),
  validation: aiPathsValidationConfigSchema.optional(),
  provenance: semanticProvenanceSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CanvasSemanticDocumentDto = z.infer<typeof canvasSemanticDocumentSchema>;

export const subgraphSemanticDocumentSchema = z.object({
  specVersion: aiPathsSemanticSpecVersionSchema,
  kind: z.literal('subgraph'),
  pathId: z.string().optional(),
  selectedNodeIds: z.array(z.string()),
  nodes: z.array(semanticNodeSchema),
  edges: z.array(semanticEdgeSchema),
  boundary: semanticBoundarySchema,
  provenance: semanticProvenanceSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type SubgraphSemanticDocumentDto = z.infer<typeof subgraphSemanticDocumentSchema>;

export const semanticDocumentSchema = z.discriminatedUnion('kind', [
  canvasSemanticDocumentSchema,
  subgraphSemanticDocumentSchema,
]);
export type SemanticDocumentDto = z.infer<typeof semanticDocumentSchema>;
