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
  const dim = maxDimension ?? 'auto';
  const qual = jpegQuality ?? 'auto';

  if (preset.id === 'lower-dimension') return `Lower max dimension (${dim}px)`;
  if (preset.id === 'lower-quality') return `Lower JPEG quality (${qual})`;
  if (preset.id === 'lower-both') return `Lower dimension + quality (${dim}px, ${qual})`;

  return preset.name.trim() !== '' ? preset.name.trim() : 'Image retry preset';
};

export const buildImageRetryPresetDescription = (preset: ImageRetryPreset): string => {
  const { maxDimension, jpegQuality } = preset.transform;
  const dimLabel = maxDimension !== null && maxDimension !== undefined ? `${maxDimension}px` : 'your target size';
  const qualLabel = jpegQuality !== null && jpegQuality !== undefined ? jpegQuality : 'your';

  if (preset.id === 'lower-dimension') return `Resize down to ${dimLabel} and convert to JPEG.`;
  if (preset.id === 'lower-quality') return `Compress to quality ${qualLabel} without resizing.`;
  if (preset.id === 'lower-both') return `Resize to ${dimLabel} and compress to ${qualLabel} for maximum compatibility.`;

  return preset.description.trim() !== '' ? preset.description.trim() : 'Adjust image export settings.';
};

export const withImageRetryPresetLabels = (preset: ImageRetryPreset): ImageRetryPreset => ({
  ...preset,
  name: buildImageRetryPresetLabel(preset),
  description: buildImageRetryPresetDescription(preset),
});

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

  const name =
    typeof record.name === 'string' && record.name.trim() !== ''
      ? record.name
      : typeof record.label === 'string' && record.label.trim() !== ''
        ? record.label
        : (fallback?.name ?? 'Image retry preset');

  const description =
    typeof record.description === 'string' && record.description.trim() !== ''
      ? record.description
      : (fallback?.description ?? 'Adjust image export settings.');

  const preset: ImageRetryPreset = {
    id,
    name,
    description,
    imageBase64Mode: record.imageBase64Mode ?? fallback?.imageBase64Mode ?? 'base-only',
    transform: {
      ...(fallback?.transform ?? {}),
      ...(record.transform ?? {}),
    },
  };
  return withImageRetryPresetLabels(preset);
};

export const normalizeImageRetryPresets = (value: unknown): ImageRetryPreset[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return getDefaultImageRetryPresets();
  }
  const defaults = getDefaultImageRetryPresets();
  const byId = new Map(defaults.map((p) => [p.id, p]));
  const normalized = value
    .map((v) => normalizePreset(v, byId))
    .filter((p): p is ImageRetryPreset => p !== null);

  return normalized.length > 0 ? normalized : defaults;
};
