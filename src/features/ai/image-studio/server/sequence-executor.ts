import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import { resolveExpectedOutputCount } from '@/features/ai/image-studio/server/run-executor';
import {
  createImageStudioRun,
  getImageStudioRunById,
  type ImageStudioRunRecord,
} from '@/features/ai/image-studio/server/run-repository';
import {
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  getImageStudioSlotById,
  listImageStudioSlots,
  createImageStudioSlots,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  validateUpscaleSourceDimensions,
  upscaleImageWithSharp,
} from '@/features/ai/image-studio/server/upscale-utils';
import { resolvePromptPlaceholders } from '@/features/ai/image-studio/utils/run-request-preview';
import {
  slotHasRenderableImage,
} from '@/features/ai/image-studio/utils/sequence-slot-resolution';
import {
  normalizeImageStudioSequenceSteps,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceCropStep,
  type ImageStudioSequenceGenerateStep,
  type ImageStudioSequenceMaskStep,
  type ImageStudioSequenceStep,
  type ImageStudioSequenceUpscaleStep,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getImageFileRepository, getDiskPathFromPublicPath } from '@/features/files/server';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
} from '@/features/jobs/workers/imageStudioRunQueue';

import type {
  ImageStudioSequenceMaskContext,
  ImageStudioSequenceRunRecord,
} from './sequence-run-repository';

const STUDIO_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'studio');
const POLL_INTERVAL_MS = 1200;
const DEFAULT_GENERATION_WAIT_MS = 18 * 60 * 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_');

const normalizePublicPath = (filepath: string): string => {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
};

const guessExtensionFromMime = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('avif')) return '.avif';
  return '.png';
};

const resolveSlotImagePath = (slot: ImageStudioSlotRecord): string | null =>
  asTrimmedString(slot.imageFile?.filepath)
  ?? asTrimmedString(slot.imageUrl)
  ?? null;

const ensureRenderableSlot = (
  slot: ImageStudioSlotRecord | null | undefined,
  contextLabel: string,
): ImageStudioSlotRecord => {
  if (!slot || !slotHasRenderableImage(slot)) {
    throw new Error(`Sequence step produced a non-renderable slot (${contextLabel}).`);
  }
  return slot;
};

const loadSourceBuffer = async (
  slot: ImageStudioSlotRecord
): Promise<{
  buffer: Buffer;
  mimeHint: string | null;
  width: number;
  height: number;
  sourceOriginalOrientation: number | null;
  sourceOrientationApplied: boolean;
}> => {
  const sourcePath = resolveSlotImagePath(slot);
  if (!sourcePath) {
    throw new Error('Working slot has no source image path.');
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw new Error('Working slot source image path is invalid.');
  }

  let buffer: Buffer;
  let mimeHint: string | null = asTrimmedString(slot.imageFile?.mimetype);

  if (/^https?:\/\//i.test(normalizedPath)) {
    const response = await fetch(normalizedPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image (${response.status}).`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    mimeHint = response.headers.get('content-type') ?? mimeHint;
  } else {
    const diskPath = getDiskPathFromPublicPath(normalizedPath);
    buffer = await fs.readFile(diskPath);
  }

  const sourceMetadata = await sharp(buffer).metadata().catch(() => null);
  const sourceOriginalOrientation =
    typeof sourceMetadata?.orientation === 'number' &&
    Number.isFinite(sourceMetadata.orientation)
      ? Math.floor(sourceMetadata.orientation)
      : null;
  const sourceOrientationApplied =
    sourceOriginalOrientation !== null && sourceOriginalOrientation !== 1;

  // Normalize to display orientation so crop geometry matches what users see in canvas/browser.
  const oriented = await sharp(buffer)
    .rotate()
    .toBuffer({ resolveWithObject: true });
  const width = oriented.info.width ?? 0;
  const height = oriented.info.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  return {
    buffer: oriented.data,
    mimeHint,
    width,
    height,
    sourceOriginalOrientation,
    sourceOrientationApplied,
  };
};

const persistSequenceOutputSlot = async (params: {
  group: 'crops' | 'upscale' | 'masks';
  run: ImageStudioSequenceRunRecord;
  sourceSlot: ImageStudioSlotRecord;
  step: ImageStudioSequenceStep;
  buffer: Buffer;
  mimeType: string;
  slotLabel: string;
  metadata: Record<string, unknown>;
}): Promise<ImageStudioSlotRecord> => {
  const extension = guessExtensionFromMime(params.mimeType);
  const safeProjectId = sanitizeSegment(params.run.projectId);
  const safeSourceSlotId = sanitizeSegment(params.sourceSlot.id);
  const stepId = sanitizeSegment(params.step.id || params.step.type);
  const fileName = sanitizeFilename(
    `sequence-${params.run.id}-${stepId}-${Date.now()}${extension}`
  );
  const diskDir = path.join(
    STUDIO_UPLOADS_ROOT,
    params.group,
    safeProjectId,
    safeSourceSlotId,
  );
  await fs.mkdir(diskDir, { recursive: true });
  const diskPath = path.join(diskDir, fileName);
  await fs.writeFile(diskPath, params.buffer);

  const publicPath = `/uploads/studio/${params.group}/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

  const metadataInfo = await sharp(params.buffer).metadata().catch(() => null);
  const imageFileRepository = await getImageFileRepository();
  const imageFile = await imageFileRepository.createImageFile({
    filename: fileName,
    filepath: publicPath,
    mimetype: params.mimeType,
    size: params.buffer.length,
    width: metadataInfo?.width ?? null,
    height: metadataInfo?.height ?? null,
    tags: ['image-studio', 'sequence', params.group],
  });

  const sourceLabel = asTrimmedString(params.sourceSlot.name) ?? params.sourceSlot.id;
  const createdSlots = await createImageStudioSlots(params.run.projectId, [
    {
      name: `${sourceLabel} • ${params.slotLabel}`,
      folderPath: params.sourceSlot.folderPath ?? null,
      imageFileId: imageFile.id,
      imageUrl: imageFile.filepath,
      imageBase64: null,
      metadata: {
        role: 'generation',
        sourceSlotId: params.sourceSlot.id,
        sourceSlotIds: [params.sourceSlot.id],
        relationType: 'sequence:output',
        sequence: {
          runId: params.run.id,
          stepId: params.step.id,
          stepType: params.step.type,
          timestamp: new Date().toISOString(),
          ...(isRecord(params.metadata) ? params.metadata : {}),
        },
      },
    },
  ]);

  const createdSlot = createdSlots[0];
  if (!createdSlot) {
    throw new Error('Failed to persist sequence step output slot.');
  }

  await upsertImageStudioSlotLink({
    projectId: params.run.projectId,
    sourceSlotId: params.sourceSlot.id,
    targetSlotId: createdSlot.id,
    relationType: `sequence:step:${params.run.id}:${params.step.id}`,
    metadata: {
      runId: params.run.id,
      stepId: params.step.id,
      stepType: params.step.type,
    },
  });

  return createdSlot;
};

const parseAspectRatio = (value: string | null): number | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.includes(':')) {
    const [left, right] = normalized.split(':', 2);
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (!Number.isFinite(leftNum) || !Number.isFinite(rightNum)) return null;
    if (!(leftNum > 0 && rightNum > 0)) return null;
    return leftNum / rightNum;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

type PixelRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const clampRectToBounds = (
  rect: PixelRect,
  sourceWidth: number,
  sourceHeight: number,
): PixelRect => {
  const left = Math.max(0, Math.min(sourceWidth - 1, Math.floor(rect.left)));
  const top = Math.max(0, Math.min(sourceHeight - 1, Math.floor(rect.top)));
  const width = Math.max(1, Math.min(sourceWidth - left, Math.floor(rect.width)));
  const height = Math.max(1, Math.min(sourceHeight - top, Math.floor(rect.height)));
  return {
    left,
    top,
    width,
    height,
  };
};

const withPadding = (
  rect: PixelRect,
  paddingPercent: number,
  sourceWidth: number,
  sourceHeight: number,
): PixelRect => {
  if (!(paddingPercent > 0)) {
    return clampRectToBounds(rect, sourceWidth, sourceHeight);
  }

  const padX = (rect.width * paddingPercent) / 100;
  const padY = (rect.height * paddingPercent) / 100;

  return clampRectToBounds(
    {
      left: rect.left - padX,
      top: rect.top - padY,
      width: rect.width + padX * 2,
      height: rect.height + padY * 2,
    },
    sourceWidth,
    sourceHeight,
  );
};

const resolveAlphaBounds = async (
  sourceBuffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<PixelRect | null> => {
  const { data, info } = await sharp(sourceBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const width = info.width;
  const height = info.height;
  if (!(width > 0 && height > 0 && channels >= 4)) {
    return null;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3] ?? 0;
      if (alpha <= 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const rect = {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  return clampRectToBounds(rect, sourceWidth, sourceHeight);
};

const resolveCropRect = async (
  step: ImageStudioSequenceCropStep,
  sourceBuffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<PixelRect> => {
  const kind = step.config.kind;
  let rect: PixelRect;

  if (
    kind === 'selected_shape' &&
    Array.isArray(step.config.polygon) &&
    step.config.polygon.length >= 3
  ) {
    const xs = step.config.polygon.map((point) => Math.max(0, Math.min(1, point.x)) * sourceWidth);
    const ys = step.config.polygon.map((point) => Math.max(0, Math.min(1, point.y)) * sourceHeight);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    rect = {
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
    return withPadding(rect, step.config.paddingPercent, sourceWidth, sourceHeight);
  }

  if ((kind === 'bbox' || kind === 'selected_shape') && step.config.bbox) {
    rect = {
      left: step.config.bbox.x * sourceWidth,
      top: step.config.bbox.y * sourceHeight,
      width: step.config.bbox.width * sourceWidth,
      height: step.config.bbox.height * sourceHeight,
    };
    return withPadding(rect, step.config.paddingPercent, sourceWidth, sourceHeight);
  }

  if (
    kind === 'polygon' &&
    Array.isArray(step.config.polygon) &&
    step.config.polygon.length >= 3
  ) {
    const xs = step.config.polygon.map((point) => Math.max(0, Math.min(1, point.x)) * sourceWidth);
    const ys = step.config.polygon.map((point) => Math.max(0, Math.min(1, point.y)) * sourceHeight);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    rect = {
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
    return withPadding(rect, step.config.paddingPercent, sourceWidth, sourceHeight);
  }

  if (kind === 'selected_shape') {
    throw new Error('Selected-shape crop is missing shape geometry. Select a shape and try again.');
  }

  if (kind === 'alpha_object_bbox') {
    const alphaBounds = await resolveAlphaBounds(sourceBuffer, sourceWidth, sourceHeight);
    if (alphaBounds) {
      return withPadding(alphaBounds, step.config.paddingPercent, sourceWidth, sourceHeight);
    }
  }

  if (kind === 'center_fit') {
    const ratio = parseAspectRatio(step.config.aspectRatio) ?? (sourceWidth / sourceHeight);
    const sourceRatio = sourceWidth / sourceHeight;

    let width = sourceWidth;
    let height = sourceHeight;

    if (sourceRatio > ratio) {
      width = Math.max(1, Math.round(sourceHeight * ratio));
      height = sourceHeight;
    } else if (sourceRatio < ratio) {
      width = sourceWidth;
      height = Math.max(1, Math.round(sourceWidth / ratio));
    }

    rect = {
      left: Math.floor((sourceWidth - width) / 2),
      top: Math.floor((sourceHeight - height) / 2),
      width,
      height,
    };
    return withPadding(rect, step.config.paddingPercent, sourceWidth, sourceHeight);
  }

  const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
  rect = {
    left: Math.floor((sourceWidth - side) / 2),
    top: Math.floor((sourceHeight - side) / 2),
    width: side,
    height: side,
  };

  return withPadding(rect, step.config.paddingPercent, sourceWidth, sourceHeight);
};

const toPolygonPointsSvg = (
  polygon: Array<{ x: number; y: number }>,
  width: number,
  height: number,
): string =>
  polygon
    .map((point) => {
      const x = Math.max(0, Math.min(1, point.x)) * width;
      const y = Math.max(0, Math.min(1, point.y)) * height;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');

const resolveMaskColors = (
  variant: 'white' | 'black',
  inverted: boolean,
): { background: '#000000' | '#ffffff'; fill: '#000000' | '#ffffff' } => {
  const preferWhite = variant === 'white';
  const background =
    (preferWhite && !inverted) || (!preferWhite && inverted)
      ? '#000000'
      : '#ffffff';
  const fill = background === '#000000' ? '#ffffff' : '#000000';
  return { background, fill };
};

const buildMaskBuffer = async (params: {
  width: number;
  height: number;
  polygons: Array<Array<{ x: number; y: number }>>;
  variant: 'white' | 'black';
  invert: boolean;
  feather: number;
}): Promise<Buffer> => {
  const { background, fill } = resolveMaskColors(params.variant, params.invert);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}" viewBox="0 0 ${params.width} ${params.height}">
      <rect x="0" y="0" width="${params.width}" height="${params.height}" fill="${background}" />
      ${params.polygons
    .map((polygon) => `<polygon points="${toPolygonPointsSvg(polygon, params.width, params.height)}" fill="${fill}" />`)
    .join('')}
    </svg>`,
    'utf8',
  );

  let pipeline = sharp(svg).png();
  if (params.feather > 0) {
    pipeline = pipeline.blur(Math.min(10, params.feather / 10));
  }
  return pipeline.toBuffer();
};

const buildReferenceAssets = async (params: {
  projectId: string;
  currentSlotId: string;
  referenceSlotIds: string[];
}): Promise<Array<{ id?: string; filepath: string }>> => {
  const uniqueIds = Array.from(new Set(params.referenceSlotIds));
  if (uniqueIds.length === 0) return [];

  const resolved = await Promise.all(
    uniqueIds.map(async (slotId) => ({
      slotId,
      slot: await getImageStudioSlotById(slotId),
    })),
  );

  return resolved
    .filter(({ slotId, slot }) => {
      if (!slot) return false;
      if (slotId === params.currentSlotId) return false;
      return slot.projectId === params.projectId;
    })
    .map(({ slotId, slot }) => {
      const filepath = resolveSlotImagePath(slot!);
      return {
        id: slotId,
        filepath: filepath ?? '',
      };
    })
    .filter((entry) => Boolean(entry.filepath));
};

const readRunCreatedSlotIds = (run: ImageStudioRunRecord): string[] => {
  const history = Array.isArray(run.historyEvents) ? [...run.historyEvents] : [];
  history.reverse();

  for (const event of history) {
    if (event?.type !== 'completed') continue;
    const payload = isRecord(event.payload) ? event.payload : null;
    if (!payload) continue;
    const idsRaw = payload['createdSlotIds'];
    if (!Array.isArray(idsRaw)) continue;
    const ids = idsRaw
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (ids.length > 0) return ids;
  }

  return [];
};

const readGenerationRunId = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = isRecord(slot.metadata) ? slot.metadata : null;
  const value = metadata ? metadata['generationRunId'] : null;
  return asTrimmedString(value);
};

const readGenerationOutputIndex = (slot: ImageStudioSlotRecord): number => {
  const metadata = isRecord(slot.metadata) ? slot.metadata : null;
  const value = metadata ? metadata['generationOutputIndex'] : null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.floor(numeric);
};

const resolveGeneratedSlotsForRun = async (
  projectId: string,
  runId: string,
): Promise<string[]> => {
  const slots = await listImageStudioSlots(projectId);
  const matches = slots
    .filter((slot) => readGenerationRunId(slot) === runId)
    .sort((a, b) => readGenerationOutputIndex(a) - readGenerationOutputIndex(b));
  return matches.map((slot) => slot.id);
};

const waitForRunTerminal = async (
  runId: string,
  timeoutMs: number,
): Promise<ImageStudioRunRecord> => {
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / POLL_INTERVAL_MS));
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const run = await getImageStudioRunById(runId);
    if (!run) {
      throw new Error(`Generation run ${runId} no longer exists.`);
    }
    if (run.status === 'completed' || run.status === 'failed') {
      return run;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timed out while waiting for generation run completion.');
};

const executeCropStep = async (params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceCropStep;
  currentSlot: ImageStudioSlotRecord;
}): Promise<{ nextSlotId: string; producedSlotIds: string[] }> => {
  const source = await loadSourceBuffer(params.currentSlot);
  const rect = await resolveCropRect(
    params.step,
    source.buffer,
    source.width,
    source.height,
  );

  const output = await sharp(source.buffer)
    .extract(rect)
    .png()
    .toBuffer();

  const createdSlot = await persistSequenceOutputSlot({
    group: 'crops',
    run: params.run,
    sourceSlot: params.currentSlot,
    step: params.step,
    buffer: output,
    mimeType: 'image/png',
    slotLabel: 'Crop',
    metadata: {
      mode: params.step.config.kind,
      cropRect: rect,
      paddingPercent: params.step.config.paddingPercent,
      sourceWidth: source.width,
      sourceHeight: source.height,
      sourceOriginalOrientation: source.sourceOriginalOrientation,
      sourceOrientationApplied: source.sourceOrientationApplied,
      selectedShapeId:
        params.step.config.kind === 'selected_shape'
          ? params.step.config.selectedShapeId ?? null
          : null,
    },
  });
  ensureRenderableSlot(createdSlot, `crop:${params.step.id}`);

  return {
    nextSlotId: createdSlot.id,
    producedSlotIds: [createdSlot.id],
  };
};

const executeMaskStep = async (params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceMaskStep;
  currentSlot: ImageStudioSlotRecord;
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<{
  nextSlotId: string;
  producedSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
}> => {
  const polygons = params.step.config.source === 'preset_polygons'
    ? params.step.config.polygons
    : (params.runtimeMask?.polygons ?? []);

  if (!Array.isArray(polygons) || polygons.length === 0) {
    throw new Error('Mask step has no polygons to apply.');
  }

  const nextMask: ImageStudioSequenceMaskContext = {
    polygons,
    invert: params.step.config.invert,
    feather: params.step.config.feather,
  };

  if (!params.step.config.persistMaskSlot) {
    return {
      nextSlotId: params.currentSlot.id,
      producedSlotIds: [],
      runtimeMask: nextMask,
    };
  }

  const source = await loadSourceBuffer(params.currentSlot);
  const output = await buildMaskBuffer({
    width: source.width,
    height: source.height,
    polygons,
    variant: params.step.config.variant,
    invert: params.step.config.invert,
    feather: params.step.config.feather,
  });

  const maskSlot = await persistSequenceOutputSlot({
    group: 'masks',
    run: params.run,
    sourceSlot: params.currentSlot,
    step: params.step,
    buffer: output,
    mimeType: 'image/png',
    slotLabel: 'Mask',
    metadata: {
      source: params.step.config.source,
      polygonCount: polygons.length,
      invert: params.step.config.invert,
      feather: params.step.config.feather,
      variant: params.step.config.variant,
    },
  });
  ensureRenderableSlot(maskSlot, `mask:${params.step.id}`);

  return {
    nextSlotId: params.currentSlot.id,
    producedSlotIds: [maskSlot.id],
    runtimeMask: nextMask,
  };
};

const resolveRegeneratePrompt = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = isRecord(slot.metadata) ? slot.metadata : null;
  const generationRequest = metadata && isRecord(metadata['generationRequest'])
    ? metadata['generationRequest']
    : null;
  return asTrimmedString(generationRequest?.['prompt']);
};

const executeGenerateStep = async (params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceGenerateStep;
  currentSlot: ImageStudioSlotRecord;
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<{ nextSlotId: string; producedSlotIds: string[]; generatedRunId: string }> => {
  const assetPath = resolveSlotImagePath(params.currentSlot);
  if (!assetPath) {
    throw new Error('Current slot has no image source for generation.');
  }

  const settingsSnapshot = parseImageStudioSettings(
    params.run.request.studioSettings
      ? JSON.stringify(params.run.request.studioSettings)
      : null,
  );

  if (params.step.config.modelOverride) {
    settingsSnapshot.targetAi.openai.model = params.step.config.modelOverride;
  }

  if (typeof params.step.config.outputCount === 'number') {
    settingsSnapshot.targetAi.openai.image.n = params.step.config.outputCount;
  }

  let prompt = params.run.request.prompt;
  if (params.step.type === 'regenerate') {
    const regeneratePrompt = resolveRegeneratePrompt(params.currentSlot);
    if (regeneratePrompt) {
      prompt = regeneratePrompt;
    }
  }

  if (params.step.config.promptMode === 'override' && params.step.config.promptTemplate) {
    prompt = params.step.config.promptTemplate;
  }

  prompt = resolvePromptPlaceholders(prompt, params.run.request.paramsState).trim();
  if (!prompt) {
    throw new Error('Sequence generation prompt resolved to an empty value.');
  }

  const referenceAssets = params.step.config.referencePolicy === 'none'
    ? []
    : await buildReferenceAssets({
      projectId: params.run.projectId,
      currentSlotId: params.currentSlot.id,
      referenceSlotIds: params.run.request.referenceSlotIds,
    });

  const generationRequest = {
    projectId: params.run.projectId,
    asset: {
      id: params.currentSlot.id,
      filepath: assetPath,
    },
    ...(referenceAssets.length > 0 ? { referenceAssets } : {}),
    prompt,
    ...(params.runtimeMask
      ? {
        mask: {
          type: 'polygons' as const,
          polygons: params.runtimeMask.polygons,
          invert: params.runtimeMask.invert,
          feather: params.runtimeMask.feather,
        },
      }
      : {}),
    studioSettings: settingsSnapshot as unknown as Record<string, unknown>,
  };

  const expectedOutputs = resolveExpectedOutputCount(generationRequest);
  const generationRun = await createImageStudioRun({
    projectId: params.run.projectId,
    request: generationRequest,
    expectedOutputs,
  });

  startImageStudioRunQueue();
  await enqueueImageStudioRunJob(generationRun.id);

  const finishedRun = await waitForRunTerminal(
    generationRun.id,
    params.step.timeoutMs ?? DEFAULT_GENERATION_WAIT_MS,
  );

  if (finishedRun.status !== 'completed') {
    throw new Error(
      finishedRun.errorMessage || `${params.step.type} generation run failed.`,
    );
  }

  const createdSlotIdsFromHistory = readRunCreatedSlotIds(finishedRun);
  const createdSlotIds = createdSlotIdsFromHistory.length > 0
    ? createdSlotIdsFromHistory
    : await resolveGeneratedSlotsForRun(params.run.projectId, generationRun.id);

  const uniqueSlotIds = Array.from(new Set(createdSlotIds));
  if (uniqueSlotIds.length === 0) {
    throw new Error('Generation run completed but produced no slot outputs.');
  }

  const renderableSlotIds: string[] = [];
  for (const slotId of uniqueSlotIds) {
    const slot = await getImageStudioSlotById(slotId);
    if (slot?.projectId !== params.run.projectId) continue;
    if (!slotHasRenderableImage(slot)) continue;
    renderableSlotIds.push(slot.id);
  }
  if (renderableSlotIds.length === 0) {
    throw new Error('Generation run completed but returned no renderable slot outputs.');
  }

  return {
    nextSlotId: renderableSlotIds[0]!,
    producedSlotIds: renderableSlotIds,
    generatedRunId: generationRun.id,
  };
};

const executeUpscaleStep = async (params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceUpscaleStep;
  currentSlot: ImageStudioSlotRecord;
}): Promise<{ nextSlotId: string; producedSlotIds: string[] }> => {
  const source = await loadSourceBuffer(params.currentSlot);
  const validation = validateUpscaleSourceDimensions(source.width, source.height);
  if (!validation.ok) {
    throw new Error('Source image exceeds upscale processing limits.');
  }

  const output = await upscaleImageWithSharp({
    sourceBuffer: source.buffer,
    sourceWidth: source.width,
    sourceHeight: source.height,
    strategy: params.step.config.strategy,
    ...(params.step.config.strategy === 'target_resolution'
      ? {
        targetWidth: params.step.config.targetWidth,
        targetHeight: params.step.config.targetHeight,
      }
      : {
        scale: params.step.config.scale,
      }),
  });

  const createdSlot = await persistSequenceOutputSlot({
    group: 'upscale',
    run: params.run,
    sourceSlot: params.currentSlot,
    step: params.step,
    buffer: output.outputBuffer,
    mimeType: output.outputMime,
    slotLabel: 'Upscale',
    metadata: {
      strategy: output.strategy,
      scale: output.scale,
      width: output.outputWidth,
      height: output.outputHeight,
      kernel: output.kernel,
      smoothingQuality: params.step.config.smoothingQuality,
    },
  });
  ensureRenderableSlot(createdSlot, `upscale:${params.step.id}`);

  return {
    nextSlotId: createdSlot.id,
    producedSlotIds: [createdSlot.id],
  };
};

export type ImageStudioSequenceStepExecutionContext = {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  stepIndex: number;
  inputSlotId: string;
  runtimeMask: ImageStudioSequenceMaskContext;
  outputSlotIds: string[];
};

export type ImageStudioSequenceStepExecutionResult = {
  nextSlotId: string;
  producedSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
  details?: Record<string, unknown>;
};

export async function executeImageStudioSequenceStep(
  context: ImageStudioSequenceStepExecutionContext,
): Promise<ImageStudioSequenceStepExecutionResult> {
  const currentSlot = await getImageStudioSlotById(context.inputSlotId);
  if (currentSlot?.projectId !== context.run.projectId) {
    throw new Error('Step input slot is missing or does not belong to the sequence project.');
  }

  if (context.step.type === 'crop_center') {
    const result = await executeCropStep({
      run: context.run,
      step: context.step,
      currentSlot,
    });
    return {
      nextSlotId: result.nextSlotId,
      producedSlotIds: result.producedSlotIds,
      runtimeMask: context.runtimeMask,
      details: {
        kind: context.step.config.kind,
      },
    };
  }

  if (context.step.type === 'mask') {
    const result = await executeMaskStep({
      run: context.run,
      step: context.step,
      currentSlot,
      runtimeMask: context.runtimeMask,
    });
    return {
      nextSlotId: result.nextSlotId,
      producedSlotIds: result.producedSlotIds,
      runtimeMask: result.runtimeMask,
      details: {
        source: context.step.config.source,
        polygonCount: result.runtimeMask?.polygons.length ?? 0,
      },
    };
  }

  if (context.step.type === 'generate' || context.step.type === 'regenerate') {
    const result = await executeGenerateStep({
      run: context.run,
      step: context.step,
      currentSlot,
      runtimeMask: context.runtimeMask,
    });

    return {
      nextSlotId: result.nextSlotId,
      producedSlotIds: result.producedSlotIds,
      runtimeMask: context.runtimeMask,
      details: {
        generationRunId: result.generatedRunId,
        outputCount: result.producedSlotIds.length,
      },
    };
  }

  if (context.step.type !== 'upscale') {
    throw new Error(`Unsupported sequence step type: ${context.step.type}`);
  }

  const upscaleResult = await executeUpscaleStep({
    run: context.run,
    step: context.step,
    currentSlot,
  });
  return {
    nextSlotId: upscaleResult.nextSlotId,
    producedSlotIds: upscaleResult.producedSlotIds,
    runtimeMask: context.runtimeMask,
    details: {
      strategy: context.step.config.strategy,
    },
  };
}

export function resolveSequenceStepsForExecution(
  run: ImageStudioSequenceRunRecord,
): ImageStudioSequenceStep[] {
  const parsedSettings = parseImageStudioSettings(
    run.request.studioSettings
      ? JSON.stringify(run.request.studioSettings)
      : null,
  );

  if (Array.isArray(run.request.steps) && run.request.steps.length > 0) {
    return normalizeImageStudioSequenceSteps(run.request.steps, {
      fallbackOperations: run.request.steps.map((step) => step.type),
    });
  }

  return resolveImageStudioSequenceActiveSteps(parsedSettings.projectSequencing);
}
