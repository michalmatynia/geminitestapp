export type ProductStudioSequenceGenerationMode =
  | 'studio_prompt_then_sequence'
  | 'model_full_sequence';

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE: ProductStudioSequenceGenerationMode =
  'studio_prompt_then_sequence';

export type ProductStudioSequencingConfig = {
  enabled: boolean;
  cropCenterBeforeGeneration: boolean;
  upscaleOnAccept: boolean;
  upscaleScale: number;
  runViaSequence: boolean;
  sequenceStepCount: number;
  expectedOutputs: number;
};

export const DEFAULT_PRODUCT_STUDIO_SEQUENCING: ProductStudioSequencingConfig = {
  enabled: false,
  cropCenterBeforeGeneration: true,
  upscaleOnAccept: true,
  upscaleScale: 2,
  runViaSequence: false,
  sequenceStepCount: 0,
  expectedOutputs: 1,
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

  return {
    enabled,
    cropCenterBeforeGeneration,
    upscaleOnAccept,
    upscaleScale,
    runViaSequence,
    sequenceStepCount,
    expectedOutputs,
  };
}
