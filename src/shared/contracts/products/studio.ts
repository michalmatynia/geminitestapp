import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
export const productStudioSequenceGenerationModeSchema = z.enum([
  'studio_prompt_then_sequence',
  'model_full_sequence',
  'studio_native_sequencer_prior_generation',
  'auto',
]);

export type ProductStudioSequenceGenerationMode = z.infer<
  typeof productStudioSequenceGenerationModeSchema
>;

export const productStudioExecutionRouteSchema = z.enum([
  'studio_sequencer',
  'studio_native_sequencer_prior_generation',
  'ai_model_full_sequence',
  'ai_direct_generation',
]);

export type ProductStudioExecutionRoute = z.infer<typeof productStudioExecutionRouteSchema>;

export const productStudioSequencingDiagnosticsScopeSchema = z.enum([
  'project',
  'global',
  'default',
]);

export type ProductStudioSequencingDiagnosticsScope = z.infer<
  typeof productStudioSequencingDiagnosticsScopeSchema
>;

export const productStudioSequenceReadinessStateSchema = z.enum([
  'ready',
  'project_settings_missing',
  'project_sequence_disabled',
  'project_steps_empty',
  'project_snapshot_stale',
]);

export type ProductStudioSequenceReadinessState = z.infer<
  typeof productStudioSequenceReadinessStateSchema
>;

export const productStudioSequencingConfigSchema = z.object({
  persistedEnabled: z.boolean(),
  enabled: z.boolean(),
  cropCenterBeforeGeneration: z.boolean(),
  upscaleOnAccept: z.boolean(),
  upscaleScale: z.number(),
  runViaSequence: z.boolean(),
  sequenceStepCount: z.number(),
  expectedOutputs: z.number(),
  snapshotHash: z.string().nullable(),
  snapshotSavedAt: z.string().nullable(),
  snapshotStepCount: z.number(),
  snapshotModelId: z.string().nullable(),
  currentSnapshotHash: z.string().nullable(),
  snapshotMatchesCurrent: z.boolean(),
  needsSaveDefaults: z.boolean(),
  needsSaveDefaultsReason: z.string().nullable(),
});

export type ProductStudioSequencingConfig = z.infer<typeof productStudioSequencingConfigSchema>;

export const productStudioSequencingDiagnosticsSchema = z.object({
  projectId: z.string().nullable(),
  projectSettingsKey: z.string().nullable(),
  selectedSettingsKey: z.string().nullable(),
  selectedScope: productStudioSequencingDiagnosticsScopeSchema,
  hasProjectSettings: z.boolean(),
  hasGlobalSettings: z.boolean(),
  projectSequencingEnabled: z.boolean(),
  globalSequencingEnabled: z.boolean(),
  selectedSequencingEnabled: z.boolean(),
  selectedSnapshotHash: z.string().nullable(),
  selectedSnapshotSavedAt: z.string().nullable(),
  selectedSnapshotStepCount: z.number(),
  selectedSnapshotModelId: z.string().nullable(),
});

export type ProductStudioSequencingDiagnostics = z.infer<
  typeof productStudioSequencingDiagnosticsSchema
>;

export const productStudioSequenceReadinessSchema = z.object({
  ready: z.boolean(),
  requiresProjectSequence: z.boolean(),
  state: productStudioSequenceReadinessStateSchema,
  message: z.string().nullable(),
});

export type ProductStudioSequenceReadiness = z.infer<typeof productStudioSequenceReadinessSchema>;

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS: ProductStudioSequenceReadiness = {
  ready: false,
  requiresProjectSequence: false,
  state: 'project_settings_missing',
  message: 'Loading...',
};

export type ProductStudioSequenceStepType =
  | 'crop_center'
  | 'mask'
  | 'generate'
  | 'regenerate'
  | 'upscale';

export interface ProductStudioSequenceStepPlanEntry {
  index: number;
  stepId: string;
  stepType: ProductStudioSequenceStepType;
  inputSource: 'previous' | 'source';
  resolvedInput: 'previous' | 'source';
  producesOutput: boolean;
}

export function normalizeProductStudioSequenceGenerationMode(
  value: unknown
): ProductStudioSequenceGenerationMode {
  if (
    value === 'studio_prompt_then_sequence' ||
    value === 'model_full_sequence' ||
    value === 'studio_native_sequencer_prior_generation' ||
    value === 'auto'
  ) {
    return value;
  }
  return 'auto';
}

export const productStudioRotateRequestSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  direction: z.enum(['left', 'right']),
});

export type ProductStudioRotateRequest = z.infer<typeof productStudioRotateRequestSchema>;

export const productStudioAcceptRequestSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  generationSlotId: z.string().trim().min(1),
  projectId: z.string().trim().nullable().optional(),
});

export type ProductStudioAcceptRequest = z.infer<typeof productStudioAcceptRequestSchema>;

export const productStudioSendRequestSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  projectId: z.string().trim().nullable().optional(),
  rotateBeforeSendDeg: z.literal(90).nullable().optional(),
  sequenceGenerationMode: productStudioSequenceGenerationModeSchema.optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ProductStudioSendRequest = z.infer<typeof productStudioSendRequestSchema>;

export const productStudioLinkRequestSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  projectId: z.string().trim().nullable().optional(),
  rotateBeforeSendDeg: z.literal(90).nullable().optional(),
});

export type ProductStudioLinkRequest = z.infer<typeof productStudioLinkRequestSchema>;

/**
 * Product Draft Contracts
 */
