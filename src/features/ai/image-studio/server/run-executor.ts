import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import { z } from 'zod';

import { getImageModelCapabilities } from '@/features/ai/image-studio/utils/image-models';
import {
  IMAGE_STUDIO_OPENAI_API_KEY_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getImageFileRepository } from '@/features/files/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { badRequestError, configurationError, operationFailedError } from '@/shared/errors/app-error';
import type { ImageFileRecord } from '@/shared/types/domain/files';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
const publicRoot = path.join(process.cwd(), 'public');
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
const IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT = process.env['IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT'] === 'true';
const DALLE2_PROMPT_MAX_CHARS = 1000;
const UNKNOWN_PARAMETER_REGEX = /Unknown parameter:\s*['"]([^'"]+)['"]/i;
const MODEL_MUST_BE_DALLE2_REGEX = /Value must be ['"]dall-e-2['"]/i;
const MAX_UNKNOWN_PARAMETER_RETRIES = 6;
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const polygonSchema = z.array(pointSchema).min(3);

export const imageStudioRunMaskSchema = z.union([
  z.object({
    type: z.literal('polygon'),
    points: polygonSchema,
    closed: z.boolean(),
  }),
  z.object({
    type: z.literal('polygons'),
    polygons: z.array(polygonSchema).min(1),
    invert: z.boolean().optional(),
    feather: z.number().min(0).max(50).optional(),
  }),
]);

export const imageStudioRunRequestSchema = z.object({
  projectId: z.string().min(1).max(120),
  asset: z.object({
    filepath: z.string().min(1),
    id: z.string().optional(),
  }),
  referenceAssets: z
    .array(
      z.object({
        filepath: z.string().min(1),
        id: z.string().optional(),
      })
    )
    .optional(),
  prompt: z.string().min(1),
  mask: imageStudioRunMaskSchema.nullable().optional(),
  studioSettings: z.record(z.string(), z.any()).optional(),
});

export type ImageStudioRunRequest = z.infer<typeof imageStudioRunRequestSchema>;

export type ImageStudioRunExecutionResult = {
  projectId: string;
  outputs: ImageFileRecord[];
};

export const sanitizeImageStudioProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const resolveExpectedOutputCount = (rawRequest: unknown): number => {
  const parsed = imageStudioRunRequestSchema.safeParse(rawRequest);
  if (!parsed.success) return 1;
  const settings = parseImageStudioSettings(
    parsed.data.studioSettings ? JSON.stringify(parsed.data.studioSettings) : null
  );
  const requested = settings.targetAi.openai.image.n;
  if (!Number.isFinite(requested) || !requested) return 1;
  return Math.max(1, Math.min(10, Math.floor(requested)));
};

const resolveAssetPath = (filepath: string): string => {
  const normalized = filepath.replace(/^\/+/, '');
  return path.resolve(publicRoot, normalized);
};

const ensureWithinProject = (diskPath: string, projectId: string): void => {
  const projectRoot = path.resolve(projectsRoot, projectId);
  if (!diskPath.startsWith(`${projectRoot}${path.sep}`)) {
    throw badRequestError('Asset path is outside the project.');
  }
};

const toOutputFolder = (projectId: string): string =>
  path.join(projectsRoot, projectId, 'outputs');

const mapBackground = (value: string | null | undefined): 'transparent' | 'opaque' | 'auto' | null => {
  if (!value) return null;
  if (value === 'transparent') return 'transparent';
  if (value === 'opaque') return 'opaque';
  if (value === 'white') return 'opaque';
  return 'auto';
};

const coerceImageSize = (value: string | null | undefined): OpenAI.Images.ImageEditParams['size'] => {
  if (!value) return undefined;
  const allowed = new Set([
    'auto',
    '256x256',
    '512x512',
    '1024x1024',
    '1536x1024',
    '1024x1536',
    '1792x1024',
    '1024x1792',
  ]);
  return allowed.has(value) ? (value as OpenAI.Images.ImageEditParams['size']) : undefined;
};

const extractUnknownParameterName = (error: unknown): string | null => {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const match = UNKNOWN_PARAMETER_REGEX.exec(message);
  return match?.[1]?.trim() || null;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
};

const resolveDalle2SquareSize = (width: number, height: number): 256 | 512 | 1024 => {
  const maxSide = Math.max(width, height, 1);
  if (maxSide <= 256) return 256;
  if (maxSide <= 512) return 512;
  return 1024;
};

const toDalle2SizeLabel = (size: 256 | 512 | 1024): '256x256' | '512x512' | '1024x1024' => {
  if (size === 256) return '256x256';
  if (size === 512) return '512x512';
  return '1024x1024';
};

const clampPromptForDalle2 = (prompt: string): string => {
  if (prompt.length <= DALLE2_PROMPT_MAX_CHARS) return prompt;
  return `${prompt.slice(0, DALLE2_PROMPT_MAX_CHARS - 3)}...`;
};

async function toUploadableImageFile(params: {
  diskPath: string;
  fileNameBase: string;
}): Promise<Awaited<ReturnType<typeof toFile>>> {
  const ext = path.extname(params.diskPath).toLowerCase();
  const mimeType = IMAGE_MIME_BY_EXTENSION[ext];
  if (mimeType) {
    const buffer = await fs.readFile(params.diskPath);
    return toFile(buffer, `${params.fileNameBase}${ext}`, { type: mimeType });
  }

  const pngBuffer = await sharp(params.diskPath).png().toBuffer();
  return toFile(pngBuffer, `${params.fileNameBase}.png`, { type: 'image/png' });
}

async function toDalle2UploadableImageFile(
  diskPath: string,
): Promise<{
  file: Awaited<ReturnType<typeof toFile>>;
  size: '256x256' | '512x512' | '1024x1024';
}> {
  const metadata = await sharp(diskPath).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const squareSize = resolveDalle2SquareSize(width, height);
  const squarePng = await sharp(diskPath)
    .ensureAlpha()
    .resize(squareSize, squareSize, {
      fit: 'contain',
      position: 'center',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  return {
    file: await toFile(squarePng, 'image.png', { type: 'image/png' }),
    size: toDalle2SizeLabel(squareSize),
  };
}

async function buildMaskBuffer(params: {
  imagePath: string;
  polygons: Array<Array<{ x: number; y: number }>>;
  invert?: boolean;
  feather?: number;
}): Promise<Buffer | null> {
  const metadata = await sharp(params.imagePath).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  if (!width || !height) return null;

  const polygons = params.polygons
    .map((poly) => poly.map((p) => `${Math.round(p.x * width)},${Math.round(p.y * height)}`).join(' '))
    .map((points) => `<polygon points="${points}" fill="${params.invert ? 'white' : 'black'}" fill-opacity="${params.invert ? 1 : 0}" />`)
    .join('\n');

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${params.invert ? 'black' : 'white'}" fill-opacity="${params.invert ? 0 : 1}" />
  ${polygons}
</svg>`;

  let output = sharp(Buffer.from(svg));
  if (params.feather && params.feather > 0) {
    output = output.blur(Math.min(10, params.feather / 10));
  }
  return output.png().toBuffer();
}

async function createImageRecord(params: {
  projectId: string;
  buffer: Buffer;
  extension: string;
}): Promise<ImageFileRecord> {
  const folder = toOutputFolder(params.projectId);
  await fs.mkdir(folder, { recursive: true });

  const filename = `edit-${Date.now()}-${randomUUID().slice(0, 6)}.${params.extension}`;
  const diskPath = path.join(folder, filename);
  await fs.writeFile(diskPath, params.buffer);

  const filepath = `/uploads/studio/${params.projectId}/outputs/${filename}`;
  const mimetype =
    params.extension === 'jpeg'
      ? 'image/jpeg'
      : params.extension === 'webp'
        ? 'image/webp'
        : 'image/png';
  const now = new Date();

  try {
    const repo = await getImageFileRepository();
    return await repo.createImageFile({
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      tags: ['image-studio', 'output'],
    });
  } catch {
    return {
      id: randomUUID(),
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      width: null,
      height: null,
      tags: ['image-studio', 'output'],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
}

export async function executeImageStudioRun(rawRequest: unknown): Promise<ImageStudioRunExecutionResult> {
  const parsed = imageStudioRunRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const request = parsed.data;
  const projectId = sanitizeImageStudioProjectId(request.projectId);
  if (!projectId) throw badRequestError('Project id is required.');

  const assetPath = request.asset.filepath;
  if (!assetPath.startsWith(`/uploads/studio/${projectId}/`)) {
    throw badRequestError('Asset must belong to the current project.');
  }

  const diskPath = resolveAssetPath(assetPath);
  ensureWithinProject(diskPath, projectId);

  await fs.stat(diskPath).catch(() => {
    throw badRequestError('Asset file not found.');
  });

  const settings = parseImageStudioSettings(
    request.studioSettings ? JSON.stringify(request.studioSettings) : null
  );

  if (settings.targetAi.openai.api !== 'images') {
    throw badRequestError('Image Studio run currently supports the Images API only.');
  }

  const apiKey =
    (await getSettingValue(IMAGE_STUDIO_OPENAI_API_KEY_KEY))?.trim() ||
    (await getSettingValue('openai_api_key'))?.trim() ||
    process.env['OPENAI_API_KEY'] ||
    null;
  if (!apiKey) {
    throw configurationError('OpenAI API key is missing. Set it in Image Studio settings.');
  }

  const client = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: OPENAI_MAX_RETRIES,
  });

  const overrides =
    settings.targetAi.openai.advanced_overrides && typeof settings.targetAi.openai.advanced_overrides === 'object'
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
    polygons.length > 0
      ? await buildMaskBuffer({ imagePath: diskPath, polygons, invert, feather })
      : null;

  const referenceAssets = request.referenceAssets ?? [];
  const referencePaths: string[] = [];
  const seenPaths = new Set<string>();

  for (const ref of referenceAssets) {
    const refPath = ref.filepath;
    if (!refPath) continue;
    if (refPath === assetPath) continue;
    if (seenPaths.has(refPath)) continue;
    if (!refPath.startsWith(`/uploads/studio/${projectId}/`)) {
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
  if (referencePaths.length + 1 > maxImages) {
    throw badRequestError(`Too many input images. Limit is ${maxImages} total.`);
  }

  const resolvedModel = settings.targetAi.openai.model?.trim() || null;
  if (!resolvedModel) {
    throw configurationError('Image Studio model is missing. Set it in Image Studio settings.');
  }
  const modelName = (resolvedModel ?? '').toLowerCase();
  const modelCapabilities = getImageModelCapabilities(resolvedModel);
  if (modelName.includes('dall-e-2') && referencePaths.length > 0) {
    throw badRequestError('Multiple input images are only supported for GPT image models.');
  }
  const requestedFormat = settings.targetAi.openai.image.format ?? 'png';
  const format = modelCapabilities.formatOptions.includes(requestedFormat)
    ? requestedFormat
    : (modelCapabilities.formatOptions[0] ?? 'png');

  let dalle2BaseSize: '256x256' | '512x512' | '1024x1024' | null = null;
  let imageFiles: Array<Awaited<ReturnType<typeof toFile>>>;
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

  const payload: OpenAI.Images.ImageEditParamsNonStreaming = {
    model: resolvedModel,
    prompt: modelName.includes('dall-e-2') ? clampPromptForDalle2(request.prompt) : request.prompt,
    image: imagePayload as unknown as OpenAI.Images.ImageEditParamsNonStreaming['image'],
  };
  const payloadRecord = payload as unknown as Record<string, unknown>;
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
  if (modelName.includes('dall-e-2') && dalle2BaseSize) {
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
  if (modelCapabilities.supportsStream && typeof settings.targetAi.openai.stream === 'boolean') {
    payloadRecord['stream'] = settings.targetAi.openai.stream;
  }
  if (modelCapabilities.supportsUser && settings.targetAi.openai.user) {
    payloadRecord['user'] = settings.targetAi.openai.user;
  }

  if (mask) {
    payloadRecord['mask'] = await toFile(mask, 'mask.png', { type: 'image/png' });
  }

  if (overrides) {
    const { image, mask: overrideMask, prompt, ...rest } =
      overrides as Partial<OpenAI.Images.ImageEditParamsNonStreaming>;
    void image;
    void overrideMask;
    void prompt;
    const target = payload as unknown as Record<string, unknown>;
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'output_format' && !(IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT && modelCapabilities.supportsOutputFormat)) {
          return;
        }
        if (key === 'response_format' && !modelCapabilities.supportsResponseFormat) {
          return;
        }
        if (key === 'stream' && !modelCapabilities.supportsStream) {
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
        target[key] = value as unknown;
      }
    });
  }

  if (!(IMAGE_STUDIO_ENABLE_OUTPUT_FORMAT && modelCapabilities.supportsOutputFormat)) {
    delete payloadRecord['output_format'];
  }

  let response: Awaited<ReturnType<typeof client.images.edit>> | null = null;
  let dalle2ModelFallbackApplied = false;
  for (let attempt = 0; attempt < MAX_UNKNOWN_PARAMETER_RETRIES; attempt += 1) {
    try {
      response = await client.images.edit(payload);
      break;
    } catch (error) {
      const message = extractErrorMessage(error);
      const activeModel = String(payloadRecord['model'] ?? '').toLowerCase();
      if (
        !dalle2ModelFallbackApplied &&
        activeModel !== 'dall-e-2' &&
        MODEL_MUST_BE_DALLE2_REGEX.test(message)
      ) {
        const fallbackImage = await toDalle2UploadableImageFile(diskPath);
        payloadRecord['model'] = 'dall-e-2';
        payloadRecord['prompt'] = clampPromptForDalle2(String(payloadRecord['prompt'] ?? request.prompt));
        payloadRecord['image'] = fallbackImage.file;
        payloadRecord['size'] = fallbackImage.size;
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
        unknownParameter === 'image' ||
        unknownParameter === 'mask'
      ) {
        throw error;
      }
      if (!Object.prototype.hasOwnProperty.call(payloadRecord, unknownParameter)) {
        throw error;
      }
      if (unknownParameter === 'output_format') {
        effectiveFormat = 'png';
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

  return { projectId, outputs };
}
