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

export const IMAGE_STUDIO_SEQUENCE_CROP_KINDS = [
  'center_square',
  'center_fit',
  'bbox',
  'polygon',
  'alpha_object_bbox',
] as const;

export type ImageStudioSequenceCropKind =
  (typeof IMAGE_STUDIO_SEQUENCE_CROP_KINDS)[number];

export const IMAGE_STUDIO_SEQUENCE_MASK_SOURCES = [
  'current_shapes',
  'preset_polygons',
] as const;

export type ImageStudioSequenceMaskSource =
  (typeof IMAGE_STUDIO_SEQUENCE_MASK_SOURCES)[number];

export const IMAGE_STUDIO_SEQUENCE_PROMPT_MODES = ['inherit', 'override'] as const;

export type ImageStudioSequencePromptMode =
  (typeof IMAGE_STUDIO_SEQUENCE_PROMPT_MODES)[number];

export const IMAGE_STUDIO_SEQUENCE_REFERENCE_POLICIES = ['inherit', 'none'] as const;

export type ImageStudioSequenceReferencePolicy =
  (typeof IMAGE_STUDIO_SEQUENCE_REFERENCE_POLICIES)[number];

export const IMAGE_STUDIO_SEQUENCE_FAILURE_MODES = ['stop', 'continue', 'skip'] as const;

export type ImageStudioSequenceFailureMode =
  (typeof IMAGE_STUDIO_SEQUENCE_FAILURE_MODES)[number];

export type ImageStudioSequencePoint = {
  x: number;
  y: number;
};

export type ImageStudioSequenceCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageStudioSequenceStepBase = {
  id: string;
  type: ImageStudioSequenceOperation;
  enabled: boolean;
  label: string | null;
  onFailure: ImageStudioSequenceFailureMode;
  retries: number;
  retryBackoffMs: number;
  timeoutMs: number | null;
};

export type ImageStudioSequenceCropStep = ImageStudioSequenceStepBase & {
  type: 'crop_center';
  config: {
    kind: ImageStudioSequenceCropKind;
    aspectRatio: string | null;
    paddingPercent: number;
    bbox: ImageStudioSequenceCropRect | null;
    polygon: ImageStudioSequencePoint[] | null;
  };
};

export type ImageStudioSequenceMaskStep = ImageStudioSequenceStepBase & {
  type: 'mask';
  config: {
    source: ImageStudioSequenceMaskSource;
    polygons: ImageStudioSequencePoint[][];
    invert: boolean;
    feather: number;
    variant: 'white' | 'black';
    persistMaskSlot: boolean;
  };
};

export type ImageStudioSequenceGenerateStep = ImageStudioSequenceStepBase & {
  type: 'generate' | 'regenerate';
  config: {
    promptMode: ImageStudioSequencePromptMode;
    promptTemplate: string | null;
    modelOverride: string | null;
    outputCount: number | null;
    referencePolicy: ImageStudioSequenceReferencePolicy;
  };
};

export type ImageStudioSequenceUpscaleStep = ImageStudioSequenceStepBase & {
  type: 'upscale';
  config: {
    strategy: 'scale' | 'target_resolution';
    scale: number;
    targetWidth: number;
    targetHeight: number;
    smoothingQuality: 'low' | 'medium' | 'high';
  };
};

export type ImageStudioSequenceStep =
  | ImageStudioSequenceCropStep
  | ImageStudioSequenceMaskStep
  | ImageStudioSequenceGenerateStep
  | ImageStudioSequenceUpscaleStep;

export type ImageStudioSequencePreset = {
  id: string;
  name: string;
  description: string | null;
  steps: ImageStudioSequenceStep[];
  updatedAt: string | null;
};

export type ImageStudioProjectSequencingSettings = {
  enabled: boolean;
  trigger: 'manual' | 'product_studio';
  runtime: 'server';
  operations: ImageStudioSequenceOperation[];
  steps: ImageStudioSequenceStep[];
  presets: ImageStudioSequencePreset[];
  activePresetId: string | null;
  upscaleStrategy: 'scale' | 'target_resolution';
  upscaleScale: number;
  upscaleTargetWidth: number;
  upscaleTargetHeight: number;
};

const clampImageStudioUpscaleScale = (value: number): number => {
  const clamped = Math.max(1.1, Math.min(8, value));
  return Number(clamped.toFixed(2));
};

const clampImageStudioUpscaleResolutionSide = (value: number): number => {
  const clamped = Math.max(1, Math.min(32_768, Math.floor(value)));
  return clamped;
};

const clampSequencePaddingPercent = (value: number): number => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return Number(clamped.toFixed(2));
};

const clampSequenceFeather = (value: number): number => {
  const clamped = Math.max(0, Math.min(50, Number.isFinite(value) ? value : 0));
  return Number(clamped.toFixed(2));
};

const clampSequenceRetries = (value: number): number => {
  const parsed = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(5, parsed));
};

const clampSequenceRetryBackoffMs = (value: number): number => {
  const parsed = Number.isFinite(value) ? Math.floor(value) : 1000;
  return Math.max(0, Math.min(60_000, parsed));
};

const clampSequenceTimeoutMs = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const parsed = Math.floor(value);
  return Math.max(1_000, Math.min(1_800_000, parsed));
};

const clampSequenceOutputCount = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const parsed = Math.floor(value);
  return Math.max(1, Math.min(10, parsed));
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const asInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.floor(value);
};

const isSequenceOperation = (value: unknown): value is ImageStudioSequenceOperation =>
  typeof value === 'string' && IMAGE_STUDIO_SEQUENCE_OPERATIONS.includes(value as ImageStudioSequenceOperation);

const isCropKind = (value: unknown): value is ImageStudioSequenceCropKind =>
  typeof value === 'string' && IMAGE_STUDIO_SEQUENCE_CROP_KINDS.includes(value as ImageStudioSequenceCropKind);

const toStepId = (value: unknown, fallbackType: ImageStudioSequenceOperation, index: number): string => {
  const candidate = asTrimmedString(value);
  if (!candidate) return `step_${index + 1}_${fallbackType}`;
  return candidate.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
};

const normalizeSequencePoint = (value: unknown): ImageStudioSequencePoint | null => {
  const record = asRecord(value);
  if (!record) return null;
  const x = asFiniteNumber(record['x']);
  const y = asFiniteNumber(record['y']);
  if (x === null || y === null) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
};

const normalizeSequencePolygon = (value: unknown): ImageStudioSequencePoint[] | null => {
  if (!Array.isArray(value)) return null;
  const points = value
    .map((entry) => normalizeSequencePoint(entry))
    .filter((entry): entry is ImageStudioSequencePoint => Boolean(entry));
  return points.length >= 3 ? points : null;
};

const normalizeSequenceCropRect = (value: unknown): ImageStudioSequenceCropRect | null => {
  const record = asRecord(value);
  if (!record) return null;
  const x = asFiniteNumber(record['x']);
  const y = asFiniteNumber(record['y']);
  const width = asFiniteNumber(record['width']);
  const height = asFiniteNumber(record['height']);
  if (x === null || y === null || width === null || height === null) {
    return null;
  }

  const safeWidth = Math.max(0.0001, Math.min(1, width));
  const safeHeight = Math.max(0.0001, Math.min(1, height));
  const safeX = Math.max(0, Math.min(1 - safeWidth, x));
  const safeY = Math.max(0, Math.min(1 - safeHeight, y));
  return {
    x: Number(safeX.toFixed(6)),
    y: Number(safeY.toFixed(6)),
    width: Number(safeWidth.toFixed(6)),
    height: Number(safeHeight.toFixed(6)),
  };
};

const normalizeSequenceBase = (
  value: Record<string, unknown> | null,
  type: ImageStudioSequenceOperation,
  index: number,
): Omit<ImageStudioSequenceStepBase, 'type'> => {
  const fallback = defaultSequenceStepByType(type, index);

  const failureModeRaw = asTrimmedString(value?.['onFailure']);
  const onFailure: ImageStudioSequenceFailureMode =
    failureModeRaw === 'continue' || failureModeRaw === 'skip' || failureModeRaw === 'stop'
      ? failureModeRaw
      : fallback.onFailure;

  const timeoutRaw = asInteger(value?.['timeoutMs']);

  return {
    id: toStepId(value?.['id'], type, index),
    enabled: asBoolean(value?.['enabled'], fallback.enabled),
    label: asTrimmedString(value?.['label']) ?? null,
    onFailure,
    retries: clampSequenceRetries(asInteger(value?.['retries']) ?? fallback.retries),
    retryBackoffMs: clampSequenceRetryBackoffMs(
      asInteger(value?.['retryBackoffMs']) ?? fallback.retryBackoffMs,
    ),
    timeoutMs: clampSequenceTimeoutMs(timeoutRaw ?? fallback.timeoutMs),
  };
};

const cloneStep = (step: ImageStudioSequenceStep): ImageStudioSequenceStep => {
  const base: Omit<ImageStudioSequenceStepBase, 'type'> = {
    id: step.id,
    enabled: step.enabled,
    label: step.label,
    onFailure: step.onFailure,
    retries: step.retries,
    retryBackoffMs: step.retryBackoffMs,
    timeoutMs: step.timeoutMs,
  };

  if (step.type === 'crop_center') {
    return {
      ...base,
      type: 'crop_center',
      config: {
        kind: step.config.kind,
        aspectRatio: step.config.aspectRatio,
        paddingPercent: step.config.paddingPercent,
        bbox: step.config.bbox
          ? { ...step.config.bbox }
          : null,
        polygon: Array.isArray(step.config.polygon)
          ? step.config.polygon.map((point) => ({ ...point }))
          : null,
      },
    };
  }

  if (step.type === 'mask') {
    return {
      ...base,
      type: 'mask',
      config: {
        source: step.config.source,
        polygons: step.config.polygons.map((polygon) =>
          polygon.map((point) => ({ ...point }))
        ),
        invert: step.config.invert,
        feather: step.config.feather,
        variant: step.config.variant,
        persistMaskSlot: step.config.persistMaskSlot,
      },
    };
  }

  if (step.type === 'upscale') {
    return {
      ...base,
      type: 'upscale',
      config: {
        strategy: step.config.strategy,
        scale: step.config.scale,
        targetWidth: step.config.targetWidth,
        targetHeight: step.config.targetHeight,
        smoothingQuality: step.config.smoothingQuality,
      },
    };
  }

  return {
    ...base,
    type: step.type,
    config: {
      promptMode: step.config.promptMode,
      promptTemplate: step.config.promptTemplate,
      modelOverride: step.config.modelOverride,
      outputCount: step.config.outputCount,
      referencePolicy: step.config.referencePolicy,
    },
  };
};

const defaultSequenceStepByType = (
  type: ImageStudioSequenceOperation,
  index = 0,
): ImageStudioSequenceStep => {
  const base: Omit<ImageStudioSequenceStepBase, 'type'> = {
    id: `step_${index + 1}_${type}`,
    enabled: true,
    label: null,
    onFailure: 'stop',
    retries: 0,
    retryBackoffMs: 1000,
    timeoutMs: null,
  };

  if (type === 'crop_center') {
    return {
      ...base,
      type: 'crop_center',
      config: {
        kind: 'center_square',
        aspectRatio: null,
        paddingPercent: 0,
        bbox: null,
        polygon: null,
      },
    };
  }

  if (type === 'mask') {
    return {
      ...base,
      type: 'mask',
      config: {
        source: 'current_shapes',
        polygons: [],
        invert: false,
        feather: 0,
        variant: 'white',
        persistMaskSlot: false,
      },
    };
  }

  if (type === 'upscale') {
    return {
      ...base,
      type: 'upscale',
      config: {
        strategy: 'scale',
        scale: 2,
        targetWidth: 2048,
        targetHeight: 2048,
        smoothingQuality: 'high',
      },
    };
  }

  return {
    ...base,
    type,
    config: {
      promptMode: 'inherit',
      promptTemplate: null,
      modelOverride: null,
      outputCount: null,
      referencePolicy: 'inherit',
    },
  };
};

const normalizeSequenceStep = (
  value: unknown,
  index: number,
  fallbackByType: Partial<Record<ImageStudioSequenceOperation, ImageStudioSequenceStep>>,
): ImageStudioSequenceStep | null => {
  const record = asRecord(value);
  if (!record) return null;

  const typeCandidate = record['type'];
  if (!isSequenceOperation(typeCandidate)) return null;
  const type = typeCandidate;

  const fallback = fallbackByType[type] ?? defaultSequenceStepByType(type, index);
  const base = normalizeSequenceBase(record, type, index);
  const config = asRecord(record['config']);

  if (type === 'crop_center') {
    const kind = isCropKind(config?.['kind'])
      ? config?.['kind']
      : (fallback.type === 'crop_center' ? fallback.config.kind : 'center_square');
    const aspectRatio = asTrimmedString(config?.['aspectRatio'])
      ?? (fallback.type === 'crop_center' ? fallback.config.aspectRatio : null);
    const paddingPercent = clampSequencePaddingPercent(
      asFiniteNumber(config?.['paddingPercent'])
      ?? (fallback.type === 'crop_center' ? fallback.config.paddingPercent : 0),
    );
    const bbox = normalizeSequenceCropRect(config?.['bbox'])
      ?? (fallback.type === 'crop_center' ? fallback.config.bbox : null);
    const polygon = normalizeSequencePolygon(config?.['polygon'])
      ?? (fallback.type === 'crop_center' ? fallback.config.polygon : null);

    return {
      ...base,
      type,
      config: {
        kind,
        aspectRatio,
        paddingPercent,
        bbox,
        polygon,
      },
    };
  }

  if (type === 'mask') {
    const sourceRaw = asTrimmedString(config?.['source']);
    const source: ImageStudioSequenceMaskSource =
      sourceRaw === 'preset_polygons' ? 'preset_polygons' : 'current_shapes';
    const polygonsRaw = Array.isArray(config?.['polygons']) ? config?.['polygons'] : [];
    const polygons = polygonsRaw
      .map((entry) => normalizeSequencePolygon(entry))
      .filter((entry): entry is ImageStudioSequencePoint[] => Boolean(entry));

    return {
      ...base,
      type,
      config: {
        source,
        polygons,
        invert: asBoolean(config?.['invert'], fallback.type === 'mask' ? fallback.config.invert : false),
        feather: clampSequenceFeather(
          asFiniteNumber(config?.['feather'])
          ?? (fallback.type === 'mask' ? fallback.config.feather : 0),
        ),
        variant:
          config?.['variant'] === 'black' || config?.['variant'] === 'white'
            ? config['variant']
            : (fallback.type === 'mask' ? fallback.config.variant : 'white'),
        persistMaskSlot: asBoolean(
          config?.['persistMaskSlot'],
          fallback.type === 'mask' ? fallback.config.persistMaskSlot : false,
        ),
      },
    };
  }

  if (type === 'upscale') {
    const strategy: 'scale' | 'target_resolution' =
      config?.['strategy'] === 'target_resolution' ? 'target_resolution' : 'scale';

    return {
      ...base,
      type,
      config: {
        strategy,
        scale: clampImageStudioUpscaleScale(
          asFiniteNumber(config?.['scale'])
          ?? (fallback.type === 'upscale' ? fallback.config.scale : 2),
        ),
        targetWidth: clampImageStudioUpscaleResolutionSide(
          asInteger(config?.['targetWidth'])
          ?? (fallback.type === 'upscale' ? fallback.config.targetWidth : 2048),
        ),
        targetHeight: clampImageStudioUpscaleResolutionSide(
          asInteger(config?.['targetHeight'])
          ?? (fallback.type === 'upscale' ? fallback.config.targetHeight : 2048),
        ),
        smoothingQuality:
          config?.['smoothingQuality'] === 'low' ||
          config?.['smoothingQuality'] === 'medium' ||
          config?.['smoothingQuality'] === 'high'
            ? config['smoothingQuality']
            : (fallback.type === 'upscale' ? fallback.config.smoothingQuality : 'high'),
      },
    };
  }

  const promptModeRaw = asTrimmedString(config?.['promptMode']);
  const promptMode: ImageStudioSequencePromptMode =
    promptModeRaw === 'override' ? 'override' : 'inherit';
  const referencePolicyRaw = asTrimmedString(config?.['referencePolicy']);
  const referencePolicy: ImageStudioSequenceReferencePolicy =
    referencePolicyRaw === 'none' ? 'none' : 'inherit';

  return {
    ...base,
    type,
    config: {
      promptMode,
      promptTemplate: asTrimmedString(config?.['promptTemplate'])
        ?? (fallback.type === type ? fallback.config.promptTemplate : null),
      modelOverride: asTrimmedString(config?.['modelOverride'])
        ?? (fallback.type === type ? fallback.config.modelOverride : null),
      outputCount: clampSequenceOutputCount(
        asInteger(config?.['outputCount'])
        ?? (fallback.type === type ? fallback.config.outputCount : null),
      ),
      referencePolicy,
    },
  };
};

const dedupeStepIds = (steps: ImageStudioSequenceStep[]): ImageStudioSequenceStep[] => {
  const seen = new Set<string>();
  return steps.map((step, index) => {
    const baseId = step.id || `step_${index + 1}_${step.type}`;
    if (!seen.has(baseId)) {
      seen.add(baseId);
      return step;
    }
    let suffix = 2;
    let nextId = `${baseId}_${suffix}`;
    while (seen.has(nextId)) {
      suffix += 1;
      nextId = `${baseId}_${suffix}`;
    }
    seen.add(nextId);
    return {
      ...step,
      id: nextId,
    };
  });
};

const buildSequenceStepsFromOperations = (
  operations: ImageStudioSequenceOperation[],
  params?: {
    upscaleStrategy?: 'scale' | 'target_resolution';
    upscaleScale?: number;
    upscaleTargetWidth?: number;
    upscaleTargetHeight?: number;
  },
): ImageStudioSequenceStep[] => {
  const sequence = operations.length > 0 ? operations : [...defaultImageStudioSettings.projectSequencing.operations];
  return sequence.map((operation, index) => {
    const baseStep = defaultSequenceStepByType(operation, index);
    if (baseStep.type !== 'upscale') return baseStep;
    return {
      ...baseStep,
      config: {
        ...baseStep.config,
        strategy: params?.upscaleStrategy === 'target_resolution' ? 'target_resolution' : 'scale',
        scale: clampImageStudioUpscaleScale(params?.upscaleScale ?? baseStep.config.scale),
        targetWidth: clampImageStudioUpscaleResolutionSide(
          params?.upscaleTargetWidth ?? baseStep.config.targetWidth,
        ),
        targetHeight: clampImageStudioUpscaleResolutionSide(
          params?.upscaleTargetHeight ?? baseStep.config.targetHeight,
        ),
      },
    };
  });
};

const deriveOperationsFromSteps = (steps: ImageStudioSequenceStep[]): ImageStudioSequenceOperation[] => {
  const unique: ImageStudioSequenceOperation[] = [];
  for (const step of steps) {
    if (!IMAGE_STUDIO_SEQUENCE_OPERATIONS.includes(step.type)) continue;
    if (unique.includes(step.type)) continue;
    unique.push(step.type);
  }
  return unique.length > 0
    ? unique
    : [...defaultImageStudioSettings.projectSequencing.operations];
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

export function normalizeImageStudioSequenceSteps(
  input: unknown,
  params?: {
    fallbackOperations?: ImageStudioSequenceOperation[];
    upscaleStrategy?: 'scale' | 'target_resolution';
    upscaleScale?: number;
    upscaleTargetWidth?: number;
    upscaleTargetHeight?: number;
  },
): ImageStudioSequenceStep[] {
  const operations = normalizeImageStudioSequenceOperations(params?.fallbackOperations);
  const fallbackSteps = buildSequenceStepsFromOperations(operations, {
    upscaleStrategy: params?.upscaleStrategy,
    upscaleScale: params?.upscaleScale,
    upscaleTargetWidth: params?.upscaleTargetWidth,
    upscaleTargetHeight: params?.upscaleTargetHeight,
  });

  if (!Array.isArray(input)) {
    return dedupeStepIds(fallbackSteps.map((step) => cloneStep(step)));
  }

  const fallbackByType: Partial<Record<ImageStudioSequenceOperation, ImageStudioSequenceStep>> = {};
  for (const step of fallbackSteps) {
    if (!fallbackByType[step.type]) {
      fallbackByType[step.type] = step;
    }
  }

  const normalized = input
    .map((entry, index) => normalizeSequenceStep(entry, index, fallbackByType))
    .filter((entry): entry is ImageStudioSequenceStep => Boolean(entry));

  if (normalized.length === 0) {
    return dedupeStepIds(fallbackSteps.map((step) => cloneStep(step)));
  }

  return dedupeStepIds(normalized.map((step) => cloneStep(step)));
}

const normalizeSequencePreset = (
  input: unknown,
  index: number,
  fallbackSteps: ImageStudioSequenceStep[],
): ImageStudioSequencePreset | null => {
  const record = asRecord(input);
  if (!record) return null;

  const rawId = asTrimmedString(record['id']) ?? `preset_${index + 1}`;
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || `preset_${index + 1}`;
  const name = asTrimmedString(record['name']) ?? `Preset ${index + 1}`;
  const description = asTrimmedString(record['description']) ?? null;
  const updatedAt = asTrimmedString(record['updatedAt']) ?? null;

  const steps = normalizeImageStudioSequenceSteps(record['steps'], {
    fallbackOperations: deriveOperationsFromSteps(fallbackSteps),
    upscaleStrategy: fallbackSteps.find((step) => step.type === 'upscale' && step.enabled)?.type === 'upscale'
      ? (fallbackSteps.find((step) => step.type === 'upscale' && step.enabled) as ImageStudioSequenceUpscaleStep).config.strategy
      : 'scale',
    upscaleScale: fallbackSteps.find((step) => step.type === 'upscale' && step.enabled)?.type === 'upscale'
      ? (fallbackSteps.find((step) => step.type === 'upscale' && step.enabled) as ImageStudioSequenceUpscaleStep).config.scale
      : 2,
    upscaleTargetWidth: fallbackSteps.find((step) => step.type === 'upscale' && step.enabled)?.type === 'upscale'
      ? (fallbackSteps.find((step) => step.type === 'upscale' && step.enabled) as ImageStudioSequenceUpscaleStep).config.targetWidth
      : 2048,
    upscaleTargetHeight: fallbackSteps.find((step) => step.type === 'upscale' && step.enabled)?.type === 'upscale'
      ? (fallbackSteps.find((step) => step.type === 'upscale' && step.enabled) as ImageStudioSequenceUpscaleStep).config.targetHeight
      : 2048,
  });

  return {
    id,
    name,
    description,
    steps,
    updatedAt,
  };
};

export function normalizeImageStudioSequencePresets(
  input: unknown,
  fallbackSteps: ImageStudioSequenceStep[],
): ImageStudioSequencePreset[] {
  if (!Array.isArray(input)) return [];

  const deduped = new Map<string, ImageStudioSequencePreset>();
  input.forEach((entry, index) => {
    const normalized = normalizeSequencePreset(entry, index, fallbackSteps);
    if (!normalized) return;
    if (deduped.has(normalized.id)) return;
    deduped.set(normalized.id, normalized);
  });

  return Array.from(deduped.values());
}

export function resolveImageStudioSequenceActivePreset(
  sequencing: Pick<ImageStudioProjectSequencingSettings, 'activePresetId' | 'presets'>,
): ImageStudioSequencePreset | null {
  if (!sequencing.activePresetId) return null;
  return sequencing.presets.find((preset) => preset.id === sequencing.activePresetId) ?? null;
}

export function resolveImageStudioSequenceActiveSteps(
  sequencing: Pick<ImageStudioProjectSequencingSettings, 'steps' | 'presets' | 'activePresetId'>,
): ImageStudioSequenceStep[] {
  const activePreset = resolveImageStudioSequenceActivePreset(sequencing);
  if (!activePreset) {
    return sequencing.steps.map((step) => cloneStep(step));
  }
  return activePreset.steps.map((step) => cloneStep(step));
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

    const operations = normalizeImageStudioSequenceOperations(
      parsedSettings.projectSequencing.operations
    );
    const upscaleStrategy =
      parsedSettings.projectSequencing.upscaleStrategy === 'target_resolution'
        ? 'target_resolution'
        : 'scale';
    const upscaleScale = clampImageStudioUpscaleScale(
      parsedSettings.projectSequencing.upscaleScale
    );
    const upscaleTargetWidth = clampImageStudioUpscaleResolutionSide(
      parsedSettings.projectSequencing.upscaleTargetWidth
    );
    const upscaleTargetHeight = clampImageStudioUpscaleResolutionSide(
      parsedSettings.projectSequencing.upscaleTargetHeight
    );

    const normalizedSteps = normalizeImageStudioSequenceSteps(
      parsedSettings.projectSequencing.steps,
      {
        fallbackOperations: operations,
        upscaleStrategy,
        upscaleScale,
        upscaleTargetWidth,
        upscaleTargetHeight,
      },
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
      upscaleStrategy,
      upscaleScale,
      upscaleTargetWidth,
      upscaleTargetHeight,
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
