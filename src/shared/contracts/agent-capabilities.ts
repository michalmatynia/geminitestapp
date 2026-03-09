import { z } from 'zod';

export const AgentCapabilityEffectSchema = z.enum([
  'observe',
  'propose',
  'safe_write',
  'leased_mutation',
  'approval_required',
  'operator_only',
]);

export type AgentCapabilityEffect = z.infer<typeof AgentCapabilityEffectSchema>;

export const AgentSurfaceKindSchema = z.enum([
  'api',
  'script',
  'service',
  'runtime',
  'documentation',
]);

export type AgentSurfaceKind = z.infer<typeof AgentSurfaceKindSchema>;

export const AgentCapabilityMaturitySchema = z.enum([
  'available',
  'partial',
  'planned',
]);

export type AgentCapabilityMaturity = z.infer<
  typeof AgentCapabilityMaturitySchema
>;

export const AgentLeaseModeSchema = z.enum([
  'exclusive',
  'shared-read',
  'append-only',
  'partitioned',
]);

export type AgentLeaseMode = z.infer<typeof AgentLeaseModeSchema>;

export const AgentLeaseStatusSchema = z.enum([
  'available',
  'leased',
  'blocked',
  'recoverable',
]);

export type AgentLeaseStatus = z.infer<typeof AgentLeaseStatusSchema>;

export const AgentRuntimeLeaseDescriptorSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  mode: AgentLeaseModeSchema,
  requiresLease: z.boolean(),
  status: AgentLeaseStatusSchema.optional(),
  ownerAgentEnvKeys: z.array(z.string().min(1)).default([]),
  leaseMs: z.number().int().positive().nullable().default(null),
  heartbeatMs: z.number().int().positive().nullable().default(null),
  staleAfterMs: z.number().int().positive().nullable().default(null),
  recovery: z.string().min(1).optional(),
  entrypoints: z.array(z.string().min(1)).default([]),
});

export type AgentRuntimeLeaseDescriptor = z.infer<
  typeof AgentRuntimeLeaseDescriptorSchema
>;

export const ApprovalGateDescriptorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  requiredFor: z.array(z.string().min(1)).default([]),
  policy: z.string().min(1),
});

export type ApprovalGateDescriptor = z.infer<
  typeof ApprovalGateDescriptorSchema
>;

export const ForwardOnlyExecutionPolicySchema = z.object({
  eventLog: z.enum(['append-only', 'best-effort']),
  checkpoints: z.enum(['required', 'recommended', 'optional']),
  resourceClaims: z.enum(['required', 'recommended', 'optional']),
  handoff: z.enum(['required', 'supported', 'not_supported']),
  mutationPolicy: z.enum(['forward-only', 'mixed']),
  conflictPolicy: z.string().min(1),
  notes: z.array(z.string().min(1)).default([]),
});

export type ForwardOnlyExecutionPolicy = z.infer<
  typeof ForwardOnlyExecutionPolicySchema
>;

export const AgentCapabilityDescriptorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  surface: AgentSurfaceKindSchema,
  maturity: AgentCapabilityMaturitySchema,
  effects: z.array(AgentCapabilityEffectSchema).min(1),
  forwardOnly: z.boolean(),
  approvalGateIds: z.array(z.string().min(1)).default([]),
  entrypoints: z.array(z.string().min(1)).default([]),
  resources: z.array(z.string().min(1)).default([]),
  concurrencyNotes: z.array(z.string().min(1)).default([]),
});

export type AgentCapabilityDescriptor = z.infer<
  typeof AgentCapabilityDescriptorSchema
>;

export const AgentCapabilityManifestSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().datetime(),
  summary: z.string().min(1),
  executionModel: ForwardOnlyExecutionPolicySchema,
  resources: z.array(AgentRuntimeLeaseDescriptorSchema),
  approvalGates: z.array(ApprovalGateDescriptorSchema),
  capabilities: z.array(AgentCapabilityDescriptorSchema),
  recommendedWorkflow: z.array(z.string().min(1)).default([]),
  discovery: z.object({
    apiRoute: z.string().min(1),
    docs: z.array(z.string().min(1)).default([]),
  }),
});

export type AgentCapabilityManifest = z.infer<
  typeof AgentCapabilityManifestSchema
>;
