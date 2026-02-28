import { type CanvasResizeDirection } from '@/shared/lib/ai/image-studio/utils/canvas-resize';
import type { VectorShape, VectorTool } from '@/shared/lib/vector-drawing';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import {
  normalizeShapeToPolygons,
  polygonsFromShapes,
  type ImageContentFrame,
  type MaskShapeForExport,
} from '../generation-toolbar/GenerationToolbarImageUtils';

import type { RequestPreviewImage } from '@/shared/lib/ai/image-studio/utils/run-request-preview';
import type {
  ImageStudioSequenceCropStep,
  ImageStudioSequenceStep,
} from '@/shared/lib/ai/image-studio/utils/studio-settings';

export const CHARS_PER_TOKEN_ESTIMATE = 4;
export const ACTION_HISTORY_MAX_STEPS = 50;
export const CANVAS_RESIZE_MIN_PX = 64;
export const CANVAS_RESIZE_MAX_PX = 32_768;

export const parseCanvasDimensionInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (normalized < CANVAS_RESIZE_MIN_PX || normalized > CANVAS_RESIZE_MAX_PX) {
    return null;
  }
  return normalized;
};

export const formatCanvasSizeLabel = (width: number | null, height: number | null): string => {
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    typeof height !== 'number' ||
    !Number.isFinite(height)
  ) {
    return 'Auto';
  }
  return `${Math.floor(width)} x ${Math.floor(height)}`;
};

export type CanvasSizePresetOption = {
  value: string;
  label: string;
  description: string;
};

export const CANVAS_SIZE_PRESET_OPTIONS: CanvasSizePresetOption[] = [
  {
    value: '1024x1024',
    label: 'Square 1024 x 1024',
    description: 'Balanced square canvas.',
  },
  {
    value: '1536x1024',
    label: 'Landscape 1536 x 1024',
    description: 'Wider layout for horizontal compositions.',
  },
  {
    value: '1024x1536',
    label: 'Portrait 1024 x 1536',
    description: 'Taller layout for vertical compositions.',
  },
  {
    value: '2048x2048',
    label: 'Square 2048 x 2048',
    description: 'High-resolution square output.',
  },
  {
    value: '2048x1536',
    label: 'Landscape 2048 x 1536',
    description: 'High-resolution horizontal output.',
  },
  {
    value: '1536x2048',
    label: 'Portrait 1536 x 2048',
    description: 'High-resolution vertical output.',
  },
];

export const parseCanvasSizePresetValue = (
  value: string
): { width: number; height: number } | null => {
  const [widthRaw, heightRaw] = value.split('x');
  if (!widthRaw || !heightRaw) return null;
  const width = parseCanvasDimensionInput(widthRaw);
  const height = parseCanvasDimensionInput(heightRaw);
  if (width === null || height === null) return null;
  return { width, height };
};

export const CANVAS_RESIZE_DIRECTION_OPTIONS: Array<{
  value: CanvasResizeDirection;
  arrow: string;
  label: string;
  description: string;
}> = [
  {
    value: 'up-left',
    arrow: '^<',
    label: 'Extend Up + Left',
    description: 'Adds new canvas area above and left of current content.',
  },
  {
    value: 'up',
    arrow: '^',
    label: 'Extend Up',
    description: 'Adds new canvas area above current content.',
  },
  {
    value: 'up-right',
    arrow: '^>',
    label: 'Extend Up + Right',
    description: 'Adds new canvas area above and right of current content.',
  },
  {
    value: 'left',
    arrow: '<',
    label: 'Extend Left',
    description: 'Adds new canvas area left of current content.',
  },
  {
    value: 'center',
    arrow: '+',
    label: 'Extend From Center',
    description: 'Splits extension evenly around current content.',
  },
  {
    value: 'right',
    arrow: '>',
    label: 'Extend Right',
    description: 'Adds new canvas area right of current content.',
  },
  {
    value: 'down-left',
    arrow: 'v<',
    label: 'Extend Down + Left',
    description: 'Adds new canvas area below and left of current content.',
  },
  {
    value: 'down',
    arrow: 'v',
    label: 'Extend Down',
    description: 'Adds new canvas area below current content.',
  },
  {
    value: 'down-right',
    arrow: 'v>',
    label: 'Extend Down + Right',
    description: 'Adds new canvas area below and right of current content.',
  },
];

type ModelCostProfile = {
  imageUsdPerImage: number;
  inputUsdPer1KTokens: number;
};

const DEFAULT_MODEL_COST_PROFILE: ModelCostProfile = {
  imageUsdPerImage: 0.03,
  inputUsdPer1KTokens: 0.004,
};

const MODEL_COST_PROFILES: Array<{ prefix: string; profile: ModelCostProfile }> = [
  { prefix: 'gpt-image-1', profile: { imageUsdPerImage: 0.04, inputUsdPer1KTokens: 0.006 } },
  { prefix: 'gpt-5.2', profile: { imageUsdPerImage: 0.05, inputUsdPer1KTokens: 0.01 } },
  { prefix: 'gpt-5', profile: { imageUsdPerImage: 0.045, inputUsdPer1KTokens: 0.009 } },
  { prefix: 'gpt-4.1-mini', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.003 } },
  { prefix: 'gpt-4.1', profile: { imageUsdPerImage: 0.028, inputUsdPer1KTokens: 0.005 } },
  { prefix: 'gpt-4o-mini', profile: { imageUsdPerImage: 0.018, inputUsdPer1KTokens: 0.0025 } },
  { prefix: 'gpt-4o', profile: { imageUsdPerImage: 0.026, inputUsdPer1KTokens: 0.0045 } },
  { prefix: 'dall-e-3', profile: { imageUsdPerImage: 0.08, inputUsdPer1KTokens: 0.0 } },
  { prefix: 'dall-e-2', profile: { imageUsdPerImage: 0.02, inputUsdPer1KTokens: 0.0 } },
];

export const cloneSerializableValue = <T>(value: T): T => {
  const seen = new WeakSet<object>();
  const serialized = JSON.stringify(value, (_key: string, candidate: unknown): unknown => {
    if (typeof candidate === 'bigint') return candidate.toString();
    if (typeof candidate === 'function' || typeof candidate === 'symbol') return undefined;
    if (candidate instanceof Date) return candidate.toISOString();
    if (candidate && typeof candidate === 'object') {
      if (seen.has(candidate)) return undefined;
      seen.add(candidate);
    }
    return candidate;
  });
  if (typeof serialized !== 'string') return value;
  return JSON.parse(serialized) as T;
};

export const areStringArraysEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

export const collectSequenceMaskPolygons = (
  shapes: VectorShape[],
  sourceWidth = 1,
  sourceHeight = 1,
  imageContentFrame: ImageContentFrame | null = null
): Array<Array<{ x: number; y: number }>> => {
  const eligibleShapes = shapes.filter((shape) => {
    if (!shape.visible) return false;
    if (shape.type === 'rect' || shape.type === 'ellipse') {
      return shape.points.length >= 2;
    }
    return shape.closed && shape.points.length >= 3;
  });

  return polygonsFromShapes(eligibleShapes as MaskShapeForExport[], sourceWidth, sourceHeight, {
    imageContentFrame,
  });
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toCropRectFromPolygons = (
  polygons: Array<Array<{ x: number; y: number }>>
): { x: number; y: number; width: number; height: number } | null => {
  if (!Array.isArray(polygons) || polygons.length === 0) return null;
  const points = polygons.flat();
  if (points.length < 3) return null;

  const xs = points
    .map((point) => point.x)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const ys = points
    .map((point) => point.y)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (xs.length < 3 || ys.length < 3) return null;

  const minX = clamp01(Math.min(...xs));
  const maxX = clamp01(Math.max(...xs));
  const minY = clamp01(Math.min(...ys));
  const maxY = clamp01(Math.max(...ys));
  if (!(maxX > minX && maxY > minY)) return null;

  return {
    x: Number(minX.toFixed(6)),
    y: Number(minY.toFixed(6)),
    width: Number(Math.max(0.0001, maxX - minX).toFixed(6)),
    height: Number(Math.max(0.0001, maxY - minY).toFixed(6)),
  };
};

const resolveSelectedShapeCropStep = (
  step: ImageStudioSequenceCropStep,
  params: {
    maskShapes: VectorShape[];
    sourceWidth: number;
    sourceHeight: number;
    imageContentFrame: ImageContentFrame | null;
  }
): { step: ImageStudioSequenceCropStep; error: string | null } => {
  if (step.config.kind !== 'selected_shape') {
    return { step, error: null };
  }

  const selectedShapeId = step.config.selectedShapeId?.trim() ?? '';
  if (!selectedShapeId) {
    return {
      step,
      error: `Crop step "${step.id}" uses Selected Shape, but no shape is selected.`,
    };
  }

  const selectedShape = params.maskShapes.find((shape) => shape.id === selectedShapeId) ?? null;
  if (!selectedShape?.visible) {
    return {
      step,
      error: `Crop step "${step.id}" selected shape is missing or hidden.`,
    };
  }

  const polygons = normalizeShapeToPolygons(
    selectedShape as MaskShapeForExport,
    params.sourceWidth,
    params.sourceHeight,
    {
      imageContentFrame: params.imageContentFrame,
    }
  );
  const cropRect = toCropRectFromPolygons(polygons);
  if (!cropRect) {
    return {
      step,
      error: `Crop step "${step.id}" selected shape has no usable crop geometry.`,
    };
  }

  return {
    step: {
      ...step,
      config: {
        ...step.config,
        // Resolve selected-shape crop to explicit bbox geometry for server execution.
        kind: 'bbox',
        bbox: cropRect,
        polygon: null,
      },
    },
    error: null,
  };
};

export const resolveSequenceStepsForRun = (
  steps: ImageStudioSequenceStep[],
  params: {
    maskShapes: VectorShape[];
    sourceWidth: number;
    sourceHeight: number;
    imageContentFrame: ImageContentFrame | null;
  }
): {
  resolvedSteps: ImageStudioSequenceStep[];
  errors: string[];
} => {
  const errors: string[] = [];

  const resolvedSteps = steps.map((step): ImageStudioSequenceStep => {
    if (step.type !== 'crop_center') return step;
    const resolved = resolveSelectedShapeCropStep(step, params);
    if (resolved.error) {
      errors.push(resolved.error);
      return step;
    }
    return resolved.step;
  });

  return {
    resolvedSteps,
    errors,
  };
};

export const estimatePromptTokens = (prompt: string): number => {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / CHARS_PER_TOKEN_ESTIMATE));
};

export const resolveModelCostProfile = (model: string): ModelCostProfile => {
  const normalizedModel = model.trim().toLowerCase();
  if (!normalizedModel) return DEFAULT_MODEL_COST_PROFILE;
  const matched = MODEL_COST_PROFILES.find(({ prefix }) => normalizedModel.startsWith(prefix));
  return matched ? matched.profile : DEFAULT_MODEL_COST_PROFILE;
};

export type StudioActionHistorySnapshot = {
  selectedFolder: string;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: 'image' | '3d';
  compositeAssetIds: string[];
  tool: VectorTool;
  canvasSelectionEnabled: boolean;
  imageTransformMode: 'none' | 'move';
  canvasImageOffset: { x: number; y: number };
  canvasBackgroundLayerEnabled: boolean;
  canvasBackgroundColor: string;
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  promptText: string;
  paramsState: Record<string, unknown> | null;
  paramSpecs: Record<string, unknown> | null;
  paramUiOverrides: Record<string, unknown>;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  studioSettings: Record<string, unknown>;
};

export type StudioActionHistoryEntry = {
  id: string;
  label: string;
  createdAt: string;
  signature: string;
  snapshot: StudioActionHistorySnapshot;
};

export type SequenceRequestPreview = {
  payload: Record<string, unknown> | null;
  errors: string[];
  resolvedPrompt: string;
  maskShapeCount: number;
  images: RequestPreviewImage[];
  stepCount: number;
};

export type SequenceRunStartResponse = {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  dispatchMode: 'queued' | 'inline';
  currentSlotId: string;
  stepCount: number;
};

export const buildReferencePreviewImages = (
  slots: ImageStudioSlotRecord[],
  compositeAssetIds: string[]
): RequestPreviewImage[] =>
  compositeAssetIds
    .map((slotId: string) => slots.find((slot) => slot.id === slotId))
    .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot))
    .flatMap((slot) => {
      const imageFileRecord =
        slot.imageFile && typeof slot.imageFile === 'object'
          ? (slot.imageFile as Record<string, unknown>)
          : null;
      const imageFileUrl =
        typeof imageFileRecord?.['url'] === 'string' ? imageFileRecord['url'] : '';
      const slotImageUrl = typeof slot.imageUrl === 'string' ? slot.imageUrl : '';
      const filepath = imageFileUrl || slotImageUrl;
      if (!filepath) return [];
      const slotName = typeof slot.name === 'string' ? slot.name.trim() : '';
      return [
        {
          kind: 'reference' as const,
          id: slot.id,
          name: slotName || slot.id || 'Reference card',
          filepath,
        },
      ];
    });
