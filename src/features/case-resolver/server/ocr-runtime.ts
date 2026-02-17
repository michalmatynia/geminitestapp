import 'server-only';

import path from 'path';

import { getDiskPathFromPublicPath } from '@/features/files/server';

const CASE_RESOLVER_UPLOAD_PREFIX = '/uploads/case-resolver/';
const CASE_RESOLVER_UPLOAD_DISK_PREFIX = path.resolve(
  process.cwd(),
  'public',
  'uploads',
  'case-resolver'
);
const CASE_RESOLVER_IMAGE_EXTENSION_PATTERN =
  /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic|heif|tif|tiff|svg)$/i;

export const normalizeCaseResolverPublicFilepath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split('?')[0] ?? '';
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return normalized || null;
};

export const isCaseResolverImageFilepath = (filepath: string): boolean => {
  const normalized = normalizeCaseResolverPublicFilepath(filepath);
  if (!normalized) return false;
  if (!normalized.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) return false;
  return CASE_RESOLVER_IMAGE_EXTENSION_PATTERN.test(normalized);
};

export const resolveCaseResolverImageDiskPath = (value: unknown): string => {
  const filepath = normalizeCaseResolverPublicFilepath(value);
  if (!filepath) {
    throw new Error('filepath is required.');
  }
  if (!filepath.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) {
    throw new Error('Only Case Resolver uploaded images are supported.');
  }
  if (!CASE_RESOLVER_IMAGE_EXTENSION_PATTERN.test(filepath)) {
    throw new Error('Only image files are supported for OCR runtime.');
  }

  const diskPath = path.resolve(getDiskPathFromPublicPath(filepath));
  const allowedPrefix = `${CASE_RESOLVER_UPLOAD_DISK_PREFIX}${path.sep}`;
  if (diskPath !== CASE_RESOLVER_UPLOAD_DISK_PREFIX && !diskPath.startsWith(allowedPrefix)) {
    throw new Error('Resolved OCR path is outside Case Resolver uploads.');
  }

  return diskPath;
};

