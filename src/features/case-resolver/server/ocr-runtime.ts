import 'server-only';

import path from 'path';

import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';

import type { CaseResolverOcrFileKind } from '@/shared/contracts/case-resolver';

const CASE_RESOLVER_UPLOAD_PREFIX = '/uploads/case-resolver/';
const CASE_RESOLVER_IMAGE_EXTENSION_PATTERN = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i;
const CASE_RESOLVER_PDF_EXTENSION_PATTERN = /\.pdf$/i;
const CASE_RESOLVER_UPLOAD_DISK_PREFIX = path.join(
  process.cwd(),
  'public',
  'uploads',
  'case-resolver'
);

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

export const isCaseResolverPdfFilepath = (filepath: string): boolean => {
  const normalized = normalizeCaseResolverPublicFilepath(filepath);
  if (!normalized) return false;
  if (!normalized.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) return false;
  return CASE_RESOLVER_PDF_EXTENSION_PATTERN.test(normalized);
};

export const inferCaseResolverOcrFileKind = (filepath: string): CaseResolverOcrFileKind | null => {
  if (isCaseResolverImageFilepath(filepath)) return 'image';
  if (isCaseResolverPdfFilepath(filepath)) return 'pdf';
  return null;
};

export const isCaseResolverOcrFilepath = (filepath: string): boolean =>
  inferCaseResolverOcrFileKind(filepath) !== null;

export const resolveCaseResolverOcrDiskPath = (
  value: unknown
): {
  filepath: string;
  diskPath: string;
  kind: CaseResolverOcrFileKind;
} => {
  const filepath = normalizeCaseResolverPublicFilepath(value);
  if (!filepath) {
    throw new Error('filepath is required.');
  }
  if (!filepath.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) {
    throw new Error('Only Case Resolver uploaded files are supported.');
  }
  const kind = inferCaseResolverOcrFileKind(filepath);
  if (!kind) {
    throw new Error('Only image and PDF files are supported for OCR runtime.');
  }

  const diskPath = path.resolve(getDiskPathFromPublicPath(filepath));
  const allowedPrefix = `${CASE_RESOLVER_UPLOAD_DISK_PREFIX}${path.sep}`;
  if (diskPath !== CASE_RESOLVER_UPLOAD_DISK_PREFIX && !diskPath.startsWith(allowedPrefix)) {
    throw new Error('Resolved OCR path is outside Case Resolver uploads.');
  }

  return {
    filepath,
    diskPath,
    kind,
  };
};

export const resolveCaseResolverImageDiskPath = (value: unknown): string =>
  resolveCaseResolverOcrDiskPath(value).diskPath;
