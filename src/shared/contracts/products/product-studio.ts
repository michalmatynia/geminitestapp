import { z } from 'zod';

export const productStudioSequenceGenerationModeSchema = z.enum([
  'studio_prompt_then_sequence',
  'model_full_sequence',
  'studio_native_sequencer_prior_generation',
  'auto',
]);

export type ProductStudioSequenceGenerationModeDto = z.infer<typeof productStudioSequenceGenerationModeSchema>;
export type ProductStudioSequenceGenerationMode = ProductStudioSequenceGenerationModeDto;

export const productStudioExecutionRouteSchema = z.enum([
  'studio_sequencer',
  'studio_native_sequencer_prior_generation',
  'ai_model_full_sequence',
  'ai_direct_generation',
]);

export type ProductStudioExecutionRouteDto = z.infer<typeof productStudioExecutionRouteSchema>;
export type ProductStudioExecutionRoute = ProductStudioExecutionRouteDto;

export const productStudioSequencingDiagnosticsScopeSchema = z.enum(['project', 'global', 'default']);

export type ProductStudioSequencingDiagnosticsScopeDto = z.infer<typeof productStudioSequencingDiagnosticsScopeSchema>;

export const productStudioSequenceReadinessStateSchema = z.enum([
  'ready',
  'project_settings_missing',
  'project_sequence_disabled',
  'project_steps_empty',
  'project_snapshot_stale',
]);

export type ProductStudioSequenceReadinessStateDto = z.infer<typeof productStudioSequenceReadinessStateSchema>;

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

export type ProductStudioSequencingConfigDto = z.infer<typeof productStudioSequencingConfigSchema>;
export type ProductStudioSequencingConfig = ProductStudioSequencingConfigDto;

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

export type ProductStudioSequencingDiagnosticsDto = z.infer<typeof productStudioSequencingDiagnosticsSchema>;
export type ProductStudioSequencingDiagnostics = ProductStudioSequencingDiagnosticsDto;

export const productStudioSequenceReadinessSchema = z.object({
  ready: z.boolean(),
  requiresProjectSequence: z.boolean(),
  state: productStudioSequenceReadinessStateSchema,
  message: z.string().nullable(),
});

export type ProductStudioSequenceReadinessDto = z.infer<typeof productStudioSequenceReadinessSchema>;
export type ProductStudioSequenceReadiness = ProductStudioSequenceReadinessDto;

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS: ProductStudioSequenceReadiness = {
  ready: false,
  requiresProjectSequence: false,
  state: 'project_settings_missing',
  message: 'Loading...',
};

export function normalizeProductStudioSequenceGenerationMode(value: unknown): ProductStudioSequenceGenerationMode {
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
