import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getDiskPathFromPublicPath, uploadFile } from '@/features/files/server';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { DATA_URL_REGEX, MIME_BY_EXTENSION, type ProductImageFileSource } from './product-studio-service.images';
import { trimString } from './product-studio-service.helpers';

export const parseDataUrlToBuffer = (
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

export const resolveBufferFromImagePath = async (
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

export const resolveMimeType = (params: {
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

export const clampUpscaleScale = (value: number): number =>
  Number(Math.max(1.1, Math.min(8, value)).toFixed(2));

export const appendFilenameSuffix = (
  filename: string,
  suffix: string,
  extOverride?: string,
): string => {
  const parsed = path.parse(filename);
  const extension = extOverride ?? (parsed.ext || '');
  const basename = parsed.name || 'image';
  return `${basename}${suffix}${extension}`;
};

export const buildUpscaledImage = async (
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

export const importSourceProductImageToStudio = async (params: {
  imageFile: ProductImageFileSource;
  productId: string;
  projectId: string;
  imageSlotIndex: number;
  rotateBeforeSendDeg: 90 | null;
  productFolderSegment: string;
}): Promise<{
  id: string;
  filepath: string;
  filename: string;
  mimetype: string;
  width: number | null;
  height: number | null;
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

  if (params.rotateBeforeSendDeg === 90) {
    uploadBuffer = await sharp(uploadBuffer).rotate(90).toBuffer();
    uploadFilename = appendFilenameSuffix(
      uploadFilename,
      '-rot90',
    );
  }

  const uploadMetadata = await sharp(uploadBuffer).metadata();
  const uploadWidth =
    typeof uploadMetadata.width === 'number' && Number.isFinite(uploadMetadata.width)
      ? Math.max(1, Math.floor(uploadMetadata.width))
      : null;
  const uploadHeight =
    typeof uploadMetadata.height === 'number' && Number.isFinite(uploadMetadata.height)
      ? Math.max(1, Math.floor(uploadMetadata.height))
      : null;

  const bytes = new Uint8Array(uploadBuffer);
  const file = new File([bytes], uploadFilename, { type: uploadMimeType });
  const uploaded = await uploadFile(file, {
    category: 'studio',
    projectId: params.projectId,
    folder: `products/${params.productFolderSegment}`,
    filenameOverride: uploadFilename,
  });

  return {
    id: uploaded.id,
    filepath: uploaded.filepath,
    filename: uploaded.filename,
    mimetype: uploaded.mimetype,
    width: uploadWidth,
    height: uploadHeight,
  };
};
