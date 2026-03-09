import { z } from 'zod';

import {
  AgentLeaseModeSchema,
  AgentRuntimeLeaseDescriptorSchema,
} from './agent-capabilities';

export const AgentLeaseRecordStatusSchema = z.enum([
  'active',
  'expired',
  'released',
  'conflicted',
]);

export type AgentLeaseRecordStatus = z.infer<
  typeof AgentLeaseRecordStatusSchema
>;

export const AgentLeaseRecordSchema = z.object({
  leaseId: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.string().min(1),
  ownerAgentId: z.string().min(1),
  ownerRunId: z.string().min(1).nullable().default(null),
  mode: AgentLeaseModeSchema,
  status: AgentLeaseRecordStatusSchema,
  leaseMs: z.number().int().positive(),
  heartbeatMs: z.number().int().positive().nullable().default(null),
  claimedAt: z.string().datetime(),
  heartbeatAt: z.string().datetime().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
  releasedAt: z.string().datetime().nullable().default(null),
  releaseReason: z.string().min(1).nullable().default(null),
});

export type AgentLeaseRecord = z.infer<typeof AgentLeaseRecordSchema>;

export const AgentLeaseEventKindSchema = z.enum([
  'claimed',
  'renewed',
  'released',
  'expired',
  'conflicted',
]);

export type AgentLeaseEventKind = z.infer<typeof AgentLeaseEventKindSchema>;

export const AgentLeaseEventSchema = z.object({
  eventId: z.string().min(1),
  kind: AgentLeaseEventKindSchema,
  resourceId: z.string().min(1),
  leaseId: z.string().min(1).nullable().default(null),
  timestamp: z.string().datetime(),
  ownerAgentId: z.string().min(1).nullable().default(null),
  ownerRunId: z.string().min(1).nullable().default(null),
  summary: z.string().min(1),
});

export type AgentLeaseEvent = z.infer<typeof AgentLeaseEventSchema>;

export const AgentLeaseStateSchema = z.object({
  resource: AgentRuntimeLeaseDescriptorSchema,
  supported: z.boolean(),
  activeLease: AgentLeaseRecordSchema.nullable(),
  recentEvents: z.array(AgentLeaseEventSchema).default([]),
});

export type AgentLeaseState = z.infer<typeof AgentLeaseStateSchema>;

export const AgentLeaseMutationActionSchema = z.enum([
  'claim',
  'renew',
  'release',
]);

export type AgentLeaseMutationAction = z.infer<
  typeof AgentLeaseMutationActionSchema
>;

export const AgentLeaseMutationRequestSchema = z.object({
  action: AgentLeaseMutationActionSchema,
  resourceId: z.string().min(1),
  ownerAgentId: z.string().min(1),
  ownerRunId: z.string().min(1).nullable().optional(),
  leaseId: z.string().min(1).optional(),
  leaseMs: z.number().int().positive().optional(),
  reason: z.string().min(1).optional(),
});

export type AgentLeaseMutationRequest = z.infer<
  typeof AgentLeaseMutationRequestSchema
>;

export const AgentLeaseMutationCodeSchema = z.enum([
  'claimed',
  'renewed',
  'released',
  'conflict',
  'not_found',
  'unsupported',
]);

export type AgentLeaseMutationCode = z.infer<
  typeof AgentLeaseMutationCodeSchema
>;

export const AgentLeaseMutationResultSchema = z.object({
  ok: z.boolean(),
  code: AgentLeaseMutationCodeSchema,
  message: z.string().min(1),
  state: AgentLeaseStateSchema.nullable().default(null),
  lease: AgentLeaseRecordSchema.nullable().default(null),
  conflictingLease: AgentLeaseRecordSchema.nullable().default(null),
  event: AgentLeaseEventSchema.nullable().default(null),
});

export type AgentLeaseMutationResult = z.infer<
  typeof AgentLeaseMutationResultSchema
>;
