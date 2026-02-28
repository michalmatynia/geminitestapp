export const IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS = [
  'gpt-image-1',
  'gpt-image-1-mini',
  'gpt-image-1.5',
  'gpt-5.2',
  'gpt-5.2-mini',
  'dall-e-3',
] as const;

const IMAGE_SIZE_OPTIONS_GPT = [
  'auto',
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '1792x1024',
  '1024x1792',
] as const;

const IMAGE_SIZE_OPTIONS_DALLE = ['1024x1024', '1792x1024', '1024x1792'] as const;

const IMAGE_QUALITY_OPTIONS_GPT = ['auto', 'low', 'medium', 'high'] as const;
const IMAGE_QUALITY_OPTIONS_DALLE = ['standard', 'hd'] as const;

const IMAGE_BACKGROUND_OPTIONS_GPT = ['auto', 'opaque', 'transparent'] as const;
const IMAGE_BACKGROUND_OPTIONS_DALLE = ['white'] as const;

const IMAGE_FORMAT_OPTIONS_GPT = ['png', 'jpeg', 'webp'] as const;
const IMAGE_FORMAT_OPTIONS_DALLE = ['png'] as const;

export type ImageModelCapabilities = {
  family: 'gpt-5.2' | 'gpt-image' | 'dall-e' | 'generic';
  supportsCount: boolean;
  supportsUser: boolean;
  supportsStream: boolean;
  supportsOutputFormat: boolean;
  supportsResponseFormat: boolean;
  supportsModeration: boolean;
  supportsOutputCompression: boolean;
  supportsPartialImages: boolean;
  sizeOptions: readonly string[];
  qualityOptions: ReadonlyArray<'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd'>;
  backgroundOptions: ReadonlyArray<'auto' | 'transparent' | 'opaque' | 'white'>;
  formatOptions: ReadonlyArray<'png' | 'jpeg' | 'webp'>;
};

const KNOWN_IMAGE_MODEL_IDS = new Set<string>(
  IMAGE_STUDIO_IMAGE_MODEL_FALLBACKS.map((id) => id.toLowerCase())
);

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

export function isGpt52ImageModel(modelId: string): boolean {
  return normalizeModelId(modelId).startsWith('gpt-5.2');
}

function isGptImageModel(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  return normalized.includes('gpt-image');
}

function isDalleImageModel(modelId: string): boolean {
  return normalizeModelId(modelId).startsWith('dall-e');
}

export function supportsImageSequenceGeneration(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return false;
  if (isDalleImageModel(normalized)) return false;
  if (isGpt52ImageModel(normalized)) return true;
  if (isGptImageModel(normalized)) return true;
  if (normalized.startsWith('gpt-')) return true;
  return normalized.includes('sequence');
}

export function getImageModelCapabilities(modelId: string): ImageModelCapabilities {
  if (isGpt52ImageModel(modelId)) {
    return {
      family: 'gpt-5.2',
      supportsCount: true,
      supportsUser: true,
      supportsStream: false,
      supportsOutputFormat: false,
      supportsResponseFormat: false,
      supportsModeration: false,
      supportsOutputCompression: false,
      supportsPartialImages: false,
      sizeOptions: IMAGE_SIZE_OPTIONS_GPT,
      qualityOptions: IMAGE_QUALITY_OPTIONS_GPT,
      backgroundOptions: IMAGE_BACKGROUND_OPTIONS_GPT,
      formatOptions: IMAGE_FORMAT_OPTIONS_GPT,
    };
  }

  if (isGptImageModel(modelId)) {
    return {
      family: 'gpt-image',
      supportsCount: true,
      supportsUser: true,
      supportsStream: false,
      supportsOutputFormat: true,
      supportsResponseFormat: false,
      supportsModeration: false,
      supportsOutputCompression: false,
      supportsPartialImages: false,
      sizeOptions: IMAGE_SIZE_OPTIONS_GPT,
      qualityOptions: IMAGE_QUALITY_OPTIONS_GPT,
      backgroundOptions: IMAGE_BACKGROUND_OPTIONS_GPT,
      formatOptions: IMAGE_FORMAT_OPTIONS_GPT,
    };
  }

  if (isDalleImageModel(modelId)) {
    return {
      family: 'dall-e',
      supportsCount: true,
      supportsUser: true,
      supportsStream: false,
      supportsOutputFormat: false,
      supportsResponseFormat: true,
      supportsModeration: false,
      supportsOutputCompression: false,
      supportsPartialImages: false,
      sizeOptions: IMAGE_SIZE_OPTIONS_DALLE,
      qualityOptions: IMAGE_QUALITY_OPTIONS_DALLE,
      backgroundOptions: IMAGE_BACKGROUND_OPTIONS_DALLE,
      formatOptions: IMAGE_FORMAT_OPTIONS_DALLE,
    };
  }

  return {
    family: 'generic',
    supportsCount: true,
    supportsUser: true,
    supportsStream: false,
    supportsOutputFormat: false,
    supportsResponseFormat: true,
    supportsModeration: false,
    supportsOutputCompression: false,
    supportsPartialImages: false,
    sizeOptions: IMAGE_SIZE_OPTIONS_GPT,
    qualityOptions: IMAGE_QUALITY_OPTIONS_GPT,
    backgroundOptions: IMAGE_BACKGROUND_OPTIONS_GPT,
    formatOptions: IMAGE_FORMAT_OPTIONS_GPT,
  };
}

export function isLikelyImageOutputModelId(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  if (!normalized) return false;

  if (KNOWN_IMAGE_MODEL_IDS.has(normalized)) return true;
  if (normalized.includes('gpt-image')) return true;
  if (normalized.startsWith('dall-e')) return true;
  if (normalized.includes('image')) return true;
  if (normalized.startsWith('gpt-5.2')) return true;

  return false;
}

export function uniqueSortedModelIds(modelIds: readonly string[]): string[] {
  return Array.from(new Set(modelIds.map((modelId) => modelId.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}

export function toLikelyImageModelIds(modelIds: readonly string[]): string[] {
  const filtered = modelIds.filter((modelId) => isLikelyImageOutputModelId(modelId));
  return uniqueSortedModelIds(filtered);
}
