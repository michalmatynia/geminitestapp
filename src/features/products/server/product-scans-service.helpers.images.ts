import 'server-only';

import { randomUUID } from 'crypto';
import { tmpdir } from 'node:os';
import { extname, join, sep } from 'node:path';

import {
  PRODUCT_SCAN_URL_PATTERN,
  PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN,
  PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS,
  PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES,
  PRODUCT_SCAN_MIN_IMAGE_BYTES,
} from './product-scans-service.constants';
import { readOptionalString } from './product-scans-service.helpers.base';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const PRODUCT_SCAN_HTTP_URL_PATTERN = /^https?:\/\//i;
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const nodeFs = getFsPromises();
const PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY = join(tmpdir(), 'geminitestapp-product-scan-images');
const PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT = `${process.cwd()}${sep}public${sep}uploads`;

const isLoopbackProductScanHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
};

const resolveLocalPublicPathFromScanImageUrl = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) {
    return null;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  try {
    const urlString = String(normalized);
    if (!urlString.startsWith('http')) return null;
    const parsed = new URL(urlString);
    if (isLoopbackProductScanHost(parsed.hostname) === false) {
      return null;
    }
    return parsed.pathname !== '' ? parsed.pathname : null;
  } catch {
    return null;
  }
};

const resolvePublicUploadsFallbackDiskPath = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null || !PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN.test(normalized)) {
    return null;
  }

  const cleaned = normalized.replace(/^\/uploads\/+/, '');
  const segments = cleaned
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  return segments.length === 0
    ? PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT
    : `${PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT}${sep}${segments.join(sep)}`;
};

export const hasSupportedLocalScanImageExtension = (candidate: {
  filepath?: string | null;
  filename?: string | null;
}): boolean => {
  const extensionSource =
    readOptionalString(candidate.filename) ?? readOptionalString(candidate.filepath);
  if (extensionSource === null) {
    return false;
  }

  const normalizedExtension = extname(extensionSource).toLowerCase();
  if (normalizedExtension === '') {
    return true;
  }

  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(normalizedExtension);
};

export const validateLocalScanImageCandidatePath = async (
  filepath: string
): Promise<boolean> => {
  if (filepath.length === 0) {
    return false;
  }
  try {
    const stats = await nodeFs.stat(filepath);
    return stats.isFile() && stats.size >= PRODUCT_SCAN_MIN_IMAGE_BYTES;
  } catch {
    return false;
  }
};

export const resolveLocalScanImageCandidatePath = async (
  candidate: { filepath?: string | null; url?: string | null } | null | undefined
): Promise<string | null> => {
  if (!candidate) {
    return null;
  }

  const explicitFilepath = readOptionalString(candidate.filepath);
  if (explicitFilepath !== null && (await validateLocalScanImageCandidatePath(explicitFilepath))) {
    return explicitFilepath;
  }

  const publicPath = resolveLocalPublicPathFromScanImageUrl(candidate.url);
  if (publicPath === null) {
    return null;
  }

  const diskPath = getDiskPathFromPublicPath(publicPath);
  if (diskPath !== null && (await validateLocalScanImageCandidatePath(diskPath))) {
    return diskPath;
  }

  const fallbackDiskPath = resolvePublicUploadsFallbackDiskPath(publicPath);
  if (
    fallbackDiskPath !== null &&
    fallbackDiskPath !== diskPath &&
    (await validateLocalScanImageCandidatePath(fallbackDiskPath))
  ) {
    return fallbackDiskPath;
  }

  return null;
};

export const downloadRemoteImageForScanning = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    if (contentLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < PRODUCT_SCAN_MIN_IMAGE_BYTES) {
      return null;
    }

    try {
      await nodeFs.mkdir(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, { recursive: true });
    } catch {
      // Ignore if exists
    }

    const filename = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extname(new URL(url).pathname) || '.jpg'}`;
    const filepath = join(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, filename);

    await nodeFs.writeFile(filepath, Buffer.from(buffer));
    return filepath;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'downloadRemoteImageForScanning',
      url,
    });
    return null;
  }
};

export const resolveLocalImageForScanning = async (
  candidate: { filepath: string | null; url: string | null }
): Promise<string | null> => {
  if (candidate.filepath !== null) {
    return candidate.filepath;
  }
  if (candidate.url !== null && PRODUCT_SCAN_URL_PATTERN.test(candidate.url)) {
    return await downloadRemoteImageForScanning(candidate.url);
  }
  return null;
};

export const resolveImageCandidateFilepath = async (
  candidate: { filepath: string | null; url: string | null } | null | undefined
): Promise<string | null> => {
  if (!candidate) return null;
  return await resolveLocalImageForScanning(candidate);
};

export const hydrateProductScanImageCandidates = async (input: {
  product: ProductWithImages;
  imageCandidates: ProductScanRecord['imageCandidates'];
}): Promise<ProductScanRecord['imageCandidates']> => {
  const results = [...input.imageCandidates];
  const processedUrls = new Set(results.map((r) => r.url).filter((u): u is string => u !== null));

  const productImages = input.product.images ?? [];
  for (const image of productImages) {
    const imageFile = image.imageFile;
    const url =
      readOptionalString(imageFile.publicUrl) ??
      readOptionalString(imageFile.url) ??
      readOptionalString(imageFile.thumbnailUrl);
    if (url !== null && !processedUrls.has(url)) {
      results.push({
        id: readOptionalString(imageFile.id) ?? readOptionalString(image.imageFileId),
        filepath: readOptionalString(imageFile.filepath),
        url,
        filename: readOptionalString(imageFile.filename),
      });
      processedUrls.add(url);
    }
  }

  const productImageBase64s = Array.isArray(input.product.imageBase64s)
    ? input.product.imageBase64s
    : [];
  for (let index = 0; index < productImageBase64s.length; index++) {
    const resolved = resolveProductScanBase64Image(productImageBase64s[index]);
    if (resolved === null) {
      continue;
    }

    const candidate = await writeProductScanTempImageCandidate({
      id: `base64-slot-${index + 1}`,
      filename: null,
      buffer: resolved.buffer,
      mimeType: resolved.mimeType,
      sourceUrl: null,
      productId: input.product.id,
      slotIndex: index,
    });
    if (candidate !== null) {
      results.push(candidate);
    }
  }

  return results;
};

const resolveProductScanBase64ImageExtension = (mimeType: string): string => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/bmp') return '.bmp';
  if (normalized === 'image/tiff') return '.tiff';
  if (normalized === 'image/avif') return '.avif';
  if (normalized === 'image/heic') return '.heic';
  if (normalized === 'image/heif') return '.heif';
  return '.jpg';
};

const resolveProductScanBase64Image = (
  value: unknown
): { buffer: Buffer; mimeType: string } | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) {
    return null;
  }

  const dataUriMatch = normalized.match(/^data:([^;,]+);base64,(.*)$/is);
  const mimeType = dataUriMatch?.[1]?.trim().toLowerCase() ?? 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  const base64Value = (dataUriMatch?.[2] ?? normalized).replace(/\s+/g, '');
  if (
    base64Value.length === 0 ||
    base64Value.length % 4 !== 0 ||
    /^[a-zA-Z0-9+/]+={0,2}$/.test(base64Value) === false
  ) {
    return null;
  }

  return {
    buffer: Buffer.from(base64Value, 'base64'),
    mimeType,
  };
};

const resolveProductScanUrlImageExtension = (input: {
  contentType?: string | null;
  filename?: string | null;
  url?: string | null;
}): string => {
  if (input.contentType !== null && input.contentType !== undefined && input.contentType !== '') {
    return resolveProductScanBase64ImageExtension(input.contentType);
  }

  const extensionSource = readOptionalString(input.filename) ?? readOptionalString(input.url);
  if (extensionSource === null) {
    return '.jpg';
  }

  const extension = extname(extensionSource.split('?')[0] ?? '').toLowerCase();
  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(extension) ? extension : '.jpg';
};

const writeProductScanTempImageCandidate = async (input: {
  id: string | null;
  filename: string | null;
  buffer: Buffer;
  mimeType?: string | null;
  sourceUrl?: string | null;
  productId?: string | null;
  slotIndex?: number | null;
}): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  if (
    input.buffer.byteLength < PRODUCT_SCAN_MIN_IMAGE_BYTES ||
    input.buffer.byteLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES
  ) {
    return null;
  }

  const extension = resolveProductScanUrlImageExtension({
    contentType: input.mimeType,
    filename: input.filename,
    url: input.sourceUrl,
  });
  const rawSafeProductId = readOptionalString(input.productId)?.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60);
  const safeProductId = typeof rawSafeProductId === 'string' && rawSafeProductId !== '' ? rawSafeProductId : 'product';
  const slotLabel =
    typeof input.slotIndex === 'number' && Number.isFinite(input.slotIndex)
      ? `slot-${input.slotIndex + 1}`
      : 'remote';
  const filename =
    readOptionalString(input.filename) ?? `${safeProductId}-scan-${slotLabel}${extension}`;
  const filepath = join(
    PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY,
    `${safeProductId}-${slotLabel}-${randomUUID()}${extension}`
  );

  await nodeFs.mkdir(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, { recursive: true });
  await nodeFs.writeFile(filepath, input.buffer);

  return {
    id: input.id,
    filepath,
    url: readOptionalString(input.sourceUrl),
    filename,
  };
};

const resolveLocalScanImageCandidateUrlPath = async (
  candidate: Pick<ProductScanRecord['imageCandidates'][number], 'url' | 'filename'>
): Promise<string | null> => {
  const publicPath = resolveLocalPublicPathFromScanImageUrl(candidate.url);
  if (publicPath === null) {
    return null;
  }

  return await resolveLocalScanImageCandidatePath({
    filepath: publicPath,
  });
};

const materializeProductScanUrlCandidate = async (
  candidate: ProductScanRecord['imageCandidates'][number]
): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const url = readOptionalString(candidate.url);
  if (url === null || PRODUCT_SCAN_HTTP_URL_PATTERN.test(url) === false) {
    return null;
  }

  const response = await fetch(url);
  if (response.ok === false) {
    return null;
  }

  const contentLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(contentLength) && contentLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType !== null && /^image\//i.test(contentType) === false) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return await writeProductScanTempImageCandidate({
    id: candidate.id,
    filename: candidate.filename,
    buffer,
    mimeType: contentType,
    sourceUrl: url,
  });
};

export const sanitizeProductScanImageCandidates = async (
  imageCandidates: ProductScanRecord['imageCandidates'],
  options: { materializeUrlCandidates?: boolean; requireLocalFile?: boolean } = {}
): Promise<ProductScanRecord['imageCandidates']> => {
  const sanitizedCandidates = await Promise.all(
    imageCandidates.map(async (candidate) => {
      const resolvedFilepath = await resolveLocalScanImageCandidatePath(candidate);
      const hasUrl = readOptionalString(candidate.url) !== null;

      if (resolvedFilepath !== null) {
        return {
          ...candidate,
          filepath: resolvedFilepath,
        };
      }

      if (hasUrl === false) {
        return null;
      }

      const localUrlFilepath = await resolveLocalScanImageCandidateUrlPath(candidate);
      if (localUrlFilepath !== null) {
        return {
          ...candidate,
          filepath: localUrlFilepath,
        };
      }

      if (options.materializeUrlCandidates === true) {
        try {
          const materializedCandidate = await materializeProductScanUrlCandidate(candidate);
          if (materializedCandidate !== null) {
            return materializedCandidate;
          }
        } catch (error) {
          await ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: 'sanitizeProductScanImageCandidates.materializeUrlCandidate',
            candidateId: candidate.id,
          });
        }
      }

      if (options.requireLocalFile === true) {
        return null;
      }

      return {
        ...candidate,
        filepath: null,
      };
    })
  );

  return sanitizedCandidates.filter(
    (candidate): candidate is ProductScanRecord['imageCandidates'][number] => candidate !== null
  );
};
