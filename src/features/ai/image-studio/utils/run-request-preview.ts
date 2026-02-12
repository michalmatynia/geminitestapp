import type { VectorShape } from '@/features/vector-drawing';

import type { RunStudioPayload } from '../hooks/useImageStudioMutations';
import type { ImageStudioSlotRecord } from '../types';
import type { ImageStudioSettings } from './studio-settings';

type BuildRunRequestPayloadInput = {
  projectId: string;
  workingSlot: ImageStudioSlotRecord | null;
  slots: ImageStudioSlotRecord[];
  compositeAssetIds: string[];
  promptText: string;
  paramsState: Record<string, unknown> | null;
  maskShapes: VectorShape[];
  maskInvert: boolean;
  maskFeather: number;
  studioSettings: ImageStudioSettings;
};

export type RequestPreviewImage = {
  kind: 'base' | 'reference';
  id?: string | undefined;
  name: string;
  filepath: string;
};

export type RunRequestPreview = {
  payload: RunStudioPayload | null;
  errors: string[];
  resolvedPrompt: string;
  maskShapeCount: number;
  images: RequestPreviewImage[];
};

function getValueAtPath(root: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.').map((key) => key.trim()).filter(Boolean);
  let cursor: unknown = root;
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

export function resolvePromptPlaceholders(prompt: string, paramsState: Record<string, unknown> | null): string {
  if (!paramsState) return prompt;
  return prompt.replace(/{{\s*([^}]+)\s*}}/g, (_match: string, rawToken: string) => {
    const key = String(rawToken || '').trim();
    if (!key) return '';
    const value = getValueAtPath(paramsState, key);
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  });
}

export function buildRunRequestPreview(input: BuildRunRequestPayloadInput): RunRequestPreview {
  const {
    projectId,
    workingSlot,
    slots,
    compositeAssetIds,
    promptText,
    paramsState,
    maskShapes,
    maskInvert,
    maskFeather,
    studioSettings,
  } = input;

  const errors: string[] = [];
  if (!projectId.trim()) {
    errors.push('Select a project first.');
  }
  if (!workingSlot) {
    errors.push('Select a working card first.');
  }

  const filepath = workingSlot?.imageFile?.filepath || '';
  if (!filepath) {
    errors.push('Working card has no image filepath.');
  }

  const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
  if (!resolvedPrompt) {
    errors.push('Resolved prompt is empty.');
  }

  const eligibleShapes = maskShapes.filter(
    (shape) => shape.visible && shape.closed && (shape.type === 'polygon' || shape.type === 'lasso') && shape.points.length >= 3
  );
  const mask: RunStudioPayload['mask'] =
    eligibleShapes.length > 0
      ? {
        type: 'polygons',
        polygons: eligibleShapes.map((shape) => shape.points.map((point) => ({ x: point.x, y: point.y }))),
        invert: maskInvert || undefined,
        feather: maskFeather > 0 ? maskFeather : undefined,
      }
      : null;

  const referenceSlots = compositeAssetIds
    .map((id: string) => slots.find((slot) => slot.id === id))
    .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));

  const referenceAssets = referenceSlots
    .map((slot: ImageStudioSlotRecord) => ({
      id: slot.id,
      filepath: slot.imageFile?.filepath || slot.imageUrl || '',
    }))
    .filter((asset) => Boolean(asset.filepath));

  const images: RequestPreviewImage[] = [];
  if (filepath) {
    images.push({
      kind: 'base',
      id: workingSlot?.id,
      name: workingSlot?.name || workingSlot?.id || 'Base image',
      filepath,
    });
  }
  referenceSlots.forEach((slot) => {
    const refPath = slot.imageFile?.filepath || slot.imageUrl || '';
    if (!refPath) return;
    images.push({
      kind: 'reference',
      id: slot.id,
      name: slot.name || slot.id || 'Reference image',
      filepath: refPath,
    });
  });

  if (errors.length > 0) {
    return {
      payload: null,
      errors,
      resolvedPrompt,
      maskShapeCount: eligibleShapes.length,
      images,
    };
  }

  const payload: RunStudioPayload = {
    projectId: projectId.trim(),
    asset: {
      filepath,
      ...(workingSlot?.id ? { id: workingSlot.id } : {}),
    },
    ...(referenceAssets.length > 0 ? { referenceAssets } : {}),
    prompt: resolvedPrompt,
    mask,
    studioSettings: studioSettings as unknown as Record<string, unknown>,
  };

  return {
    payload,
    errors,
    resolvedPrompt,
    maskShapeCount: eligibleShapes.length,
    images,
  };
}
