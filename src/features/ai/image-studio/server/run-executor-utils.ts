import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

import {
  badRequestError,
} from '@/shared/errors/app-error';
import { parseImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import { imageStudioRunRequestSchema, type ImageFileRecord } from '@/shared/contracts/image-studio';
import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';

export const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
export const publicRoot = path.join(process.cwd(), 'public');

export const DALLE_PROMPT_MAX_CHARS = 1000;
export const UNKNOWN_PARAMETER_REGEX = /Unknown parameter:\s*['"]([^'"]+)['"]/i;
export const MODEL_MUST_BE_DALLE2_REGEX = /Value must be ['"]dall-e-2['"]/i;
export const MAX_UNKNOWN_PARAMETER_RETRIES = 6;

export const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export const sanitizeImageStudioProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const PROJECT_SCOPED_STUDIO_ASSET_GROUPS = ['crops', 'center', 'upscale', 'autoscale'] as const;

export const resolveExpectedOutputCount = (rawRequest: unknown): number => {
  const parsed = imageStudioRunRequestSchema.safeParse(rawRequest);
  if (!parsed.success) return 1;
  if (parsed.data.operation === 'center_object') return 1;
  const settings = parseImageStudioSettings(
    parsed.data.studioSettings ? JSON.stringify(parsed.data.studioSettings) : null
  );
  const requested = settings.targetAi.openai.image.n;
  if (!Number.isFinite(requested) || !requested) return 1;
  return Math.max(1, Math.min(10, Math.floor(requested)));
};

export const normalizePublicAssetPath = (filepath: string): string => {
  const trimmed = filepath.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed, 'http://localhost');
    const [withoutQuery] = url.pathname.split(/[?#]/, 1);
    if (!withoutQuery) return '';
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  } catch {
    const [withoutQuery] = trimmed.split(/[?#]/, 1);
    if (!withoutQuery) return '';
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
};

export const resolveAssetPath = (filepath: string): string => {
  const normalized = filepath.replace(/^\/+/, '');
  return path.resolve(publicRoot, normalized);
};

const getProjectScopedPublicPrefixes = (projectId: string): string[] => [
  `/uploads/studio/${projectId}/`,
  ...PROJECT_SCOPED_STUDIO_ASSET_GROUPS.map((group) => `/uploads/studio/${group}/${projectId}/`),
];

export const isProjectScopedAssetPath = (filepath: string, projectId: string): boolean => {
  if (!filepath) return false;
  const normalized = normalizePublicAssetPath(filepath);
  if (!normalized) return false;
  return getProjectScopedPublicPrefixes(projectId).some((prefix) => normalized.startsWith(prefix));
};

const getProjectScopedRoots = (projectId: string): string[] => [
  path.resolve(projectsRoot, projectId),
  ...PROJECT_SCOPED_STUDIO_ASSET_GROUPS.map((group) =>
    path.resolve(projectsRoot, group, projectId)
  ),
];

export const ensureWithinProject = (diskPath: string, projectId: string): void => {
  const resolvedPath = path.resolve(diskPath);
  const withinProject = getProjectScopedRoots(projectId).some(
    (projectRoot) =>
      resolvedPath === projectRoot || resolvedPath.startsWith(`${projectRoot}${path.sep}`)
  );
  if (!withinProject) {
    throw badRequestError('Asset path is outside the project.');
  }
};

export const toOutputFolder = (projectId: string): string => path.join(projectsRoot, projectId, 'outputs');

export const mapBackground = (
  value: string | null | undefined
): 'transparent' | 'opaque' | 'auto' | null => {
  if (!value) return null;
  if (value === 'transparent') return 'transparent';
  if (value === 'opaque') return 'opaque';
  if (value === 'white') return 'opaque';
  return 'auto';
};

export const coerceImageSize = (
  value: string | null | undefined
): OpenAI.Images.ImageEditParams['size'] => {
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

export const extractUnknownParameterName = (error: unknown): string | null => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';
  const match = UNKNOWN_PARAMETER_REGEX.exec(message);
  return match?.[1]?.trim() || null;
};

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
};

export const resolveDalle2SquareSize = (width: number, height: number): 256 | 512 | 1024 => {
  const maxSide = Math.max(width, height, 1);
  if (maxSide <= 256) return 256;
  if (maxSide <= 512) return 512;
  return 1024;
};

export const toDalle2SizeLabel = (size: 256 | 512 | 1024): '256x256' | '512x512' | '1024x1024' => {
  if (size === 256) return '256x256';
  if (size === 512) return '512x512';
  return '1024x1024';
};

export const countPromptCharacters = (prompt: string): number => Array.from(prompt).length;

export const assertDallePromptWithinLimit = (prompt: string, modelId: string): void => {
  const promptLength = countPromptCharacters(prompt);
  if (promptLength <= DALLE_PROMPT_MAX_CHARS) return;
  throw badRequestError(
    `Invalid 'prompt': string too long for ${modelId}. Maximum ${DALLE_PROMPT_MAX_CHARS}, got ${promptLength}.`
  );
};

export function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch {
    return null;
  }
}

export const resolveCenterOutputFormat = async (
  buffer: Buffer,
  mime: string
): Promise<{ buffer: Buffer; format: 'png' | 'jpeg' | 'webp' }> => {
  const normalizedMime = mime.toLowerCase();
  if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) {
    return { buffer, format: 'jpeg' };
  }
  if (normalizedMime.includes('webp')) {
    return { buffer, format: 'webp' };
  }
  if (normalizedMime.includes('png')) {
    return { buffer, format: 'png' };
  }
  const converted = await sharp(buffer).png().toBuffer();
  return { buffer: converted, format: 'png' };
};

export async function toUploadableImageFile(params: {
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

export async function toDalle2UploadableImageFile(diskPath: string): Promise<{
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

export async function createImageRecord(params: {
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
  const metadata = await sharp(params.buffer)
    .metadata()
    .catch(() => null);
  const width = metadata?.width ?? null;
  const height = metadata?.height ?? null;

  try {
    const repo = await getImageFileRepository();
    return await repo.createImageFile({
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      width: width ?? undefined,
      height: height ?? undefined,
      tags: ['image-studio', 'output'],
    });
  } catch {
    return {
      id: randomUUID(),
      name: filename,
      filename,
      filepath,
      mimetype,
      size: params.buffer.length,
      width: width ?? undefined,
      height: height ?? undefined,
      tags: ['image-studio', 'output'],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
}

export async function buildMaskBuffer(params: {
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
    .map((poly) =>
      poly.map((p) => `${Math.round(p.x * width)},${Math.round(p.y * height)}`).join(' ')
    )
    .map(
      (points) =>
        `<polygon points="${points}" fill="${params.invert ? 'white' : 'black'}" fill-opacity="${params.invert ? 1 : 0}" />`
    )
    .join('');

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${params.invert ? 'black' : 'white'}" />
    ${polygons}
  </svg>`;

  let mask = sharp(Buffer.from(svg)).png();
  if (params.feather && params.feather > 0) {
    mask = mask.blur(params.feather);
  }
  return await mask.toBuffer();
}
