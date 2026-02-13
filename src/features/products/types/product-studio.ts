export type ProductStudioSequencingConfig = {
  enabled: boolean;
  cropCenterBeforeGeneration: boolean;
  upscaleOnAccept: boolean;
  upscaleScale: number;
};

export const DEFAULT_PRODUCT_STUDIO_SEQUENCING: ProductStudioSequencingConfig = {
  enabled: false,
  cropCenterBeforeGeneration: true,
  upscaleOnAccept: true,
  upscaleScale: 2,
};

const asObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const clampUpscaleScale = (value: number): number => {
  const clamped = Math.max(1.1, Math.min(8, value));
  return Number(clamped.toFixed(2));
};

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

  return {
    enabled,
    cropCenterBeforeGeneration,
    upscaleOnAccept,
    upscaleScale,
  };
}
