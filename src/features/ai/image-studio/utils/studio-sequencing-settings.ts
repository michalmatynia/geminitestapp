export const IMAGE_STUDIO_SEQUENCE_OPERATIONS = [
  'crop_center',
  'mask',
  'generate',
  'regenerate',
  'upscale',
] as const;

export const IMAGE_STUDIO_SEQUENCE_MAX_STEPS = 20;

export type ImageStudioSequenceOperation =
  (typeof IMAGE_STUDIO_SEQUENCE_OPERATIONS)[number];

export const IMAGE_STUDIO_SEQUENCE_CROP_KINDS = [
  'center_square',
  'center_fit',
  'bbox',
  'polygon',
  'alpha_object_bbox',
  'selected_shape',
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

export const IMAGE_STUDIO_SEQUENCE_STEP_RUNTIMES = ['server', 'client'] as const;

export type ImageStudioSequenceStepRuntime =
  (typeof IMAGE_STUDIO_SEQUENCE_STEP_RUNTIMES)[number];

export const IMAGE_STUDIO_SEQUENCE_STEP_INPUT_SOURCES = [
  'previous',
  'source',
] as const;

export type ImageStudioSequenceStepInputSource =
  (typeof IMAGE_STUDIO_SEQUENCE_STEP_INPUT_SOURCES)[number];

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
  runtime: ImageStudioSequenceStepRuntime;
  inputSource: ImageStudioSequenceStepInputSource;
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
    selectedShapeId: string | null;
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
  snapshotHash: string | null;
  snapshotSavedAt: string | null;
  snapshotStepCount: number;
  snapshotModelId: string | null;
};

const IMAGE_STUDIO_SEQUENCE_DEFAULT_OPERATIONS: ImageStudioSequenceOperation[] = [
  'crop_center',
  'generate',
  'upscale',
];

export const clampImageStudioUpscaleScale = (value: number): number => {
  const clamped = Math.max(1.1, Math.min(8, value));
  return Number(clamped.toFixed(2));
};

export const clampImageStudioUpscaleResolutionSide = (value: number): number => {
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

const isStepRuntime = (value: unknown): value is ImageStudioSequenceStepRuntime =>
  typeof value === 'string' && IMAGE_STUDIO_SEQUENCE_STEP_RUNTIMES.includes(value as ImageStudioSequenceStepRuntime);

const isStepInputSource = (
  value: unknown,
): value is ImageStudioSequenceStepInputSource =>
  typeof value === 'string' &&
  IMAGE_STUDIO_SEQUENCE_STEP_INPUT_SOURCES.includes(
    value as ImageStudioSequenceStepInputSource,
  );

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
  const runtimeRaw = asTrimmedString(value?.['runtime']);
  const runtime: ImageStudioSequenceStepRuntime = isStepRuntime(runtimeRaw)
    ? runtimeRaw
    : fallback.runtime;
  const inputSourceRaw = asTrimmedString(value?.['inputSource']);
  const inputSource: ImageStudioSequenceStepInputSource = isStepInputSource(
    inputSourceRaw,
  )
    ? inputSourceRaw
    : fallback.inputSource;

  const timeoutRaw = asInteger(value?.['timeoutMs']);

  return {
    id: toStepId(value?.['id'], type, index),
    runtime,
    inputSource,
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
    runtime: step.runtime,
    inputSource: step.inputSource,
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
        selectedShapeId: step.config.selectedShapeId ?? null,
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
    runtime: 'server',
    inputSource: 'previous',
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
        selectedShapeId: null,
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
    const selectedShapeId = asTrimmedString(config?.['selectedShapeId'])
      ?? (fallback.type === 'crop_center' ? fallback.config.selectedShapeId : null);
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
        selectedShapeId,
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

export const buildSequenceStepsFromOperations = (
  operations: ImageStudioSequenceOperation[],
  params?: {
    upscaleStrategy?: 'scale' | 'target_resolution';
    upscaleScale?: number;
    upscaleTargetWidth?: number;
    upscaleTargetHeight?: number;
  },
): ImageStudioSequenceStep[] => {
  const sequence =
    operations.length > 0
      ? operations.slice(0, IMAGE_STUDIO_SEQUENCE_MAX_STEPS)
      : [...IMAGE_STUDIO_SEQUENCE_DEFAULT_OPERATIONS];
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

export const deriveOperationsFromSteps = (
  steps: ImageStudioSequenceStep[]
): ImageStudioSequenceOperation[] => {
  const unique: ImageStudioSequenceOperation[] = [];
  for (const step of steps) {
    if (!IMAGE_STUDIO_SEQUENCE_OPERATIONS.includes(step.type)) continue;
    if (unique.includes(step.type)) continue;
    unique.push(step.type);
  }
  return unique.length > 0
    ? unique
    : [...IMAGE_STUDIO_SEQUENCE_DEFAULT_OPERATIONS];
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
    : [...IMAGE_STUDIO_SEQUENCE_DEFAULT_OPERATIONS];
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
  const fallbackStepParams: {
    upscaleStrategy?: 'scale' | 'target_resolution';
    upscaleScale?: number;
    upscaleTargetWidth?: number;
    upscaleTargetHeight?: number;
  } = {
    ...(params?.upscaleStrategy ? { upscaleStrategy: params.upscaleStrategy } : {}),
    ...(typeof params?.upscaleScale === 'number'
      ? { upscaleScale: params.upscaleScale }
      : {}),
    ...(typeof params?.upscaleTargetWidth === 'number'
      ? { upscaleTargetWidth: params.upscaleTargetWidth }
      : {}),
    ...(typeof params?.upscaleTargetHeight === 'number'
      ? { upscaleTargetHeight: params.upscaleTargetHeight }
      : {}),
  };
  const fallbackSteps = buildSequenceStepsFromOperations(operations, {
    ...fallbackStepParams,
  });

  if (!Array.isArray(input)) {
    return dedupeStepIds(
      fallbackSteps
        .slice(0, IMAGE_STUDIO_SEQUENCE_MAX_STEPS)
        .map((step) => cloneStep(step)),
    );
  }
  if (input.length === 0) {
    // Preserve explicit "no steps" state (do not auto-rebuild fallback stack).
    return [];
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
    return dedupeStepIds(
      fallbackSteps
        .slice(0, IMAGE_STUDIO_SEQUENCE_MAX_STEPS)
        .map((step) => cloneStep(step)),
    );
  }

  return dedupeStepIds(
    normalized
      .slice(0, IMAGE_STUDIO_SEQUENCE_MAX_STEPS)
      .map((step) => cloneStep(step)),
  );
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
