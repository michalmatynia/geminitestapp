import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import OpenAI, { toFile } from 'openai';

import { buildImageStudioGenerationPrompt } from '@/features/ai/image-studio/context-registry/generation-prompt';
import { getImageModelCapabilities } from '@/features/ai/image-studio/utils/image-models';
import { parsePersistedImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import { type ImageStudioRunExecutionResult, type ImageStudioRunRequest, type ImageStudioGenerationExecutionMeta, type ImageFileRecord } from '@/shared/contracts/image-studio';
import {
  badRequestError,
  configurationError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { resolveBrainProviderCredential } from '@/shared/lib/ai-brain/provider-credentials';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';

import {
  assertDallePromptWithinLimit,
  buildMaskBuffer,
  coerceImageSize,
  createImageRecord,
  extractErrorMessage,
  extractUnknownParameterName,
  isProjectScopedAssetPath,
  mapBackground,
  normalizePublicAssetPath,
  resolveAssetPath,
  ensureWithinProject,
  toDalle2UploadableImageFile,
  toUploadableImageFile,
} from '../run-executor-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_OPENAI_TIMEOUT_MS = 180_000;
const DEFAULT_OPENAI_MAX_RETRIES = 2;

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const OPENAI_TIMEOUT_MS = Math.max(
  30_000,
  parsePositiveInteger(process.env['IMAGE_STUDIO_OPENAI_TIMEOUT_MS'], DEFAULT_OPENAI_TIMEOUT_MS)
);
const OPENAI_MAX_RETRIES = Math.min(
  5,
  parsePositiveInteger(process.env['IMAGE_STUDIO_OPENAI_MAX_RETRIES'], DEFAULT_OPENAI_MAX_RETRIES)
);
const IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT =
  process.env['IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT'] === 'true';
const MODEL_MUST_BE_DALLE2_REGEX = /Value must be ['"]dall-e-2['"]/i;
const MAX_UNKNOWN_PARAMETER_RETRIES = 6;
type MutableImagePayload = Record<string, unknown> & {
  model: string;
  prompt: string;
};
const isImageEditPayload = (
  value: unknown
): value is MutableImagePayload & OpenAI.Images.ImageEditParamsNonStreaming =>
  typeof value === 'object' && value !== null && 'image' in value;

const isImageGeneratePayload = (
  value: unknown
): value is MutableImagePayload & OpenAI.Images.ImageGenerateParamsNonStreaming =>
  typeof value === 'object' && value !== null && !('image' in value);

export async function executeGenerationOperation(params: {
  request: ImageStudioRunRequest;
  projectId: string;
  diskPath: string | null;
  hasSourceAsset: boolean;
  assetPath: string;
}): Promise<ImageStudioRunExecutionResult> {
  const { request, projectId, diskPath, hasSourceAsset, assetPath } = params;

  const settings = parsePersistedImageStudioSettings(
    request.studioSettings ? JSON.stringify(request.studioSettings) : null
  );

  if (settings.targetAi.openai.api !== 'images') {
    throw badRequestError('Image Studio run currently supports the Images API only.');
  }

  const apiKey = await resolveBrainProviderCredential('openai');

  const client = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: OPENAI_MAX_RETRIES,
  });

  const overrides =
    settings.targetAi.openai.advanced_overrides &&
    typeof settings.targetAi.openai.advanced_overrides === 'object'
      ? settings.targetAi.openai.advanced_overrides
      : null;
  let polygons: Array<Array<{ x: number; y: number }>> = [];
  let invert = false;
  let feather = 0;
  if (request.mask) {
    if (request.mask.type === 'polygon') {
      if (request.mask.closed && request.mask.points.length >= 3) {
        polygons = [request.mask.points];
      }
    } else {
      polygons = request.mask.polygons;
      invert = Boolean(request.mask.invert);
      feather = typeof request.mask.feather === 'number' ? request.mask.feather : 0;
    }
  }
  const mask =
    diskPath && polygons.length > 0
      ? await buildMaskBuffer({ imagePath: diskPath, polygons, invert, feather })
      : null;

  const referenceAssets = hasSourceAsset ? (request.referenceAssets ?? []) : [];
  const referencePaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const ref of referenceAssets) {
    const refPath = normalizePublicAssetPath(ref.filepath);
    if (!refPath) continue;
    if (assetPath && refPath === assetPath) continue;
    if (seenPaths.has(refPath)) continue;
    if (!isProjectScopedAssetPath(refPath, projectId)) {
      throw badRequestError('Reference asset must belong to the current project.');
    }
    const refDiskPath = resolveAssetPath(refPath);
    ensureWithinProject(refDiskPath, projectId);
    await fs.stat(refDiskPath).catch(() => {
      throw badRequestError('Reference asset file not found.');
    });
    seenPaths.add(refPath);
    referencePaths.push(refDiskPath);
  }

  const maxImages = 16;
  if (hasSourceAsset && referencePaths.length + 1 > maxImages) {
    throw badRequestError(`Too many input images. Limit is ${maxImages} total.`);
  }

  const generationConfig = await resolveBrainExecutionConfigForCapability('image_studio.general', {
    runtimeKind: 'image_generation',
  });
  const resolvedModel = generationConfig.modelId.trim() || null;
  if (!resolvedModel) {
    throw configurationError('Image Studio model is missing. Configure it in AI Brain.');
  }
  const prompt = buildImageStudioGenerationPrompt(request.prompt, request.contextRegistry?.resolved);
  const modelName = (resolvedModel ?? '').toLowerCase();
  const modelCapabilities = getImageModelCapabilities(resolvedModel);
  if (modelCapabilities.family === 'dall-e') {
    assertDallePromptWithinLimit(prompt, resolvedModel);
  }
  if (hasSourceAsset && modelName.includes('dall-e-2') && referencePaths.length > 0) {
    throw badRequestError('Multiple input images are only supported for GPT image models.');
  }
  const requestedFormat = settings.targetAi.openai.image.format ?? 'png';
  const format = modelCapabilities.formatOptions.includes(requestedFormat)
    ? requestedFormat
    : (modelCapabilities.formatOptions[0] ?? 'png');

  const requestMode: 'edit' | 'generate' = hasSourceAsset && diskPath ? 'edit' : 'generate';
  let dalle2BaseSize: '256x256' | '512x512' | '1024x1024' | null = null;
  let imageFiles: Array<Awaited<ReturnType<typeof toFile>>> = [];
  let payload: MutableImagePayload;

  if (requestMode === 'edit') {
    if (!diskPath) {
      throw badRequestError('Source asset is required for image edit runs.');
    }
    if (modelName.includes('dall-e-2')) {
      const dalle2Base = await toDalle2UploadableImageFile(diskPath);
      imageFiles = [dalle2Base.file];
      dalle2BaseSize = dalle2Base.size;
    } else {
      const baseName = path.basename(diskPath, path.extname(diskPath)) || 'image';
      const baseImage = await toUploadableImageFile({
        diskPath,
        fileNameBase: baseName,
      });
      const referenceImages = await Promise.all(
        referencePaths.map((refPath: string, index: number) =>
          toUploadableImageFile({
            diskPath: refPath,
            fileNameBase: `reference-${index + 1}`,
          })
        )
      );
      imageFiles = [baseImage, ...referenceImages];
    }
    const imagePayload = imageFiles.length === 1 ? imageFiles[0]! : imageFiles;
    payload = {
      model: resolvedModel,
      prompt,
      image: imagePayload,
    };
  } else {
    payload = {
      model: resolvedModel,
      prompt,
    };
  }

  const payloadRecord = payload;
  let effectiveFormat: 'png' | 'jpeg' | 'webp' = format;
  if (IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT && modelCapabilities.supportsOutputFormat) {
    payloadRecord['output_format'] = format;
  } else {
    effectiveFormat = 'png';
  }
  if (modelCapabilities.supportsResponseFormat && !modelName.startsWith('gpt-')) {
    payloadRecord['response_format'] = 'b64_json';
  }

  if (modelCapabilities.supportsCount && typeof settings.targetAi.openai.image.n === 'number') {
    payloadRecord['n'] = settings.targetAi.openai.image.n;
  }
  const size = coerceImageSize(settings.targetAi.openai.image.size ?? null);
  if (requestMode === 'edit' && modelName.includes('dall-e-2') && dalle2BaseSize) {
    payloadRecord['size'] = dalle2BaseSize;
  } else if (size && modelCapabilities.sizeOptions.includes(size)) {
    payloadRecord['size'] = size;
  }
  if (
    settings.targetAi.openai.image.quality &&
    modelCapabilities.qualityOptions.includes(settings.targetAi.openai.image.quality)
  ) {
    payloadRecord['quality'] = settings.targetAi.openai.image.quality;
  }
  const requestedBackground = settings.targetAi.openai.image.background;
  const background = mapBackground(requestedBackground);
  if (
    requestedBackground &&
    modelCapabilities.backgroundOptions.includes(requestedBackground) &&
    background
  ) {
    payloadRecord['background'] = background;
  }
  if (modelCapabilities.supportsModeration && settings.targetAi.openai.image.moderation) {
    payloadRecord['moderation'] = settings.targetAi.openai.image.moderation;
  }
  if (
    modelCapabilities.supportsOutputCompression &&
    typeof settings.targetAi.openai.image.output_compression === 'number'
  ) {
    payloadRecord['output_compression'] = settings.targetAi.openai.image.output_compression;
  }
  if (
    modelCapabilities.supportsPartialImages &&
    typeof settings.targetAi.openai.image.partial_images === 'number'
  ) {
    payloadRecord['partial_images'] = settings.targetAi.openai.image.partial_images;
  }
  if (
    requestMode === 'edit' &&
    modelCapabilities.supportsStream &&
    typeof settings.targetAi.openai.stream === 'boolean'
  ) {
    payloadRecord['stream'] = settings.targetAi.openai.stream;
  }
  if (modelCapabilities.supportsUser && settings.targetAi.openai.user) {
    payloadRecord['user'] = settings.targetAi.openai.user;
  }

  if (requestMode === 'edit' && mask) {
    payloadRecord['mask'] = await toFile(mask, 'mask.png', { type: 'image/png' });
  }

  if (overrides) {
    Object.entries(overrides).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'image' || key === 'mask' || key === 'prompt') {
          return;
        }
        if (
          key === 'output_format' &&
          !(IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT && modelCapabilities.supportsOutputFormat)
        ) {
          return;
        }
        if (key === 'response_format' && !modelCapabilities.supportsResponseFormat) {
          return;
        }
        if (key === 'stream' && (requestMode !== 'edit' || !modelCapabilities.supportsStream)) {
          return;
        }
        if (key === 'moderation' && !modelCapabilities.supportsModeration) {
          return;
        }
        if (key === 'output_compression' && !modelCapabilities.supportsOutputCompression) {
          return;
        }
        if (key === 'partial_images' && !modelCapabilities.supportsPartialImages) {
          return;
        }
        payloadRecord[key] = value;
      }
    });
  }

  if (!(IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT && modelCapabilities.supportsOutputFormat)) {
    delete payloadRecord['output_format'];
  }

  let response: OpenAI.ImagesResponse | null = null;
  let dalle2ModelFallbackApplied = false;
  const unknownParameterDrops: string[] = [];
  let apiAttemptCount = 0;
  for (let attempt = 0; attempt < MAX_UNKNOWN_PARAMETER_RETRIES; attempt += 1) {
    try {
      apiAttemptCount += 1;
      if (requestMode === 'edit') {
        if (!isImageEditPayload(payload)) {
          throw operationFailedError('Image edit payload is missing the source image.');
        }
        response = (await client.images.edit(payload)) as OpenAI.ImagesResponse;
      } else {
        if (!isImageGeneratePayload(payload)) {
          throw operationFailedError('Image generation payload unexpectedly includes edit fields.');
        }
        response = (await client.images.generate(payload)) as OpenAI.ImagesResponse;
      }
      break;
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = extractErrorMessage(error);
      const activeModel = String(payloadRecord['model'] ?? '').toLowerCase();
      if (
        !dalle2ModelFallbackApplied &&
        activeModel !== 'dall-e-2' &&
        MODEL_MUST_BE_DALLE2_REGEX.test(message)
      ) {
        const fallbackPrompt = String(payloadRecord['prompt'] ?? prompt);
        assertDallePromptWithinLimit(fallbackPrompt, 'dall-e-2');
        payloadRecord['model'] = 'dall-e-2';
        payloadRecord['prompt'] = fallbackPrompt;
        if (requestMode === 'edit' && diskPath) {
          const fallbackImage = await toDalle2UploadableImageFile(diskPath);
          payloadRecord['image'] = fallbackImage.file;
          payloadRecord['size'] = fallbackImage.size;
        } else if (
          payloadRecord['size'] !== '256x256' &&
          payloadRecord['size'] !== '512x512' &&
          payloadRecord['size'] !== '1024x1024'
        ) {
          payloadRecord['size'] = '1024x1024';
        }
        payloadRecord['quality'] = 'standard';
        payloadRecord['response_format'] = 'b64_json';
        delete payloadRecord['output_format'];
        delete payloadRecord['background'];
        delete payloadRecord['mask'];
        delete payloadRecord['moderation'];
        delete payloadRecord['output_compression'];
        delete payloadRecord['partial_images'];
        delete payloadRecord['stream'];
        effectiveFormat = 'png';
        dalle2ModelFallbackApplied = true;
        continue;
      }

      const unknownParameter = extractUnknownParameterName(error);
      if (!unknownParameter) {
        throw error;
      }
      if (
        unknownParameter === 'model' ||
        unknownParameter === 'prompt' ||
        (requestMode === 'edit' && (unknownParameter === 'image' || unknownParameter === 'mask'))
      ) {
        throw error;
      }
      if (!Object.prototype.hasOwnProperty.call(payloadRecord, unknownParameter)) {
        throw error;
      }
      if (unknownParameter === 'output_format') {
        effectiveFormat = 'png';
      }
      if (!unknownParameterDrops.includes(unknownParameter)) {
        unknownParameterDrops.push(unknownParameter);
      }
      delete payloadRecord[unknownParameter];
    }
  }
  if (!response) {
    throw operationFailedError('Image API request failed after unknown-parameter retries.');
  }

  const images = response.data ?? [];
  if (images.length === 0) {
    throw operationFailedError('Image API returned no images.');
  }

  const outputs: ImageFileRecord[] = [];
  for (const img of images) {
    if (!img.b64_json) {
      throw operationFailedError('Image API did not return base64 data.');
    }
    const buffer = Buffer.from(img.b64_json, 'base64');
    const record = await createImageRecord({
      projectId,
      buffer,
      extension: effectiveFormat === 'jpeg' || effectiveFormat === 'webp' ? effectiveFormat : 'png',
    });
    outputs.push(record);
  }

  const modelUsedRaw = payloadRecord['model'];
  const modelUsed =
    typeof modelUsedRaw === 'string' && modelUsedRaw.trim() ? modelUsedRaw.trim() : resolvedModel;
  const effectiveSizeRaw = payloadRecord['size'];
  const effectiveQualityRaw = payloadRecord['quality'];
  const effectiveBackgroundRaw = payloadRecord['background'];

  return {
    projectId,
    outputs,
    executionMeta: {
      operation: 'generate',
      modelRequested: resolvedModel,
      modelUsed,
      outputFormat: effectiveFormat,
      requestedOutputCount: Math.max(
        1,
        Math.min(10, Math.floor(settings.targetAi.openai.image.n || 1))
      ),
      responseImageCount: images.length,
      inputImageCount: requestMode === 'edit' ? imageFiles.length : 0,
      usedMask: requestMode === 'edit' && Boolean(payloadRecord['mask']),
      requestedSize: settings.targetAi.openai.image.size ?? null,
      effectiveSize:
        typeof effectiveSizeRaw === 'string' && effectiveSizeRaw.trim() ? effectiveSizeRaw : null,
      requestedQuality: settings.targetAi.openai.image.quality ?? null,
      effectiveQuality:
        typeof effectiveQualityRaw === 'string' && effectiveQualityRaw.trim()
          ? effectiveQualityRaw
          : null,
      requestedBackground: settings.targetAi.openai.image.background ?? null,
      effectiveBackground:
        typeof effectiveBackgroundRaw === 'string' && effectiveBackgroundRaw.trim()
          ? effectiveBackgroundRaw
          : null,
      unknownParameterDrops,
      usedDalle2ModelFallback: dalle2ModelFallbackApplied,
      apiAttemptCount,
    } as ImageStudioGenerationExecutionMeta,
  };
}
