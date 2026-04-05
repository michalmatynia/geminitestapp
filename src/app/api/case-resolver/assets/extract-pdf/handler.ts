import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import { caseResolverPdfExtractRequestSchema } from '@/shared/contracts/case-resolver/file';
import { type CaseResolverPdfExtractResponse } from '@/shared/contracts/case-resolver';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const CASE_RESOLVER_UPLOAD_PREFIX = '/uploads/case-resolver/';
const CASE_RESOLVER_UPLOAD_DISK_PREFIX = path.join(
  process.cwd(),
  'public',
  'uploads',
  'case-resolver'
);

const normalizePublicFilepath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split('?')[0] ?? '';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
};

type PdfParseResult = {
  text?: unknown;
  numpages?: unknown;
};

type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

const isPdfParseFn = (value: unknown): value is PdfParseFn => typeof value === 'function';
const normalizePdfParseResult = (value: unknown): PdfParseResult =>
  value && typeof value === 'object' ? (value as PdfParseResult) : {};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let rawPayload: unknown;
  try {
    rawPayload = (await req.json()) as unknown;
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON payload', { error });
  }

  const parsedRequest = caseResolverPdfExtractRequestSchema.safeParse(rawPayload);
  const filepath = normalizePublicFilepath(parsedRequest.success ? parsedRequest.data.filepath : null);
  if (!filepath) {
    throw badRequestError('filepath is required');
  }
  if (!filepath.startsWith(CASE_RESOLVER_UPLOAD_PREFIX)) {
    throw badRequestError('Only case resolver uploaded PDFs can be extracted');
  }
  if (!filepath.toLowerCase().endsWith('.pdf')) {
    throw badRequestError('Only PDF files are supported');
  }

  const diskPath = getDiskPathFromPublicPath(filepath);
  if (!diskPath.startsWith(CASE_RESOLVER_UPLOAD_DISK_PREFIX)) {
    throw badRequestError('Resolved path is outside case resolver uploads');
  }

  const fileBuffer = await fs.readFile(diskPath);
  const pdfModule = await import('pdf-parse');
  const pdfParseCandidate = Reflect.get(pdfModule, 'default') ?? pdfModule;
  if (!isPdfParseFn(pdfParseCandidate)) {
    throw badRequestError('PDF parser is unavailable');
  }
  const pdfParse = pdfParseCandidate;
  const parsed = normalizePdfParseResult(await pdfParse(fileBuffer));
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  const response: CaseResolverPdfExtractResponse = {
    filepath,
    text,
    pageCount: typeof parsed.numpages === 'number' ? parsed.numpages : null,
  };

  return NextResponse.json(response);
}
