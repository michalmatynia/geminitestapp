import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import { imageStudioRunDispatchModeSchema } from '@/shared/contracts/image-studio/run';
import { imageStudioSlotSchema } from '@/shared/contracts/image-studio/slot';
import { productWithImagesSchema } from './product';
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

export const productStudioSequenceStepTypeSchema = z.enum([
  'crop_center',
  'mask',
  'generate',
  'regenerate',
  'upscale',
]);

export type ProductStudioSequenceStepType = z.infer<typeof productStudioSequenceStepTypeSchema>;

export const productStudioSequenceStepPlanEntrySchema = z.object({
  index: z.number(),
  stepId: z.string(),
  stepType: productStudioSequenceStepTypeSchema,
  inputSource: z.enum(['previous', 'source']),
  resolvedInput: z.enum(['previous', 'source']),
  producesOutput: z.boolean(),
});

export type ProductStudioSequenceStepPlanEntry = z.infer<
  typeof productStudioSequenceStepPlanEntrySchema
>;

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

export const productStudioConfigSchema = z.object({
  projectId: z.string().nullable(),
  sourceSlotByImageIndex: z.record(z.string(), z.string()),
  sourceSlotHistoryByImageIndex: z.record(z.string(), z.array(z.string())),
  updatedAt: z.string(),
});

export type ProductStudioConfig = z.infer<typeof productStudioConfigSchema>;

export const productStudioConfigResponseSchema = z.object({
  config: productStudioConfigSchema,
});

export type ProductStudioConfigResponse = z.infer<typeof productStudioConfigResponseSchema>;

export const productStudioVariantsResponseSchema = z.object({
  config: productStudioConfigSchema,
  sequencing: productStudioSequencingConfigSchema,
  sequencingDiagnostics: productStudioSequencingDiagnosticsSchema,
  sequenceReadiness: productStudioSequenceReadinessSchema,
  sequenceStepPlan: z.array(productStudioSequenceStepPlanEntrySchema),
  sequenceGenerationMode: productStudioSequenceGenerationModeSchema,
  projectId: z.string().nullable(),
  sourceSlotId: z.string().nullable(),
  sourceSlot: imageStudioSlotSchema.nullable(),
  variants: z.array(imageStudioSlotSchema),
});

export type ProductStudioVariantsResponse = z.infer<typeof productStudioVariantsResponseSchema>;

export const productStudioRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type ProductStudioRunStatus = z.infer<typeof productStudioRunStatusSchema>;

export const productStudioRunKindSchema = z.enum(['generation', 'sequence']);
export type ProductStudioRunKind = z.infer<typeof productStudioRunKindSchema>;

export const productStudioRunAuditStatusSchema = z.enum(['completed', 'failed']);
export type ProductStudioRunAuditStatus = z.infer<typeof productStudioRunAuditStatusSchema>;

export const productStudioCropRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type ProductStudioCropRect = z.infer<typeof productStudioCropRectSchema>;

export const productStudioSourceImageSizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});

export type ProductStudioSourceImageSize = z.infer<typeof productStudioSourceImageSizeSchema>;

export const productStudioRunAuditTimingsSchema = z.object({
  importMs: z.number().nullable(),
  sourceSlotUpsertMs: z.number().nullable(),
  routeDecisionMs: z.number().nullable(),
  dispatchMs: z.number().nullable(),
  totalMs: z.number(),
});

export type ProductStudioRunAuditTimings = z.infer<typeof productStudioRunAuditTimingsSchema>;

export const productStudioAuditEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  status: productStudioRunAuditStatusSchema,
  imageSlotIndex: z.number(),
  executionRoute: productStudioExecutionRouteSchema,
  requestedSequenceMode: productStudioSequenceGenerationModeSchema,
  resolvedSequenceMode: productStudioSequenceGenerationModeSchema,
  runKind: productStudioRunKindSchema,
  runId: z.string().nullable(),
  sequenceRunId: z.string().nullable(),
  dispatchMode: imageStudioRunDispatchModeSchema.nullable(),
  fallbackReason: z.string().nullable(),
  warnings: z.array(z.string()),
  settingsScope: productStudioSequencingDiagnosticsScopeSchema,
  settingsKey: z.string().nullable(),
  projectSettingsKey: z.string().nullable(),
  settingsScopeValid: z.boolean(),
  sequenceSnapshotHash: z.string().nullable(),
  stepOrderUsed: z.array(z.string()),
  resolvedCropRect: productStudioCropRectSchema.nullable(),
  sourceImageSize: productStudioSourceImageSizeSchema.nullable(),
  timings: productStudioRunAuditTimingsSchema,
  errorMessage: z.string().nullable(),
});

export type ProductStudioAuditEntry = z.infer<typeof productStudioAuditEntrySchema>;

export const productStudioAuditResponseSchema = z.object({
  entries: z.array(productStudioAuditEntrySchema),
});

export type ProductStudioAuditResponse = z.infer<typeof productStudioAuditResponseSchema>;

export const productStudioLinkResponseSchema = z.object({
  config: productStudioConfigSchema,
  projectId: z.string(),
  imageSlotIndex: z.number(),
  sourceSlot: imageStudioSlotSchema,
});

export type ProductStudioLinkResponse = z.infer<typeof productStudioLinkResponseSchema>;

export const productStudioSendResponseSchema = z.object({
  config: productStudioConfigSchema,
  sequencing: productStudioSequencingConfigSchema,
  sequencingDiagnostics: productStudioSequencingDiagnosticsSchema,
  sequenceReadiness: productStudioSequenceReadinessSchema,
  sequenceStepPlan: z.array(productStudioSequenceStepPlanEntrySchema),
  projectId: z.string(),
  imageSlotIndex: z.number(),
  sourceSlot: imageStudioSlotSchema,
  runId: z.string(),
  runStatus: productStudioRunStatusSchema,
  expectedOutputs: z.number(),
  dispatchMode: imageStudioRunDispatchModeSchema,
  runKind: productStudioRunKindSchema,
  sequenceRunId: z.string().nullable(),
  requestedSequenceMode: productStudioSequenceGenerationModeSchema,
  resolvedSequenceMode: productStudioSequenceGenerationModeSchema,
  executionRoute: productStudioExecutionRouteSchema,
  warnings: z.array(z.string()).optional(),
});

export type ProductStudioSendResponse = z.infer<typeof productStudioSendResponseSchema>;

export const productStudioPreflightResponseSchema = z.object({
  config: productStudioConfigSchema,
  projectId: z.string(),
  imageSlotIndex: z.number(),
  sequenceStepPlan: z.array(productStudioSequenceStepPlanEntrySchema),
  sequenceGenerationMode: productStudioSequenceGenerationModeSchema,
  requestedSequenceMode: productStudioSequenceGenerationModeSchema,
  resolvedSequenceMode: productStudioSequenceGenerationModeSchema,
  executionRoute: productStudioExecutionRouteSchema,
  sequencing: productStudioSequencingConfigSchema,
  sequencingDiagnostics: productStudioSequencingDiagnosticsSchema,
  sequenceReadiness: productStudioSequenceReadinessSchema,
  modelId: z.string(),
  warnings: z.array(z.string()),
});

export type ProductStudioPreflightResponse = z.infer<typeof productStudioPreflightResponseSchema>;

export const productStudioProductResponseSchema = z.object({
  product: productWithImagesSchema,
});

export type ProductStudioProductResponse = z.infer<typeof productStudioProductResponseSchema>;

/**
 * Product Draft Contracts
 */
