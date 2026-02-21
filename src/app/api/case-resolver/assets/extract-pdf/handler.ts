import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getDiskPathFromPublicPath } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

type ExtractPdfRequest = {
  filepath?: unknown;
};

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
  let payload: ExtractPdfRequest;
  try {
    payload = (await req.json()) as ExtractPdfRequest;
  } catch (error) {
    throw badRequestError('Invalid JSON payload', { error });
  }

  const filepath = normalizePublicFilepath(payload.filepath);
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
  const pdfParseModule = (await import('pdf-parse')) as any;
  const parsed = await pdfParseModule.default(fileBuffer);
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';

  return NextResponse.json({
    filepath,
    text,
    pageCount: typeof parsed.numpages === 'number' ? parsed.numpages : null,
  });
}
