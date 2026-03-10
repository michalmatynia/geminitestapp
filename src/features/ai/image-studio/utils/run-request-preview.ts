import type { ImageStudioSlotRecord, RunStudioPayload } from '@/shared/contracts/image-studio';
import type { VectorShape } from '@/shared/lib/vector-drawing';

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
  selectedModelId: string;
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

const DALLE_PROMPT_MAX_CHARS = 1000;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const countPromptCharacters = (value: string): number => Array.from(value).length;
const isDalleModelId = (value: string): boolean => value.trim().toLowerCase().startsWith('dall-e');

const readSlotImagePath = (slot: ImageStudioSlotRecord | null | undefined): string => {
  const imageFileRecord = asRecord(slot?.imageFile);
  const imageFilePath =
    typeof imageFileRecord?.['filepath'] === 'string'
      ? imageFileRecord['filepath'].trim()
      : typeof imageFileRecord?.['path'] === 'string'
        ? imageFileRecord['path'].trim()
        : typeof imageFileRecord?.['url'] === 'string'
          ? imageFileRecord['url'].trim()
          : '';
  if (imageFilePath) return imageFilePath;
  return typeof slot?.imageUrl === 'string' ? slot.imageUrl.trim() : '';
};

const readEnvironmentReferenceAsset = (
  slot: ImageStudioSlotRecord | null
): { id?: string; filepath: string; name: string } | null => {
  const metadata = asRecord(slot?.metadata);
  const environmentReference = asRecord(metadata?.['environmentReference']);
  if (!environmentReference) return null;

  const filepath =
    typeof environmentReference['imageUrl'] === 'string'
      ? environmentReference['imageUrl'].trim()
      : '';
  if (!filepath) return null;

  const id =
    typeof environmentReference['imageFileId'] === 'string'
      ? environmentReference['imageFileId'].trim() || undefined
      : undefined;
  const name =
    typeof environmentReference['filename'] === 'string' && environmentReference['filename'].trim()
      ? environmentReference['filename'].trim()
      : 'Environment Reference';

  return {
    ...(id ? { id } : {}),
    filepath,
    name,
  };
};

function getValueAtPath(root: Record<string, unknown>, path: string): unknown {
  const keys = path
    .split('.')
    .map((key) => key.trim())
    .filter(Boolean);
  let cursor: unknown = root;
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

export function resolvePromptPlaceholders(
  prompt: string,
  paramsState: Record<string, unknown> | null
): string {
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
    selectedModelId,
    studioSettings,
  } = input;

  const errors: string[] = [];
  if (!projectId.trim()) {
    errors.push('Select a project first.');
  }
  const sourceFilepath = readSlotImagePath(workingSlot);
  const hasSourceAsset = Boolean(sourceFilepath);

  const resolvedPrompt = resolvePromptPlaceholders(promptText, paramsState).trim();
  if (!resolvedPrompt) {
    errors.push('Resolved prompt is empty.');
  }
  const selectedModel = selectedModelId.trim();
  if (selectedModel && isDalleModelId(selectedModel)) {
    const resolvedPromptLength = countPromptCharacters(resolvedPrompt);
    if (resolvedPromptLength > DALLE_PROMPT_MAX_CHARS) {
      const controlPromptLength = countPromptCharacters(promptText.trim());
      if (resolvedPromptLength !== controlPromptLength) {
        errors.push(
          `Selected model (${selectedModel}) allows max ${DALLE_PROMPT_MAX_CHARS} characters. Resolved prompt is ${resolvedPromptLength} chars while Control Prompt field is ${controlPromptLength} chars.`
        );
      } else {
        errors.push(
          `Selected model (${selectedModel}) allows max ${DALLE_PROMPT_MAX_CHARS} characters. Current prompt length is ${resolvedPromptLength} chars.`
        );
      }
    }
  }

  const eligibleShapes = maskShapes.filter(
    (shape) =>
      shape.visible &&
      shape.closed &&
      (shape.type === 'polygon' || shape.type === 'lasso') &&
      shape.points.length >= 3
  );
  const mask: RunStudioPayload['mask'] =
    hasSourceAsset && eligibleShapes.length > 0
      ? {
        type: 'polygons',
        polygons: eligibleShapes.map((shape: VectorShape) =>
          shape.points.map((point: { x: number; y: number }) => ({ x: point.x, y: point.y }))
        ),
        invert: maskInvert || undefined,
        feather: maskFeather > 0 ? maskFeather : undefined,
      }
      : null;

  const referenceSlots = (hasSourceAsset ? compositeAssetIds : [])
    .map((id: string) => slots.find((slot) => slot.id === id))
    .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));

  const referenceAssets: Array<{ filepath: string; id?: string }> = referenceSlots
    .map((slot: ImageStudioSlotRecord) => ({
      id: slot.id,
      filepath: readSlotImagePath(slot),
    }))
    .filter((asset) => Boolean(asset.filepath));
  const environmentReferenceAsset = hasSourceAsset
    ? readEnvironmentReferenceAsset(workingSlot)
    : null;
  if (environmentReferenceAsset) {
    const exists = referenceAssets.some(
      (asset) =>
        asset.filepath === environmentReferenceAsset.filepath ||
        Boolean(
          asset.id && environmentReferenceAsset.id && asset.id === environmentReferenceAsset.id
        )
    );
    if (!exists) {
      referenceAssets.push({
        ...(environmentReferenceAsset.id ? { id: environmentReferenceAsset.id } : {}),
        filepath: environmentReferenceAsset.filepath,
      });
    }
  }

  const images: RequestPreviewImage[] = [];
  if (sourceFilepath) {
    images.push({
      kind: 'base',
      id: workingSlot?.id,
      name: workingSlot?.name || workingSlot?.id || 'Base image',
      filepath: sourceFilepath,
    });
  }
  referenceSlots.forEach((slot) => {
    const refPath = readSlotImagePath(slot);
    if (!refPath) return;
    images.push({
      kind: 'reference',
      id: slot.id,
      name: slot.name || slot.id || 'Reference image',
      filepath: refPath,
    });
  });
  if (environmentReferenceAsset) {
    const exists = images.some(
      (image) =>
        image.filepath === environmentReferenceAsset.filepath ||
        Boolean(
          image.id && environmentReferenceAsset.id && image.id === environmentReferenceAsset.id
        )
    );
    if (!exists) {
      images.push({
        kind: 'reference',
        ...(environmentReferenceAsset.id ? { id: environmentReferenceAsset.id } : {}),
        name: environmentReferenceAsset.name,
        filepath: environmentReferenceAsset.filepath,
      });
    }
  }

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
    ...(hasSourceAsset
      ? {
        asset: {
          filepath: sourceFilepath,
          ...(workingSlot?.id ? { id: workingSlot.id } : {}),
        },
      }
      : {}),
    ...(hasSourceAsset && referenceAssets.length > 0 ? { referenceAssets } : {}),
    prompt: resolvedPrompt,
    ...(hasSourceAsset ? { mask } : {}),
    studioSettings: studioSettings as Record<string, unknown>,
  };

  return {
    payload,
    errors,
    resolvedPrompt,
    maskShapeCount: eligibleShapes.length,
    images,
  };
}
