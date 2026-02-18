import { z } from 'zod';

import {
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  buildSequenceStepsFromOperations,
  clampImageStudioUpscaleResolutionSide,
  clampImageStudioUpscaleScale,
  deriveOperationsFromSteps,
  normalizeImageStudioSequencePresets,
  normalizeImageStudioSequenceSteps,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioProjectSequencingSettings,
  type ImageStudioSequencePreset,
  type ImageStudioSequenceStep,
  type ImageStudioSequenceUpscaleStep,
} from './studio-sequencing-settings';

export * from './studio-sequencing-settings';

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
  helpTooltips: {
    cropButtonsEnabled: boolean;
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

export type ImageStudioSequenceSnapshot = {
  hash: string;
  stepCount: number;
  modelId: string | null;
};

type ImageStudioSequenceSnapshotPayload = {
  sequencingEnabled: boolean;
  trigger: 'manual' | 'product_studio';
  runtime: 'server';
  activePresetId: string | null;
  modelId: string | null;
  defaultOutputCount: number | null;
  steps: ReturnType<typeof resolveImageStudioSequenceActiveSteps>;
};

const defaultSequenceSteps = buildSequenceStepsFromOperations([
  'crop_center',
  'generate',
  'upscale',
]);

export const defaultImageStudioSettings: ImageStudioSettings = {
  version: 1,
  projectSequencing: {
    enabled: false,
    trigger: 'manual',
    runtime: 'server',
    operations: ['crop_center', 'generate', 'upscale'],
    steps: defaultSequenceSteps,
    presets: [],
    activePresetId: null,
    upscaleStrategy: 'scale',
    upscaleScale: 2,
    upscaleTargetWidth: 2048,
    upscaleTargetHeight: 2048,
    snapshotHash: null,
    snapshotSavedAt: null,
    snapshotStepCount: 0,
    snapshotModelId: null,
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
  helpTooltips: {
    cropButtonsEnabled: true,
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

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const deriveUpscaleSummaryFromSteps = (steps: ImageStudioSequenceStep[]): {
  strategy: 'scale' | 'target_resolution';
  scale: number;
  targetWidth: number;
  targetHeight: number;
} => {
  const firstEnabledUpscale = steps.find(
    (step): step is ImageStudioSequenceUpscaleStep =>
      step.type === 'upscale' && step.enabled
  );
  return {
    strategy: firstEnabledUpscale?.config.strategy ?? 'scale',
    scale: firstEnabledUpscale?.config.scale ?? 2,
    targetWidth: firstEnabledUpscale?.config.targetWidth ?? 2048,
    targetHeight: firstEnabledUpscale?.config.targetHeight ?? 2048,
  };
};

const hashSequenceSnapshotPayload = (payload: string): string => {
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;

  for (let index = 0; index < payload.length; index += 1) {
    const charCode = payload.charCodeAt(index);
    h1 = Math.imul(h1 ^ charCode, 2654435761);
    h2 = Math.imul(h2 ^ charCode, 1597334677);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return [h1 >>> 0, h2 >>> 0, (h1 ^ h2) >>> 0]
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('')
    .slice(0, 20);
};

const buildImageStudioSequenceSnapshotPayload = (
  settings: ImageStudioSettings,
): ImageStudioSequenceSnapshotPayload => {
  const activeSteps = resolveImageStudioSequenceActiveSteps(
    settings.projectSequencing,
  ).filter((step) => step.enabled);

  const modelId = asTrimmedString(settings.targetAi.openai.model);
  const defaultOutputCount =
    typeof settings.targetAi.openai.image.n === 'number' &&
    Number.isFinite(settings.targetAi.openai.image.n)
      ? Math.max(1, Math.min(10, Math.floor(settings.targetAi.openai.image.n)))
      : null;

  return {
    sequencingEnabled: Boolean(settings.projectSequencing.enabled),
    trigger:
      settings.projectSequencing.trigger === 'product_studio'
        ? 'product_studio'
        : 'manual',
    runtime: 'server',
    activePresetId: asTrimmedString(settings.projectSequencing.activePresetId),
    modelId,
    defaultOutputCount,
    steps: activeSteps,
  };
};

export function buildImageStudioSequenceSnapshot(
  settings: ImageStudioSettings,
): ImageStudioSequenceSnapshot {
  const payload = buildImageStudioSequenceSnapshotPayload(settings);
  const hash = hashSequenceSnapshotPayload(JSON.stringify(payload));

  return {
    hash,
    stepCount: payload.steps.length,
    modelId: payload.modelId,
  };
}

const imageStudioSettingsSchema = z
  .object({
    version: z.literal(1).optional().default(1),
    projectSequencing: z
      .object({
        enabled: z
          .boolean()
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.enabled),
        trigger: z
          .enum(['manual', 'product_studio'])
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.trigger),
        runtime: z
          .enum(['server'])
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.runtime),
        operations: z
          .array(z.enum(IMAGE_STUDIO_SEQUENCE_OPERATIONS))
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.operations),
        steps: z
          .array(z.unknown())
          .optional(),
        presets: z
          .array(
            z.object({
              id: z.string().trim().min(1),
              name: z.string().trim().min(1),
              description: z.string().trim().nullable().optional(),
              steps: z.array(z.unknown()).optional(),
              updatedAt: z.string().trim().nullable().optional(),
            })
          )
          .optional(),
        activePresetId: z
          .string()
          .trim()
          .min(1)
          .nullable()
          .optional()
          .default(null),
        upscaleStrategy: z
          .enum(['scale', 'target_resolution'])
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.upscaleStrategy),
        upscaleScale: z
          .number()
          .finite()
          .min(1.1)
          .max(8)
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.upscaleScale),
        upscaleTargetWidth: z
          .number()
          .int()
          .min(1)
          .max(32_768)
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.upscaleTargetWidth),
        upscaleTargetHeight: z
          .number()
          .int()
          .min(1)
          .max(32_768)
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.upscaleTargetHeight),
        snapshotHash: z
          .string()
          .trim()
          .min(1)
          .nullable()
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.snapshotHash),
        snapshotSavedAt: z
          .string()
          .trim()
          .min(1)
          .nullable()
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.snapshotSavedAt),
        snapshotStepCount: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.snapshotStepCount),
        snapshotModelId: z
          .string()
          .trim()
          .min(1)
          .nullable()
          .optional()
          .default(defaultImageStudioSettings.projectSequencing.snapshotModelId),
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
    helpTooltips: z
      .object({
        cropButtonsEnabled: z
          .boolean()
          .optional()
          .default(defaultImageStudioSettings.helpTooltips.cropButtonsEnabled),
      })
      .optional()
      .default(defaultImageStudioSettings.helpTooltips),
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

const resolveActivePresetId = (
  requestedPresetId: string | null | undefined,
  presets: ImageStudioSequencePreset[],
): string | null => {
  if (!requestedPresetId) return null;
  const normalized = requestedPresetId.trim();
  if (!normalized) return null;
  return presets.some((preset) => preset.id === normalized) ? normalized : null;
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

    const normalizedSteps = normalizeImageStudioSequenceSteps(
      parsedSettings.projectSequencing.steps,
    );

    const normalizedPresets = normalizeImageStudioSequencePresets(
      parsedSettings.projectSequencing.presets,
      normalizedSteps,
    );

    const activePresetId = resolveActivePresetId(
      parsedSettings.projectSequencing.activePresetId,
      normalizedPresets,
    );

    const activeSteps = activePresetId
      ? normalizedPresets.find((preset) => preset.id === activePresetId)?.steps ?? normalizedSteps
      : normalizedSteps;
    const operations = deriveOperationsFromSteps(activeSteps);
    const upscaleSummary = deriveUpscaleSummaryFromSteps(activeSteps);

    const snapshotHash = asTrimmedString(
      parsedSettings.projectSequencing.snapshotHash,
    );
    const snapshotSavedAt = asTrimmedString(
      parsedSettings.projectSequencing.snapshotSavedAt,
    );
    const snapshotStepCount = asNonNegativeInteger(
      parsedSettings.projectSequencing.snapshotStepCount,
    );
    const snapshotModelId = asTrimmedString(
      parsedSettings.projectSequencing.snapshotModelId,
    );

    const projectSequencing: ImageStudioProjectSequencingSettings = {
      enabled: parsedSettings.projectSequencing.enabled,
      trigger:
        parsedSettings.projectSequencing.trigger === 'product_studio'
          ? 'product_studio'
          : 'manual',
      runtime: 'server',
      operations:
        operations.length > 0
          ? operations
          : deriveOperationsFromSteps(activeSteps),
      steps: normalizedSteps,
      presets: normalizedPresets,
      activePresetId,
      upscaleStrategy: upscaleSummary.strategy,
      upscaleScale: clampImageStudioUpscaleScale(upscaleSummary.scale),
      upscaleTargetWidth: clampImageStudioUpscaleResolutionSide(upscaleSummary.targetWidth),
      upscaleTargetHeight: clampImageStudioUpscaleResolutionSide(upscaleSummary.targetHeight),
      snapshotHash,
      snapshotSavedAt,
      snapshotStepCount,
      snapshotModelId,
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
