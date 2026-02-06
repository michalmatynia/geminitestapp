import type { ImageRetryPreset } from '@/features/data-import-export/types/imports';

const clonePreset = (preset: ImageRetryPreset): ImageRetryPreset => ({
  ...preset,
  transform: { ...preset.transform },
});

export const DEFAULT_IMAGE_RETRY_PRESETS: ImageRetryPreset[] = [
  {
    id: 'lower-dimension',
    label: 'Lower max dimension (1200px)',
    description: 'Resize down to 1200px and convert to JPEG.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, maxDimension: 1200, jpegQuality: 85 },
  },
  {
    id: 'lower-quality',
    label: 'Lower JPEG quality (70)',
    description: 'Compress harder without resizing.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, jpegQuality: 70 },
  },
  {
    id: 'lower-both',
    label: 'Lower dimension + quality (1200px, 70)',
    description: 'Resize and compress for maximum compatibility.',
    imageBase64Mode: 'base-only' as const,
    transform: { forceJpeg: true, maxDimension: 1200, jpegQuality: 70 },
  },
].map(clonePreset);

export const getDefaultImageRetryPresets = (): ImageRetryPreset[] =>
  DEFAULT_IMAGE_RETRY_PRESETS.map(clonePreset);

export const buildImageRetryPresetLabel = (
  preset: ImageRetryPreset,
): string => {
  const maxDimension = preset.transform.maxDimension;
  const jpegQuality = preset.transform.jpegQuality;
  switch (preset.id) {
    case 'lower-dimension':
      return `Lower max dimension (${maxDimension ?? 'auto'}px)`;
    case 'lower-quality':
      return `Lower JPEG quality (${jpegQuality ?? 'auto'})`;
    case 'lower-both':
      return `Lower dimension + quality (${maxDimension ?? 'auto'}px, ${
        jpegQuality ?? 'auto'
      })`;
    default:
      return preset.label?.trim() || 'Image retry preset';
  }
};

export const buildImageRetryPresetDescription = (
  preset: ImageRetryPreset,
): string => {
  const maxDimension = preset.transform.maxDimension;
  const jpegQuality = preset.transform.jpegQuality;
  switch (preset.id) {
    case 'lower-dimension':
      return `Resize down to ${
        maxDimension ? `${maxDimension}px` : 'your target size'
      } and convert to JPEG.`;
    case 'lower-quality':
      return `Compress to quality ${jpegQuality ?? 'your'} without resizing.`;
    case 'lower-both':
      return `Resize to ${
        maxDimension ? `${maxDimension}px` : 'your target size'
      } and compress to ${jpegQuality ?? 'your'} for maximum compatibility.`;
    default:
      return preset.description?.trim() || 'Adjust image export settings.';
  }
};

export const withImageRetryPresetLabels = (
  preset: ImageRetryPreset,
): ImageRetryPreset => ({
  ...preset,
  label: buildImageRetryPresetLabel(preset),
  description: buildImageRetryPresetDescription(preset),
});

export const normalizeImageRetryPresets = (
  value: unknown,
): ImageRetryPreset[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return getDefaultImageRetryPresets();
  }
  const defaults = getDefaultImageRetryPresets();
  const byId = new Map(
    defaults.map((preset: ImageRetryPreset) => [preset.id, preset]),
  );
  const normalized = value
    .filter((entry: unknown) => entry && typeof entry === 'object')
    .map((entry: unknown) => {
      const record = entry as Partial<ImageRetryPreset> & {
        transform?: Partial<ImageRetryPreset['transform']>;
      };
      const id = typeof record.id === 'string' ? record.id : null;
      if (!id) return null;
      const fallback = byId.get(id);
      const transform = {
        ...(fallback?.transform ?? {}),
        ...(record.transform ?? {}),
      };
      const preset: ImageRetryPreset = {
        id,
        label:
          typeof record.label === 'string' && record.label.trim()
            ? record.label
            : (fallback?.label ?? 'Image retry preset'),
        description:
          typeof record.description === 'string' && record.description.trim()
            ? record.description
            : (fallback?.description ?? 'Adjust image export settings.'),
        imageBase64Mode:
          record.imageBase64Mode ?? fallback?.imageBase64Mode ?? 'base-only',
        transform,
      };
      return withImageRetryPresetLabels(preset);
    })
    .filter((entry: ImageRetryPreset | null): entry is ImageRetryPreset =>
      Boolean(entry),
    );

  return normalized.length > 0 ? normalized : defaults;
};
