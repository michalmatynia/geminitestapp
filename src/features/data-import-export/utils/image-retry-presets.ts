import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';

const clonePreset = (preset: ImageRetryPreset): ImageRetryPreset => ({
  ...preset,
  transform: { ...preset.transform },
});

export const DEFAULT_IMAGE_RETRY_PRESETS: ImageRetryPreset[] = [
  {
    id: 'lower-dimension',
    name: 'Lower max dimension (1200px)',
    description: 'Resize down to 1200px and convert to JPEG.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, maxDimension: 1200, jpegQuality: 85, width: 1200, height: 1200 },
  },
  {
    id: 'lower-quality',
    name: 'Lower JPEG quality (70)',
    description: 'Compress harder without resizing.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, jpegQuality: 70 },
  },
  {
    id: 'lower-both',
    name: 'Lower dimension + quality (1200px, 70)',
    description: 'Resize and compress for maximum compatibility.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, maxDimension: 1200, jpegQuality: 70, width: 1200, height: 1200 },
  },
].map(clonePreset);

export const getDefaultImageRetryPresets = (): ImageRetryPreset[] =>
  DEFAULT_IMAGE_RETRY_PRESETS.map(clonePreset);

export const buildImageRetryPresetLabel = (preset: ImageRetryPreset): string => {
  const { maxDimension, jpegQuality } = preset.transform;
  const dim = maxDimension !== undefined ? String(maxDimension) : 'auto';
  const qual = jpegQuality !== undefined ? String(jpegQuality) : 'auto';

  if (preset.id === 'lower-dimension') return `Lower max dimension (${dim}px)`;
  if (preset.id === 'lower-quality') return `Lower JPEG quality (${qual})`;
  if (preset.id === 'lower-both') return `Lower dimension + quality (${dim}px, ${qual})`;

  const trimmedName = preset.name.trim();
  return trimmedName.length > 0 ? trimmedName : 'Image retry preset';
};

const getPresetDescription = (presetId: string, dimLabel: string, qualLabel: string): string | null => {
  if (presetId === 'lower-dimension') return `Resize down to ${dimLabel} and convert to JPEG.`;
  if (presetId === 'lower-quality') return `Compress to quality ${qualLabel} without resizing.`;
  if (presetId === 'lower-both') return `Resize to ${dimLabel} and compress to ${qualLabel} for maximum compatibility.`;
  return null;
};

export const buildImageRetryPresetDescription = (preset: ImageRetryPreset): string => {
  const { maxDimension, jpegQuality } = preset.transform;
  const dimLabel = maxDimension !== undefined ? `${maxDimension}px` : 'your target size';
  const qualLabel = jpegQuality !== undefined ? String(jpegQuality) : 'your';

  const desc = getPresetDescription(preset.id, dimLabel, qualLabel);
  if (desc !== null) return desc;

  const trimmedDesc = preset.description.trim();
  return trimmedDesc.length > 0 ? trimmedDesc : 'Adjust image export settings.';
};



export const withImageRetryPresetLabels = (preset: ImageRetryPreset): ImageRetryPreset => ({
  ...preset,
  name: buildImageRetryPresetLabel(preset),
  description: buildImageRetryPresetDescription(preset),
});

const resolvePresetName = (
  record: Partial<ImageRetryPreset> & { label?: string },
  fallback: ImageRetryPreset | undefined
): string => {
  if (typeof record.name === 'string' && record.name.trim().length > 0) {
    return record.name;
  }
  if (typeof record.label === 'string' && record.label.trim().length > 0) {
    return record.label;
  }
  return fallback?.name ?? 'Image retry preset';
};

const resolvePresetDescription = (
  description: unknown,
  fallbackDesc: string | undefined
): string => {
  if (typeof description === 'string' && description.trim().length > 0) {
    return description;
  }
  return fallbackDesc ?? 'Adjust image export settings.';
};

const resolvePresetTransform = (
  recordTransform: Partial<ImageRetryPreset['transform']> | undefined,
  fallbackTransform: ImageRetryPreset['transform'] | undefined
): ImageRetryPreset['transform'] => ({
  ...(fallbackTransform ?? {}),
  ...(recordTransform ?? {}),
});

const resolvePresetBase64Mode = (
  recordMode: ImageRetryPreset['imageBase64Mode'] | undefined,
  fallbackMode: ImageRetryPreset['imageBase64Mode'] | undefined
): ImageRetryPreset['imageBase64Mode'] => recordMode ?? fallbackMode ?? 'base-only';

const normalizePreset = (
  entry: unknown,
  byId: Map<string, ImageRetryPreset>
): ImageRetryPreset | null => {
  if (entry === null || typeof entry !== 'object') return null;
  const record = entry as Partial<ImageRetryPreset> & {
    transform?: Partial<ImageRetryPreset['transform']>;
    label?: string;
  };
  const id = typeof record.id === 'string' ? record.id : null;
  if (id === null) return null;
  
  const fallback = byId.get(id);
  const name = resolvePresetName(record, fallback);
  const description = resolvePresetDescription(record.description, fallback?.description);
  const transform = resolvePresetTransform(record.transform, fallback?.transform);
  const imageBase64Mode = resolvePresetBase64Mode(record.imageBase64Mode, fallback?.imageBase64Mode);

  return withImageRetryPresetLabels({ id, name, description, imageBase64Mode, transform });
};





const mapToNormalizedPresets = (value: unknown[], byId: Map<string, ImageRetryPreset>): ImageRetryPreset[] =>
  value
    .map((v) => normalizePreset(v, byId))
    .filter((p): p is ImageRetryPreset => p !== null);

const getInitialPresets = (value: unknown): ImageRetryPreset[] | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return getDefaultImageRetryPresets();
  }
  return null;
};

export const normalizeImageRetryPresets = (value: unknown): ImageRetryPreset[] => {
  const initial = getInitialPresets(value);
  if (initial !== null) return initial;

  const defaults = getDefaultImageRetryPresets();
  const byId = new Map(defaults.map((p) => [p.id, p]));
  const normalized = mapToNormalizedPresets(value as unknown[], byId);

  return normalized.length > 0 ? normalized : defaults;
};


