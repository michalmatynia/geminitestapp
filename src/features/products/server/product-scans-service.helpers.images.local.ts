import 'server-only';

import { extname, sep } from 'node:path';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';

import {
  PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN,
  PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS,
  PRODUCT_SCAN_MIN_IMAGE_BYTES,
  PRODUCT_SCAN_URL_PATTERN,
} from './product-scans-service.constants';
import { readOptionalString } from './product-scans-service.helpers.base';
import { downloadRemoteImageForScanning } from './product-scans-service.helpers.images.remote';
import {
  PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT,
  productScanImageFs,
} from './product-scans-service.helpers.images.shared';

const isLoopbackProductScanHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
};

export const resolveLocalPublicPathFromScanImageUrl = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) return null;
  if (normalized.startsWith('/')) return normalized;

  try {
    if (normalized.startsWith('http') === false) return null;
    const parsed = new URL(normalized);
    if (isLoopbackProductScanHost(parsed.hostname) === false) return null;
    return parsed.pathname.length > 0 ? parsed.pathname : null;
  } catch {
    return null;
  }
};

const resolvePublicUploadsFallbackDiskPath = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null || PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN.test(normalized) === false) {
    return null;
  }

  const cleaned = normalized.replace(/^\/uploads\/+/, '');
  const segments = cleaned
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  return segments.length === 0
    ? PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT
    : `${PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT}${sep}${segments.join(sep)}`;
};

const resolvePublicUploadsPathFromScanImageFilepath = (value: unknown): string | null => {
  const normalized = readOptionalString(value);
  return normalized !== null && PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN.test(normalized)
    ? normalized
    : null;
};

export const hasSupportedLocalScanImageExtension = (candidate: {
  filepath?: string | null;
  filename?: string | null;
}): boolean => {
  const extensionSource =
    readOptionalString(candidate.filename) ?? readOptionalString(candidate.filepath);
  if (extensionSource === null) return false;

  const normalizedExtension = extname(extensionSource).toLowerCase();
  if (normalizedExtension.length === 0) return true;
  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(normalizedExtension);
};

export const validateLocalScanImageCandidatePath = async (
  filepath: string
): Promise<boolean> => {
  if (filepath.length === 0) return false;
  try {
    const stats = await productScanImageFs.stat(filepath);
    return stats.isFile() && stats.size >= PRODUCT_SCAN_MIN_IMAGE_BYTES;
  } catch {
    return false;
  }
};

const resolveValidatedCandidatePublicPath = async (
  publicPath: string
): Promise<string | null> => {
  const diskPath = getDiskPathFromPublicPath(publicPath);
  if (await validateLocalScanImageCandidatePath(diskPath)) return diskPath;

  const fallbackDiskPath = resolvePublicUploadsFallbackDiskPath(publicPath);
  if (fallbackDiskPath === null || fallbackDiskPath === diskPath) return null;
  return (await validateLocalScanImageCandidatePath(fallbackDiskPath)) ? fallbackDiskPath : null;
};

export const resolveLocalScanImageCandidatePath = async (
  candidate: { filepath?: string | null; url?: string | null } | null | undefined
): Promise<string | null> => {
  if (candidate === null || candidate === undefined) return null;

  const explicitFilepath = readOptionalString(candidate.filepath);
  if (explicitFilepath !== null && (await validateLocalScanImageCandidatePath(explicitFilepath))) {
    return explicitFilepath;
  }

  const publicPath =
    resolveLocalPublicPathFromScanImageUrl(candidate.url) ??
    resolvePublicUploadsPathFromScanImageFilepath(explicitFilepath);
  if (publicPath === null) return null;

  return await resolveValidatedCandidatePublicPath(publicPath);
};

export const resolveLocalImageForScanning = async (
  candidate: { filepath: string | null; url: string | null }
): Promise<string | null> => {
  if (candidate.filepath !== null) return candidate.filepath;
  if (candidate.url !== null && PRODUCT_SCAN_URL_PATTERN.test(candidate.url)) {
    return await downloadRemoteImageForScanning(candidate.url);
  }
  return null;
};

export const resolveImageCandidateFilepath = async (
  candidate: { filepath: string | null; url: string | null } | null | undefined
): Promise<string | null> => {
  if (candidate === null || candidate === undefined) return null;
  return await resolveLocalImageForScanning(candidate);
};

export const resolveLocalScanImageCandidateUrlPath = async (
  candidate: Pick<ProductScanRecord['imageCandidates'][number], 'url' | 'filename'>
): Promise<string | null> => {
  const publicPath = resolveLocalPublicPathFromScanImageUrl(candidate.url);
  if (publicPath === null) return null;
  return await resolveLocalScanImageCandidatePath({ filepath: publicPath });
};
