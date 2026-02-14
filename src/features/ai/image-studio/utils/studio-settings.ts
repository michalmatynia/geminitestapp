import { z } from 'zod';

export const IMAGE_STUDIO_SETTINGS_KEY = 'image_studio_settings';
export const IMAGE_STUDIO_OPENAI_API_KEY_KEY = 'image_studio_openai_api_key';
export const IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX =
  'image_studio_project_settings_';

export function sanitizeImageStudioProjectIdForSettings(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function getImageStudioProjectSettingsKey(
  projectId: string | null | undefined
): string | null {
  if (typeof projectId !== 'string') return null;
  const normalized = projectId.trim();
  if (!normalized) return null;
  const safeProjectId = sanitizeImageStudioProjectIdForSettings(normalized);
  if (!safeProjectId) return null;
  return `${IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX}${safeProjectId}`;
}

export function normalizeImageStudioModelPresets(
  presets: string[] | null | undefined,
  fallbackModel: string | null | undefined,
): string[] {
  const normalized: string[] = [];
  if (Array.isArray(presets)) {
    for (const entry of presets) {
      if (typeof entry !== 'string') continue;
      const modelId = entry.trim();
      if (!modelId) continue;
      if (normalized.includes(modelId)) continue;
      normalized.push(modelId);
    }
  }

  const fallback = typeof fallbackModel === 'string' ? fallbackModel.trim() : '';
  if (fallback && !normalized.includes(fallback)) {
    normalized.unshift(fallback);
  }

  return normalized;
}

export const IMAGE_STUDIO_SEQUENCE_OPERATIONS = [
  'crop_center',
  'mask',
  'generate',
  'regenerate',
  'upscale',
] as const;

export type ImageStudioSequenceOperation =
  (typeof IMAGE_STUDIO_SEQUENCE_OPERATIONS)[number];

export type ImageStudioProjectSequencingSettings = {
  enabled: boolean;
  trigger: 'manual';
  operations: ImageStudioSequenceOperation[];
  upscaleScale: number;
};

const clampImageStudioUpscaleScale = (value: number): number => {
  const clamped = Math.max(1.1, Math.min(8, value));
  return Number(clamped.toFixed(2));
};

export function normalizeImageStudioSequenceOperations(
  input: ImageStudioSequenceOperation[] | null | undefined
): ImageStudioSequenceOperation[] {
  const allowed = new Set<ImageStudioSequenceOperation>(
    IMAGE_STUDIO_SEQUENCE_OPERATIONS
  );
  const normalized: ImageStudioSequenceOperation[] = [];
  if (Array.isArray(input)) {
    for (const entry of input) {
      if (!allowed.has(entry)) continue;
      if (normalized.includes(entry)) continue;
      normalized.push(entry);
    }
  }
  return normalized.length > 0
    ? normalized
    : [...defaultImageStudioSettings.projectSequencing.operations];
}

export type ImageStudioSettings = {
  version: 1;
  projectSequencing: ImageStudioProjectSequencingSettings;
  promptExtraction: {
    mode: 'programmatic' | 'gpt' | 'hybrid';
    applyAutofix: boolean;
    autoApplyFormattedPrompt: boolean;
    showValidationSummary: boolean;
    gpt: {
      model: string;
      temperature: number | null;
      top_p: number | null;
      max_output_tokens: number | null;
    };
  };
  uiExtractor: {
    mode: 'heuristic' | 'ai' | 'both';
    model: string;
    temperature: number | null;
    max_output_tokens: number | null;
  };
  targetAi: {
    provider: 'openai';
    openai: {
      api: 'responses' | 'images';
      model: string;
      modelPresets: string[];
      temperature: number | null;
      top_p: number | null;
      max_output_tokens: number | null;
      presence_penalty: number | null;
      frequency_penalty: number | null;
      seed: number | null;
      user: string | null;
      stream: boolean;
      reasoning_effort: 'low' | 'medium' | 'high' | null;
      response_format: 'text' | 'json' | null;
      tool_choice: 'auto' | 'none' | null;
      image: {
        size: string | null;
        quality: 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd' | null;
        background: 'auto' | 'transparent' | 'opaque' | 'white' | null;
        format: 'png' | 'jpeg' | 'webp' | null;
        n: number | null;
        moderation: 'auto' | 'low' | null;
        output_compression: number | null;
        partial_images: number | null;
      };
      advanced_overrides: Record<string, unknown> | null;
    };
  };
};

export const defaultImageStudioSettings: ImageStudioSettings = {
  version: 1,
  projectSequencing: {
    enabled: false,
    trigger: 'manual',
    operations: ['crop_center', 'generate', 'upscale'],
    upscaleScale: 2,
  },
  promptExtraction: {
    mode: 'hybrid',
    applyAutofix: true,
    autoApplyFormattedPrompt: true,
    showValidationSummary: true,
    gpt: {
      model: 'gpt-4o-mini',
      temperature: null,
      top_p: null,
      max_output_tokens: null,
    },
  },
  uiExtractor: {
    mode: 'heuristic',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_output_tokens: 800,
  },
  targetAi: {
    provider: 'openai',
    openai: {
      api: 'images',
      model: 'gpt-image-1',
      modelPresets: ['gpt-image-1'],
      temperature: null,
      top_p: null,
      max_output_tokens: null,
      presence_penalty: null,
      frequency_penalty: null,
      seed: null,
      user: null,
      stream: false,
      reasoning_effort: null,
      response_format: 'text',
      tool_choice: null,
      image: {
        size: null,
        quality: null,
        background: null,
        format: 'png',
        n: 1,
        moderation: null,
        output_compression: null,
        partial_images: null,
      },
      advanced_overrides: null,
    },
  },
};

const finiteNumberOrNull = z.number().finite().nullable().optional().default(null);
const intOrNull = z.number().int().nullable().optional().default(null);
const nonEmptyStringOrNull = z.string().trim().min(1).nullable().optional().default(null);

const imageStudioSettingsSchema: z.ZodType<ImageStudioSettings> = z
  .object({
    version: z.literal(1).optional().default(1),
    projectSequencing: z
      .object({
        enabled: z
          .boolean()
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.enabled),
        trigger: z
          .enum(['manual'])
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.trigger),
        operations: z
          .array(z.enum(IMAGE_STUDIO_SEQUENCE_OPERATIONS))
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.operations),
        upscaleScale: z
          .number()
          .finite()
          .min(1.1)
          .max(8)
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.upscaleScale),
      })
      .optional()
      .default(defaultImageStudioSettings.projectSequencing),
    promptExtraction: z
      .object({
        mode: z.enum(['programmatic', 'gpt', 'hybrid']).optional().default(defaultImageStudioSettings.promptExtraction.mode),
        applyAutofix: z.boolean().optional().default(defaultImageStudioSettings.promptExtraction.applyAutofix),
        autoApplyFormattedPrompt: z.boolean().optional().default(defaultImageStudioSettings.promptExtraction.autoApplyFormattedPrompt),
        showValidationSummary: z.boolean().optional().default(defaultImageStudioSettings.promptExtraction.showValidationSummary),
        gpt: z
          .object({
            model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.promptExtraction.gpt.model),
            temperature: finiteNumberOrNull,
            top_p: finiteNumberOrNull,
            max_output_tokens: intOrNull,
          })
          .optional()
          .default(defaultImageStudioSettings.promptExtraction.gpt),
      })
      .optional()
      .default(defaultImageStudioSettings.promptExtraction),
    uiExtractor: z
      .object({
        mode: z.enum(['heuristic', 'ai', 'both']).optional().default(defaultImageStudioSettings.uiExtractor.mode),
        model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.uiExtractor.model),
        temperature: finiteNumberOrNull,
        max_output_tokens: intOrNull,
      })
      .optional()
      .default(defaultImageStudioSettings.uiExtractor),
    targetAi: z
      .object({
        provider: z.literal('openai').optional().default('openai'),
        openai: z
          .object({
            api: z.enum(['responses', 'images']).optional().default(defaultImageStudioSettings.targetAi.openai.api),
            model: z.string().trim().min(1).optional().default(defaultImageStudioSettings.targetAi.openai.model),
            modelPresets: z.array(z.string().trim().min(1)).optional().default(defaultImageStudioSettings.targetAi.openai.modelPresets),
            temperature: finiteNumberOrNull,
            top_p: finiteNumberOrNull,
            max_output_tokens: intOrNull,
            presence_penalty: finiteNumberOrNull,
            frequency_penalty: finiteNumberOrNull,
            seed: intOrNull,
            user: nonEmptyStringOrNull,
            stream: z.boolean().optional().default(defaultImageStudioSettings.targetAi.openai.stream),
            reasoning_effort: z.enum(['low', 'medium', 'high']).nullable().optional().default(null),
            response_format: z.enum(['text', 'json']).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.response_format),
            tool_choice: z.enum(['auto', 'none']).nullable().optional().default(null),
            image: z
              .object({
                size: nonEmptyStringOrNull,
                quality: z.enum(['auto', 'low', 'medium', 'high', 'standard', 'hd']).nullable().optional().default(null),
                background: z.enum(['auto', 'transparent', 'opaque', 'white']).nullable().optional().default(null),
                format: z.enum(['png', 'jpeg', 'webp']).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.image.format),
                n: z.number().int().min(1).max(10).nullable().optional().default(defaultImageStudioSettings.targetAi.openai.image.n),
                moderation: z.enum(['auto', 'low']).nullable().optional().default(null),
                output_compression: z.number().int().min(0).max(100).nullable().optional().default(null),
                partial_images: z.number().int().min(0).max(3).nullable().optional().default(null),
              })
              .optional()
              .default(defaultImageStudioSettings.targetAi.openai.image),
            advanced_overrides: z.record(z.string(), z.any()).nullable().optional().default(null),
          })
          .optional()
          .default(defaultImageStudioSettings.targetAi.openai),
      })
      .optional()
      .default(defaultImageStudioSettings.targetAi),
  });

const extractRawModelFallback = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const targetAi = (value as Record<string, unknown>)['targetAi'];
  if (!targetAi || typeof targetAi !== 'object' || Array.isArray(targetAi)) return null;
  const openai = (targetAi as Record<string, unknown>)['openai'];
  if (!openai || typeof openai !== 'object' || Array.isArray(openai)) return null;
  const model = (openai as Record<string, unknown>)['model'];
  if (typeof model !== 'string') return null;
  const normalized = model.trim();
  return normalized.length > 0 ? normalized : null;
};

export function parseImageStudioSettings(raw: string | null | undefined): ImageStudioSettings {
  if (!raw) return defaultImageStudioSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = imageStudioSettingsSchema.safeParse(parsed);
    if (!result.success) {
      const modelFallback = extractRawModelFallback(parsed);
      if (!modelFallback) return defaultImageStudioSettings;
      return {
        ...defaultImageStudioSettings,
        targetAi: {
          ...defaultImageStudioSettings.targetAi,
          openai: {
            ...defaultImageStudioSettings.targetAi.openai,
            model: modelFallback,
            modelPresets: normalizeImageStudioModelPresets(
              defaultImageStudioSettings.targetAi.openai.modelPresets,
              modelFallback,
            ),
          },
        },
      };
    }
    const parsedSettings = result.data;
    const modelPresets = normalizeImageStudioModelPresets(
      parsedSettings.targetAi.openai.modelPresets,
      parsedSettings.targetAi.openai.model,
    );
    const projectSequencing: ImageStudioProjectSequencingSettings = {
      enabled: parsedSettings.projectSequencing.enabled,
      trigger: parsedSettings.projectSequencing.trigger,
      operations: normalizeImageStudioSequenceOperations(
        parsedSettings.projectSequencing.operations
      ),
      upscaleScale: clampImageStudioUpscaleScale(
        parsedSettings.projectSequencing.upscaleScale
      ),
    };
    return {
      ...parsedSettings,
      projectSequencing,
      targetAi: {
        ...parsedSettings.targetAi,
        openai: {
          ...parsedSettings.targetAi.openai,
          modelPresets,
        },
      },
    };
  } catch {
    return defaultImageStudioSettings;
  }
}
