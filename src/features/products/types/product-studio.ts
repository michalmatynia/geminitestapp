export type ProductStudioSequenceGenerationMode =
  | 'studio_prompt_then_sequence'
  | 'model_full_sequence'
  | 'studio_native_sequencer_prior_generation'
  | 'auto';

export type ProductStudioExecutionRoute =
  | 'studio_sequencer'
  | 'studio_native_sequencer_prior_generation'
  | 'ai_model_full_sequence'
  | 'ai_direct_generation';

export type ProductStudioSequencingDiagnosticsScope =
  | 'project'
  | 'global'
  | 'default';

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE: ProductStudioSequenceGenerationMode =
  'auto';

export type ProductStudioSequencingConfig = {
  persistedEnabled: boolean;
  enabled: boolean;
  cropCenterBeforeGeneration: boolean;
  upscaleOnAccept: boolean;
  upscaleScale: number;
  runViaSequence: boolean;
  sequenceStepCount: number;
  expectedOutputs: number;
  snapshotHash: string | null;
  snapshotSavedAt: string | null;
  snapshotStepCount: number;
  snapshotModelId: string | null;
  currentSnapshotHash: string | null;
  snapshotMatchesCurrent: boolean;
  needsSaveDefaults: boolean;
  needsSaveDefaultsReason: string | null;
};

export type ProductStudioSequencingDiagnostics = {
  projectId: string | null;
  projectSettingsKey: string | null;
  selectedSettingsKey: string | null;
  selectedScope: ProductStudioSequencingDiagnosticsScope;
  hasProjectSettings: boolean;
  hasGlobalSettings: boolean;
  projectSequencingEnabled: boolean;
  globalSequencingEnabled: boolean;
  selectedSequencingEnabled: boolean;
  selectedSnapshotHash: string | null;
  selectedSnapshotSavedAt: string | null;
  selectedSnapshotStepCount: number;
  selectedSnapshotModelId: string | null;
};

export const DEFAULT_PRODUCT_STUDIO_SEQUENCING: ProductStudioSequencingConfig = {
  persistedEnabled: false,
  enabled: false,
  cropCenterBeforeGeneration: true,
  upscaleOnAccept: true,
  upscaleScale: 2,
  runViaSequence: false,
  sequenceStepCount: 0,
  expectedOutputs: 1,
  snapshotHash: null,
  snapshotSavedAt: null,
  snapshotStepCount: 0,
  snapshotModelId: null,
  currentSnapshotHash: null,
  snapshotMatchesCurrent: false,
  needsSaveDefaults: false,
  needsSaveDefaultsReason: null,
};

export const DEFAULT_PRODUCT_STUDIO_SEQUENCING_DIAGNOSTICS: ProductStudioSequencingDiagnostics = {
  projectId: null,
  projectSettingsKey: null,
  selectedSettingsKey: null,
  selectedScope: 'default',
  hasProjectSettings: false,
  hasGlobalSettings: false,
  projectSequencingEnabled: false,
  globalSequencingEnabled: false,
  selectedSequencingEnabled: false,
  selectedSnapshotHash: null,
  selectedSnapshotSavedAt: null,
  selectedSnapshotStepCount: 0,
  selectedSnapshotModelId: null,
};

const asObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const clampUpscaleScale = (value: number): number => {
  const clamped = Math.max(1.1, Math.min(8, value));
  return Number(clamped.toFixed(2));
};

export function normalizeProductStudioSequenceGenerationMode(
  input: unknown
): ProductStudioSequenceGenerationMode {
  if (typeof input !== 'string') {
    return DEFAULT_PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE;
  }
  const normalized = input.trim();
  if (normalized === 'model_full_sequence') return 'model_full_sequence';
  if (normalized === 'studio_native_sequencer_prior_generation') {
    return 'studio_native_sequencer_prior_generation';
  }
  if (normalized === 'auto') return 'auto';
  if (normalized === 'studio_prompt_then_sequence') {
    return 'studio_prompt_then_sequence';
  }
  return DEFAULT_PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE;
}

export function normalizeProductStudioSequencing(
  input: unknown
): ProductStudioSequencingConfig {
  const record = asObjectRecord(input);
  if (!record) return { ...DEFAULT_PRODUCT_STUDIO_SEQUENCING };

  const enabled = typeof record['enabled'] === 'boolean'
    ? record['enabled']
    : DEFAULT_PRODUCT_STUDIO_SEQUENCING.enabled;
  const cropCenterBeforeGeneration =
    typeof record['cropCenterBeforeGeneration'] === 'boolean'
      ? record['cropCenterBeforeGeneration']
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.cropCenterBeforeGeneration;
  const upscaleOnAccept =
    typeof record['upscaleOnAccept'] === 'boolean'
      ? record['upscaleOnAccept']
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.upscaleOnAccept;

  let upscaleScale = DEFAULT_PRODUCT_STUDIO_SEQUENCING.upscaleScale;
  const rawScale = record['upscaleScale'];
  if (typeof rawScale === 'number' && Number.isFinite(rawScale)) {
    upscaleScale = clampUpscaleScale(rawScale);
  }

  const runViaSequence =
    typeof record['runViaSequence'] === 'boolean'
      ? record['runViaSequence']
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.runViaSequence;

  let sequenceStepCount = DEFAULT_PRODUCT_STUDIO_SEQUENCING.sequenceStepCount;
  const rawStepCount = record['sequenceStepCount'];
  if (typeof rawStepCount === 'number' && Number.isFinite(rawStepCount)) {
    sequenceStepCount = Math.max(0, Math.floor(rawStepCount));
  }

  let expectedOutputs = DEFAULT_PRODUCT_STUDIO_SEQUENCING.expectedOutputs;
  const rawExpectedOutputs = record['expectedOutputs'];
  if (typeof rawExpectedOutputs === 'number' && Number.isFinite(rawExpectedOutputs)) {
    expectedOutputs = Math.max(1, Math.min(10, Math.floor(rawExpectedOutputs)));
  }

  const persistedEnabled =
    typeof record['persistedEnabled'] === 'boolean'
      ? record['persistedEnabled']
      : enabled;

  const snapshotHash =
    typeof record['snapshotHash'] === 'string' && record['snapshotHash'].trim().length > 0
      ? record['snapshotHash'].trim()
      : null;
  const snapshotSavedAt =
    typeof record['snapshotSavedAt'] === 'string' &&
      record['snapshotSavedAt'].trim().length > 0
      ? record['snapshotSavedAt'].trim()
      : null;
  const snapshotStepCount =
    typeof record['snapshotStepCount'] === 'number' && Number.isFinite(record['snapshotStepCount'])
      ? Math.max(0, Math.floor(record['snapshotStepCount']))
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.snapshotStepCount;
  const snapshotModelId =
    typeof record['snapshotModelId'] === 'string' &&
      record['snapshotModelId'].trim().length > 0
      ? record['snapshotModelId'].trim()
      : null;
  const currentSnapshotHash =
    typeof record['currentSnapshotHash'] === 'string' &&
      record['currentSnapshotHash'].trim().length > 0
      ? record['currentSnapshotHash'].trim()
      : null;
  const snapshotMatchesCurrent =
    typeof record['snapshotMatchesCurrent'] === 'boolean'
      ? record['snapshotMatchesCurrent']
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.snapshotMatchesCurrent;
  const needsSaveDefaults =
    typeof record['needsSaveDefaults'] === 'boolean'
      ? record['needsSaveDefaults']
      : DEFAULT_PRODUCT_STUDIO_SEQUENCING.needsSaveDefaults;
  const needsSaveDefaultsReason =
    typeof record['needsSaveDefaultsReason'] === 'string' &&
      record['needsSaveDefaultsReason'].trim().length > 0
      ? record['needsSaveDefaultsReason'].trim()
      : null;

  return {
    persistedEnabled,
    enabled,
    cropCenterBeforeGeneration,
    upscaleOnAccept,
    upscaleScale,
    runViaSequence,
    sequenceStepCount,
    expectedOutputs,
    snapshotHash,
    snapshotSavedAt,
    snapshotStepCount,
    snapshotModelId,
    currentSnapshotHash,
    snapshotMatchesCurrent,
    needsSaveDefaults,
    needsSaveDefaultsReason,
  };
}
