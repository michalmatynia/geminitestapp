import type { VectorShape } from '@/features/vector-drawing';

import {
  polygonsFromShapes,
  type ImageContentFrame,
  type MaskShapeForExport,
} from '../generation-toolbar/GenerationToolbarImageUtils';

import type { ImageStudioSlotRecord } from '../../types';
import type { RequestPreviewImage } from '../../utils/run-request-preview';

export const CHARS_PER_TOKEN_ESTIMATE = 4;
export const ACTION_HISTORY_MAX_STEPS = 10;

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

export const cloneSerializableValue = <T,>(value: T): T => {
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

export const estimatePromptTokens = (prompt: string): number => {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / CHARS_PER_TOKEN_ESTIMATE));
};

export const resolveModelCostProfile = (model: string): ModelCostProfile => {
  const normalizedModel = model.trim().toLowerCase();
  if (!normalizedModel) return DEFAULT_MODEL_COST_PROFILE;
  const matched = MODEL_COST_PROFILES.find(({ prefix }) =>
    normalizedModel.startsWith(prefix)
  );
  return matched ? matched.profile : DEFAULT_MODEL_COST_PROFILE;
};

export type StudioActionHistorySnapshot = {
  selectedFolder: string;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  previewMode: 'image' | '3d';
  compositeAssetIds: string[];
  tool: 'select' | 'polygon' | 'lasso' | 'rect' | 'ellipse' | 'brush';
  canvasSelectionEnabled: boolean;
  imageTransformMode: 'none' | 'move';
  canvasImageOffset: { x: number; y: number };
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
      const filepath = slot.imageFile?.filepath || slot.imageUrl || '';
      if (!filepath) return [];
      return [{
        kind: 'reference' as const,
        id: slot.id,
        name: slot.name || slot.id || 'Reference card',
        filepath,
      }];
    });
