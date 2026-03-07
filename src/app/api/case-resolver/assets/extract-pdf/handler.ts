import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import {
  caseResolverPdfExtractRequestSchema,
  type CaseResolverPdfExtractResponse,
} from '@/shared/contracts/case-resolver';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

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

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let rawPayload: unknown;
  try {
    rawPayload = (await req.json()) as unknown;
  } catch (error) {
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
  const pdfParse = (
    pdfModule as unknown as {
      default: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
    }
  ).default;
  const parsed = await pdfParse(fileBuffer);
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  const response: CaseResolverPdfExtractResponse = {
    filepath,
    text,
    pageCount: typeof parsed.numpages === 'number' ? parsed.numpages : null,
  };

  return NextResponse.json(response);
}
