import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  imageStudioRunRequestSchema,
  resolveExpectedOutputCount,
  sanitizeImageStudioProjectId,
  type ImageStudioRunRequest,
} from '@/features/ai/image-studio/server/run-executor';
import {
  createImageStudioRun,
  getImageStudioRunById,
  updateImageStudioRun,
  type ImageStudioRunRecord,
} from '@/features/ai/image-studio/server/run-repository';
import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import { listImageStudioSlotLinks } from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  listImageStudioSlots,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import { supportsImageSequenceGeneration } from '@/features/ai/image-studio/utils/image-models';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceStep,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getDiskPathFromPublicPath, uploadFile } from '@/features/files/server';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/features/image-slots';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
  type ImageStudioRunDispatchMode,
} from '@/features/jobs/workers/imageStudioRunQueue';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/features/products/constants';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { getProductRepository } from '@/features/products/services/product-repository';
import { createProductStudioRunAudit } from '@/features/products/services/product-studio-audit-service';
import {
  getProductStudioConfig,
  setProductStudioProject,
  setProductStudioSourceSlot,
  type ProductStudioConfig,
} from '@/features/products/services/product-studio-config';
import { productService } from '@/features/products/services/productService';
import type { ProductWithImages } from '@/features/products/types';
import {
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioExecutionRoute,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingConfig,
} from '@/features/products/types/product-studio';
import {
  badRequestError,
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';

type ProductStudioVariantsResult = {
  config: ProductStudioConfig;
  sequencing: ProductStudioSequencingConfig;
  projectId: string | null;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

export type ProductStudioSendResult = {
  config: ProductStudioConfig;
  sequencing: ProductStudioSequencingConfig;
  projectId: string;
  imageSlotIndex: number;
  sourceSlot: ImageStudioSlotRecord;
  runId: string;
  runStatus: ImageStudioRunRecord['status'] | 'cancelled';
  expectedOutputs: number;
  dispatchMode: ImageStudioRunDispatchMode;
  runKind: 'generation' | 'sequence';
  sequenceRunId: string | null;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  warnings?: string[];
};

type ProductImageFileSource = {
  id: string;
  filepath: string;
  filename: string | null;
  mimetype: string | null;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/i;

type ResolvePostProductionRouteInput = {
  sequencing: ProductStudioSequencingConfig;
  requestedMode: ProductStudioSequenceGenerationMode;
  modelId: string;
};

type ResolvePostProductionRouteResult = {
  executionRoute: ProductStudioExecutionRoute;
  runKind: ProductStudioSendResult['runKind'];
  resolvedMode: ProductStudioSequenceGenerationMode;
  warnings: string[];
};

const normalizeProjectId = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = sanitizeImageStudioProjectId(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeImageSlotIndex = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw badRequestError('Image slot index must be a number.');
  }
  const normalized = Math.floor(value);
  if (normalized < 0 || normalized >= DEFAULT_IMAGE_SLOT_COUNT) {
    throw badRequestError(
      `Image slot index must be between 0 and ${DEFAULT_IMAGE_SLOT_COUNT - 1}.`,
    );
  }
  return normalized;
};

const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolvePostProductionRoute = (
  input: ResolvePostProductionRouteInput,
): ResolvePostProductionRouteResult => {
  const warnings: string[] = [];
  const modelSupportsFullSequence = supportsImageSequenceGeneration(input.modelId);
  const sequencerEnabled = input.sequencing.enabled && input.sequencing.runViaSequence;

  if (!sequencerEnabled) {
    return {
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      resolvedMode: input.requestedMode === 'auto' ? 'studio_prompt_then_sequence' : input.requestedMode,
      warnings,
    };
  }

  if (input.requestedMode === 'studio_prompt_then_sequence') {
    return {
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
      warnings,
    };
  }

  if (input.requestedMode === 'studio_native_sequencer_prior_generation') {
    return {
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
      warnings,
    };
  }

  if (input.requestedMode === 'model_full_sequence') {
    if (modelSupportsFullSequence) {
      return {
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
        warnings,
      };
    }
    const modelLabel = input.modelId || 'selected model';
    warnings.push(
      `Model "${modelLabel}" does not support full-sequence generation. Falling back to native Image Studio sequencer with prior generation.`,
    );
    return {
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
      warnings,
    };
  }

  if (modelSupportsFullSequence) {
    return {
      executionRoute: 'ai_model_full_sequence',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
      warnings,
    };
  }

  return {
    executionRoute: 'studio_native_sequencer_prior_generation',
    runKind: 'sequence',
    resolvedMode: 'studio_native_sequencer_prior_generation',
    warnings,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toProductImageFileSource = (
  value: unknown,
): ProductImageFileSource | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = trimString(record['id']);
  const filepath = trimString(record['filepath']);
  if (!id || !filepath) return null;

  return {
    id,
    filepath,
    filename: trimString(record['filename']),
    mimetype: trimString(record['mimetype']),
  };
};

const pickProductName = (product: ProductWithImages): string => {
  return (
    product.name_en?.trim() ||
    product.name_pl?.trim() ||
    product.name_de?.trim() ||
    product.sku?.trim() ||
    product.id
  );
};

const buildGenerationPrompt = (product: ProductWithImages): string => {
  const productName = pickProductName(product);
  return `Create a high-quality e-commerce studio image for "${productName}". Keep the exact product identity, shape, color, texture, and branding. Use clean neutral lighting and background. No text or watermark.`;
};

const buildModelNativeSequencePrompt = (params: {
  basePrompt: string;
  sequenceStepTypes: string[];
}): string => {
  if (params.sequenceStepTypes.length === 0) {
    return params.basePrompt;
  }
  const sequencePlan = params.sequenceStepTypes
    .map((stepType, index) => `${index + 1}. ${stepType}`)
    .join('\n');
  return `${params.basePrompt}

Apply this sequence plan in one model-native pass:
${sequencePlan}

Return only the final post-produced image output.`;
};

const ensureSequenceHasPriorGenerationStep = (
  inputSteps: ImageStudioSequenceStep[],
  fallbackOutputCount: number,
): ImageStudioSequenceStep[] => {
  const activeSteps = inputSteps.filter((step) => step.enabled);
  const firstStep = activeSteps[0] ?? null;
  if (firstStep?.type === 'generate' || firstStep?.type === 'regenerate') {
    return activeSteps;
  }

  const injectedGenerateStep: ImageStudioSequenceStep = {
    id: 'product_studio_prior_generate',
    type: 'generate',
    runtime: 'server',
    enabled: true,
    label: 'Product Studio Prior Generation',
    onFailure: 'stop',
    retries: 1,
    retryBackoffMs: 1000,
    timeoutMs: null,
    config: {
      promptMode: 'inherit',
      promptTemplate: null,
      modelOverride: null,
      outputCount: Math.max(1, Math.min(10, Math.floor(fallbackOutputCount || 1))),
      referencePolicy: 'inherit',
    },
  };

  return [injectedGenerateStep, ...activeSteps];
};

const ensureProduct = async (productId: string): Promise<ProductWithImages> => {
  const normalizedId = trimString(productId);
  if (!normalizedId) {
    throw badRequestError('Product id is required.');
  }

  const product = await productService.getProductById(normalizedId);
  if (!product) {
    throw notFoundError('Product not found', { productId: normalizedId });
  }
  return product;
};

const parseDataUrlToBuffer = (
  value: string,
): { buffer: Buffer; mime: string | null } | null => {
  const match = value.match(DATA_URL_REGEX);
  if (!match) return null;
  try {
    return {
      mime: match[1] ?? null,
      buffer: Buffer.from(match[2] ?? '', 'base64'),
    };
  } catch {
    return null;
  }
};

const resolveBufferFromImagePath = async (
  filepath: string,
): Promise<{ buffer: Buffer; mime: string | null }> => {
  const normalized = filepath.trim();
  if (!normalized) {
    throw badRequestError('Source product image path is empty.');
  }

  if (normalized.startsWith('data:')) {
    const parsed = parseDataUrlToBuffer(normalized);
    if (!parsed) {
      throw badRequestError('Invalid data URL in source product image.');
    }
    return parsed;
  }

  if (/^https?:\/\//i.test(normalized)) {
    const response = await fetch(normalized);
    if (!response.ok) {
      throw operationFailedError('Failed to fetch source product image.', {
        filepath: normalized,
        status: response.status,
      });
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mime: response.headers.get('content-type'),
    };
  }

  const normalizedPublicPath = normalized.startsWith('/')
    ? normalized
    : `/${normalized.replace(/^\/+/, '')}`;
  const diskPath = getDiskPathFromPublicPath(normalizedPublicPath);
  const buffer = await fs.readFile(diskPath);
  return {
    buffer,
    mime: null,
  };
};

const resolveMimeType = (params: {
  preferredMime: string | null;
  fallbackMime: string | null;
  filename: string;
}): string => {
  const preferred = trimString(params.preferredMime);
  if (preferred) return preferred;
  const fallback = trimString(params.fallbackMime);
  if (fallback) return fallback;

  const dotIndex = params.filename.lastIndexOf('.');
  const extension =
    dotIndex >= 0 ? params.filename.slice(dotIndex).toLowerCase() : '';
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
};

const clampUpscaleScale = (value: number): number =>
  Number(Math.max(1.1, Math.min(8, value)).toFixed(2));

const appendFilenameSuffix = (
  filename: string,
  suffix: string,
  extOverride?: string,
): string => {
  const parsed = path.parse(filename);
  const extension = extOverride ?? (parsed.ext || '');
  const basename = parsed.name || 'image';
  return `${basename}${suffix}${extension}`;
};

const buildCenteredCrop = async (
  sourceBuffer: Buffer,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
} | null> => {
  const metadata = await sharp(sourceBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!(width > 0 && height > 0)) return null;

  const side = Math.min(width, height);
  if (!(side > 0)) return null;
  if (width === height) return null;

  const left = Math.floor((width - side) / 2);
  const top = Math.floor((height - side) / 2);
  const buffer = await sharp(sourceBuffer)
    .extract({
      left,
      top,
      width: side,
      height: side,
    })
    .png()
    .toBuffer();

  return {
    buffer,
    width: side,
    height: side,
  };
};

const buildUpscaledImage = async (
  sourceBuffer: Buffer,
  scaleInput: number,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  scale: number;
}> => {
  const metadata = await sharp(sourceBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw badRequestError(
      'Accepted variant has invalid dimensions for upscaling.',
    );
  }

  const scale = clampUpscaleScale(scaleInput);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const buffer = await sharp(sourceBuffer)
    .resize({
      width: targetWidth,
      height: targetHeight,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
    scale,
  };
};

const importSourceProductImageToStudio = async (params: {
  imageFile: ProductImageFileSource;
  productId: string;
  projectId: string;
  imageSlotIndex: number;
  sequencing: ProductStudioSequencingConfig;
}): Promise<{
  id: string;
  filepath: string;
  filename: string;
  mimetype: string;
}> => {
  const sourceImage = params.imageFile;
  const sourcePath = trimString(sourceImage.filepath);
  if (!sourcePath) {
    throw badRequestError('Selected product image has no filepath.');
  }

  const sourceFilename =
    trimString(sourceImage.filename) ??
    `product-image-${params.imageSlotIndex + 1}.png`;
  const sourceMime = trimString(sourceImage.mimetype);
  const { buffer, mime } = await resolveBufferFromImagePath(sourcePath);
  const mimeType = resolveMimeType({
    preferredMime: sourceMime,
    fallbackMime: mime,
    filename: sourceFilename,
  });

  let uploadBuffer = buffer;
  let uploadMimeType = mimeType;
  let uploadFilename = sourceFilename;

  if (
    params.sequencing.enabled &&
    params.sequencing.cropCenterBeforeGeneration
  ) {
    const cropped = await buildCenteredCrop(buffer);
    if (cropped) {
      uploadBuffer = cropped.buffer;
      uploadMimeType = 'image/png';
      uploadFilename = appendFilenameSuffix(
        sourceFilename,
        '-center-crop',
        '.png',
      );
    }
  }

  const bytes = new Uint8Array(uploadBuffer);
  const file = new File([bytes], uploadFilename, { type: uploadMimeType });
  const uploaded = await uploadFile(file, {
    category: 'studio',
    projectId: params.projectId,
    folder: `products/${params.productId}`,
    filenameOverride: uploadFilename,
  });

  return {
    id: uploaded.id,
    filepath: uploaded.filepath,
    filename: uploaded.filename,
    mimetype: uploaded.mimetype,
  };
};

const createUpscaledAcceptedProductImage = async (params: {
  generationSlot: ImageStudioSlotRecord;
  product: ProductWithImages;
  imageSlotIndex: number;
  sequencing: ProductStudioSequencingConfig;
}): Promise<{ imageFileId: string; filepath: string; scale: number }> => {
  const sourcePath =
    trimString(params.generationSlot.imageFile?.filepath) ??
    trimString(params.generationSlot.imageUrl);
  if (!sourcePath) {
    throw badRequestError(
      'Selected generation card has no image path to upscale.',
    );
  }

  const sourceFilename =
    trimString(params.generationSlot.imageFile?.filename) ??
    trimString(params.generationSlot.name) ??
    `product-${params.product.id}-slot-${params.imageSlotIndex + 1}`;

  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const upscaled = await buildUpscaledImage(
    buffer,
    params.sequencing.upscaleScale,
  );
  const scaleLabel = `${upscaled.scale.toFixed(2).replace(/\.00$/, '')}x`;
  const targetFilename = appendFilenameSuffix(
    sourceFilename,
    `-upscaled-${scaleLabel}`,
    '.png',
  );

  const file = new File([new Uint8Array(upscaled.buffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: params.product.sku?.trim() ?? undefined,
    filenameOverride: targetFilename,
  });

  return {
    imageFileId: uploaded.id,
    filepath: uploaded.filepath,
    scale: upscaled.scale,
  };
};

const resolveSequencingFromStudioSettings = (
  studioSettings: ImageStudioSettings,
): ProductStudioSequencingConfig => {
  const sequenceConfig = studioSettings.projectSequencing;
  const activeSteps = resolveImageStudioSequenceActiveSteps(
    sequenceConfig,
  ).filter((step) => step.enabled);
  const enabled = Boolean(sequenceConfig.enabled) && activeSteps.length > 0;
  const firstUpscaleStep = activeSteps.find((step) => step.type === 'upscale');
  const firstGenerateStep = activeSteps.find(
    (step) => step.type === 'generate' || step.type === 'regenerate',
  );
  const expectedOutputs =
    firstGenerateStep?.type === 'generate' ||
    firstGenerateStep?.type === 'regenerate'
      ? (firstGenerateStep.config.outputCount ??
        studioSettings.targetAi.openai.image.n ??
        1)
      : (studioSettings.targetAi.openai.image.n ?? 1);
  return {
    enabled,
    cropCenterBeforeGeneration:
      enabled && activeSteps.some((step) => step.type === 'crop_center'),
    upscaleOnAccept:
      enabled && activeSteps.some((step) => step.type === 'upscale'),
    upscaleScale: clampUpscaleScale(
      firstUpscaleStep?.type === 'upscale'
        ? firstUpscaleStep.config.scale
        : sequenceConfig.upscaleScale,
    ),
    runViaSequence: enabled,
    sequenceStepCount: activeSteps.length,
    expectedOutputs: Math.max(
      1,
      Math.min(10, Math.floor(expectedOutputs || 1)),
    ),
  };
};

const resolveStudioSettingsBundle = async (
  projectId: string,
): Promise<{
  parsedStudioSettings: ImageStudioSettings;
  studioSettings: Record<string, unknown>;
  sequencing: ProductStudioSequencingConfig;
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  modelId: string;
}> => {
  const projectSettingsKey = getImageStudioProjectSettingsKey(projectId);

  const [projectSettingsRaw, globalSettingsRaw, sequenceGenerationModeRaw] = await Promise.all([
    projectSettingsKey
      ? getSettingValue(projectSettingsKey)
      : Promise.resolve(null),
    getSettingValue(IMAGE_STUDIO_SETTINGS_KEY),
    getSettingValue(PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY),
  ]);

  const parsedSettings = parseImageStudioSettings(
    projectSettingsRaw ?? globalSettingsRaw,
  );
  const sequenceGenerationMode = normalizeProductStudioSequenceGenerationMode(
    sequenceGenerationModeRaw,
  );
  const modelId = trimString(parsedSettings.targetAi.openai.model) ?? '';
  return {
    parsedStudioSettings: parsedSettings,
    studioSettings: parsedSettings as unknown as Record<string, unknown>,
    sequencing: resolveSequencingFromStudioSettings(parsedSettings),
    sequenceGenerationMode,
    modelId,
  };
};

const buildSourceSlotMetadata = (params: {
  productId: string;
  imageSlotIndex: number;
  sourceImageFileId: string;
}): Record<string, unknown> => ({
  role: 'import',
  source: 'product-studio',
  productId: params.productId,
  imageSlotIndex: params.imageSlotIndex,
  productImageFileId: params.sourceImageFileId,
  updatedAt: new Date().toISOString(),
});

const resolveSourceSlotIdForIndex = (
  config: ProductStudioConfig,
  imageSlotIndex: number,
): string | null => {
  return trimString(config.sourceSlotByImageIndex[String(imageSlotIndex)]);
};

const sortSlotsNewestFirst = (
  input: ImageStudioSlotRecord[],
): ImageStudioSlotRecord[] => {
  return [...input].sort((a, b) => {
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
    return bTime - aTime;
  });
};

const resolveGenerationVariants = async (params: {
  projectId: string;
  sourceSlotId: string;
}): Promise<{
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
}> => {
  const [slots, links] = await Promise.all([
    listImageStudioSlots(params.projectId),
    listImageStudioSlotLinks(params.projectId),
  ]);

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot]),
  );

  const sourceSlot = slotById.get(params.sourceSlotId) ?? null;

  const linkedVariants = links
    .filter(
      (link) =>
        link.sourceSlotId === params.sourceSlotId &&
        link.relationType.startsWith('generation:output:'),
    )
    .map((link) => slotById.get(link.targetSlotId) ?? null)
    .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));

  const metadataVariants = slots.filter((slot) => {
    if (slot.id === params.sourceSlotId) return false;
    const metadata = asRecord(slot.metadata);
    if (!metadata) return false;

    const role = trimString(metadata['role']);
    if (role !== 'generation') return false;

    const directSourceSlotId = trimString(metadata['sourceSlotId']);
    if (directSourceSlotId === params.sourceSlotId) return true;

    const sourceSlotIdsRaw = metadata['sourceSlotIds'];
    if (!Array.isArray(sourceSlotIdsRaw)) return false;

    return sourceSlotIdsRaw.some(
      (value: unknown): boolean => trimString(value) === params.sourceSlotId,
    );
  });

  const dedupedById = new Map<string, ImageStudioSlotRecord>();
  [...linkedVariants, ...metadataVariants].forEach((slot) => {
    dedupedById.set(slot.id, slot);
  });

  return {
    sourceSlot,
    variants: sortSlotsNewestFirst(Array.from(dedupedById.values())),
  };
};

const resolveProductAndStudioTarget = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<{
  product: ProductWithImages;
  imageSlotIndex: number;
  config: ProductStudioConfig;
  projectId: string;
}> => {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const overrideProjectId = normalizeProjectId(params.projectId);

  const existingConfig = await getProductStudioConfig(product.id);
  const existingProjectId = normalizeProjectId(existingConfig.projectId);
  const config =
    overrideProjectId !== null && overrideProjectId !== existingProjectId
      ? await setProductStudioProject(product.id, overrideProjectId)
      : existingConfig;

  const projectId = normalizeProjectId(config.projectId);
  if (!projectId) {
    throw badRequestError(
      'Image Studio project is not selected for this product.',
    );
  }

  return {
    product,
    imageSlotIndex,
    config,
    projectId,
  };
};

export async function getProductStudioVariants(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<ProductStudioVariantsResult> {
  const resolved = await resolveProductAndStudioTarget(params);
  const { sequencing } = await resolveStudioSettingsBundle(resolved.projectId);
  const sourceSlotId = resolveSourceSlotIdForIndex(
    resolved.config,
    resolved.imageSlotIndex,
  );

  if (!sourceSlotId) {
    return {
      config: resolved.config,
      sequencing,
      projectId: resolved.projectId,
      sourceSlotId: null,
      sourceSlot: null,
      variants: [],
    };
  }

  const { sourceSlot, variants } = await resolveGenerationVariants({
    projectId: resolved.projectId,
    sourceSlotId,
  });

  return {
    config: resolved.config,
    sequencing,
    projectId: resolved.projectId,
    sourceSlotId,
    sourceSlot,
    variants,
  };
}

export async function sendProductImageToStudio(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSendResult> {
  const startedAtMs = Date.now();
  let importMs: number | null = null;
  let sourceSlotUpsertMs: number | null = null;
  let routeDecisionMs: number | null = null;
  let dispatchMs: number | null = null;
  const resolved = await resolveProductAndStudioTarget(params);
  const {
    parsedStudioSettings,
    studioSettings,
    sequencing,
    sequenceGenerationMode,
    modelId,
  } = await resolveStudioSettingsBundle(resolved.projectId);
  const requestedSequenceMode = normalizeProductStudioSequenceGenerationMode(
    params.sequenceGenerationMode ?? sequenceGenerationMode,
  );
  const sourceImage = toProductImageFileSource(
    resolved.product.images[resolved.imageSlotIndex]?.imageFile,
  );

  if (!sourceImage) {
    throw badRequestError(
      'Selected product image slot has no uploaded source image.',
    );
  }

  const importStartMs = Date.now();
  const imported = await importSourceProductImageToStudio({
    imageFile: sourceImage,
    imageSlotIndex: resolved.imageSlotIndex,
    productId: resolved.product.id,
    projectId: resolved.projectId,
    sequencing,
  });
  importMs = Date.now() - importStartMs;

  const slotName = `${pickProductName(resolved.product)} • Slot ${resolved.imageSlotIndex + 1}`;
  const folderPath = `products/${resolved.product.id}`;
  const existingSourceSlotId = resolveSourceSlotIdForIndex(
    resolved.config,
    resolved.imageSlotIndex,
  );

  let sourceSlot = existingSourceSlotId
    ? await getImageStudioSlotById(existingSourceSlotId)
    : null;

  if (sourceSlot && sourceSlot.projectId !== resolved.projectId) {
    sourceSlot = null;
  }

  const sourceUpsertStartMs = Date.now();
  if (sourceSlot) {
    sourceSlot = await updateImageStudioSlot(sourceSlot.id, {
      name: slotName,
      folderPath,
      imageFileId: imported.id,
      imageUrl: imported.filepath,
      imageBase64: null,
      metadata: buildSourceSlotMetadata({
        productId: resolved.product.id,
        imageSlotIndex: resolved.imageSlotIndex,
        sourceImageFileId: sourceImage.id,
      }),
    });
  } else {
    const created = await createImageStudioSlots(resolved.projectId, [
      {
        name: slotName,
        folderPath,
        imageFileId: imported.id,
        imageUrl: imported.filepath,
        imageBase64: null,
        metadata: buildSourceSlotMetadata({
          productId: resolved.product.id,
          imageSlotIndex: resolved.imageSlotIndex,
          sourceImageFileId: sourceImage.id,
        }),
      },
    ]);
    sourceSlot = created[0] ?? null;
  }

  if (!sourceSlot) {
    throw operationFailedError(
      'Failed to create or update the Studio source card.',
    );
  }

  const config = await setProductStudioSourceSlot(
    resolved.product.id,
    resolved.imageSlotIndex,
    sourceSlot.id,
  );
  sourceSlotUpsertMs = Date.now() - sourceUpsertStartMs;

  const generationPrompt = buildGenerationPrompt(resolved.product);
  const routeDecisionStartMs = Date.now();
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const warnings = [...routeDecision.warnings];
  routeDecisionMs = Date.now() - routeDecisionStartMs;
  const resolvedActiveSteps = resolveImageStudioSequenceActiveSteps(
    parsedStudioSettings.projectSequencing,
  ).filter((step) => step.enabled);

  if (
    routeDecision.executionRoute === 'studio_sequencer' ||
    routeDecision.executionRoute === 'studio_native_sequencer_prior_generation'
  ) {
    const stepsForSequenceRun =
      routeDecision.executionRoute === 'studio_native_sequencer_prior_generation'
        ? ensureSequenceHasPriorGenerationStep(
          resolvedActiveSteps,
          parsedStudioSettings.targetAi.openai.image.n ?? sequencing.expectedOutputs,
        )
        : resolvedActiveSteps;
    let sequenceRun;
    try {
      const dispatchStartMs = Date.now();
      sequenceRun = await startImageStudioSequenceRun({
        projectId: resolved.projectId,
        sourceSlotId: sourceSlot.id,
        prompt: generationPrompt,
        paramsState: null,
        referenceSlotIds: [],
        studioSettings,
        steps: stepsForSequenceRun,
        metadata: {
          source: 'product-studio',
          productId: resolved.product.id,
          imageSlotIndex: resolved.imageSlotIndex,
          executionRoute: routeDecision.executionRoute,
          requestedSequenceMode,
          resolvedSequenceMode: routeDecision.resolvedMode,
        },
      });
      dispatchMs = Date.now() - dispatchStartMs;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to dispatch Image Studio sequence run from Product Studio.';
      const fallbackReason = warnings[0] ?? null;
      await createProductStudioRunAudit({
        productId: resolved.product.id,
        imageSlotIndex: resolved.imageSlotIndex,
        projectId: resolved.projectId,
        status: 'failed',
        requestedSequenceMode,
        resolvedSequenceMode: routeDecision.resolvedMode,
        executionRoute: routeDecision.executionRoute,
        runKind: 'sequence',
        runId: null,
        sequenceRunId: null,
        dispatchMode: null,
        fallbackReason,
        warnings,
        timings: {
          importMs,
          sourceSlotUpsertMs,
          routeDecisionMs,
          dispatchMs,
          totalMs: Date.now() - startedAtMs,
        },
        errorMessage: message,
      }).catch(() => {});
      throw error;
    }
    const fallbackReason = warnings[0] ?? null;
    await createProductStudioRunAudit({
      productId: resolved.product.id,
      imageSlotIndex: resolved.imageSlotIndex,
      projectId: resolved.projectId,
      status: 'completed',
      requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      runKind: 'sequence',
      runId: sequenceRun.runId,
      sequenceRunId: sequenceRun.runId,
      dispatchMode: sequenceRun.dispatchMode,
      fallbackReason,
      warnings,
      timings: {
        importMs,
        sourceSlotUpsertMs,
        routeDecisionMs,
        dispatchMs,
        totalMs: Date.now() - startedAtMs,
      },
      errorMessage: null,
    }).catch(() => {});

    return {
      config,
      sequencing,
      projectId: resolved.projectId,
      imageSlotIndex: resolved.imageSlotIndex,
      sourceSlot,
      runId: sequenceRun.runId,
      runStatus: sequenceRun.status,
      expectedOutputs: sequencing.expectedOutputs,
      dispatchMode: sequenceRun.dispatchMode,
      runKind: 'sequence',
      sequenceRunId: sequenceRun.runId,
      requestedSequenceMode: requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  const sequenceStepTypes = resolvedActiveSteps.map((step) => step.type);
  const effectivePrompt =
    routeDecision.executionRoute === 'ai_model_full_sequence'
      ? buildModelNativeSequencePrompt({
        basePrompt: generationPrompt,
        sequenceStepTypes,
      })
      : generationPrompt;

  const runRequestCandidate: ImageStudioRunRequest = {
    projectId: resolved.projectId,
    asset: {
      id: sourceSlot.id,
      filepath:
        trimString(sourceSlot.imageFile?.filepath) ??
        trimString(sourceSlot.imageUrl) ??
        imported.filepath,
    },
    prompt: effectivePrompt,
    studioSettings,
  };

  const parsedRequest =
    imageStudioRunRequestSchema.safeParse(runRequestCandidate);
  if (!parsedRequest.success) {
    throw badRequestError('Invalid Image Studio run request payload.', {
      errors: parsedRequest.error.format(),
    });
  }

  const request = {
    ...parsedRequest.data,
    projectId: resolved.projectId,
  };

  const expectedOutputs = resolveExpectedOutputCount(request);
  const run = await createImageStudioRun({
    projectId: resolved.projectId,
    request,
    expectedOutputs,
  });

  let dispatchMode: ImageStudioRunDispatchMode;
  try {
    const dispatchStartMs = Date.now();
    startImageStudioRunQueue();
    dispatchMode = await enqueueImageStudioRunJob(run.id);
    dispatchMs = Date.now() - dispatchStartMs;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to dispatch Image Studio run from Product Studio.';

    await updateImageStudioRun(run.id, {
      status: 'failed',
      errorMessage,
      finishedAt: new Date().toISOString(),
    });
    const fallbackReason = warnings[0] ?? null;
    await createProductStudioRunAudit({
      productId: resolved.product.id,
      imageSlotIndex: resolved.imageSlotIndex,
      projectId: resolved.projectId,
      status: 'failed',
      requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      runKind: 'generation',
      runId: run.id,
      sequenceRunId: null,
      dispatchMode: null,
      fallbackReason,
      warnings,
      timings: {
        importMs,
        sourceSlotUpsertMs,
        routeDecisionMs,
        dispatchMs,
        totalMs: Date.now() - startedAtMs,
      },
      errorMessage,
    }).catch(() => {});

    throw operationFailedError(
      'Failed to dispatch Image Studio run from Product Studio.',
      {
        runId: run.id,
        reason: errorMessage,
      },
    );
  }

  const latestRun =
    (await updateImageStudioRun(run.id, {
      dispatchMode,
    })) ??
    (await getImageStudioRunById(run.id)) ??
    run;
  const fallbackReason = warnings[0] ?? null;
  await createProductStudioRunAudit({
    productId: resolved.product.id,
    imageSlotIndex: resolved.imageSlotIndex,
    projectId: resolved.projectId,
    status: 'completed',
    requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    runKind: 'generation',
    runId: latestRun.id,
    sequenceRunId: null,
    dispatchMode,
    fallbackReason,
    warnings,
    timings: {
      importMs,
      sourceSlotUpsertMs,
      routeDecisionMs,
      dispatchMs,
      totalMs: Date.now() - startedAtMs,
    },
    errorMessage: null,
  }).catch(() => {});

  return {
    config,
    sequencing,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sourceSlot,
    runId: latestRun.id,
    runStatus: latestRun.status,
    expectedOutputs: latestRun.expectedOutputs,
    dispatchMode,
    runKind: 'generation',
    sequenceRunId: null,
    requestedSequenceMode: requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export async function acceptProductStudioVariant(params: {
  productId: string;
  imageSlotIndex: number;
  generationSlotId: string;
  projectId?: string | null | undefined;
}): Promise<ProductWithImages> {
  const resolved = await resolveProductAndStudioTarget(params);
  const generationSlotId = trimString(params.generationSlotId);
  if (!generationSlotId) {
    throw badRequestError('Generation slot id is required.');
  }

  const generationSlot = await getImageStudioSlotById(generationSlotId);
  if (generationSlot?.projectId !== resolved.projectId) {
    throw notFoundError(
      'Generation slot not found in selected Studio project.',
      {
        generationSlotId,
        projectId: resolved.projectId,
      },
    );
  }

  const generationImageFileId =
    trimString(generationSlot.imageFileId) ??
    trimString(generationSlot.imageFile?.id);
  if (!generationImageFileId) {
    throw badRequestError(
      'Selected generation card has no image file to accept.',
    );
  }

  const { sequencing } = await resolveStudioSettingsBundle(resolved.projectId);
  let acceptedImageFileId = generationImageFileId;
  if (sequencing.enabled && sequencing.upscaleOnAccept) {
    const upscaled = await createUpscaledAcceptedProductImage({
      generationSlot,
      product: resolved.product,
      imageSlotIndex: resolved.imageSlotIndex,
      sequencing,
    });
    acceptedImageFileId = upscaled.imageFileId;
  }

  const nextImageFileIds = resolved.product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter(Boolean);

  while (nextImageFileIds.length <= resolved.imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[resolved.imageSlotIndex] = acceptedImageFileId;

  const compactedImageIds = nextImageFileIds.filter((id) => id.length > 0);

  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(
    resolved.product.id,
    compactedImageIds,
  );

  const updatedProduct = await productService.getProductById(
    resolved.product.id,
  );
  if (!updatedProduct) {
    throw operationFailedError(
      'Product image was updated, but failed to reload product.',
    );
  }

  return updatedProduct;
}
