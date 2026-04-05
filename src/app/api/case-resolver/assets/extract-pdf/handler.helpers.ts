import path from 'path';

import { caseResolverPdfExtractRequestSchema } from '@/shared/contracts/case-resolver/file';
import { type CaseResolverPdfExtractResponse } from '@/shared/contracts/case-resolver';
import { badRequestError } from '@/shared/errors/app-error';

export const CASE_RESOLVER_UPLOAD_PREFIX = '/uploads/case-resolver/';
export const CASE_RESOLVER_UPLOAD_DISK_PREFIX = path.join(
  process.cwd(),
  'public',
  'uploads',
  'case-resolver'
);

export const normalizePublicFilepath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split('?')[0] ?? '';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
};

export type PdfParseResult = {
  text?: unknown;
  numpages?: unknown;
};

export type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

export const isPdfParseFn = (value: unknown): value is PdfParseFn => typeof value === 'function';

export const normalizePdfParseResult = (value: unknown): PdfParseResult =>
  value && typeof value === 'object' ? (value as PdfParseResult) : {};

export const resolveCaseResolverPdfExtractFilepath = (rawPayload: unknown): string => {
  const parsedRequest = caseResolverPdfExtractRequestSchema.safeParse(rawPayload);
  const filepath = normalizePublicFilepath(parsedRequest.success ? parsedRequest.data.filepath : null);
  if (!filepath) {
    throw badRequestError('filepath is required');
  }
  return filepath;
};

export const assertCaseResolverPdfFilepath = (filepath: string): void => {
  if (!filepath.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) {
    throw badRequestError('Only case resolver uploaded PDFs can be extracted');
  }
  if (!filepath.toLowerCase().endsWith('.pdf')) {
    throw badRequestError('Only PDF files are supported');
  }
};

export const assertCaseResolverUploadDiskPath = (diskPath: string): void => {
  if (!diskPath.startsWith(CASE_RESOLVER_UPLOAD_DISK_PREFIX)) {
    throw badRequestError('Resolved path is outside case resolver uploads');
  }
};

export const resolvePdfParseFn = (pdfModule: unknown): PdfParseFn => {
  const pdfParseCandidate: unknown =
    pdfModule && typeof pdfModule === 'object'
      ? ((pdfModule as Record<string, unknown>)['default'] ?? pdfModule)
      : pdfModule;
  if (!isPdfParseFn(pdfParseCandidate)) {
    throw badRequestError('PDF parser is unavailable');
  }
  return pdfParseCandidate;
};

export const buildCaseResolverPdfExtractResponse = (
  filepath: string,
  parsed: unknown
): CaseResolverPdfExtractResponse => {
  const normalized = normalizePdfParseResult(parsed);
  return {
    filepath,
    text: typeof normalized.text === 'string' ? normalized.text.trim() : '',
    pageCount: typeof normalized.numpages === 'number' ? normalized.numpages : null,
  };
};
