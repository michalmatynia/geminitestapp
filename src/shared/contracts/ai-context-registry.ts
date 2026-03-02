import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const contextNodeKindSchema = z.enum([
  'page',
  'component',
  'collection',
  'action',
  'policy',
  'event',
  'workflow',
]);
export type ContextNodeKind = z.infer<typeof contextNodeKindSchema>;

export const riskTierSchema = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export type RiskTier = z.infer<typeof riskTierSchema>;

export const dataClassificationSchema = z.enum([
  'public',
  'internal',
  'restricted',
  'secret',
]);
export type DataClassification = z.infer<typeof dataClassificationSchema>;

export const contextRelationshipTypeSchema = z.enum([
  'uses',
  'reads',
  'writes',
  'governed_by',
  'depends_on',
  'emits',
  'related_to',
]);
export type ContextRelationshipType = z.infer<typeof contextRelationshipTypeSchema>;

// ─── Permissions ──────────────────────────────────────────────────────────────

export const contextNodePermissionsSchema = z.object({
  readScopes: z.array(z.string()),
  proposeScopes: z.array(z.string()).optional(),
  executeScopes: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
  riskTier: riskTierSchema,
  classification: dataClassificationSchema,
});
export type ContextNodePermissions = z.infer<typeof contextNodePermissionsSchema>;

// ─── Relationship ─────────────────────────────────────────────────────────────

export const contextRelationshipSchema = z.object({
  type: contextRelationshipTypeSchema,
  targetId: z.string().min(1),
  cardinality: z.enum(['1:1', '1:n', 'n:m']).optional(),
  notes: z.string().optional(),
});
export type ContextRelationship = z.infer<typeof contextRelationshipSchema>;

// ─── Example ──────────────────────────────────────────────────────────────────

export const contextExampleSchema = z.object({
  title: z.string(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
});
export type ContextExample = z.infer<typeof contextExampleSchema>;

// ─── Source ───────────────────────────────────────────────────────────────────

export const contextNodeSourceSchema = z.object({
  type: z.enum(['code', 'db']),
  ref: z.string(),
});
export type ContextNodeSource = z.infer<typeof contextNodeSourceSchema>;

// ─── ContextNode ──────────────────────────────────────────────────────────────

export const contextNodeSchema = z.object({
  id: z.string().min(1),
  kind: contextNodeKindSchema,
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  owner: z.string().optional(),
  relationships: z.array(contextRelationshipSchema).optional(),
  jsonSchema2020: z.record(z.string(), z.unknown()).optional(),
  examples: z.array(contextExampleSchema).optional(),
  permissions: contextNodePermissionsSchema,
  version: z.string(),
  updatedAtISO: z.string(),
  source: contextNodeSourceSchema,
});
export type ContextNode = z.infer<typeof contextNodeSchema>;

// ─── Runtime Refs & Documents ────────────────────────────────────────────────

export const contextRegistryRefKindSchema = z.enum(['static_node', 'runtime_document']);
export type ContextRegistryRefKind = z.infer<typeof contextRegistryRefKindSchema>;

export const contextRegistryRefSchema = z.object({
  id: z.string().min(1),
  kind: contextRegistryRefKindSchema,
  providerId: z.string().min(1).optional(),
  entityType: z.string().min(1).optional(),
});
export type ContextRegistryRef = z.infer<typeof contextRegistryRefSchema>;

export const contextRuntimeDocumentSectionKindSchema = z.enum([
  'facts',
  'items',
  'events',
  'text',
]);
export type ContextRuntimeDocumentSectionKind = z.infer<
  typeof contextRuntimeDocumentSectionKindSchema
>;

export const contextRuntimeDocumentSectionSchema = z.object({
  id: z.string().min(1).optional(),
  kind: contextRuntimeDocumentSectionKindSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  text: z.string().optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ContextRuntimeDocumentSection = z.infer<typeof contextRuntimeDocumentSectionSchema>;

export const contextRuntimeDocumentTimestampsSchema = z
  .object({
    createdAt: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    finishedAt: z.string().nullable().optional(),
    deadLetteredAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .optional();
export type ContextRuntimeDocumentTimestamps = z.infer<
  typeof contextRuntimeDocumentTimestampsSchema
>;

export const contextRuntimeDocumentSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('runtime_document'),
  entityType: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  status: z.string().nullable().optional(),
  tags: z.array(z.string()),
  relatedNodeIds: z.array(z.string().min(1)),
  timestamps: contextRuntimeDocumentTimestampsSchema,
  facts: z.record(z.string(), z.unknown()).optional(),
  sections: z.array(contextRuntimeDocumentSectionSchema).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
});
export type ContextRuntimeDocument = z.infer<typeof contextRuntimeDocumentSchema>;

export const contextRegistryResolutionBundleSchema = z.object({
  refs: z.array(contextRegistryRefSchema),
  nodes: z.array(contextNodeSchema),
  documents: z.array(contextRuntimeDocumentSchema),
  truncated: z.boolean(),
  engineVersion: z.string(),
});
export type ContextRegistryResolutionBundle = z.infer<
  typeof contextRegistryResolutionBundleSchema
>;

export const contextRegistryConsumerEnvelopeSchema = z.object({
  refs: z.array(contextRegistryRefSchema),
  engineVersion: z.string(),
  resolved: contextRegistryResolutionBundleSchema.optional(),
});
export type ContextRegistryConsumerEnvelope = z.infer<
  typeof contextRegistryConsumerEnvelopeSchema
>;

// ─── Search ───────────────────────────────────────────────────────────────────

export const contextSearchRequestSchema = z.object({
  query: z.string().optional(),
  kinds: z.array(contextNodeKindSchema).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type ContextSearchRequest = z.infer<typeof contextSearchRequestSchema>;

export const contextSearchResponseSchema = z.object({
  nodes: z.array(contextNodeSchema),
  total: z.number(),
  registryVersion: z.string(),
});
export type ContextSearchResponse = z.infer<typeof contextSearchResponseSchema>;

// ─── Resolve ──────────────────────────────────────────────────────────────────

export const contextResolveRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  depth: z.number().int().min(0).max(3).optional(),
  includeSchemas: z.boolean().optional(),
  includeExamples: z.boolean().optional(),
  maxNodes: z.number().int().min(1).max(300).optional(),
});
export type ContextResolveRequest = z.infer<typeof contextResolveRequestSchema>;

export const contextResolveResponseSchema = z.object({
  nodes: z.array(contextNodeSchema),
  truncated: z.boolean(),
  visitedIds: z.array(z.string()),
  registryVersion: z.string(),
});
export type ContextResolveResponse = z.infer<typeof contextResolveResponseSchema>;

// ─── Related ──────────────────────────────────────────────────────────────────

export const contextRelatedResponseSchema = z.object({
  sourceId: z.string(),
  nodes: z.array(contextNodeSchema),
});
export type ContextRelatedResponse = z.infer<typeof contextRelatedResponseSchema>;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const contextSchemaResponseSchema = z.object({
  entity: z.string(),
  schema: z.record(z.string(), z.unknown()).nullable(),
});
export type ContextSchemaResponse = z.infer<typeof contextSchemaResponseSchema>;

// ─── Actions — Workflow ───────────────────────────────────────────────────────

export const contextWorkflowSchema = z.enum([
  'ui_analysis',
  'data_analysis',
  'content_edit',
  'admin_automation',
]);
export type ContextWorkflow = z.infer<typeof contextWorkflowSchema>;

// ─── Actions — Propose ────────────────────────────────────────────────────────

export const proposeActionRequestSchema = z.object({
  workflow: contextWorkflowSchema,
  intent: z.string().min(1).max(4000),
  rootIds: z.array(z.string().min(1)).min(1).max(25),
});
export type ProposeActionRequest = z.infer<typeof proposeActionRequestSchema>;

// ─── Actions — Execute ────────────────────────────────────────────────────────

export const executeActionRequestSchema = z.object({
  proposalId: z.string().uuid(),
  approval: z.object({
    approvedBy: z.string().min(1),
    approvedAtISO: z.string().datetime(),
    reason: z.string().max(2000).optional(),
  }),
});
export type ExecuteActionRequest = z.infer<typeof executeActionRequestSchema>;

// ─── Proposal ─────────────────────────────────────────────────────────────────

export const proposalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'executed',
  'failed',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const contextProposalSchema = z.object({
  id: z.string().uuid(),
  workflow: contextWorkflowSchema,
  intent: z.string(),
  rootIds: z.array(z.string()),
  status: proposalStatusSchema,
  approvalsNeeded: z.boolean(),
  preview: z.object({
    summary: z.string(),
    impactedNodeIds: z.array(z.string()),
  }),
  createdAt: z.string(),
  executedAt: z.string().optional(),
  approvedBy: z.string().optional(),
});
export type ContextProposal = z.infer<typeof contextProposalSchema>;

// ─── Context Pack ─────────────────────────────────────────────────────────────
// TypeScript interface only — has a function member (buildSeedContext), not Zod-serializable.

export interface ContextPack {
  id: string;
  description: string;
  maxSteps: number;
  maxNodes: number;
  maxBytes: number;
  allowedKinds: ContextNodeKind[];
  systemPrompt: string;
  buildSeedContext(rootIds: string[]): string;
}
