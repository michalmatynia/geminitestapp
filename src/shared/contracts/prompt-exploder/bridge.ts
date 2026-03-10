import { z } from 'zod';

import {
  promptExploderCaseResolverPartyBundleSchema,
  promptExploderCaseResolverMetadataSchema,
  type PromptExploderCaseResolverPartyBundle,
  type PromptExploderCaseResolverMetadata,
} from './case-resolver';

export const promptExploderBridgePayloadStatusSchema = z.enum([
  'pending',
  'applied',
  'dismissed',
  'failed',
]);
export type PromptExploderBridgePayloadStatus = z.infer<
  typeof promptExploderBridgePayloadStatusSchema
>;

export const promptExploderBridgeSourceSchema = z.enum([
  'manual',
  'auto',
  'external',
  'draft',
  'template',
  'sequence',
  'qa_matrix',
  'prompt-exploder',
  'image-studio',
  'case-resolver',
]);
export type PromptExploderBridgeSource = z.infer<typeof promptExploderBridgeSourceSchema>;
export const PROMPT_EXPLODER_CANONICAL_BRIDGE_SOURCES: readonly PromptExploderBridgeSource[] =
  promptExploderBridgeSourceSchema.options;

export const promptExploderBridgeTargetSchema = z.enum([
  'image-studio',
  'case-resolver',
  'external',
  'clipboard',
  'file',
  'prompt-exploder',
]);
export type PromptExploderBridgeTarget = z.infer<typeof promptExploderBridgeTargetSchema>;
export const PROMPT_EXPLODER_CANONICAL_BRIDGE_TARGETS: readonly PromptExploderBridgeTarget[] =
  promptExploderBridgeTargetSchema.options;

export const promptExploderCaseResolverContextSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string().optional(),
  sessionId: z.string().optional(),
  documentVersionAtStart: z.number().optional(),
});

export interface PromptExploderCaseResolverContext {
  fileId?: string | undefined;
  fileName?: string | undefined;
  sessionId?: string | undefined;
  documentVersionAtStart?: number | undefined;
}

export const promptExploderBridgePayloadSchema = z.object({
  prompt: z.string(),
  source: promptExploderBridgeSourceSchema,
  target: promptExploderBridgeTargetSchema,
  createdAt: z.string(),
  transferId: z.string().optional(),
  payloadVersion: z.number().optional(),
  expiresAt: z.string().optional(),
  status: promptExploderBridgePayloadStatusSchema.optional(),
  appliedAt: z.string().optional(),
  checksum: z.string().optional(),
  caseResolverContext: promptExploderCaseResolverContextSchema.optional(),
  caseResolverParties: promptExploderCaseResolverPartyBundleSchema.optional(),
  caseResolverMetadata: promptExploderCaseResolverMetadataSchema.optional(),
});

export interface PromptExploderBridgePayload {
  prompt: string;
  source: PromptExploderBridgeSource;
  target: PromptExploderBridgeTarget;
  createdAt: string;
  transferId?: string | undefined;
  payloadVersion?: number | undefined;
  expiresAt?: string | undefined;
  status?: PromptExploderBridgePayloadStatus | undefined;
  appliedAt?: string | undefined;
  checksum?: string | undefined;
  caseResolverContext?: PromptExploderCaseResolverContext | undefined;
  caseResolverParties?: PromptExploderCaseResolverPartyBundle | undefined;
  caseResolverMetadata?: PromptExploderCaseResolverMetadata | undefined;
}

export type PromptExploderBridgePayloadSnapshot = {
  payload: PromptExploderBridgePayload | null;
  isExpired: boolean;
  expiresAt: string | null;
};

export type PromptExploderBridgeSaveOptions = {
  transferId?: string | null | undefined;
  createdAt?: string | null | undefined;
  expiresAt?: string | null | undefined;
  payloadVersion?: number | null | undefined;
  checksum?: string | null | undefined;
  status?: PromptExploderBridgePayloadStatus | null | undefined;
  appliedAt?: string | null | undefined;
};
